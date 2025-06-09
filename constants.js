// Contract Addresses - Replace these with your deployed contract addresses
export const CONTRACT_ADDRESSES = {
    FUNDME: "0x...", // Replace with your FundMe contract address
    NFT: "0x...", // Replace with your NftBrabo contract address
    PICA_TOKEN: "0x...", // Replace with your PICA token contract address
};

// Contract ABIs - Complete ABIs from your contracts
export const FUNDME_ABI = [
    // Events
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "funder", "type": "address"},
            {"indexed": false, "name": "ethAmount", "type": "uint256"},
            {"indexed": false, "name": "picaTokensAwarded", "type": "uint256"}
        ],
        "name": "Funded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "recipient", "type": "address"}
        ],
        "name": "NftMinted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "user", "type": "address"},
            {"indexed": false, "name": "totalFundingUsd", "type": "uint256"}
        ],
        "name": "TierUpgraded",
        "type": "event"
    },
    
    // Functions
    {
        "inputs": [],
        "name": "fund",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_sAdrees", "type": "address"}],
        "name": "getHowMuchDudeFunded",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "_address", "type": "address"}],
        "name": "getHowMuchDudeFundedInUsdActual",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "_sAdrees", "type": "address"}],
        "name": "getHowMuchDudeFundedInUsd",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "_idx", "type": "uint256"}],
        "name": "getFunders",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getPicaTokenBalance",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "ethAmount", "type": "uint256"}],
        "name": "calculatePicaTokenReward",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "MINIMUM_USD",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "PICA_MULTIPLIER",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

export const NFT_ABI = [
    {
        "inputs": [{"name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "owner", "type": "address"}],
        "name": "getTokenIdByOwner",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "tokenURI",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTotalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

export const PICA_TOKEN_ABI = [
    // Standard ERC20 functions you might need
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    }
];


// NFT Tier Thresholds (in USD)
export const NFT_TIERS = {
    BRONZE: {
        name: "Bronze",
        threshold: 10,
        icon: "🥉",
        color: "#cd7f32"
    },
    SILVER: {
        name: "Silver",
        threshold: 100,
        icon: "🥈",
        color: "#c0c0c0"
    },
    GOLD: {
        name: "Gold",
        threshold: 1000,
        icon: "🥇",
        color: "#ffd700"
    }
};

