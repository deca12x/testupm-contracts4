import { expect } from "chai";
import { ethers } from "hardhat";
import { EventDeposit } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("EventDeposit", function () {
  let eventDeposit: EventDeposit;
  let admin: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let redemptionDeadline: number;

  beforeEach(async function () {
    // Get signers
    [admin, user1, user2] = await ethers.getSigners();

    // Set redemption deadline to 7 days from now
    const latestBlock = await ethers.provider.getBlock("latest");
    redemptionDeadline = latestBlock!.timestamp + (7 * 24 * 60 * 60);

    // Deploy contract
    const EventDepositFactory = await ethers.getContractFactory("EventDeposit");
    eventDeposit = await EventDepositFactory.deploy(admin.address, redemptionDeadline);
    await eventDeposit.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right admin", async function () {
      expect(await eventDeposit.admin()).to.equal(admin.address);
    });

    it("Should set the correct deposit amount", async function () {
      expect(await eventDeposit.DEPOSIT_AMOUNT()).to.equal(ethers.parseEther("1"));
    });

    it("Should set the correct redemption deadline", async function () {
      expect(await eventDeposit.REDEMPTION_DEADLINE()).to.equal(redemptionDeadline);
    });
  });

  describe("Deposits", function () {
    it("Should allow user to deposit exactly 1 DOT", async function () {
      await expect(
        eventDeposit.connect(user1).deposit({ value: ethers.parseEther("1") })
      ).to.emit(eventDeposit, "DepositMade")
        .withArgs(user1.address, ethers.parseEther("1"), await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    });

    it("Should fail if user deposits wrong amount", async function () {
      await expect(
        eventDeposit.connect(user1).deposit({ value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Must send exactly 1 DOT");
    });

    it("Should fail if user deposits twice", async function () {
      await eventDeposit.connect(user1).deposit({ value: ethers.parseEther("1") });

      await expect(
        eventDeposit.connect(user1).deposit({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("User has already deposited");
    });

    it("Should track depositor correctly", async function () {
      await eventDeposit.connect(user1).deposit({ value: ethers.parseEther("1") });
      expect(await eventDeposit.hasDeposited(user1.address)).to.be.true;
      expect(await eventDeposit.hasDeposited(user2.address)).to.be.false;
    });

    it("Should track multiple depositors", async function () {
      await eventDeposit.connect(user1).deposit({ value: ethers.parseEther("1") });
      await eventDeposit.connect(user2).deposit({ value: ethers.parseEther("1") });

      expect(await eventDeposit.hasDeposited(user1.address)).to.be.true;
      expect(await eventDeposit.hasDeposited(user2.address)).to.be.true;
      expect(await eventDeposit.depositors(0)).to.equal(user1.address);
      expect(await eventDeposit.depositors(1)).to.equal(user2.address);
    });
  });

  describe("Redemption (before deadline)", function () {
    beforeEach(async function () {
      // User1 deposits
      await eventDeposit.connect(user1).deposit({ value: ethers.parseEther("1") });
    });

    it("Should allow user to redeem their deposit before deadline", async function () {
      const initialBalance = await ethers.provider.getBalance(user1.address);

      const tx = await eventDeposit.connect(user1).redeem();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);

      // User should get their deposit back minus gas
      expect(finalBalance).to.equal(initialBalance + ethers.parseEther("1") - gasUsed);
    });

    it("Should emit DepositRedeemed event", async function () {
      await expect(eventDeposit.connect(user1).redeem())
        .to.emit(eventDeposit, "DepositRedeemed")
        .withArgs(user1.address, ethers.parseEther("1"), await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    });

    it("Should remove user from depositors list after redemption", async function () {
      await eventDeposit.connect(user1).redeem();
      expect(await eventDeposit.hasDeposited(user1.address)).to.be.false;
    });

    it("Should fail if user hasn't deposited", async function () {
      await expect(
        eventDeposit.connect(user2).redeem()
      ).to.be.revertedWith("No deposit found for this address");
    });
  });

  describe("Redemption (after deadline)", function () {
    beforeEach(async function () {
      // Multiple users deposit
      await eventDeposit.connect(user1).deposit({ value: ethers.parseEther("1") });
      await eventDeposit.connect(user2).deposit({ value: ethers.parseEther("1") });

      // Fast forward time past redemption deadline
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
      await ethers.provider.send("evm_mine", []);
    });

    it("Should allow anyone to trigger admin withdrawal after deadline", async function () {
      const adminInitialBalance = await ethers.provider.getBalance(admin.address);
      const contractBalance = await ethers.provider.getBalance(await eventDeposit.getAddress());

      // User2 triggers the withdrawal (not admin)
      await eventDeposit.connect(user2).redeem();

      const adminFinalBalance = await ethers.provider.getBalance(admin.address);

      // Admin should receive all contract funds
      expect(adminFinalBalance).to.equal(adminInitialBalance + contractBalance);
    });

    it("Should emit AdminWithdrawal event", async function () {
      const contractBalance = await ethers.provider.getBalance(await eventDeposit.getAddress());

      await expect(eventDeposit.connect(user1).redeem())
        .to.emit(eventDeposit, "AdminWithdrawal")
        .withArgs(admin.address, contractBalance, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    });

    it("Should clear all depositors after admin withdrawal", async function () {
      await eventDeposit.connect(user1).redeem();

      expect(await eventDeposit.hasDeposited(user1.address)).to.be.false;
      expect(await eventDeposit.hasDeposited(user2.address)).to.be.false;
    });

    it("Should fail if contract has no balance", async function () {
      // First redemption empties the contract
      await eventDeposit.connect(user1).redeem();

      // Second attempt should fail
      await expect(
        eventDeposit.connect(user2).redeem()
      ).to.be.revertedWith("No funds to withdraw");
    });
  });
});
