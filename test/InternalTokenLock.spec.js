const chai = require("chai");
const { ethers, network } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { keccak256 } = require("ethers/lib/utils");

const { expect } = chai;
chai.use(solidity);

const DECIMALS = ethers.BigNumber.from(10).pow(18);
// const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; // ethers.utils.keccak256('MINTER_ROLE');
// let TOKEN, INTERNAL_TOKEN_LOCK;
// let AdvisorWallet, EcoSystemWallet, TeamWallet, LiqWallet;

describe('InternalTokenLock', async () => {

  const [
    deployer,
    reward,
    marketing,
    bounty,
    liquidity,
    ecosystem,
    team,
    advisor
  ] = await ethers.getSigners();

  const wallets = {
    deployer,
    reward,
    marketing,
    bounty,
    liquidity,
    ecosystem,
    team,
    advisor
  };

  const contracts = {
    token: null,
    lock: null,
  };

  beforeEach(async () => {
    const KWS = await ethers.getContractFactory('KWS');
    const token = await KWS.connect(wallets.deployer).deploy();
    await token.deployed();
    contracts.token = token;

    const Lock = await ethers.getContractFactory('InternalTokenLock');
    const lock = await Lock.connect(wallets.deployer).deploy(contracts.token.address);
    await lock.deployed();
    contracts.lock = lock;

    await token.mint(lock.address, ethers.BigNumber.from(372500000).mul(DECIMALS));
  });

  it('Already fund', async () => {
    const total = await contracts.token.balanceOf(contracts.lock.address);
    expect(total).to.be.gt(ethers.BigNumber.from(0));
  });

  describe('GameReward', () => {
    it('nothing can unlock if It is not started', async () => {
      const total = await contracts.lock.unlockableGameReward(0);
      expect(total).to.be.eq(0);
    });

    it('wallet must be granted game reward', async () => {
      const res = contracts.lock.connect(wallets.bounty).unlockGameReward(wallets.bounty);
      await expect(res, 'sender did not grant game reward').to.be.reverted;

      // add role
      await contracts.lock.grantRole(await contracts.lock.GAME_REWARD_ROLE(), wallets.reward.address);
      const res2 = contracts.lock.connect(wallets.reward).unlockGameReward(wallets.reward.address);
      await expect(res2).to.be.emit(contracts.lock, 'GameRewardReleased');
    });


    beforeEach(async () => {
      await contracts.lock.grantRole(await contracts.lock.GAME_REWARD_ROLE(), wallets.reward.address);
    });

    describe('Unlock', () => {
      it('unlock 5% per quarter', async () => {
        const beforeBalance = await contracts.token.balanceOf(wallets.reward.address);

        const res = await contracts.lock.connect(wallets.reward).unlockGameReward(wallets.reward.address);
        const TOKEN_PER_TRANCHE = (await contracts.lock.GAME_REWARD()).mul(5).div(100);
        expect(res).to.emit(contracts.lock, 'GameRewardReleased').withArgs(wallets.reward.address, TOKEN_PER_TRANCHE);
        expect(await contracts.lock.gameReward()).to.be.eq(TOKEN_PER_TRANCHE);
        expect(await contracts.token.balanceOf(wallets.reward.address)).to.be.eq(beforeBalance.add(TOKEN_PER_TRANCHE));

        // 2 month, no unlock token
        await network.provider.send("evm_increaseTime", [86400 * 30 * 2]);
        await contracts.lock.connect(wallets.reward).unlockGameReward(wallets.reward.address);
        expect(await contracts.lock.gameReward()).to.be.eq(TOKEN_PER_TRANCHE);
        expect(await contracts.token.balanceOf(wallets.reward.address)).to.be.eq(beforeBalance.add(TOKEN_PER_TRANCHE));

        await network.provider.send("evm_increaseTime", [86400 * 30]);
        await contracts.lock.connect(wallets.reward).unlockGameReward(wallets.reward.address);
        expect(await contracts.lock.gameReward()).to.be.eq(TOKEN_PER_TRANCHE.mul(2));
        expect(await contracts.token.balanceOf(wallets.reward.address)).to.be.eq(beforeBalance.add(TOKEN_PER_TRANCHE.mul(2)));


        // after 6 years, full unlock
        await network.provider.send("evm_increaseTime", [86400 * 365 * 6]);
        await contracts.lock.connect(wallets.reward).unlockGameReward(wallets.reward.address);
        expect(await contracts.lock.gameReward()).to.be.eq(TOKEN_PER_TRANCHE.mul(20));
        expect(await contracts.token.balanceOf(wallets.reward.address)).to.be.eq(beforeBalance.add(await contracts.lock.GAME_REWARD()));

        // nothing to unlock
        const res2 = contracts.lock.connect(wallets.reward).unlockGameReward(wallets.reward.address);
        await expect(res2).to.be.reverted;
      });
    });


  });

  describe('FreeBounty', () => {
    it('no token is unlocked', async () => {
      const total = await contracts.lock.freeBounty();
      expect(total).to.be.eq(0);
    });

    it('unlock', async () => {
      const beforeBalance = await contracts.token.balanceOf(wallets.bounty.address);
      const res = await contracts.lock.connect(wallets.deployer).unlockFreeBounty(wallets.bounty.address);
      const TOTAL_BOUNTY = await contracts.lock.FREE_BOUNTY();
      expect(await contracts.token.balanceOf(wallets.bounty.address)).to.be.eq(beforeBalance.add(TOTAL_BOUNTY));
      expect(res).to.emit(contracts.lock, 'FreeBountyReleased').withArgs(wallets.bounty.address, TOTAL_BOUNTY);

      // reunlock
      const res2 = contracts.lock.connect(wallets.deployer).unlockFreeBounty(wallets.bounty.address);
      await expect(res2).to.be.reverted;
    });
  });

  describe('Marketing', () => {
    beforeEach(async () => {
      await contracts.lock.grantRole(await contracts.lock.MARKETING_ROLE(), wallets.marketing.address);
    });

    it('no token is unlocked', async () => {
      const total = await contracts.lock.marketing();
      expect(total).to.be.eq(0);
    });

    it('preunlock TGE', async () => {
      const beforeBalance = await contracts.token.balanceOf(wallets.marketing.address);
      const res = await contracts.lock.connect(wallets.marketing).preunlockMarketing(wallets.marketing.address);

      const TOTAL_MARKETING = await contracts.lock.MARKETING();
      const PREUNLOCK_TOKEN = TOTAL_MARKETING.mul(2).div(100);

      expect(await contracts.lock.marketing()).to.be.eq(PREUNLOCK_TOKEN);
      expect(await contracts.token.balanceOf(wallets.marketing.address)).to.be.eq(beforeBalance.add(PREUNLOCK_TOKEN));

      // run preunlock again
      const res2 = contracts.lock.connect(wallets.marketing).preunlockMarketing(wallets.marketing.address);
      await expect(res2).to.be.reverted;
    });

    it('unlock', async () => {
      const beforeBalance = await contracts.token.balanceOf(wallets.marketing.address);

      // unlock without run preunlock
      const res = contracts.lock.connect(wallets.marketing).unlockMarketing(wallets.marketing.address);
      await expect(res).to.be.revertedWith("InternalTokenLock: preunlock is not run");

      await contracts.lock.connect(wallets.marketing).preunlockMarketing(wallets.marketing.address);
      const res2 = await contracts.lock.connect(wallets.marketing).unlockMarketing(wallets.marketing.address);

      expect(res2).to.emit(contracts.lock, 'MarketingReleased').withArgs(wallets.marketing.address, ethers.BigNumber.from(0));


      // unlock per month
      await network.provider.send("evm_increaseTime", [86400 * 30]);
      const TOTAL_MARKETING = await contracts.lock.MARKETING();
      const PREUNLOCK_TOKEN = TOTAL_MARKETING.mul(2).div(100);
      const TOKEN_PER_TRANCHE = ethers.BigNumber.from(1_770_000).mul(DECIMALS); // it is not natural number TOTAL_MARKETING.sub(PREUNLOCK);

      const startMarketingTime = await contracts.lock.startMarketingTime();
      const totalPreUnlockInFirstTranche = await contracts.lock.connect(wallets.marketing)
        .unlockableMarketing(startMarketingTime.add(30 * 86400));

      expect(totalPreUnlockInFirstTranche).to.be.eq(TOKEN_PER_TRANCHE);

      const resx = await contracts.lock.connect(wallets.marketing).unlockMarketing(wallets.marketing.address);
      expect(resx).to.emit(contracts.lock, 'MarketingReleased').withArgs(wallets.marketing.address, TOKEN_PER_TRANCHE);
      expect(await contracts.lock.marketing()).to.be.eq(ethers.BigNumber.from(PREUNLOCK_TOKEN).add(TOKEN_PER_TRANCHE));

      expect(await contracts.token.balanceOf(wallets.marketing.address))
        .to.be.eq(beforeBalance.add(PREUNLOCK_TOKEN).add(TOKEN_PER_TRANCHE));

      // try unlock token earlier
      await contracts.lock.connect(wallets.marketing).unlockMarketing(wallets.marketing.address);
      expect(await contracts.token.balanceOf(wallets.marketing.address))
        .to.be.eq(beforeBalance.add(PREUNLOCK_TOKEN).add(TOKEN_PER_TRANCHE));

      // full lock
      await network.provider.send("evm_increaseTime", [86400 * 30 * 17]);
      await contracts.lock.connect(wallets.marketing).unlockMarketing(wallets.marketing.address);

      expect(await contracts.token.balanceOf(wallets.marketing.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.marketing()));

      expect(await contracts.lock.marketing()).to.be.eq(TOTAL_MARKETING);


      // try unlock
      const res4 = contracts.lock.connect(wallets.marketing).unlockMarketing(wallets.marketing.address);
      await expect(res4).to.be.revertedWith('InternalTokenLock: end of unlock');

    });
  });

  describe('Liquidity', () => {
    beforeEach(async () => {
      await contracts.lock.grantRole(await contracts.lock.LIQUIDITY_ROLE(), wallets.liquidity.address);
    });

    it('no token is unlocked', async () => {
      const total = await contracts.lock.liquidity();
      expect(total).to.be.eq(0);
    });

    it('preunlock TGE', async () => {
      const beforeBalance = await contracts.token.balanceOf(wallets.liquidity.address);
      await contracts.lock.connect(wallets.liquidity).preunlockLiquidity(wallets.liquidity.address);

      const TOTAL_LIQ = await contracts.lock.LIQUIDITY();
      const PREUNLOCK_TOKEN = TOTAL_LIQ.mul(5).div(100);

      expect(await contracts.lock.liquidity()).to.be.eq(PREUNLOCK_TOKEN);
      expect(await contracts.token.balanceOf(wallets.liquidity.address)).to.be.eq(beforeBalance.add(PREUNLOCK_TOKEN));

      // run preunlock again
      const res2 = contracts.lock.connect(wallets.marketing).preunlockLiquidity(wallets.liquidity.address);
      await expect(res2).to.be.reverted;
    });

    it('unlock', async () => {
      const beforeBalance = await contracts.token.balanceOf(wallets.liquidity.address);

      // unlock without run preunlock
      const res = contracts.lock.connect(wallets.liquidity).unlockLiquidity(wallets.liquidity.address);
      await expect(res).to.be.revertedWith("InternalTokenLock: preunlock is not run");

      await contracts.lock.connect(wallets.liquidity).preunlockLiquidity(wallets.liquidity.address);
      const res2 = await contracts.lock.connect(wallets.liquidity).unlockLiquidity(wallets.liquidity.address);

      expect(res2).to.emit(contracts.lock, 'LiquidityReleased').withArgs(wallets.liquidity.address, ethers.BigNumber.from(0));


      // unlock per month
      await network.provider.send("evm_increaseTime", [86400 * 30]);
      const TOTAL_LIQ = await contracts.lock.LIQUIDITY();
      const PREUNLOCK_TOKEN = TOTAL_LIQ.mul(5).div(100);
      const TOKEN_PER_TRANCHE = ethers.BigNumber.from(6096_000).mul(DECIMALS); // it is not natural number TOTAL_LIQ.sub(PREUNLOCK);

      const startLiqTime = await contracts.lock.startLiquidityTime();
      const totalPreUnlockInFirstTranche = await contracts.lock.connect(wallets.liquidity)
        .unlockableLiquidity(startLiqTime.add(30 * 86400));

      expect(totalPreUnlockInFirstTranche).to.be.eq(TOKEN_PER_TRANCHE);

      const resx = await contracts.lock.connect(wallets.liquidity).unlockLiquidity(wallets.liquidity.address);
      expect(resx).to.emit(contracts.lock, 'LiquidityReleased').withArgs(wallets.liquidity.address, TOKEN_PER_TRANCHE);
      expect(await contracts.lock.liquidity()).to.be.eq(ethers.BigNumber.from(PREUNLOCK_TOKEN).add(TOKEN_PER_TRANCHE));

      expect(await contracts.token.balanceOf(wallets.liquidity.address))
        .to.be.eq(beforeBalance.add(PREUNLOCK_TOKEN).add(TOKEN_PER_TRANCHE));

      // try unlock token earlier
      await contracts.lock.connect(wallets.liquidity).unlockLiquidity(wallets.liquidity.address);
      expect(await contracts.token.balanceOf(wallets.liquidity.address))
        .to.be.eq(beforeBalance.add(PREUNLOCK_TOKEN).add(TOKEN_PER_TRANCHE));

      // full lock
      await network.provider.send("evm_increaseTime", [86400 * 30 * 11]);
      await contracts.lock.connect(wallets.liquidity).unlockLiquidity(wallets.liquidity.address);

      expect(await contracts.token.balanceOf(wallets.liquidity.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.liquidity()));

      expect(await contracts.lock.liquidity()).to.be.eq(TOTAL_LIQ);


      // try unlock
      const res4 = contracts.lock.connect(wallets.liquidity).unlockLiquidity(wallets.liquidity.address);
      await expect(res4).to.be.revertedWith('InternalTokenLock: end of unlock');

    });
  });

  describe('Ecosystem', () => {
    beforeEach(async () => {
      await contracts.lock.grantRole(await contracts.lock.ECOSYSTEM_ROLE(), wallets.ecosystem.address);
    });

    it('startLock', async () => {
      const res = contracts.lock.connect(wallets.ecosystem).unlockEcosystem(wallets.ecosystem.address);
      await expect(res).to.be.revertedWith("InternalTokenLock: not started");
    });

    it('unlock', async () => {
      await contracts.lock.connect(wallets.deployer).startLock();

      // try claim
      const beforeBalance = await contracts.token.balanceOf(wallets.ecosystem.address);
      
      const res = await contracts.lock.connect(wallets.ecosystem).unlockEcosystem(wallets.ecosystem.address);

      // nothing change
      expect(await contracts.token.balanceOf(wallets.ecosystem.address)).to.be.eq(beforeBalance);
      expect(res).to.emit(contracts.lock, 'EcosystemReleased').withArgs(wallets.ecosystem.address, 0);

      await network.provider.send("evm_increaseTime", [86400 * 30]);
      const res2 = await contracts.lock.connect(wallets.ecosystem).unlockEcosystem(wallets.ecosystem.address);
      expect(await contracts.token.balanceOf(wallets.ecosystem.address)).to.be.eq(beforeBalance);
      expect(res2).to.emit(contracts.lock, 'EcosystemReleased').withArgs(wallets.ecosystem.address, 0);

      await network.provider.send("evm_increaseTime", [86400 * 30 * 5]); // 6month from started Time
      const res3 = await contracts.lock.connect(wallets.ecosystem).unlockEcosystem(wallets.ecosystem.address);
      expect(await contracts.token.balanceOf(wallets.ecosystem.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.ECOSYSTEM_PER_TRANCHE()));
      expect(res3).to.emit(contracts.lock, 'EcosystemReleased').withArgs(wallets.ecosystem.address, await contracts.lock.ECOSYSTEM_PER_TRANCHE());

      // re claim
      await contracts.lock.connect(wallets.ecosystem).unlockEcosystem(wallets.ecosystem.address);
      expect(await contracts.token.balanceOf(wallets.ecosystem.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.ECOSYSTEM_PER_TRANCHE()));
      
      // 5 years
      await network.provider.send("evm_increaseTime", [86400 * 365 * 5]); // 5yrs
      const rx = await contracts.lock.connect(wallets.ecosystem).unlockEcosystem(wallets.ecosystem.address);
      expect(rx).to.emit(contracts.lock, 'EcosystemReleased')
        .withArgs(wallets.ecosystem.address, 
          (await contracts.lock.ECOSYSTEM()).sub(await contracts.lock.ECOSYSTEM_PER_TRANCHE()));
      expect(await contracts.token.balanceOf(wallets.ecosystem.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.ECOSYSTEM()));

      // retry on end
      const rxx = contracts.lock.connect(wallets.ecosystem).unlockEcosystem(wallets.ecosystem.address);
      await expect(rxx).to.be.revertedWith('InternalTokenLock: end of unlock');
      
    });
  });

  describe('Team', () => {
    beforeEach(async () => {
      await contracts.lock.grantRole(await contracts.lock.TEAM_ROLE(), wallets.team.address);
    });

    it('startLock', async () => {
      const res = contracts.lock.connect(wallets.team).unlockTeam(wallets.team.address);
      await expect(res).to.be.revertedWith("InternalTokenLock: not started");
    });

    it('unlock', async () => {
      await contracts.lock.connect(wallets.deployer).startLock();

      // try claim
      const beforeBalance = await contracts.token.balanceOf(wallets.team.address);
      
      const res = await contracts.lock.connect(wallets.team).unlockTeam(wallets.team.address);

      // nothing change
      expect(await contracts.token.balanceOf(wallets.team.address)).to.be.eq(beforeBalance);
      expect(res).to.emit(contracts.lock, 'TeamReleased').withArgs(wallets.team.address, 0);

      await network.provider.send("evm_increaseTime", [86400 * 30]);
      const res2 = await contracts.lock.connect(wallets.team).unlockTeam(wallets.team.address);
      expect(await contracts.token.balanceOf(wallets.team.address)).to.be.eq(beforeBalance);
      expect(res2).to.emit(contracts.lock, 'TeamReleased').withArgs(wallets.team.address, 0);

      await network.provider.send("evm_increaseTime", [86400 * 30 * 5]); // 6 months locked
      const res3 = await contracts.lock.connect(wallets.team).unlockTeam(wallets.team.address);

      expect(await contracts.token.balanceOf(wallets.team.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.TEAM_PER_TRANCHE()));
      expect(res3).to.emit(contracts.lock, 'TeamReleased').withArgs(wallets.team.address, 
        await contracts.lock.TEAM_PER_TRANCHE());
      expect(await contracts.lock.team()).to.be.eq(await contracts.lock.TEAM_PER_TRANCHE());

      // re claim
      await contracts.lock.connect(wallets.team).unlockTeam(wallets.team.address);
      expect(await contracts.token.balanceOf(wallets.team.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.TEAM_PER_TRANCHE()));

      // next quarter
      await network.provider.send("evm_increaseTime", [86400 * 30 * 3]); // quarter from started Time
      await contracts.lock.connect(wallets.team).unlockTeam(wallets.team.address);
      expect(await contracts.token.balanceOf(wallets.team.address))
        .to.be.eq(beforeBalance.add((await contracts.lock.TEAM_PER_TRANCHE()).mul(2)));
      expect(await contracts.lock.team()).to.be.eq((await contracts.lock.TEAM_PER_TRANCHE()).mul(2));
      
      // 3 years
      await network.provider.send("evm_increaseTime", [86400 * 365 * 3]); // full unlock ~ 2.5 year
      const rx = await contracts.lock.connect(wallets.team).unlockTeam(wallets.team.address);
      expect(rx).to.emit(contracts.lock, 'TeamReleased')
        .withArgs(wallets.team.address, 
          (await contracts.lock.TEAM()).sub(await contracts.lock.TEAM_PER_TRANCHE()).sub(await contracts.lock.TEAM_PER_TRANCHE()));
      expect(await contracts.token.balanceOf(wallets.team.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.TEAM()));

      // retry on end
      const rxx = contracts.lock.connect(wallets.team).unlockTeam(wallets.team.address);
      await expect(rxx).to.be.revertedWith('InternalTokenLock: end of unlock');
    });
  });

  describe('Advisors & Partnership', () => {
    beforeEach(async () => {
      await contracts.lock.grantRole(await contracts.lock.ADVISOR_ROLE(), wallets.advisor.address);
    });

    it('startLock', async () => {
      const res = contracts.lock.connect(wallets.advisor).unlockAdvisor(wallets.advisor.address);
      await expect(res).to.be.revertedWith("InternalTokenLock: not started");
    });

    it('unlock', async () => {
      await contracts.lock.connect(wallets.deployer).startLock();

      // try claim
      const beforeBalance = await contracts.token.balanceOf(wallets.advisor.address);
      
      const res = await contracts.lock.connect(wallets.advisor).unlockAdvisor(wallets.advisor.address);

      // nothing change
      expect(await contracts.token.balanceOf(wallets.advisor.address)).to.be.eq(beforeBalance);
      expect(res).to.emit(contracts.lock, 'AdvisorReleased').withArgs(wallets.advisor.address, 0);

      await network.provider.send("evm_increaseTime", [86400 * 30]);
      const res2 = await contracts.lock.connect(wallets.advisor).unlockAdvisor(wallets.advisor.address);
      expect(await contracts.token.balanceOf(wallets.advisor.address)).to.be.eq(beforeBalance);
      expect(res2).to.emit(contracts.lock, 'AdvisorReleased').withArgs(wallets.advisor.address, 0);

      await network.provider.send("evm_increaseTime", [86400 * 30 * 5]); // 6 months locked
      const res3 = await contracts.lock.connect(wallets.advisor).unlockAdvisor(wallets.advisor.address);

      expect(await contracts.token.balanceOf(wallets.advisor.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.ADVISOR_PER_TRANCHE()));
      expect(res3).to.emit(contracts.lock, 'AdvisorReleased').withArgs(wallets.advisor.address, 
        await contracts.lock.ADVISOR_PER_TRANCHE());
      expect(await contracts.lock.advisor()).to.be.eq(await contracts.lock.ADVISOR_PER_TRANCHE());

      // re claim
      await contracts.lock.connect(wallets.advisor).unlockAdvisor(wallets.advisor.address);
      expect(await contracts.token.balanceOf(wallets.advisor.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.ADVISOR_PER_TRANCHE()));

      // next quarter
      await network.provider.send("evm_increaseTime", [86400 * 30 * 3]); // quarter from started Time
      await contracts.lock.connect(wallets.advisor).unlockAdvisor(wallets.advisor.address);
      expect(await contracts.token.balanceOf(wallets.advisor.address))
        .to.be.eq(beforeBalance.add((await contracts.lock.ADVISOR_PER_TRANCHE()).mul(2)));
      expect(await contracts.lock.advisor()).to.be.eq((await contracts.lock.ADVISOR_PER_TRANCHE()).mul(2));
      
      // 3 years
      await network.provider.send("evm_increaseTime", [86400 * 365 * 3]); // full unlock ~ 2.5 year
      const rx = await contracts.lock.connect(wallets.advisor).unlockAdvisor(wallets.advisor.address);
      expect(rx).to.emit(contracts.lock, 'AdvisorReleased')
        .withArgs(wallets.advisor.address, 
          (await contracts.lock.ADVISOR()).sub(await contracts.lock.ADVISOR_PER_TRANCHE()).sub(await contracts.lock.ADVISOR_PER_TRANCHE()));
      expect(await contracts.token.balanceOf(wallets.advisor.address))
        .to.be.eq(beforeBalance.add(await contracts.lock.ADVISOR()));

      // retry on end
      const rxx = contracts.lock.connect(wallets.advisor).unlockAdvisor(wallets.advisor.address);
      await expect(rxx).to.be.revertedWith('InternalTokenLock: end of unlock');
    });
  });
});