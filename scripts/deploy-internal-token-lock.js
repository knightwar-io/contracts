

const { ethers } = require("hardhat");

const DECIMALS = ethers.BigNumber.from(10).pow(18);

async function deploy() {
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
  if (!TOKEN_ADDRESS) {
    return;
  }

  const KWS = await ethers.getContractFactory('KWS');
  // const token = await KWS.connect(wallets.deployer).deploy();
  // await token.deployed();
  // contracts.token = token;

  const token = await KWS.attach(TOKEN_ADDRESS);
  await token.deployed();

  const Lock = await ethers.getContractFactory('InternalTokenLock');
  const lock = await Lock.deploy(token.address);
  await lock.deployed();

  await token.mint(lock.address, ethers.BigNumber.from(394_000_000).mul(DECIMALS));

  console.log('InternalTokenLock:', lock.address);
}

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
