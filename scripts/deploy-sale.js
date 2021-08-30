


const H = require("hardhat");
const fs = require('fs');

const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; // ethers.utils.keccak256(ethers.utils.formatBytes32String('MINTER_ROLE'));

const DEV = process.env.DEV || '';

let { BUSD, USDT } = process.env;

const DECIMALS = H.ethers.BigNumber.from(10).pow(18);

async function deploy() {
  // deploy USDT
  if (DEV) {
    const CUSDT = await H.ethers.getContractFactory('TetherToken');
    const usdt = await CUSDT.deploy('TetherToken', 'USDT');
    await usdt.deployed();

    console.log('USDT deployed to: ', usdt.address);

    const CBUSD = await H.ethers.getContractFactory('TetherToken');
    const busd = await CBUSD.deploy('BinanceUSD', 'BUSD');
    await busd.deployed();

    console.log('BUSD deployed to: ', busd.address);

    BUSD = busd.address;
    USDT = usdt.address;

    await busd.mint('0x4cb0cB3347c95107bC5A4736D34ef31897c713fe', ethers.BigNumber.from(1_000_000_000).mul(DECIMALS));
    await usdt.mint('0x275EF6963F6305152079D308265AD71C69013Bdf', ethers.BigNumber.from(1_000_000_000).mul(DECIMALS));
  }

  const Token = await H.ethers.getContractFactory('KWS');
  const token = await Token.deploy();

  await token.deployed();
  console.log("KWS deployed to:", token.address);

  /////

  const Sale = await H.ethers.getContractFactory('Sale');

  const strategy = await Sale.deploy(
    'KWS-Strategy', 
    'KWS-STR',
    ethers.BigNumber.from(6_000_000_000).mul(DECIMALS),
    ethers.BigNumber.from(600_000).mul(DECIMALS),
    USDT,
    BUSD,
    ethers.BigNumber.from(10).mul(DECIMALS), // 10%
    9 * 30 * 86400, // seconds
    9 * 30 * 86400 / (6 * 60 * 60) // tranche
  );

  await strategy.setToken(token.address);
  await strategy.setPrice(H.ethers.BigNumber.from(DECIMALS).div(10 ** 4));

  // grant
  await token.grantRole(MINTER_ROLE, strategy.address);

  console.log('Strategy: ', strategy.address);

  const privateSale = await Sale.deploy(
    'KWS-Private', 
    'KWS-PRI',
    ethers.BigNumber.from(13_000_000_000).mul(DECIMALS),
    ethers.BigNumber.from(1_950_000).mul(DECIMALS),
    USDT,
    BUSD,
    ethers.BigNumber.from(12).mul(DECIMALS), // 12%
    6 * 30 * 86400, // seconds
    6 * 30 * 86400 / (6 * 60 * 60) // tranche
  );

  await privateSale.setToken(token.address);
  await privateSale.setPrice(H.ethers.BigNumber.from(15).mul(DECIMALS).div(10 ** 5));

  await token.grantRole(MINTER_ROLE, privateSale.address);

  // ready to start
  console.log('Private: ', privateSale.address);

  console.log('config:');
  console.log(JSON.stringify({
    STRATEGY: strategy.address,
    PRIVATE: privateSale.address,
    TOKEN: token.address,
    USDT,
    BUSD,
  }, null, 2));

  await strategy.start();
  await privateSale.start();
}

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
