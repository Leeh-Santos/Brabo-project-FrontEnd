import { ethers } from 'https://cdn.skypack.dev/ethers@5.7.2';
import { CONTRACT_ADDRESSES, FUNDME_ABI, NFT_ABI } from './constants.js';

// Toast notification system
class ToastManager {
    constructor() {
        this.container = document.getElementById('toastContainer');
        this.toasts = new Set();
    }

    show(message, type = 'info', title = '', duration = 5000) {
        const toast = this.createToast(message, type, title);
        this.container.appendChild(toast);
        this.toasts.add(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    createToast(message, type, title) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ'
        };

        const titles = {
            success: title || 'Success',
            error: title || 'Error',
            info: title || 'Info'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">✕</button>
        `;

        // Add close event
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(toast);
        });

        return toast;
    }

    remove(toast) {
        if (!this.toasts.has(toast)) return;

        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(toast);
        }, 300);
    }

    success(message, title) {
        return this.show(message, 'success', title);
    }

    error(message, title) {
        return this.show(message, 'error', title);
    }

    info(message, title) {
        return this.show(message, 'info', title);
    }
}

// Initialize toast manager
const toast = new ToastManager();

// Contract instances
let provider, signer, fundMeContract, nftContract, userAddress;

// Check if wallet was previously connected
async function checkWalletConnection() {
    try {
        if (typeof window.ethereum === 'undefined') {
            console.log('MetaMask not installed');
            return false;
        }

        // Check if user manually disconnected
        const wasDisconnected = localStorage.getItem('walletDisconnected');
        if (wasDisconnected === 'true') {
            console.log('User previously disconnected, not auto-connecting');
            return false;
        }

        // Check if we have permission to access accounts
        const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
            console.log('Wallet was previously connected, reconnecting...');
            // Automatically reconnect
            return await connectWallet(true); // true = silent connection
        }
        
        return false;
    } catch (error) {
        console.error('Error checking wallet connection:', error);
        return false;
    }
}

// Connect wallet
async function connectWallet(silent = false) {
    try {
        if (typeof window.ethereum === 'undefined') {
            if (!silent) {
                toast.error('MetaMask is required to use this application. Please install MetaMask and try again.', 'Wallet Not Found');
            }
            return false;
        }

        // Request account access if not silent
        if (!silent) {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
        }
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Update connect button
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
        
        // Enable fund button and update text
        const fundBtn = document.getElementById('fundBtn');
        fundBtn.textContent = 'Fund Project';
        fundBtn.disabled = false;
        
        if (!silent) {
            toast.success('Wallet connected successfully! You can now fund the project.', 'Connected');
        }
        
        // Clear disconnect flag when successfully connected
        localStorage.removeItem('walletDisconnected');
        
        // Load data
        await loadUserData();
        await loadContractData();
        
        // Listen to events
        listenToEvents();
        
        return true;
    } catch (error) {
        console.error('Error connecting wallet:', error);
        if (!silent) {
            if (error.code === 4001) {
                toast.error('Connection was rejected by user.', 'Connection Rejected');
            } else {
                toast.error('Failed to connect wallet. Please try again or check your wallet settings.', 'Connection Failed');
            }
        }
        return false;
    }
}

// Disconnect wallet
async function disconnectWallet() {
    // Set disconnect flag to prevent auto-reconnection
    localStorage.setItem('walletDisconnected', 'true');
    
    userAddress = null;
    provider = null;
    signer = null;
    fundMeContract = null;
    nftContract = null;
    
    // Reset connect button
    document.getElementById('connectBtn').textContent = 'Connect';
    document.getElementById('connectBtn').classList.remove('connected');
    
    // Hide disconnect button
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.style.display = 'none';
    }
    
    // Reset fund button
    const fundBtn = document.getElementById('fundBtn');
    fundBtn.textContent = 'Connect Wallet to Fund';
    fundBtn.disabled = false;  // Keep it enabled so users can click to connect
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
    
    toast.info('Wallet disconnected successfully.', 'Disconnected');
}

// Load user data
async function loadUserData() {
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
        toast.error('Failed to load your contribution data. Please refresh the page.', 'Data Load Error');
    }
}

// Load contract data (works with or without wallet connection)
async function loadContractData() {
    try {
        // Use a public provider if no wallet is connected
        let currentProvider = provider;
        if (!currentProvider) {
            // Try to create a public provider - adjust RPC URL based on your network
            try {
                // For Ethereum mainnet - replace with your network's RPC
                currentProvider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/bddd97b7f8ea4428bc578c31798385da');
                
                await currentProvider.getNetwork();
            } catch (e) {
                console.log('Could not connect to public RPC, using fallback values');
                setFallbackValues();
                return;
            }
        }
        
        // Create read-only contract instances if they don't exist
        let readOnlyFundMeContract = fundMeContract;
        let readOnlyNftContract = nftContract;
        
        if (!readOnlyFundMeContract) {
            readOnlyFundMeContract = new ethers.Contract(CONTRACT_ADDRESSES.FUNDME, FUNDME_ABI, currentProvider);
        }
        
        if (!readOnlyNftContract) {
            readOnlyNftContract = new ethers.Contract(CONTRACT_ADDRESSES.NFT, NFT_ABI, currentProvider);
        }
        
        // Get PICA balance
        try {
            const picaBalance = await readOnlyFundMeContract.getPicaTokenBalance();
            document.getElementById('picaAvailable').textContent = 
                ethers.utils.formatEther(picaBalance).slice(0, 8);
        } catch (e) {
            console.log('Could not load PICA balance:', e.message);
            document.getElementById('picaAvailable').textContent = '0';
        }
        
        // Get total raised
        try {
            const contractBalance = await currentProvider.getBalance(CONTRACT_ADDRESSES.FUNDME);
            const ethAmount = ethers.utils.formatEther(contractBalance).slice(0, 6);
            document.getElementById('totalRaised').textContent = ethAmount + ' ETH';
            document.getElementById('totalRaisedCard').textContent = ethAmount + ' ETH';
        } catch (e) {
            console.log('Could not load total raised:', e.message);
            document.getElementById('totalRaised').textContent = '0 ETH';
            document.getElementById('totalRaisedCard').textContent = '0 ETH';
        }
        
        // Get NFT count
        try {
            const nftCount = await readOnlyNftContract.getTotalSupply();
            document.getElementById('nftsMinted').textContent = nftCount.toString();
        } catch (e) {
            console.log('Could not load NFT count:', e.message);
            document.getElementById('nftsMinted').textContent = '0';
        }
        
        // Load funders list
        await loadFundersList(readOnlyFundMeContract);
        
    } catch (error) {
        console.error('Error loading contract data:', error);
        setFallbackValues();
    }
}

// Set fallback values when data can't be loaded
function setFallbackValues() {
    document.getElementById('picaAvailable').textContent = '0';
    document.getElementById('totalRaised').textContent = '0 ETH';
    document.getElementById('totalRaisedCard').textContent = '0 ETH';
    document.getElementById('nftsMinted').textContent = '0';
    document.getElementById('totalFunders').textContent = '0';
    document.getElementById('fundersList').innerHTML = '<p style="text-align: center; color: #8b8b9a;">Unable to load contributors without wallet connection</p>';
}

// Load funders list
async function loadFundersList(contractToUse = null) {
    const currentContract = contractToUse || fundMeContract;
    
    if (!currentContract) {
        document.getElementById('fundersList').innerHTML = '<p style="text-align: center; color: #8b8b9a;">Unable to load contributors</p>';
        document.getElementById('totalFunders').textContent = '0';
        return;
    }
    
    try {
        const fundersList = document.getElementById('fundersList');
        fundersList.innerHTML = '<p style="text-align: center; color: #8b8b9a;">Loading contributors...</p>';
        
        // Get funding events
        const filter = currentContract.filters.Funded();
        const events = await currentContract.queryFilter(filter, -10000);
        
        if (events.length === 0) {
            fundersList.innerHTML = '<p style="text-align: center; color: #8b8b9a;">No contributors yet. Be the first!</p>';
            document.getElementById('totalFunders').textContent = '0';
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
        
        // Clear loading message
        fundersList.innerHTML = '';
        
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
        document.getElementById('totalFunders').textContent = '0';
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
        
        const picaRewardNum = picaReward.toNumber();
        const usdValue = picaRewardNum / 2;
        
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
        toast.error('Please connect your wallet first to fund the project.', 'Wallet Required');
        return;
    }
    
    const ethAmount = document.getElementById('ethAmount').value;
    
    if (!ethAmount || ethAmount <= 0) {
        toast.error('Please enter a valid ETH amount to contribute.', 'Invalid Amount');
        return;
    }
    
    try {
        document.getElementById('fundBtn').disabled = true;
        document.getElementById('fundBtn').innerHTML = '<span class="loading"></span> Processing...';
        
        const tx = await fundMeContract.fund({
            value: ethers.utils.parseEther(ethAmount)
        });
        
        document.getElementById('fundBtn').innerHTML = '<span class="loading"></span> Confirming...';
        toast.info('Transaction submitted! Waiting for confirmation...', 'Processing');
        
        await tx.wait();
        
        toast.success('Funding successful! You will receive your PICA tokens shortly.', 'Success');
        document.getElementById('ethAmount').value = '';
        document.getElementById('rewardsPreview').style.display = 'none';
        
        // Reload data
        await loadUserData();
        await loadContractData();
    } catch (error) {
        console.error('Error funding:', error);
        if (error.code === 4001) {
            toast.error('Transaction was cancelled by user.', 'Cancelled');
        } else if (error.message?.includes('insufficient funds')) {
            toast.error('Insufficient ETH balance to complete this transaction.', 'Insufficient Funds');
        } else {
            toast.error('Transaction failed. Please check your wallet and try again.', 'Transaction Failed');
        }
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
            toast.success(`You received ${ethers.utils.formatEther(picaTokensAwarded).slice(0, 8)} PICA tokens!`, 'Tokens Received');
            await loadUserData();
        }
        await loadContractData();
    });
    
    fundMeContract.on('NftMinted', async (recipient) => {
        if (recipient.toLowerCase() === userAddress.toLowerCase()) {
            toast.success('Congratulations! You just received your BRABO NFT! 🎉', 'NFT Received');
            await loadUserData();
        }
    });
    
    fundMeContract.on('TierUpgraded', async (user, totalFundingUsd) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
            const fundingInDollars = totalFundingUsd.toNumber() / 1e18;
            let newTier = 'Bronze';
            if (fundingInDollars >= 1000) newTier = 'Gold';
            else if (fundingInDollars >= 100) newTier = 'Silver';
            
            toast.success(`Your NFT has been upgraded to ${newTier} tier! 🎊`, 'Tier Upgraded');
            await loadUserData();
        }
    });
}

// Event listeners
document.getElementById('connectBtn').addEventListener('click', async () => {
    if (!userAddress) {
        // Clear disconnect flag when user manually connects
        localStorage.removeItem('walletDisconnected');
        await connectWallet();
    }
});

const disconnectBtn = document.getElementById('disconnectBtn');
if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
        await disconnectWallet();
    });
}

document.getElementById('fundBtn').addEventListener('click', async () => {
    // If wallet is not connected, connect first
    if (!userAddress) {
        // Clear disconnect flag when user manually connects
        localStorage.removeItem('walletDisconnected');
        await connectWallet();
    } else {
        // If wallet is connected, proceed with funding
        await fundProject();
    }
});

document.getElementById('ethAmount').addEventListener('input', () => {
    if (userAddress && fundMeContract) {
        calculateRewards();
    }
});

// Check wallet connection on page load
window.addEventListener('load', async () => {
    console.log('Page loaded, initializing...');
    console.log('Contract addresses:', CONTRACT_ADDRESSES);
    
    // Check if wallet was previously connected
    const wasConnected = await checkWalletConnection();
    
    // Always try to load basic contract data regardless of wallet connection
    try {
        await loadContractData();
        console.log('Contract data loaded successfully');
    } catch (error) {
        console.error('Failed to load contract data on page load:', error);
    }
    
    if (wasConnected) {
        console.log('Wallet automatically reconnected');
    } else {
        console.log('No previous wallet connection found');
    }
});

// Handle account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
            console.log('All accounts disconnected');
            // Don't set disconnect flag for external disconnections
            await disconnectWallet();
        } else if (userAddress && accounts[0].toLowerCase() !== userAddress.toLowerCase()) {
            console.log('Account changed, reconnecting...');
            // Clear disconnect flag when account changes (user is still actively using wallet)
            localStorage.removeItem('walletDisconnected');
            await connectWallet();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        toast.info('Network changed. Refreshing page...', 'Network Change');
        setTimeout(() => window.location.reload(), 2000);
    });
}