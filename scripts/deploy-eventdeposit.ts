import { ethers } from "hardhat";

async function main() {
  console.log("Deploying EventDeposit contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Set admin to deployer address
  const admin = deployer.address;

  // Set redemption deadline to 7 days from now (in seconds)
  const currentBlock = await ethers.provider.getBlock("latest");
  const redemptionDeadline = currentBlock!.timestamp + (7 * 24 * 60 * 60);
  const deadlineDate = new Date(redemptionDeadline * 1000);

  console.log("Admin address:", admin);
  console.log("Redemption deadline:", redemptionDeadline, "(", deadlineDate.toISOString(), ")");

  // Deploy the contract
  const EventDeposit = await ethers.getContractFactory("EventDeposit");
  const eventDeposit = await EventDeposit.deploy(admin, redemptionDeadline);

  await eventDeposit.waitForDeployment();

  const contractAddress = await eventDeposit.getAddress();
  console.log("EventDeposit deployed to:", contractAddress);

  // Verify deployment
  console.log("\nContract details:");
  console.log("- Admin:", await eventDeposit.admin());
  console.log("- Deposit amount:", ethers.formatEther(await eventDeposit.DEPOSIT_AMOUNT()), "DOT");
  console.log("- Redemption deadline:", await eventDeposit.REDEMPTION_DEADLINE());

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
