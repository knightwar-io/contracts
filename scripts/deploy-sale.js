


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
    const usdt = await CUSDT.deploy('TetherToken', 'USDT', 6);
    await usdt.deployed();

    console.log('USDT deployed to: ', usdt.address);

    const CBUSD = await H.ethers.getContractFactory('TetherToken');
    const busd = await CBUSD.deploy('BinanceUSD', 'BUSD', 18);
    await busd.deployed();

    console.log('BUSD deployed to: ', busd.address);

    BUSD = busd.address;
    USDT = usdt.address;

    const DECIMALS_STABLE = await usdt.decimals();
    await busd.mint('0x4cb0cB3347c95107bC5A4736D34ef31897c713fe', ethers.BigNumber.from(1_000_000_000).mul(DECIMALS));
    await usdt.mint('0x275EF6963F6305152079D308265AD71C69013Bdf', ethers.BigNumber.from(1_000_000_000).mul(DECIMALS_STABLE));
  }

  if (BUSD && USDT) {} else {
    console.log('missing usdt/busd');
    return;
  }

  let token = null;
  if (!process.env.TOKEN_ADDRESS) {
    return;
  }


  const Token = await H.ethers.getContractFactory('KWS');
  token = await Token.attach(process.env.TOKEN_ADDRESS);

  await token.deployed();
  console.log("KWS deployed to:", token.address);


  ///// ANGEL ROUND /////
  const Sale = await H.ethers.getContractFactory('Sale');

  const angelSale = await Sale.deploy(
    'KWS-Angel',
    'KWS-AGL',
    ethers.BigNumber.from(12_500_000).mul(DECIMALS),
    ethers.BigNumber.from(125_000).mul(DECIMALS),
    USDT,
    BUSD,
    ethers.BigNumber.from(2).mul(DECIMALS), // 2%
    12 * 30 * 86400, // seconds
    12 * 30 * 86400 / (30 * 86400), // tranche
    3 * 30 * 86400 // lockTime
  );

  await angelSale.setToken(token.address);
  await angelSale.setPrice(H.ethers.BigNumber.from(DECIMALS).div(100)); // 0.01

  // grant
  await token.grantRole(MINTER_ROLE, angelSale.address);

  console.log('Angel:', angelSale.address);


  ///// SEED ROUND /////
  const seedSale = await Sale.deploy(
    'KWS-Seed',
    'KWS-SEED',
    ethers.BigNumber.from(30_000_000).mul(DECIMALS),
    ethers.BigNumber.from(450_000).mul(DECIMALS),
    USDT,
    BUSD,
    ethers.BigNumber.from(5).mul(DECIMALS), // 5%
    12 * 30 * 86400, // seconds
    12 * 30 * 86400 / (30 * 86400), // tranche
    2 * 30 * 86400 // lockTime
  );

  await seedSale.setToken(token.address);
  await seedSale.setPrice(H.ethers.BigNumber.from(15).mul(DECIMALS).div(1000)); // 0.015

  await token.grantRole(MINTER_ROLE, seedSale.address);

  // ready to start
  console.log('Seed:', seedSale.address);

  ///// PRIVATE ROUND /////
  const privateSale = await Sale.deploy(
    'KWS-Private',
    'KWS-PRV',
    ethers.BigNumber.from(57_500_000).mul(DECIMALS),
    ethers.BigNumber.from(1_437_000).mul(DECIMALS),
    USDT,
    BUSD,
    ethers.BigNumber.from(10).mul(DECIMALS), // 10%
    12 * 30 * 86400, // seconds
    12 * 30 * 86400 / (30 * 86400), // tranche
    2 * 30 * 86400 // lockTime
  );

  await privateSale.setToken(token.address);
  await privateSale.setPrice(H.ethers.BigNumber.from(25).mul(DECIMALS).div(1000)); // 0.025

  await token.grantRole(MINTER_ROLE, privateSale.address);

  // ready to start
  console.log('Private:', privateSale.address);

  console.log('config:');
  console.log(JSON.stringify({

    ANGEL: angelSale.address,
    SEED: seedSale.address,
    PRIVATE: privateSale.address,


    TOKEN: token.address,
    USDT,
    BUSD,
  }, null, 2));

  await angelSale.start();
  await seedSale.start();
  await privateSale.start();
}

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
