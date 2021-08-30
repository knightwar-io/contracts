
require("hardhat-watcher");
require("hardhat-deploy-ethers");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

// const { ethers } = require("ethers"); // do not include ethers
const { task } = require("hardhat/config");

require('dotenv').config();

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  // defaultNetwork: "",

  networks: {
    // hardhat: {
    //   chainId: 1337
    // },
    // rinkeby: {
    //   url: 'https://rinkeby.infura.io/v3/0720d1c4ec394f4090d9be740db47db0',
    //   accounts: [process.env.OPERATOR_PRIVATE_KEY],
    //   chainId: 4,
    // },
    bsctest: {
      url: 'https://data-seed-prebsc-1-s3.binance.org:8545',
      accounts: [process.env.OPERATOR_PRIVATE_KEY],
      chainId: 97,
    },
    localhost: {
      url: "http://127.0.0.1:7545"
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.8.4"
      }
    ],
    overrides: {
    }
  },

  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://bscscan.com/
    apiKey: process.env.ETHER_SCAN_KEY
  },

  watcher: {
    ci: {
      files: ["./contracts", "./test"],
      tasks: ["clean", {
        command: "compile",
        params: { quiet: true }
      },
        { command: "test", params: {  noCompile: true, testFiles: ["test/Sale.spec.js"] } }],
    }
  },
};

