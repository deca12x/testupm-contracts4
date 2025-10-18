import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0xd2BF62cCA0b8330c50ee87342C4aAcc3664E4D43";

async function main() {
  console.log("Checking EventDeposit contract at:", CONTRACT_ADDRESS);
  console.log("=".repeat(60));

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);

  // Get contract instance
  const EventDeposit = await ethers.getContractFactory("EventDeposit");
  const eventDeposit = EventDeposit.attach(CONTRACT_ADDRESS);

  // Read contract details
  console.log("\n" + "=".repeat(60));
  console.log("Contract Information:");
  console.log("=".repeat(60));

  try {
    const admin = await eventDeposit.admin();
    console.log("✅ Admin:", admin);

    const depositAmount = await eventDeposit.DEPOSIT_AMOUNT();
    console.log("✅ Deposit Amount:", ethers.formatEther(depositAmount), "PAS");

    const deadline = await eventDeposit.REDEMPTION_DEADLINE();
    const deadlineDate = new Date(Number(deadline) * 1000);
    console.log("✅ Redemption Deadline:", deadline.toString());
    console.log("   Date:", deadlineDate.toISOString());

    const hasDeposited = await eventDeposit.hasDeposited(deployer.address);
    console.log("✅ Deployer has deposited:", hasDeposited);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("✅ Deployer balance:", ethers.formatEther(balance), "PAS");

    console.log("\n" + "=".repeat(60));
    console.log("Contract is working correctly!");
    console.log("=".repeat(60));

    console.log("\nBlockScout Explorer:");
    console.log(`https://blockscout-passet-hub.parity-testnet.parity.io/address/${CONTRACT_ADDRESS}`);

    console.log("\nContract ABI location:");
    console.log("artifacts-pvm/contracts/EventDeposit.sol/EventDeposit.json");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
