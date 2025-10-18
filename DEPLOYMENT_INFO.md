# EventDeposit Contract Deployment Information

## ✅ Successfully Deployed to Polkadot Hub TestNet

### Contract Details

- **Contract Address:** `0xd2BF62cCA0b8330c50ee87342C4aAcc3664E4D43`
- **Network:** Polkadot Hub TestNet
- **Chain ID:** 420420422
- **RPC URL:** https://testnet-passet-hub-eth-rpc.polkadot.io
- **Block Explorer:** https://blockscout-passet-hub.parity-testnet.parity.io/address/0xd2BF62cCA0b8330c50ee87342C4aAcc3664E4D43

### Contract Configuration

- **Admin Address:** `0x1cA9D535cCB127cEFF445924e0c1Ea51F5Ba995D`
- **Deposit Amount:** 1.0 PAS
- **Redemption Deadline:** 1761408528 (2025-10-25T16:08:48.000Z)
- **Deadline:** 7 days from deployment

### Contract ABI

The contract ABI is located at:
```
artifacts-pvm/contracts/EventDeposit.sol/EventDeposit.json
```

## Integration with Your Next.js App

### 1. Install Dependencies

```bash
npm install ethers
```

### 2. Contract Integration Code

```typescript
import { ethers } from "ethers";

// Contract configuration
const CONTRACT_ADDRESS = "0xd2BF62cCA0b8330c50ee87342C4aAcc3664E4D43";
const RPC_URL = "https://testnet-passet-hub-eth-rpc.polkadot.io";

// Contract ABI (minimal - only functions you need)
const EVENT_DEPOSIT_ABI = [
  "function deposit() external payable",
  "function redeem() external",
  "function hasDeposited(address _user) external view returns (bool)",
  "function admin() external view returns (address)",
  "function DEPOSIT_AMOUNT() external view returns (uint256)",
  "function REDEMPTION_DEADLINE() external view returns (uint256)",
  "function depositors(uint256) external view returns (address)",
];

// For read-only operations (no wallet needed)
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, EVENT_DEPOSIT_ABI, provider);

// Check if user has deposited
export async function checkUserDeposited(userAddress: string): Promise<boolean> {
  return await contract.hasDeposited(userAddress);
}

// For write operations (requires user's wallet)
export async function getUserSigner() {
  if (typeof window.ethereum === "undefined") {
    throw new Error("Please install MetaMask or a compatible wallet");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return await provider.getSigner();
}

// Make a deposit (Page 1b - Form submission)
export async function makeDeposit() {
  try {
    const signer = await getUserSigner();
    const contractWithSigner = new ethers.Contract(
      CONTRACT_ADDRESS,
      EVENT_DEPOSIT_ABI,
      signer
    );

    const tx = await contractWithSigner.deposit({
      value: ethers.parseEther("1"), // 1 PAS
    });

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Deposit confirmed!", receipt);

    return {
      success: true,
      txHash: tx.hash,
      receipt,
    };
  } catch (error: any) {
    console.error("Deposit failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Redeem deposit (Page 2 - /redeem after tapping sticker)
export async function redeemDeposit() {
  try {
    const signer = await getUserSigner();
    const contractWithSigner = new ethers.Contract(
      CONTRACT_ADDRESS,
      EVENT_DEPOSIT_ABI,
      signer
    );

    const tx = await contractWithSigner.redeem();

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Redeem confirmed!", receipt);

    return {
      success: true,
      txHash: tx.hash,
      receipt,
    };
  } catch (error: any) {
    console.error("Redeem failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### 3. User Flow Implementation

#### Page 1a - Civic Login

```typescript
// After Civic authentication, you have the user's EOA address
const userEOAAddress = civicAuth.user.walletAddress;
```

#### Page 1b - Sign up form with deposit

```typescript
"use client";

import { useState } from "react";
import { makeDeposit, checkUserDeposited } from "@/lib/contract";

export default function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Make deposit
      const result = await makeDeposit();

      if (result.success) {
        // Show confirmation page (Page 1c)
        window.location.href = `/confirmation?tx=${result.txHash}`;
      } else {
        setError(result.error || "Deposit failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      <p>Deposit: 1 PAS (refundable at event)</p>
      <button type="submit" disabled={loading}>
        {loading ? "Processing..." : "Sign Up & Deposit"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

#### Page 2 - /redeem (after tapping NFC sticker)

```typescript
"use client";

import { useEffect, useState } from "react";
import { checkUserDeposited, redeemDeposit } from "@/lib/contract";
import { useCivicAuth } from "@/hooks/useCivicAuth"; // Your Civic Auth hook

export default function RedeemPage() {
  const { user, isAuthenticated } = useCivicAuth();
  const [hasDeposit, setHasDeposit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkDeposit() {
      if (!isAuthenticated || !user?.walletAddress) {
        setLoading(false);
        return;
      }

      try {
        const deposited = await checkUserDeposited(user.walletAddress);
        setHasDeposit(deposited);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    checkDeposit();
  }, [isAuthenticated, user]);

  async function handleRedeem() {
    setRedeeming(true);
    setError(null);

    try {
      const result = await redeemDeposit();

      if (result.success) {
        // Show success confirmation
        alert("Deposit redeemed successfully!");
        setHasDeposit(false);
      } else {
        setError(result.error || "Redeem failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRedeeming(false);
    }
  }

  if (!isAuthenticated) {
    return <div>Please authenticate with Civic first</div>;
  }

  if (loading) {
    return <div>Checking deposit...</div>;
  }

  if (!hasDeposit) {
    return <div>No deposit found for your address</div>;
  }

  return (
    <div>
      <h1>Welcome to the Event!</h1>
      <p>You have a deposit of 1 PAS ready to redeem</p>
      <button onClick={handleRedeem} disabled={redeeming}>
        {redeeming ? "Redeeming..." : "Redeem My Deposit"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## Testing the Contract

### Check Contract Status

```bash
npx hardhat run scripts/check-contract.ts --network polkadotTestnet
```

### Make a Test Deposit (from deployment account)

You can test deposits directly from your wallet via BlockScout:
1. Go to: https://blockscout-passet-hub.parity-testnet.parity.io/address/0xd2BF62cCA0b8330c50ee87342C4aAcc3664E4D43
2. Connect your wallet
3. Write Contract → deposit() → Send 1 PAS

## Important Notes

1. **Gas Costs:** Transactions on Polkadot Hub use PAS tokens for gas
2. **Deposit Amount:** Must be exactly 1 PAS (1000000000000000000 wei)
3. **Deadline:** Users can only redeem before Oct 25, 2025. After that, funds go to admin.
4. **One Deposit Per Address:** Each address can only deposit once
5. **Redemption:** Users can redeem anytime before the deadline to get their deposit back

## Network Configuration for MetaMask

Users will need to add Polkadot Hub TestNet to their wallet:

- **Network Name:** Polkadot Hub TestNet
- **RPC URL:** https://testnet-passet-hub-eth-rpc.polkadot.io
- **Chain ID:** 420420422
- **Currency Symbol:** PAS
- **Block Explorer:** https://blockscout-passet-hub.parity-testnet.parity.io/

## Get Testnet Tokens

Users can get free testnet PAS tokens from:
- https://faucet.polkadot.io/

## Contract Functions Reference

### Read Functions (no gas required)

- `hasDeposited(address _user) → bool` - Check if an address has deposited
- `admin() → address` - Get admin address
- `DEPOSIT_AMOUNT() → uint256` - Get required deposit amount (1 PAS)
- `REDEMPTION_DEADLINE() → uint256` - Get deadline timestamp
- `depositors(uint256 index) → address` - Get depositor at index (for admin)

### Write Functions (requires gas)

- `deposit()` - Make a deposit (must send exactly 1 PAS)
- `redeem()` - Redeem deposit (before deadline) or trigger admin withdrawal (after deadline)

## Support

For issues or questions, check:
- Contract on BlockScout: https://blockscout-passet-hub.parity-testnet.parity.io/address/0xd2BF62cCA0b8330c50ee87342C4aAcc3664E4D43
- Polkadot Documentation: https://docs.polkadot.com/
