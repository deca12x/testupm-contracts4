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
        polkadotTestnet: {
            url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
            chainId: 420420422,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
}

export default config
