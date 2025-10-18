// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

const EventDepositModule = buildModule("EventDepositModule", (m) => {
    // Get parameters with defaults
    // Admin address defaults to the deployer
    const admin = m.getParameter("admin", m.getAccount(0))

    // Default deadline: 7 days from now (in seconds)
    const defaultDeadline = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    const redemptionDeadline = m.getParameter("redemptionDeadline", defaultDeadline)

    const eventDeposit = m.contract("EventDeposit", [admin, redemptionDeadline])

    return { eventDeposit }
})

export default EventDepositModule
