require("hardhat-watcher");
require("hardhat-deploy-ethers");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');


// const { ethers } = require("ethers"); // do not include ethers
const { task } = require("hardhat/config");

require('dotenv').config();

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


const getLock = async (hre) => {
  const Lock = await hre.ethers.getContractFactory('InternalTokenLock');
  const lock = await Lock.attach('0x73444062Ee72674bd75aA77A3F8DD6c88eD26E93');
  return lock;
}

task('unlockBounty')
  .setAction(async (taskArgs, hre) => {
    const lock = await getLock(hre);
    await lock.unlockFreeBounty('0x66c2b727B5880E828c6a4e618A6E261ed64b66c0'); // free bounty receiver
    console.log('unlocked bounty');
  });

task('preunlockMarketing')
  .setAction(async (taskArgs, hre) => {
    const lock = await getLock(hre);

    await lock.preunlockMarketing('0x9ABDd72efbAE328c40CF0620C4f4429506338Ee4'); // free bounty receiver
    console.log('unlocked marketing');
  });

task('preunlockLiquidity')
  .setAction(async (taskArgs, hre) => {
    const lock = await getLock(hre);
    await lock.preunlockLiquidity('0x4F53E6313Baf59Ad7D61fF96d3B4621B0D0be6fD'); // free bounty receiver
    console.log('unlocked liquidity');
  });



/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  // defaultNetwork: "",

  networks: {
    hardhat: {
      chainId: 1337
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: [process.env.OPERATOR_PRIVATE_KEY],
      chainId: 56,
    },
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
      saveDeployments: true,
      url: "http://127.0.0.1:8545",
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
      initialBaseFeePerGas: 0, // to fix : https://github.com/sc-forks/solidity-coverage/issues/652, see https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
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
        { command: "test", params: { noCompile: true } }],
    },
    compile: {
      files: ["./contracts"],
      tasks: ["clean", {
        command: "compile"
      }
      ]
    },
  }
};

