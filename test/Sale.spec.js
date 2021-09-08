const chai = require("chai");
const { ethers, network, upgrades } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { utils } = require("ethers");

const { expect } = chai;
chai.use(solidity);

const DECIMALS = ethers.BigNumber.from(10).pow(18);
const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; // ethers.utils.keccak256('MINTER_ROLE');
let ITO, TOKEN;
let Creator, SeedBuyer1, SeedBuyer2, PrivateBuyer1, PrivateBuyer2, PublicBuyer1, PublicBuyer2, EcoSystemWallet;

const PRICE_IN_ANGEL = ethers.BigNumber.from(DECIMALS).div(100); // 0.01

describe('Sale', () => {
  beforeEach(async () => {
    [Creator, SeedBuyer1, SeedBuyer2, PrivateBuyer1, PrivateBuyer2, PublicBuyer1, PublicBuyer2, EcoSystemWallet] = await ethers.getSigners();

    const StableToken = await ethers.getContractFactory('TetherToken');

    const usdt = await StableToken.deploy('TetherToken', 'USDT', 6);
    const busd = await StableToken.deploy('BinanceUSD', 'BUSD', 18);
    await usdt.deployed();
    await busd.deployed();

    await usdt.connect(Creator);
    await busd.connect(Creator);

    // initial issue
    await busd.mint(Creator.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await busd.mint(SeedBuyer1.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await busd.mint(SeedBuyer2.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await busd.mint(PrivateBuyer1.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await busd.mint(PrivateBuyer2.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await busd.mint(PublicBuyer1.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await busd.mint(PublicBuyer2.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));

    await usdt.mint(Creator.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await usdt.mint(SeedBuyer1.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await usdt.mint(SeedBuyer2.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await usdt.mint(PrivateBuyer1.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await usdt.mint(PrivateBuyer2.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await usdt.mint(PublicBuyer1.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));
    await usdt.mint(PublicBuyer2.address, ethers.BigNumber.from(2_000_000).mul(DECIMALS));

    const KWS = await ethers.getContractFactory('KWS');

    const token = await upgrades.deployProxy(KWS, { initializer: 'init' });
    await token.deployed();

    const Sale = await ethers.getContractFactory('Sale');
    const sale = await Sale.connect(Creator).deploy(
      'KWS-Angel', 
      'KWS-AGL',
      ethers.BigNumber.from(12_500_000).mul(DECIMALS),
      ethers.BigNumber.from(125_000).mul(DECIMALS),
      usdt.address,
      busd.address,
      ethers.BigNumber.from(2).mul(DECIMALS), // 2%
      12 * 30 * 86400, // seconds
      12 * 30 * 86400 / (30 * 86400), // tranche
      3 * 30 * 86400 // lockTime
    );

    await sale.deployed();

    USDT = usdt;
    BUSD = busd;
    ITO = sale;
    TOKEN = token;
  });

  // total USD per $token
  const calcToken = async (amountUsd, stableDecimals = DECIMALS) => {
    // price x amountUSD
    const price = ethers.BigNumber.from(await ITO.price());
    if (DECIMALS.gt(ethers.BigNumber.from(stableDecimals))) {
      return amountUsd.mul(DECIMALS.mul(DECIMALS.div(stableDecimals))).div(price);
    }

    return amountUsd.mul(DECIMALS).div(price);
  }

  describe('setToken', async () => {
    it('token not specified', async () => {
      expect(await ITO.token()).to.be.eq(ethers.constants.AddressZero);
    })
    it('token specified', async () => {
      await ITO.setToken(TOKEN.address);
      expect(await ITO.token()).to.be.not.eq(0);
    });
  });

  describe('setPrice', async () => {
    it('price must be greater than 0', async () => {
      await ITO.setPrice(10000);
      expect(await ITO.price()).to.be.gt(0);
    });

    // convert rate
    it('price calc', async () => {
      await ITO.setPrice(ethers.BigNumber.from(DECIMALS).div(ethers.BigNumber.from(10).pow(2)));

      const stableDecimals = ethers.BigNumber.from(10).pow(await USDT.decimals());
      const usd = ethers.BigNumber.from(250_000).mul(stableDecimals);
      const token = await calcToken(usd, stableDecimals);
      expect(token).to.be.eq(ethers.BigNumber.from(25_000_000).mul(DECIMALS));
    });
  });

  describe('allowlist', async () => {
    it('add to allowlist', async () => {
      await ITO.addAllow(SeedBuyer1.address);
      expect((await ITO.isAllow(SeedBuyer1.address))).to.be.eq(true);
    });

    it('add to allowlist with limit', async () => {
      await ITO.addAllowWithLimit(SeedBuyer1.address, ethers.BigNumber.from(100).mul(DECIMALS));
      const limit = await ITO.limitToBuyOf(SeedBuyer1.address);
      expect(limit).to.be.eq(ethers.BigNumber.from(100).mul(DECIMALS));
    });
    
    it('re-add allowlist', async () => {
      await ITO.addAllow(SeedBuyer1.address);

      try {
        await ITO.addAllow(SeedBuyer1.address);
      } catch (e) {
        expect(e.message).to.be.contain('already added');
      }

      expect((await ITO.total())).to.be.eq(1);
    });
    
    it('add 2 address', async () => {
      await ITO.addAllow(SeedBuyer1.address);
      await ITO.addAllow(SeedBuyer2.address);
      expect(await ITO.total()).to.be.eq(2);
      expect((await ITO.isAllow(SeedBuyer1.address))).to.be.eq(true);
      expect((await ITO.isAllow(SeedBuyer2.address))).to.be.eq(true);
    });

    it('add and remove', async () => {
      await ITO.addAllow(SeedBuyer1.address);
      expect(await ITO.total()).to.be.eq(1);
      expect((await ITO.isAllow(SeedBuyer1.address))).to.be.eq(true);
      await ITO.removeAllow(SeedBuyer1.address);
      expect(await ITO.total()).to.be.eq(0);
      expect((await ITO.isAllow(SeedBuyer1.address))).to.be.eq(false);

      // multiple
      await ITO.addAllow(SeedBuyer1.address);
      await ITO.addAllowWithLimit(SeedBuyer2.address, ethers.BigNumber.from(100).mul(DECIMALS));
      expect(await ITO.total()).to.be.eq(2);
      await ITO.removeAllow(SeedBuyer1.address);
      expect(await ITO.total()).to.be.eq(1);
      await ITO.removeAllow(SeedBuyer2.address);
      expect(await ITO.total()).to.be.eq(0);
      expect(await ITO.limitToBuyOf(SeedBuyer2.address)).to.be.eq(0);
    });
  });

  describe('sale', () => {
    beforeEach(async () => {
      // setup price & token
      await ITO.setToken(TOKEN.address);
      await TOKEN.grantRole(MINTER_ROLE, ITO.address);

      await ITO.setPrice(PRICE_IN_ANGEL);
      await ITO.addAllow(SeedBuyer1.address);
      await ITO.addAllow(SeedBuyer2.address);
    });

    it('not yet started, can not buy', async () => {
      try {
        await ITO.connect(SeedBuyer1).buy(USDT.address, 1000);
      } catch (e) {
        expect(e.message).to.be.contain('not in sale time');
      }
    });

    it ('trigger OnSaleStarted', async () => {
      const res = await ITO.start();
      expect(res).to.emit(ITO, 'OnSaleStarted');
    });

    describe('start', () => {
      it('start & trigger event', async () => {
        const res = await ITO.start();
        expect(res).to.emit(ITO, 'OnSaleStarted');
        expect(await ITO.startTime()).to.be.gt(ethers.BigNumber.from(0));
      });

      it('re-start', async () => {
        await ITO.start();
        try {
          await ITO.start();
        } catch (e) {
          expect(e.message).to.be.contain('can not restart');
        }
      });
    });

    describe('close', () => {
      it('must be started', async () => {
        try {
          await ITO.close();
        } catch (e) {
          expect(e.message).to.be.contain('not yet started');
        }
      });

      it('re-close', async () => {
        await ITO.start();
        await ITO.close();
        try {
          await ITO.close();
        } catch (e) {
          expect(e.message).to.be.contain('ended');
        }
      });

      it('close & trigger event', async () => {
        await ITO.start();
        const res = await ITO.close();
        expect(res).to.emit(ITO, 'OnSaleEnded');
        expect(await ITO.endTime()).to.be.gt(ethers.BigNumber.from(0));
      });
    });

    // add to allowlist
    describe('started', () => {
      beforeEach(async () => {
        await ITO.start();
      });

      it('started, can not restart', async () => {
        try {
          await ITO.start();
        } catch (e) {
          expect(e.message).to.be.contain('can not restart');
        }
      })

      // it('can not add address after started', async () => {
      //   try {
      //     await ITO.addAllow(PublicBuyer1.address);
      //   } catch (e) {
      //     expect(e.message).to.be.contain('sale started');
      //   }
      // });

      it('can add address on sale time', async () => {
        const totalBefore = await ITO.total();
        await ITO.addAllow(PublicBuyer1.address);
        const currentTotal = await ITO.total();
        expect(currentTotal, 'increase 1 address').to.be.eq(totalBefore.add(1));
        expect(await ITO.isAllow(PublicBuyer1.address)).to.be.eq(true);
      });

      it('not in allowlist', async () => {
        try {
          await ITO.connect(PrivateBuyer1).buy(USDT.address, 1000);
        } catch (e) {
          expect(e.message).to.be.contain('not in allowlist')
        }
      });

      it('in allowlist', async () => {
        const stableDecimals = ethers.BigNumber.from(10).pow(await USDT.decimals());
        const usd = ethers.BigNumber.from(1000).mul(stableDecimals); // $1000
        const total = await calcToken(usd, stableDecimals);

        await USDT.connect(SeedBuyer1).approve(ITO.address, usd);

        expect(await ITO.totalSupply()).to.be.eq(ethers.BigNumber.from(0));
        await ITO.connect(SeedBuyer1).buy(USDT.address, total);
        expect(await ITO.totalSupply()).to.be.eq(total);
      });

      // SALE scenario
      it('multiple saler', async () => {
        const stableDecimals = ethers.BigNumber.from(10).pow(await USDT.decimals());
        const usd = ethers.BigNumber.from(1000).mul(stableDecimals); // $1000
        const total = await calcToken(usd, stableDecimals);

        await USDT.connect(SeedBuyer1).approve(ITO.address, usd);
        await USDT.connect(SeedBuyer2).approve(ITO.address, usd);

        await ITO.connect(SeedBuyer1).buy(USDT.address, total);
        await ITO.connect(SeedBuyer2).buy(USDT.address, total);
        expect(await ITO.totalSupply()).to.be.eq(total.mul(2));
      });

      // buyFor
      it('buy for', async () => {
        const usd = ethers.BigNumber.from(1000).mul(DECIMALS); // $1000
        const total = await calcToken(usd);
        
        await ITO.buyFor(SeedBuyer1.address, total);
        expect(await ITO.totalSupply()).to.be.eq(total);
        expect(await ITO.balanceOf(SeedBuyer1.address)).to.be.eq(total);
      });

      // it('buy mutiple times', async () => {

      // });

      // buy & exceeds token limit
      it('buy & exceeds token limit', async () => {
        // ..
      });

      it('buy & exceeds', async () => {
        const usd = ethers.BigNumber.from(1000).mul(10 ** 6); // $1000
        const total = await calcToken(usd, 10 ** 6);

        const balanceSeed1 = await USDT.balanceOf(SeedBuyer1.address);

        await USDT.connect(SeedBuyer1).approve(ITO.address, usd);
        await ITO.connect(SeedBuyer1).buy(USDT.address, total);

        const quantity = await ITO.quantity();
        const remain = quantity.sub(await ITO.totalSupply());
        const total2 = remain.add(ethers.BigNumber.from(1000).mul(DECIMALS));

        const price = await ITO.price();
        const spent = total2.div(price).mul(DECIMALS);

        // mint
        await USDT.mint(SeedBuyer2.address, ethers.BigNumber.from(spent));
        const balanceSeed2 = await USDT.balanceOf(SeedBuyer2.address);

        await USDT.connect(SeedBuyer2).approve(ITO.address, spent);
        await ITO.connect(SeedBuyer2).buy(USDT.address, total2);
        expect(await ITO.totalSupply()).to.be.eq(quantity);

        const remainSeed1 = balanceSeed1.sub(usd);

        const totalUSDSpentBySeed2 = balanceSeed2.sub(await USDT.balanceOf(SeedBuyer2.address));
        
        expect(await USDT.balanceOf(SeedBuyer1.address)).to.be.eq(remainSeed1);
        expect(remain).to.be.eq(await calcToken(totalUSDSpentBySeed2, 10 ** 6));

        // auto close
        expect(await ITO.endTime()).to.be.gt(ethers.BigNumber.from(0));

        expect(await USDT.balanceOf(ITO.address)).to.be.eq(usd.add(totalUSDSpentBySeed2));

        // try to buy
        try {
          await ITO.connect(SeedBuyer1).buy(USDT.address, total);
        } catch (e) {
          expect(e.message).to.be.contain('not in sale time');
        }
      });

      it('withdraw too early', async () => {
        try {
          await ITO.withdraw(EcoSystemWallet.address);
        } catch (e) {
          expect(e.message).to.be.contain('sale is not ended');
        }
      });

      it('buy & withdraw to wallet', async () => {
        const stableDecimals = ethers.BigNumber.from(10).pow(await USDT.decimals());
        const usd = ethers.BigNumber.from(250_000).mul(stableDecimals);
        const total = await calcToken(usd, stableDecimals);
        await USDT.mint(SeedBuyer1.address, usd);

        await USDT.connect(SeedBuyer1).approve(ITO.address, usd);
        await ITO.connect(SeedBuyer1).buy(USDT.address, total);

        expect(await ITO.endTime()).to.be.gt(ethers.BigNumber.from(0));

        const balanceOfEco = await USDT.balanceOf(EcoSystemWallet.address);
        const totalInUSDT = await USDT.balanceOf(ITO.address);
        await ITO.withdraw(EcoSystemWallet.address);

        const newBalanceOfEco = await USDT.balanceOf(EcoSystemWallet.address);
        expect(newBalanceOfEco).to.be.eq(balanceOfEco.add(totalInUSDT));
      });

      // buy usdt & busd together
      it('buy usdt & busd together', async () => {
        const usdt = ethers.BigNumber.from(1000).mul(10 ** 6);
        const busd = ethers.BigNumber.from(1200).mul(DECIMALS);

        await USDT.connect(SeedBuyer1).approve(ITO.address, usdt);
        await BUSD.connect(SeedBuyer2).approve(ITO.address, busd);
        await BUSD.connect(SeedBuyer1).approve(ITO.address, busd);

        // initial balance
        const usdtBalanceOfSeed1 = await USDT.balanceOf(SeedBuyer1.address);
        const busdBalanceOfSeed1 = await BUSD.balanceOf(SeedBuyer1.address);
        const busdBalanceOfSeed2 = await BUSD.balanceOf(SeedBuyer2.address);

        const totalTokenViaUsdt = await calcToken(usdt, 10 ** 6);
        const totalTokenViaBusd = await calcToken(busd);

        await ITO.connect(SeedBuyer1).buy(USDT.address, totalTokenViaUsdt);
        await ITO.connect(SeedBuyer2).buy(BUSD.address, totalTokenViaBusd);
        await ITO.connect(SeedBuyer1).buy(BUSD.address, totalTokenViaBusd);

        expect(await BUSD.balanceOf(SeedBuyer1.address)).to.be.eq(busdBalanceOfSeed1.sub(busd));
        expect(await BUSD.balanceOf(SeedBuyer2.address)).to.be.eq(busdBalanceOfSeed2.sub(busd));
        expect(await USDT.balanceOf(SeedBuyer1.address)).to.be.eq(usdtBalanceOfSeed1.sub(usdt));

        // total busd/usdt in sale
        expect(await BUSD.balanceOf(ITO.address)).to.be.eq(busd.add(busd));
        expect(await USDT.balanceOf(ITO.address)).to.be.eq(usdt);

        // total token TGE
        expect(await ITO.balanceOf(SeedBuyer1.address)).to.be.eq(totalTokenViaUsdt.add(totalTokenViaBusd));
        expect(await ITO.balanceOf(SeedBuyer2.address)).to.be.eq(totalTokenViaBusd);
        expect(await ITO.totalSupply()).to.be.eq(totalTokenViaUsdt.add(totalTokenViaBusd.mul(2)));
      });
    });

    describe('claim', async () => {
      const tenThousandDollar = ethers.BigNumber.from(1000).mul(DECIMALS);
      const halfDollar = ethers.BigNumber.from(3).mul(DECIMALS).div(10000000);
      
      beforeEach(async () => {

        await ITO.start();

        // we need $125000 in seed round
        const totalToken = await calcToken(tenThousandDollar);
        const totalTokenByHalfDollar = await calcToken(halfDollar); // we need check if someone buy a mount that it can not divisor

        await BUSD.connect(SeedBuyer1).approve(ITO.address, tenThousandDollar.add(halfDollar));
        await BUSD.connect(SeedBuyer2).approve(ITO.address, tenThousandDollar.sub(halfDollar));
        
        await ITO.connect(SeedBuyer1).buy(BUSD.address, totalToken.add(totalTokenByHalfDollar));
        await ITO.connect(SeedBuyer2).buy(BUSD.address, totalToken.sub(totalTokenByHalfDollar));
      });

      it('must be end of sale to claim', async () => {
        try {
          await ITO.claims();
        } catch (e) {
          expect(e.message).to.be.contain('not ready to claim');
        }
  
        // enable claim
        try {
          await ITO.enableClaim();
        } catch(e) {
          expect(e.message).to.be.contain('must be ended');
        }
      });

      describe('unlock', async () => {

        beforeEach(async () => {
          const price = await ITO.price();
          const total = (await ITO.quantity()).div(price).mul(DECIMALS);

          const remain = total.sub(tenThousandDollar.mul(2)); // s1 & s2 buyed

          await USDT.mint(SeedBuyer1.address, remain);
          await USDT.connect(SeedBuyer1).approve(ITO.address, remain);

          const quantity = await ITO.quantity();
          const totalBuyedSeed1 = await ITO.balanceOf(SeedBuyer1.address);
          const totalBuyedSeed2 = await ITO.balanceOf(SeedBuyer2.address);
          await ITO.connect(SeedBuyer1).buy(USDT.address, quantity.sub(totalBuyedSeed1).sub(totalBuyedSeed2));
        });

        it('can claim and unlock 2%', async () => {
          const totalTokenBuyedBySeed1 = await ITO.balanceOf(SeedBuyer1.address);

          expect(await ITO.endTime()).to.be.gt(ethers.BigNumber.from(0));
          await ITO.enableClaim();

          expect(await ITO.unlockBalanceOf(SeedBuyer1.address),
            'first lock is 2%').to.be.eq(totalTokenBuyedBySeed1.mul(2).div(100));
        });

        it('can not claim without enable', async () => {
          try {
            await ITO.claims();
          } catch (e) {
            expect(e.message).to.be.contain('not ready to claim');
          }
        });

        describe('start claim', () => {
          let totalLockSeed1, totalLockSeed2;
          let initBalanceSeed1;
          let totalPreUnlockSeed1;
          beforeEach(async () => {
            totalLockSeed1 = await ITO.balanceOf(SeedBuyer1.address);
            totalLockSeed2 = await ITO.balanceOf(SeedBuyer2.address);
            initBalanceSeed1 = await TOKEN.balanceOf(SeedBuyer1.address);

            await ITO.enableClaim();

            totalPreUnlockSeed1 = await ITO.unlockBalanceOf(SeedBuyer1.address);
          });

          it('unlock', async () => {
            // time travel

            // const latest = await ethers.provider.getBlockNumber();
            // const blockInfo = await ethers.provider.getBlock(latest);

            const totalLockedRemaining = totalLockSeed1.sub(totalPreUnlockSeed1);
            const pricePerTranche = totalLockedRemaining.div(12 * 30 * 86400 / (30 * 86400));

            // start claim
            const startClaimTime = await ITO.startClaimTime();

            // // // after 1 day
            expect(await ITO.unlockable(SeedBuyer1.address, startClaimTime.add(86400))).to.be.eq(totalPreUnlockSeed1);
            expect(await ITO.unlockable(SeedBuyer1.address, startClaimTime.add(86400 * 30))).to.be.eq(totalPreUnlockSeed1);

            expect(await ITO.unlockable(SeedBuyer1.address, startClaimTime.add(86400 * 31))).to.be.eq(totalPreUnlockSeed1);

            // 2 ys, full unlock
            expect(await ITO.unlockable(SeedBuyer1.address, startClaimTime.add(86400 * 365 * 2))).to.be.eq(totalLockSeed1);

            // 3month + 1hr
            expect(await ITO.unlockable(SeedBuyer1.address, startClaimTime.add(86400 * 30 * 3 + 60 * 60)))
              .to.be.eq(totalPreUnlockSeed1.add(pricePerTranche));

            // 3M + 1M
            expect(await ITO.unlockable(SeedBuyer1.address, startClaimTime.add(86400 * 30 * 4)))
              .to.be.eq(totalPreUnlockSeed1.add(pricePerTranche.mul(2)));

            // 3M + 2M
            const timeToTranche = (time) => ethers.BigNumber.from(time).div(30 * 86400).add(1);
            expect(await ITO.unlockable(SeedBuyer1.address, startClaimTime.add(86400 * 30 * 3 + 86400 * 30 * 2)))
              .to.be.eq(totalPreUnlockSeed1.add(pricePerTranche.mul(timeToTranche(86400 * 30 * 2))));

            // 3M + 31d
            expect(await ITO.unlockable(SeedBuyer1.address, startClaimTime.add(86400 * 30 * 3 + 86400 * 31)))
                .to.be.eq(totalPreUnlockSeed1.add(pricePerTranche.mul(timeToTranche(86400 * 31))));

            // in realtime
            // step0: claim in 1week
            // step1: claim in 3month (1week)
            // step2: claim in 3day (3day)
            // step3: claim in 1month
            // step4: claim in 2 year

            // step0
            await network.provider.send("evm_increaseTime", [86400 * 7]);
            const claims0 = await ITO.connect(SeedBuyer1).claims();
            const newBalance0 = await TOKEN.balanceOf(SeedBuyer1.address);
            const preUnlock = totalLockSeed1.mul(await ITO.firstUnlock()).div(DECIMALS.mul(100));
            expect(newBalance0.sub(initBalanceSeed1), 'increase = preunlock').to.be.eq(
              preUnlock
            );
            // nothing to claims
            expect(claims0, 'too early, nothing to claims')
              .to.emit(ITO, 'OnClaim')
              .withArgs(SeedBuyer1.address, ethers.BigNumber.from(0));
              
            // step1
            await network.provider.send("evm_increaseTime", [86400 * 30 * 3]);
            const claims1 = await ITO.connect(SeedBuyer1).claims();
            const totalUnlockInClaim1 = pricePerTranche;
            expect(claims1, 'total unlocked after 1 week + 3 months')
              .to.emit(ITO, 'OnClaim')
              .withArgs(SeedBuyer1.address, totalUnlockInClaim1);
            
            // total
            const newBalance1 = await TOKEN.balanceOf(SeedBuyer1.address);
            expect(newBalance1.sub(initBalanceSeed1), 'increase = prelock + 1week')
              .to.be.eq(preUnlock.add(totalUnlockInClaim1));

            // step2
            await network.provider.send("evm_increaseTime", [86400 * 3]);
            const claims2 = await ITO.connect(SeedBuyer1).claims();
            const totalUnlockInClaim2 = 0;
            expect(claims2, 'total unlocked after 3 days')
              .to.emit(ITO, 'OnClaim')
              .withArgs(SeedBuyer1.address, totalUnlockInClaim2);
            const newBalance2 = await TOKEN.balanceOf(SeedBuyer1.address);
            expect(newBalance2.sub(initBalanceSeed1), 'increase = prelock + 1 week 3 days')
              .to.be.eq(preUnlock.add(totalUnlockInClaim1));

            // reclaim
            const claims2x = await ITO.connect(SeedBuyer1).claims();
            expect(claims2x, 'nothing to reclaim')
              .to.emit(ITO, 'OnClaim')
              .withArgs(SeedBuyer1.address, ethers.BigNumber.from(0));

            // step3
            await network.provider.send("evm_increaseTime", [86400 * 30]);
            const claims3 = await ITO.connect(SeedBuyer1).claims();
            const totalUnlockInClaim3 = pricePerTranche;
            expect(claims3, 'total unlocked after 1 month')
              .to.emit(ITO, 'OnClaim')
              .withArgs(SeedBuyer1.address, totalUnlockInClaim3);
            
            const newBalance3 = await TOKEN.balanceOf(SeedBuyer1.address);
              expect(newBalance3.sub(initBalanceSeed1), 'increase = prelock + 2 month')
                .to.be.eq(preUnlock.add(pricePerTranche.mul(2)));

            // step4
            await network.provider.send("evm_increaseTime", [86400 * 365 * 2]);
            
            const totalUnlockInClaim4 = await ITO.balanceOf(SeedBuyer1.address);
            const claims4 = await ITO.connect(SeedBuyer1).claims();
            expect(claims4, 'total unlocked remaining')
              .to.emit(ITO, 'OnClaim')
              .withArgs(SeedBuyer1.address, totalUnlockInClaim4);
            const newBalance4 = await TOKEN.balanceOf(SeedBuyer1.address);
            expect(newBalance4,'full unlock').to.be.eq(totalLockSeed1.add(initBalanceSeed1));

          });
        });

        
      })
    });
  });


});