import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0xd2BF62cCA0b8330c50ee87342C4aAcc3664E4D43";

async function main() {
  console.log("Testing EventDeposit contract at:", CONTRACT_ADDRESS);
  console.log("=".repeat(60));

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("\nAccounts:");
  console.log("- Deployer:", deployer.address);

  // Get contract instance
  const EventDeposit = await ethers.getContractFactory("EventDeposit");
  const eventDeposit = EventDeposit.attach(CONTRACT_ADDRESS);

  // Read contract details
  console.log("\n" + "=".repeat(60));
  console.log("Contract Details:");
  console.log("=".repeat(60));

  const admin = await eventDeposit.admin();
  const depositAmount = await eventDeposit.DEPOSIT_AMOUNT();
  const deadline = await eventDeposit.REDEMPTION_DEADLINE();
  const deadlineDate = new Date(Number(deadline) * 1000);

  console.log("- Admin:", admin);
  console.log("- Deposit Amount:", ethers.formatEther(depositAmount), "PAS");
  console.log("- Redemption Deadline:", deadline.toString());
  console.log("- Deadline Date:", deadlineDate.toISOString());

  // Check if deployer has deposited
  console.log("\n" + "=".repeat(60));
  console.log("Checking Deposits:");
  console.log("=".repeat(60));

  const deployerDeposited = await eventDeposit.hasDeposited(deployer.address);
  console.log("- Deployer has deposited:", deployerDeposited);

  // Get deployer balance
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log("- Deployer balance:", ethers.formatEther(deployerBalance), "PAS");

  // Test deposit function
  console.log("\n" + "=".repeat(60));
  console.log("Testing Deposit Function:");
  console.log("=".repeat(60));

  if (!deployerDeposited) {
    console.log("Making a deposit of 1 PAS...");
    try {
      const tx = await eventDeposit.deposit({
        value: ethers.parseEther("1"),
        gasLimit: 300000
      });
      console.log("Transaction hash:", tx.hash);
      console.log("Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log("✅ Deposit successful! Gas used:", receipt?.gasUsed.toString());

      // Check if deposit was recorded
      const hasDeposited = await eventDeposit.hasDeposited(deployer.address);
      console.log("- Has deposited now:", hasDeposited);

      // Get updated balance
      const newBalance = await ethers.provider.getBalance(deployer.address);
      console.log("- New balance:", ethers.formatEther(newBalance), "PAS");
      console.log("- Cost (deposit + gas):", ethers.formatEther(deployerBalance - newBalance), "PAS");
    } catch (error: any) {
      console.error("❌ Deposit failed:", error.message);
    }
  } else {
    console.log("Deployer already deposited. Testing redeem instead...");

    // Test redeem function
    try {
      const tx = await eventDeposit.redeem({ gasLimit: 300000 });
      console.log("Transaction hash:", tx.hash);
      console.log("Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log("✅ Redeem successful! Gas used:", receipt?.gasUsed.toString());

      // Check if deposit was removed
      const hasDeposited = await eventDeposit.hasDeposited(deployer.address);
      console.log("- Has deposited now:", hasDeposited);

      // Get updated balance
      const newBalance = await ethers.provider.getBalance(deployer.address);
      console.log("- New balance:", ethers.formatEther(newBalance), "PAS");
    } catch (error: any) {
      console.error("❌ Redeem failed:", error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Contract testing complete!");
  console.log("=".repeat(60));
  console.log("\nView on BlockScout:");
  console.log(`https://blockscout-passet-hub.parity-testnet.parity.io/address/${CONTRACT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
