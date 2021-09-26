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


// const getLock = async (hre) => {
//   const Lock = await hre.ethers.getContractFactory('InternalTokenLock');
//   // const lock = await Lock.attach('0x73444062Ee72674bd75aA77A3F8DD6c88eD26E93');
//   const lock = await Lock.attach('0x38035330c4d5feBB3c64232A4FC1f5f0eF59e5F0');
//   return lock;
// }

// task('unlockBounty')
//   .setAction(async (taskArgs, hre) => {
//     const lock = await getLock(hre);
//     await lock.unlockFreeBounty('0x66c2b727B5880E828c6a4e618A6E261ed64b66c0'); // free bounty receiver
//     console.log('unlocked bounty');
//   });

// task('preunlockMarketing')
//   .setAction(async (taskArgs, hre) => {
//     const lock = await getLock(hre);

//     await lock.preunlockMarketing('0x9ABDd72efbAE328c40CF0620C4f4429506338Ee4'); // free bounty receiver
//     console.log('unlocked marketing');
//   });

// task('preunlockLiquidity')
//   .setAction(async (taskArgs, hre) => {
//     const lock = await getLock(hre);
//     await lock.preunlockLiquidity('0x4F53E6313Baf59Ad7D61fF96d3B4621B0D0be6fD'); // free bounty receiver
//     console.log('unlocked liquidity');
//   });

// task('mintPublic')
//   .setAction(async (taskArgs, hre) => {
//     const KWS = await hre.ethers.getContractFactory('KWS');

//     // const kws = await KWS.attach('0x6805211479c51Df6815eDD3273c6AFcfB2A4dbc3'); // testnet
//     const kws = await KWS.attach('0x5D0E95C15cA50F13fB86938433269D03112409Fe');

//     await kws.mint('0xc89bf9F7C08BE22B23BC99e5c31aAf73fAc7251C', ethers.BigNumber.from(6_000_000).mul(ethers.BigNumber.from(10).pow(18)));

//     console.log('minted public sale');
//   });


// task('xyz')
// .setAction(async (taskArgs, hre) => {
//   // const Sale = await hre.ethers.getContractFactory('Sale');
//   // const sale = await Sale.attach('0xa357F2cb7C980BC61B1677b9F74fbef452f25497');

//   // console.log('--------------------------------');
//   // console.log('await sale.totalSupply();', (await sale.totalSupply()).toString());
//   // console.log('--------------------------------');

//   const Token = await hre.ethers.getContractFactory('KWS');
//   const token = await Token.attach('0x5D0E95C15cA50F13fB86938433269D03112409Fe');

//   console.log('--------------------------------');
//   console.log('minted', (await token.totalMinted()).toString());
//   console.log('--------------------------------');
// });


const inputReader = require('wait-console-input');
task('addAngel', async (_, hre) => {
  const DECIMALS = hre.ethers.BigNumber.from(10).pow(18);

  const Sale = await hre.ethers.getContractFactory('Sale');
  const sale = await Sale.attach('0x4E8d0165434BeCA6AAC985B5Eba6b9CA3a703734');

  const items = [
    ['0x8956A2EdF1D707f6C1E7D263537cB18B0196FAdE', 10000],
    ['0x7f7e23E2d7DF7256E1a9fb945B375BEE74f62c83', 1000],
  ];

  for (let x of items) {
    const [account, quantity] = x;
    // const tx = await sale.buyFor(account, DECIMALS.mul(quantity));
    // await tx.wait();

    console.log(account, '=', quantity);
    const c = inputReader.readChar('next(n)', { reAskOnChars: [] });
    if (c !== 'n') { break; }
  }
});

task('addSeed', async (_, hre) => {
  const DECIMALS = hre.ethers.BigNumber.from(10).pow(18);

  const Sale = await hre.ethers.getContractFactory('Sale');
  const sale = await Sale.attach('0xb60C268F5D49414c42E5a7090F03B43bDace49De');

  const items = [
    ['0x8956A2EdF1D707f6C1E7D263537cB18B0196FAdE', 10000],
    ['0x7f7e23E2d7DF7256E1a9fb945B375BEE74f62c83', 1000],
  ];

  for (let x of items) {
    const [account, quantity] = x;
    // const tx = await sale.buyFor(account, DECIMALS.mul(quantity));
    // await tx.wait();

    console.log(account, '=', quantity);
    const c = inputReader.readChar('next(n)', { reAskOnChars: [] });
    if (c !== 'n') { break; }
  }
});

task('addPrivate', async (_, hre) => {
  const DECIMALS = hre.ethers.BigNumber.from(10).pow(18);

  const Sale = await hre.ethers.getContractFactory('Sale');
  const sale = await Sale.attach('0xfF53Daa380F6ACDD5e54262A52C35b0667859b50');

  const items = [
    ['0x8956A2EdF1D707f6C1E7D263537cB18B0196FAdE', 10000],
    ['0x7f7e23E2d7DF7256E1a9fb945B375BEE74f62c83', 1000],
  ];

  for (let x of items) {
    const [account, quantity] = x;
    // const tx = await sale.buyFor(account, DECIMALS.mul(quantity));
    // await tx.wait();

    console.log(account, '=', quantity);
    const c = inputReader.readChar('next(n)', { reAskOnChars: [] });
    if (c !== 'n') { break; }
  }
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

