import { ethers } from 'https://cdn.skypack.dev/ethers@5.7.2';
import { CONTRACT_ADDRESSES, FUNDME_ABI, NFT_ABI } from './constants.js';

// Contract instances
let provider, signer, fundMeContract, nftContract, userAddress;

// Smooth scroll
function scrollToFund() {
    document.getElementById('fund').scrollIntoView({ behavior: 'smooth' });
}

// Connect wallet
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask!');
            return;
        }
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Use ethers v5 syntax
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Update connect button to show address
        document.getElementById('connectBtn').textContent = 
            userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
        document.getElementById('connectBtn').classList.add('connected');
        
        // Show disconnect button
        const disconnectBtn = document.getElementById('disconnectBtn');
        if (disconnectBtn) {
            disconnectBtn.style.display = 'inline-block';
        }
        
        // Initialize contracts
        fundMeContract = new ethers.Contract(CONTRACT_ADDRESSES.FUNDME, FUNDME_ABI, signer);
        nftContract = new ethers.Contract(CONTRACT_ADDRESSES.NFT, NFT_ABI, signer);
        
        // Enable fund button
        document.getElementById('fundBtn').textContent = 'Fund Project';
        document.getElementById('fundBtn').disabled = false;
        
        // Load data
        await loadUserData();
        await loadContractData();
        
        // Listen to events
        listenToEvents();
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Error connecting wallet. Please try again.');
    }
}

// Disconnect wallet
async function disconnectWallet() {
    userAddress = null;
    provider = null;
    signer = null;
    fundMeContract = null;
    nftContract = null;
    
    // Reset connect button
    document.getElementById('connectBtn').textContent = 'Connect';
    document.getElementById('connectBtn').classList.remove('connected');
    
    // Hide disconnect button if it exists
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.style.display = 'none';
    }
    
    // Reset UI
    document.getElementById('fundBtn').textContent = 'Connect Wallet to Fund';
    document.getElementById('fundBtn').disabled = true;
    document.getElementById('userContribution').textContent = '$0';
    document.getElementById('currentTier').textContent = '-';
    document.getElementById('rewardsPreview').style.display = 'none';
    updateTierHighlight(0);
    
    // Reset stats
    document.getElementById('picaAvailable').textContent = '0';
    document.getElementById('totalRaised').textContent = '0 ETH';
    document.getElementById('totalRaisedCard').textContent = '0 ETH';
    document.getElementById('nftsMinted').textContent = '0';
    document.getElementById('totalFunders').textContent = '0';
    
    // Clear funders list
    document.getElementById('fundersList').innerHTML = '<p style="text-align: center; color: #8b8b9a;">Connect wallet to see contributors</p>';
}

// Load user data
async function loadUserData() {
    // Check if contract and user are available
    if (!fundMeContract || !userAddress) {
        return;
    }
    
    try {
        const contribution = await fundMeContract.getHowMuchDudeFundedInUsdActual(userAddress);
        const contributionNum = contribution.toNumber();
        
        document.getElementById('userContribution').textContent = '$' + contributionNum;
        
        // Update tier
        let tier = '-';
        if (contributionNum >= 1000) {
            tier = 'Gold';
        } else if (contributionNum >= 100) {
            tier = 'Silver';
        } else if (contributionNum >= 10) {
            tier = 'Bronze';
        }
        document.getElementById('currentTier').textContent = tier;
        
        updateTierHighlight(contributionNum);
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load contract data
async function loadContractData() {
    try {
        // Check if contracts are initialized
        if (!fundMeContract || !provider) {
            // Set default values when not connected
            document.getElementById('picaAvailable').textContent = '0';
            document.getElementById('totalRaised').textContent = '0 ETH';
            document.getElementById('totalRaisedCard').textContent = '0 ETH';
            document.getElementById('nftsMinted').textContent = '0';
            document.getElementById('totalFunders').textContent = '0';
            document.getElementById('fundersList').innerHTML = '<p style="text-align: center; color: #8b8b9a;">Connect wallet to see contributors</p>';
            return;
        }
        
        // Get PICA balance
        const picaBalance = await fundMeContract.getPicaTokenBalance();
        document.getElementById('picaAvailable').textContent = 
            ethers.utils.formatEther(picaBalance).slice(0, 8);
        
        // Get total raised
        const contractBalance = await provider.getBalance(CONTRACT_ADDRESSES.FUNDME);
        const ethAmount = ethers.utils.formatEther(contractBalance).slice(0, 6);
        document.getElementById('totalRaised').textContent = ethAmount + ' ETH';
        document.getElementById('totalRaisedCard').textContent = ethAmount + ' ETH';
        
        // Get NFT count
        if (nftContract) {
            try {
                const nftCount = await nftContract.getTotalSupply();
                document.getElementById('nftsMinted').textContent = nftCount.toString();
            } catch (e) {
                document.getElementById('nftsMinted').textContent = '0';
            }
        } else {
            document.getElementById('nftsMinted').textContent = '0';
        }
        
        // Load funders
        await loadFundersList();
    } catch (error) {
        console.error('Error loading contract data:', error);
        // Set default values on error
        document.getElementById('picaAvailable').textContent = '0';
        document.getElementById('totalRaised').textContent = '0 ETH';
        document.getElementById('totalRaisedCard').textContent = '0 ETH';
        document.getElementById('nftsMinted').textContent = '0';
        document.getElementById('totalFunders').textContent = '0';
    }
}

// Load funders list
async function loadFundersList() {
    // Check if contract is available
    if (!fundMeContract) {
        document.getElementById('fundersList').innerHTML = '<p style="text-align: center; color: #8b8b9a;">Connect wallet to see contributors</p>';
        return;
    }
    
    try {
        const fundersList = document.getElementById('fundersList');
        fundersList.innerHTML = '';
        
        // Get funding events
        const filter = fundMeContract.filters.Funded();
        const events = await fundMeContract.queryFilter(filter, -10000);
        
        if (events.length === 0) {
            fundersList.innerHTML = '<p style="text-align: center; color: #8b8b9a;">No contributors yet. Be the first!</p>';
            return;
        }
        
        // Group by funder
        const funders = {};
        for (const event of events) {
            const funder = event.args.funder;
            const amount = event.args.ethAmount;
            
            if (funders[funder]) {
                funders[funder] = funders[funder].add(amount);
            } else {
                funders[funder] = amount;
            }
        }
        
        // Sort and display top 10
        const sortedFunders = Object.entries(funders)
            .sort((a, b) => b[1].sub(a[1]).toString())
            .slice(0, 10);
        
        document.getElementById('totalFunders').textContent = Object.keys(funders).length;
        
        sortedFunders.forEach(([address, amount]) => {
            const row = document.createElement('div');
            row.className = 'funder-row';
            row.innerHTML = `
                <span class="funder-address">${address.slice(0, 6)}...${address.slice(-4)}</span>
                <span class="funder-amount">${ethers.utils.formatEther(amount).slice(0, 6)} ETH</span>
            `;
            fundersList.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading funders:', error);
        document.getElementById('fundersList').innerHTML = '<p style="text-align: center; color: #8b8b9a;">Error loading contributors</p>';
    }
}

// Calculate rewards preview
async function calculateRewards() {
    const ethAmount = document.getElementById('ethAmount').value;
    
    if (!ethAmount || ethAmount <= 0 || !fundMeContract || !userAddress) {
        document.getElementById('rewardsPreview').style.display = 'none';
        return;
    }
    
    try {
        const ethValue = ethers.utils.parseEther(ethAmount);
        const picaReward = await fundMeContract.calculatePicaTokenReward(ethValue);
        
        // calculatePicaTokenReward returns the result already divided by 1e18
        // So picaReward is the actual PICA tokens (not in wei)
        const picaRewardNum = picaReward.toNumber();
        const usdValue = picaRewardNum / 2; // PICA_MULTIPLIER is 2
        
        document.getElementById('picaReward').textContent = 
            picaRewardNum.toFixed(6) + ' PICA';
        document.getElementById('usdValue').textContent = '$' + usdValue.toFixed(2);
        
        // NFT preview
        const currentContribution = await fundMeContract.getHowMuchDudeFundedInUsdActual(userAddress);
        const totalAfterFunding = currentContribution.toNumber() + usdValue;
        
        let nftStatus = '';
        if (currentContribution.toNumber() < 10 && totalAfterFunding >= 10) {
            nftStatus = '🎉 You will receive your first NFT!';
        } else if (totalAfterFunding >= 1000 && currentContribution.toNumber() < 1000) {
            nftStatus = '⬆️ Upgrade to GOLD tier!';
        } else if (totalAfterFunding >= 100 && currentContribution.toNumber() < 100) {
            nftStatus = '⬆️ Upgrade to SILVER tier!';
        } else if (totalAfterFunding < 10) {
            const needed = 10 - totalAfterFunding;
            nftStatus = `Need $${needed.toFixed(2)} more for NFT`;
        } else {
            nftStatus = '✓ Maintaining current tier';
        }
        
        document.getElementById('nftPreview').textContent = nftStatus;
        document.getElementById('rewardsPreview').style.display = 'block';
    } catch (error) {
        console.error('Error calculating rewards:', error);
    }
}

// Fund project
async function fundProject() {
    if (!fundMeContract || !userAddress) {
        alert('Please connect your wallet first');
        return;
    }
    
    const ethAmount = document.getElementById('ethAmount').value;
    
    if (!ethAmount || ethAmount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    try {
        document.getElementById('fundBtn').disabled = true;
        document.getElementById('fundBtn').innerHTML = '<span class="loading"></span> Processing...';
        
        const tx = await fundMeContract.fund({
            value: ethers.utils.parseEther(ethAmount)
        });
        
        document.getElementById('fundBtn').innerHTML = '<span class="loading"></span> Confirming...';
        await tx.wait();
        
        alert('Successfully funded! You will receive your PICA tokens shortly.');
        document.getElementById('ethAmount').value = '';
        document.getElementById('rewardsPreview').style.display = 'none';
        
        // Reload data
        await loadUserData();
        await loadContractData();
    } catch (error) {
        console.error('Error funding:', error);
        alert('Error funding project. Please try again.');
    } finally {
        document.getElementById('fundBtn').disabled = false;
        document.getElementById('fundBtn').textContent = 'Fund Project';
    }
}

// Update tier highlight
function updateTierHighlight(contributionUsd) {
    // Remove all active states
    document.querySelectorAll('.nft-tier').forEach(tier => {
        tier.style.transform = 'translateY(0)';
        tier.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    });
    
    // Add active state to current tier
    if (contributionUsd >= 1000) {
        const goldTier = document.getElementById('goldTier');
        if (goldTier) {
            goldTier.style.transform = 'translateY(-5px)';
            goldTier.style.border = '1px solid #ffd700';
        }
    } else if (contributionUsd >= 100) {
        const silverTier = document.getElementById('silverTier');
        if (silverTier) {
            silverTier.style.transform = 'translateY(-5px)';
            silverTier.style.border = '1px solid #c0c0c0';
        }
    } else if (contributionUsd >= 10) {
        const bronzeTier = document.getElementById('bronzeTier');
        if (bronzeTier) {
            bronzeTier.style.transform = 'translateY(-5px)';
            bronzeTier.style.border = '1px solid #cd7f32';
        }
    }
}

// Listen to events
function listenToEvents() {
    if (!fundMeContract) return;
    
    fundMeContract.on('Funded', async (funder, ethAmount, picaTokensAwarded) => {
        if (funder.toLowerCase() === userAddress.toLowerCase()) {
            await loadUserData();
        }
        await loadContractData();
    });
    
    fundMeContract.on('NftMinted', async (recipient) => {
        if (recipient.toLowerCase() === userAddress.toLowerCase()) {
            alert('🎉 Congratulations! You just received your BRABO NFT!');
            await loadUserData();
        }
    });
    
    fundMeContract.on('TierUpgraded', async (tokenId, user, newTier) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
            const tierNames = ['Bronze', 'Silver', 'Gold'];
            alert(`🎊 Your NFT has been upgraded to ${tierNames[newTier]} tier!`);
            await loadUserData();
        }
    });
}

// Event listeners
document.getElementById('connectBtn').addEventListener('click', async () => {
    // Connect button now only connects (doesn't toggle)
    if (!userAddress) {
        await connectWallet();
    }
});

// Disconnect button event listener
const disconnectBtn = document.getElementById('disconnectBtn');
if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
        await disconnectWallet();
    });
}

document.getElementById('fundBtn').addEventListener('click', fundProject);

document.getElementById('ethAmount').addEventListener('input', () => {
    if (userAddress && fundMeContract) {
        calculateRewards();
    }
});

// Check wallet on load
window.addEventListener('load', async () => {
    console.log('Page loaded, initializing...');
    
    // Only load basic contract data (without requiring wallet connection)
    await loadContractData();
    
    // Optionally auto-connect if wallet was previously connected
    // Uncomment the following lines if you want auto-reconnect functionality:
    /*
    if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            await connectWallet();
        }
    }
    */
});

// Handle account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
            await disconnectWallet();
        } else {
            await connectWallet();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}