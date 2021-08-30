const chai = require("chai");
const { ethers, network } = require("hardhat");
const { solidity } = require("ethereum-waffle");

const { expect } = chai;
chai.use(solidity);

const DECIMALS = ethers.BigNumber.from(10).pow(18);
const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; // ethers.utils.keccak256('MINTER_ROLE');
let TOKEN, INTERNAL_TOKEN_LOCK;
let AdvisorWallet, EcoSystemWallet, TeamWallet, LiqWallet;

describe('InternalTokenLock', () => {

  beforeEach(async () => {
    [AdvisorWallet, EcoSystemWallet, TeamWallet, LiqWallet] = await ethers.getSigners();

    const KWS = await ethers.getContractFactory('KWS');

    const token = await KWS.deploy();
    await token.deployed();

    const TokenLock = await ethers.getContractFactory('InternalTokenLock');
    const tokenLock = await TokenLock.deploy(
      token.address,
      AdvisorWallet.address,
      EcoSystemWallet.address,
      TeamWallet.address,
      LiqWallet.address
    );

    await tokenLock.deployed();
    await token.grantRole(MINTER_ROLE, tokenLock.address);

    TOKEN = token;
    INTERNAL_TOKEN_LOCK = tokenLock;
  });

  it('claims to early', async () => {
    try {
      await INTERNAL_TOKEN_LOCK.claims();
    } catch (e) {
      expect(e.message).to.be.contains('please start to claims');
    }
  });

  it('start and claims', async () => {
    await INTERNAL_TOKEN_LOCK.start();
    expect(await INTERNAL_TOKEN_LOCK.startTime()).to.be.gt(ethers.BigNumber.from(0));
    try {
      await INTERNAL_TOKEN_LOCK.claims();
    } catch (e) {
      expect(e.message).to.be.contains('claims to early');
    }

    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(0));
  });

  it('start claim times', async () => {

    await INTERNAL_TOKEN_LOCK.start();

    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked(), 'prelock liq to 2%: 200.000.000').to.be.eq(ethers.BigNumber.from(10_000_000_000).mul(DECIMALS).mul(2).div(100));
    expect(await INTERNAL_TOKEN_LOCK.advisorUnlocked()).to.be.eq(ethers.BigNumber.from(0));
    expect(await INTERNAL_TOKEN_LOCK.ecoSystemUnlocked()).to.be.eq(ethers.BigNumber.from(0));
    expect(await INTERNAL_TOKEN_LOCK.teamUnlocked()).to.be.eq(ethers.BigNumber.from(0));

    // 10d, too early
    await network.provider.send("evm_increaseTime", [86400 * 10]);
    try {
      await INTERNAL_TOKEN_LOCK.claims();
    } catch (e) {
      expect(e.message).to.be.contains('claims to early');
    }

    await network.provider.send("evm_increaseTime", [86400 * 20 + 86400 * 30 * 2]);
    await INTERNAL_TOKEN_LOCK.claims();
    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked()).to.be.eq(ethers.BigNumber.from(1_450_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.ecoSystemUnlocked()).to.be.eq(ethers.BigNumber.from(2_250_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.advisorUnlocked()).to.be.eq(ethers.BigNumber.from(0).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.teamUnlocked()).to.be.eq(ethers.BigNumber.from(0).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(1));

    await network.provider.send("evm_increaseTime", [86400]);
    try {
      await INTERNAL_TOKEN_LOCK.claims();
    } catch (e) {
      expect(e.message).to.be.contains('claims to early');
    }
    
    await network.provider.send("evm_increaseTime", [86400 * 6 * 30]); // 9 months 1 day
    await INTERNAL_TOKEN_LOCK.claims();
    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(2));
    await INTERNAL_TOKEN_LOCK.claims();
    
    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked()).to.be.eq(ethers.BigNumber.from(3_950_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.ecoSystemUnlocked()).to.be.eq(ethers.BigNumber.from(6_750_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.advisorUnlocked()).to.be.eq(ethers.BigNumber.from(6_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.teamUnlocked()).to.be.eq(ethers.BigNumber.from(0).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(3));


    await network.provider.send("evm_increaseTime", [86400 * 3 * 30]); // 9 months 1 day
    await INTERNAL_TOKEN_LOCK.claims();
    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked()).to.be.eq(ethers.BigNumber.from(5_200_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.ecoSystemUnlocked()).to.be.eq(ethers.BigNumber.from(9_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.advisorUnlocked()).to.be.eq(ethers.BigNumber.from(8_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(4));

    await network.provider.send("evm_increaseTime", [86400 * 9 * 30]); // 18 months 1 day
    await INTERNAL_TOKEN_LOCK.claims();
    await INTERNAL_TOKEN_LOCK.claims();
    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked()).to.be.eq(ethers.BigNumber.from(7_700_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.ecoSystemUnlocked()).to.be.eq(ethers.BigNumber.from(13_500_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.advisorUnlocked()).to.be.eq(ethers.BigNumber.from(12_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(6));

    await network.provider.send("evm_increaseTime", [86400 * 6 * 30]); // 24 months 1 day
    await INTERNAL_TOKEN_LOCK.claims();
    await INTERNAL_TOKEN_LOCK.claims();
    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked()).to.be.eq(ethers.BigNumber.from(10_000_000_000).mul(DECIMALS));

    await network.provider.send("evm_increaseTime", [86400 * 12 * 30]); // 36 months 1 day
    await INTERNAL_TOKEN_LOCK.claims();
    await INTERNAL_TOKEN_LOCK.claims();
    await INTERNAL_TOKEN_LOCK.claims();
    await INTERNAL_TOKEN_LOCK.claims();
    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked()).to.be.eq(ethers.BigNumber.from(10_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.ecoSystemUnlocked()).to.be.eq(ethers.BigNumber.from(27_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.advisorUnlocked()).to.be.eq(ethers.BigNumber.from(12_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.teamUnlocked()).to.be.eq(ethers.BigNumber.from(22_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(12));


    await network.provider.send("evm_increaseTime", [86400 * 6 * 30]); // 42 months 1 day
    await INTERNAL_TOKEN_LOCK.claims();
    await INTERNAL_TOKEN_LOCK.claims();
    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked()).to.be.eq(ethers.BigNumber.from(10_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.ecoSystemUnlocked()).to.be.eq(ethers.BigNumber.from(31_500_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.advisorUnlocked()).to.be.eq(ethers.BigNumber.from(12_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.teamUnlocked()).to.be.eq(ethers.BigNumber.from(22_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(14));

    await network.provider.send("evm_increaseTime", [86400 * 6 * 30]); // 48 months 1 day
    await INTERNAL_TOKEN_LOCK.claims();
    await INTERNAL_TOKEN_LOCK.claims();
    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked()).to.be.eq(ethers.BigNumber.from(10_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.ecoSystemUnlocked()).to.be.eq(ethers.BigNumber.from(36_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.advisorUnlocked()).to.be.eq(ethers.BigNumber.from(12_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.teamUnlocked()).to.be.eq(ethers.BigNumber.from(22_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(16));


    expect(await TOKEN.balanceOf(LiqWallet.address)).to.be.eq(await INTERNAL_TOKEN_LOCK.liquidityUnlocked());
    expect(await TOKEN.balanceOf(EcoSystemWallet.address)).to.be.eq(await INTERNAL_TOKEN_LOCK.ecoSystemUnlocked());
    expect(await TOKEN.balanceOf(AdvisorWallet.address)).to.be.eq(await INTERNAL_TOKEN_LOCK.advisorUnlocked());
    expect(await TOKEN.balanceOf(TeamWallet.address)).to.be.eq(await INTERNAL_TOKEN_LOCK.teamUnlocked());

    expect(await TOKEN.balanceOf(LiqWallet.address)).to.be.eq(await INTERNAL_TOKEN_LOCK.LIQ());
    expect(await TOKEN.balanceOf(EcoSystemWallet.address)).to.be.eq(await INTERNAL_TOKEN_LOCK.ECOSYSTEM());
    expect(await TOKEN.balanceOf(AdvisorWallet.address)).to.be.eq(await INTERNAL_TOKEN_LOCK.ADVISOR());
    expect(await TOKEN.balanceOf(TeamWallet.address)).to.be.eq(await INTERNAL_TOKEN_LOCK.TEAM());

    // try claim again
    await network.provider.send("evm_increaseTime", [86400 * 12 * 30]); // add 1 ys
    try {
      await INTERNAL_TOKEN_LOCK.claims();
    } catch (e) {
      expect(e.message).to.be.contains('end of claims');
    }

    expect(await INTERNAL_TOKEN_LOCK.liquidityUnlocked()).to.be.eq(ethers.BigNumber.from(10_000_000_000).mul(DECIMALS));
    expect(await INTERNAL_TOKEN_LOCK.currentTranche()).to.be.eq(ethers.BigNumber.from(16));


  });
});