


const H = require("hardhat");
const fs = require('fs');

const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; // ethers.utils.keccak256(ethers.utils.formatBytes32String('MINTER_ROLE'));

const DEV = process.env.DEV || '';

let { BUSD, USDT } = process.env;

const DECIMALS = H.ethers.BigNumber.from(10).pow(18);

async function play() {
  const STRATEGY = '0x483F7AB903d79831208764D94d2d1708844EFb29';
  const saleArtifact = await artifacts.readArtifact("Sale");
  const signers = await ethers.getSigners();
  const sale = new ethers.Contract(STRATEGY, saleArtifact.abi, signers[0]);

  const res = await sale.startClaimTime();
  console.log('sale result:', res.toString());
  // console.log('start time:', await sale.startTime());
}

play()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
