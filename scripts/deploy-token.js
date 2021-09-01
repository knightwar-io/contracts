



const H = require("hardhat");

async function play() {
  const Token = await H.ethers.getContractFactory('KWS');
  const token = await Token.deploy();

  await token.deployed();
  console.log("KWS deployed to:", token.address);
}

play()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
