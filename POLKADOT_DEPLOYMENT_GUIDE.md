# Polkadot Hub TestNet Deployment Guide

## Overview

This project uses the `@parity/hardhat-polkadot` plugin which allows you to deploy EVM-compatible smart contracts to Polkadot Hub testnets using the Revive compiler.

## Understanding Private Keys and Accounts

### How the Polkadot Hardhat Plugin Works

The `@parity/hardhat-polkadot` plugin has **two modes** for managing accounts:

#### 1. **Forking Mode** (Current Configuration)

When configured with `forking`, the plugin connects to a remote Polkadot Hub testnet:

```typescript
networks: {
    hardhat: {
        polkavm: true,
        forking: {
            url: "https://testnet-passet-hub.polkadot.io",
        },
        adapterConfig: {
            adapterBinaryPath: "./bin/eth-rpc",
            dev: true,
        },
    },
}
```

**In this mode:**
- The plugin automatically generates test accounts for you (similar to regular Hardhat)
- You **DO NOT need** a private key in `.env` for local testing
- When you call `ethers.getSigners()`, it returns pre-funded test accounts
- The `eth-rpc` binary acts as an adapter between Ethereum RPC calls and Polkadot

#### 2. **Local Node Mode** (Alternative)

When configured with `nodeConfig`, the plugin starts a local Polkadot node:

```typescript
networks: {
    hardhat: {
        polkavm: true,
        nodeConfig: {
            nodeBinaryPath: './bin/revive-dev-node',
            rpcPort: 8000,
            dev: true,
        },
        adapterConfig: {
            adapterBinaryPath: './bin/eth-rpc',
            dev: true,
        },
    },
}
```

**In this mode:**
- A local Polkadot development node is started automatically
- Test accounts are automatically generated and funded
- You **DO NOT need** a private key in `.env`

### When DO You Need a Private Key?

You **ONLY** need to provide a private key when:

1. **Deploying to the actual Polkadot Hub TestNet** (not forking)
2. **Using a custom network configuration** that connects to a live network

For that, you would add a custom network to your `hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "@parity/hardhat-polkadot"
import * as dotenv from "dotenv"

dotenv.config()

const config: HardhatUserConfig = {
    solidity: "0.8.28",
    resolc: {
        compilerSource: "npm",
    },
    networks: {
        hardhat: {
            // ... existing config
        },
        polkadotTestnet: {
            url: "https://testnet-passet-hub.polkadot.io",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        }
    },
}

export default config
```

Then create a `.env` file:

```bash
PRIVATE_KEY=your_private_key_here
```

## Current Project Status

### What's Working

1. ✅ **EventDeposit.sol contract** - Copied and ready
2. ✅ **Hardhat configuration** - Set up with Polkadot plugin
3. ✅ **Compilation** - Contract compiles successfully with `resolc`
4. ✅ **Deployment script** - Ready at `scripts/deploy-eventdeposit.ts`
5. ✅ **Ignition module** - Ready at `ignition/modules/EventDeposit.ts`

### Current Configuration

The project is currently configured in **forking mode**, which:
- Connects to `https://testnet-passet-hub.polkadot.io`
- Automatically provides test accounts
- **Does NOT require** a private key in `.env`

## How to Deploy

### Option 1: Using Hardhat Script (Forking Mode)

```bash
# Switch to Node 24
nvm use 24

# Compile the contract
npx hardhat compile

# Deploy using the script
npx hardhat run scripts/deploy-eventdeposit.ts --network hardhat
```

### Option 2: Using Hardhat Ignition (Forking Mode)

```bash
# Deploy with default parameters (deadline = 7 days from now)
npx hardhat ignition deploy ignition/modules/EventDeposit.ts --network hardhat

# Or with custom parameters
npx hardhat ignition deploy ignition/modules/EventDeposit.ts --network hardhat \
  --parameters '{"admin":"0xYourAdminAddress","redemptionDeadline":1234567890}'
```

### Option 3: Deploy to Live Polkadot Hub TestNet (Requires Private Key)

1. Get testnet tokens from a faucet
2. Create `.env` file with your private key
3. Update `hardhat.config.ts` to add a custom network (see example above)
4. Deploy:

```bash
npx hardhat run scripts/deploy-eventdeposit.ts --network polkadotTestnet
```

## Contract Interaction Examples

### Using ethers.js in Your Next.js App

```typescript
import { ethers } from "ethers";

// EventDeposit contract ABI (copy from artifacts after compilation)
const EVENT_DEPOSIT_ABI = [ /* ... ABI ... */ ];
const CONTRACT_ADDRESS = "0x..."; // Your deployed contract address

// Connect to Polkadot Hub TestNet
const provider = new ethers.JsonRpcProvider("https://testnet-passet-hub.polkadot.io");

// For read-only operations
const contract = new ethers.Contract(CONTRACT_ADDRESS, EVENT_DEPOSIT_ABI, provider);

// Check if user has deposited
async function hasUserDeposited(userAddress: string): Promise<boolean> {
  return await contract.hasDeposited(userAddress);
}

// For transactions (requires signer with Civic Auth EOA)
async function depositToEvent(signer: ethers.Signer) {
  const contractWithSigner = contract.connect(signer);
  const tx = await contractWithSigner.deposit({
    value: ethers.parseEther("1") // 1 DOT
  });
  const receipt = await tx.wait();
  return receipt;
}

// Redeem deposit
async function redeemDeposit(signer: ethers.Signer) {
  const contractWithSigner = contract.connect(signer);
  const tx = await contractWithSigner.redeem();
  const receipt = await tx.wait();
  return receipt;
}
```

### Integration with Civic Auth

Since your Next.js app uses Civic Auth with EOA addresses:

1. After Civic authentication, you'll have the user's EOA address
2. Create a signer from the user's wallet (MetaMask, Civic Wallet, etc.)
3. Use that signer to interact with the contract

```typescript
// In your Next.js app
import { BrowserProvider } from "ethers";

// Get signer from user's wallet after Civic Auth
async function getUserSigner() {
  // This assumes user has connected their wallet
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return signer;
}

// Use in your form submission
async function handleFormSubmit() {
  try {
    const signer = await getUserSigner();
    const receipt = await depositToEvent(signer);
    console.log("Deposit successful:", receipt.hash);
    // Show confirmation page (Page 1c)
  } catch (error) {
    console.error("Deposit failed:", error);
    // Show error to user
  }
}
```

## Checking Depositors List

The contract has a public `depositors` array and a `hasDeposited` function:

```typescript
// Check if specific user deposited
const hasDeposited = await contract.hasDeposited(userEOAAddress);

// Get depositor at index (for admin purposes)
const depositorAddress = await contract.depositors(0); // First depositor
```

## Important Notes

1. **Compilation**: Use `npx hardhat compile` to compile with `resolc` (Revive Solidity compiler)
2. **Testing**: The forking mode allows you to test without testnet tokens
3. **Gas Costs**: Polkadot Hub uses a different gas model than Ethereum
4. **Deposit Amount**: The contract uses `1 ether` which equals 1 DOT in Polkadot

## Troubleshooting

### Issue: "Wrong hardhat network configuration"
- Make sure you're using the correct network configuration format
- Check that `polkavm: true` is set in the network config

### Issue: Compilation fails
- Ensure you're using Node 24: `nvm use 24`
- Make sure `@parity/hardhat-polkadot` is installed: `npm install --save-dev @parity/hardhat-polkadot`

### Issue: Deployment hangs
- Forking mode may take time to connect to the remote network
- Try using local node mode instead, or deploy directly to testnet

## Next Steps

1. Test the deployment script in forking mode
2. Get testnet tokens for live deployment
3. Deploy to Polkadot Hub TestNet
4. Integrate contract address and ABI into your Next.js app
5. Test the full user flow: Auth → Deposit → Redeem
