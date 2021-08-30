


const H = require("hardhat");
const fs = require('fs');

const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; // ethers.utils.keccak256(ethers.utils.formatBytes32String('MINTER_ROLE'));

const DEV = process.env.DEV || '';

let { BUSD, USDT } = process.env;

const DECIMALS = H.ethers.BigNumber.from(10).pow(18);

// dev purpose
async function play() {
  const CUSDT = await H.ethers.getContractFactory('TetherToken');

  const DECIMALS = ethers.BigNumber.from(10).pow(18);
  const busd = await CUSDT.attach(BUSD);
  const usdt = await CUSDT.attach(USDT);

  const signers = await ethers.getSigners();

  // note wallet of creator 0x0e302f8DB9D9e799FdD9f2F06Ec742Dd442283E1
  await busd.connect(signers[0]).mint('0xdBAcC0F57b0C8B2B11Ae1BFfD96f30cf2f7c406C', ethers.BigNumber.from(9_000_000_000).mul(DECIMALS));
  await usdt.connect(signers[0]).mint('0xdBAcC0F57b0C8B2B11Ae1BFfD96f30cf2f7c406C', ethers.BigNumber.from(9_000_000_000).mul(DECIMALS));
}

play()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
