// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import './interfaces/IToken.sol';

import "hardhat/console.sol";

// lock eco / advisor / team ...
contract InternalTokenLock is AccessControl {

  using SafeMath for uint256;

  bytes32 public constant GAME_REWARD_ROLE = keccak256("GAME_REWARD_ROLE");
  bytes32 public constant MARKETING_ROLE = keccak256("MARKETING_ROLE");
  bytes32 public constant LIQUIDITY_ROLE = keccak256("LIQUIDITY_ROLE");
  bytes32 public constant ECOSYSTEM_ROLE = keccak256("ECOSYSTEM_ROLE");
  bytes32 public constant TEAM_ROLE = keccak256("TEAM_ROLE");
  bytes32 public constant ADVISOR_ROLE = keccak256("ADVISOR_ROLE");

  constructor(
    IToken token_
  ) {
    _token = token_;

    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _setupRole(GAME_REWARD_ROLE, msg.sender);
    _setupRole(MARKETING_ROLE, msg.sender);
    _setupRole(LIQUIDITY_ROLE, msg.sender);
    _setupRole(ECOSYSTEM_ROLE, msg.sender);
    _setupRole(TEAM_ROLE, msg.sender);
    _setupRole(ADVISOR_ROLE, msg.sender);
  }

  IToken internal _token;

  function token() public view returns(address) {
    return address(_token);
  }

  uint256 constant public DECIMALS = 10 ** 18;

  //////////////////////////////
  // GAME Vesting Schedule
  //////////////////////////////

  uint256 constant public GAME_REWARD = 150000000 * DECIMALS; // 30%
  uint256 internal _gameReward = 0;
  uint internal _startGameLaunchTime = 0;

  event GameRewardReleased(address receiver, uint256 remain);

  function gameReward() public view returns(uint256) {
    return _gameReward;
  }

  function unlockableGameReward(uint256 ts) public view returns(uint256) {
    // is not started yet
    if (_startGameLaunchTime == 0) return 0;

    uint _currentTranche = (ts - _startGameLaunchTime) / (3 * 30 * 86400) + 1; // per quarter
    uint256 _tokenPerTranche = GAME_REWARD * 5 / 100; // 5% per quarter
    uint256 _total = _currentTranche * _tokenPerTranche;
    if (_total > GAME_REWARD) {
      _total = GAME_REWARD;
    }

    uint256 remain = _total - _gameReward;
    // _gameReward = _gameReward + remain;

    return remain;
  }

  // 5% per quater
  function unlockGameReward(address receiver) public onlyRole(GAME_REWARD_ROLE) {
    require(_gameReward < GAME_REWARD, "InternalTokenLock: end of unlock");
    require(_token.balanceOf(address(this)) > 0);

    if (_startGameLaunchTime == 0) {
      _startGameLaunchTime = block.timestamp;
    }

    uint256 remain = this.unlockableGameReward(block.timestamp);
    _gameReward = _gameReward + remain;

    _token.transfer(receiver, remain);

    emit GameRewardReleased(receiver, remain);
  }


  //////////////////////////////
  // Free Bounty
  //////////////////////////////
  uint256 constant public FREE_BOUNTY = 500000 * DECIMALS; // 0.1%
  uint256 internal _freeBounty = 0;
  event FreeBountyReleased(address receiver, uint256 total);

  function freeBounty() public view returns(uint256) {
    return _freeBounty;
  }

  function unlockFreeBounty(address receiver) public onlyRole(DEFAULT_ADMIN_ROLE) {
    require(_freeBounty==0, "Bounty has been unlocked");

    _freeBounty = FREE_BOUNTY;
    _token.transfer(receiver, FREE_BOUNTY);

    emit FreeBountyReleased(receiver, _freeBounty);
  }


  //////////////////////////////
  // Marketing
  //////////////////////////////
  uint256 constant public MARKETING = 42000000 * DECIMALS; // 8.4%
  uint256 constant public PREUNLOCK_MARKETING = 840000 * DECIMALS; // 2%
  uint256 internal _marketing = 0;
  uint256 internal _startMarketingTime = 0;
  bool internal _isPreunlockMarketing = false;

  event MarketingReleased(address receiver, uint256 total);

  function marketing() public view returns(uint256) {
    return _marketing;
  }

  function startMarketingTime() public view returns(uint) {
    return _startMarketingTime;
  }

  function unlockableMarketing(uint ts) public view returns(uint256) {
    if (_startMarketingTime == 0) return 0;

    uint _currentTranche = (ts - _startMarketingTime) / (30 * 86400); // per quarter
    uint256 _tokenPerTranche = 2287000 * DECIMALS; // (MARKETING - _initial) / 18; // 5% per quarter ~ 2.286.666,6666666665
    uint256 _total = _currentTranche * _tokenPerTranche;

    if (_total >= MARKETING - PREUNLOCK_MARKETING) {
      return MARKETING - PREUNLOCK_MARKETING;
    }

    return _total;
  }

  function preunlockMarketing(address receiver) public onlyRole(MARKETING_ROLE) {
    require(_marketing < MARKETING, "InternalTokenLock: end of unlock");
    require(_token.balanceOf(address(this)) > 0);
    require(!_isPreunlockMarketing, "InternalTokenLock: preunlocked");

    uint256 amount = PREUNLOCK_MARKETING;
    _marketing = amount;
    _isPreunlockMarketing = true;
    _startMarketingTime = block.timestamp;
    _token.transfer(receiver, amount);

    emit MarketingReleased(receiver, amount);
  }

  function unlockMarketing(address receiver) public onlyRole(MARKETING_ROLE) {
    require(_marketing < MARKETING, "InternalTokenLock: end of unlock");
    require(_token.balanceOf(address(this)) > 0);
    require(_isPreunlockMarketing, "InternalTokenLock: preunlock is not run");

    uint256 total = this.unlockableMarketing(block.timestamp);
    uint256 remain = total + PREUNLOCK_MARKETING - _marketing;
    if (remain > 0) {
      _marketing = _marketing.add(remain);
      _token.transfer(receiver, remain);
    }

    emit MarketingReleased(receiver, remain);
  }



  //////////////////////////////
  // Liquidity
  //////////////////////////////
  uint256 constant public LIQUIDITY = 70000000 * DECIMALS; // 14%
  uint256 constant public PREUNLOCK_LIQUIDITY = 3500000 * DECIMALS;
  uint256 internal _liquidity = 0;
  uint256 internal _startLiquidityTime = 0;
  bool internal _isPreunlockLiquidity = false;

  event LiquidityReleased(address receiver, uint256 total);

  function liquidity() public view returns(uint256) {
    return _liquidity;
  }

  function startLiquidityTime() public view returns(uint) {
    return _startLiquidityTime;
  }

  function unlockableLiquidity(uint ts) public view returns(uint256) {
    if (_startLiquidityTime == 0) return 0;

    uint _currentTranche = (ts - _startLiquidityTime) / (30 * 86400); // per quarter
    uint256 _tokenPerTranche = 5542000 * DECIMALS; // 5.541.666,666666667
    uint256 _total = _currentTranche * _tokenPerTranche;

    if (_total >= LIQUIDITY - PREUNLOCK_LIQUIDITY) {
      return LIQUIDITY - PREUNLOCK_LIQUIDITY;
    }

    return _total;
  }

  function preunlockLiquidity(address receiver) public onlyRole(LIQUIDITY_ROLE) {
    require(_marketing < LIQUIDITY, "InternalTokenLock: end of unlock");
    require(_token.balanceOf(address(this)) > 0);
    require(!_isPreunlockLiquidity);

    uint256 amount = PREUNLOCK_LIQUIDITY;
    _liquidity = amount;
    _isPreunlockLiquidity = true;
    _startLiquidityTime = block.timestamp;
    _token.transfer(receiver, amount);

    emit LiquidityReleased(receiver, amount);
  }

  function unlockLiquidity(address receiver) public onlyRole(LIQUIDITY_ROLE) {
    require(_liquidity < LIQUIDITY, "InternalTokenLock: end of unlock");
    require(_token.balanceOf(address(this)) > 0);
    require(_isPreunlockLiquidity, "InternalTokenLock: preunlock is not run");

    uint256 total = this.unlockableLiquidity(block.timestamp);
    uint256 remain = total + PREUNLOCK_LIQUIDITY - _liquidity;
    if (remain > 0) {
      _liquidity = _liquidity.add(remain);
      _token.transfer(receiver, remain);
    }

    emit LiquidityReleased(receiver, remain);
  }

  
  //////////////////////////////
  // Ecosystem &  Team & Advisor
  //////////////////////////////
  uint256 public constant LOCK_TIME = 6 * 30 * 86400; // 6 month
  uint256 public constant ECOSYSTEM = 50000000 * DECIMALS;
  uint256 public constant ECOSYSTEM_PER_TRANCHE = 833334 * DECIMALS; // 833.333,3333333333
  uint256 public constant TEAM = 65000000 * DECIMALS;
  uint256 public constant TEAM_PER_TRANCHE = 6500000 * DECIMALS; // 10% quarterly
  uint256 public constant ADVISOR = 20000000 * DECIMALS;
  uint256 public constant ADVISOR_PER_TRANCHE = 2000000 * DECIMALS; // 10% quarterly

  uint internal _startLockTime = 0;

  uint256 internal _ecosystem = 0;
  uint256 internal _team = 0;
  uint256 internal _advisor = 0;

  function ecosystem() public view returns(uint256) {
    return _ecosystem;
  }

  function team() public view returns(uint256) {
    return _team;
  }

  function advisor() public view returns(uint256) {
    return _advisor;
  }

  function startLock() public onlyRole(DEFAULT_ADMIN_ROLE)  {
    require(_startLockTime == 0, 'InternalTokenLock: started');
    _startLockTime = block.timestamp;
  }

  function unlockableEcosystem(uint ts) public view returns(uint256) {
    if (_startLockTime == 0) return 0;
    if (ts < _startLockTime) return 0;

    // 6 months lock
    if (ts - _startLockTime < LOCK_TIME) return 0;

    uint currentTranche = (ts - _startLockTime - LOCK_TIME) / (30 * 86400) + 1; // unlock monthly
    uint256 total = currentTranche * ECOSYSTEM_PER_TRANCHE;
    if (total >= ECOSYSTEM) {
      return ECOSYSTEM;
    }

    return total;
  }

  event EcosystemReleased(address receiver, uint256 amount);
  function unlockEcosystem(address receiver) public onlyRole(ECOSYSTEM_ROLE) {
    require(_startLockTime != 0, 'InternalTokenLock: not started');
    require(_ecosystem < ECOSYSTEM, 'InternalTokenLock: end of unlock');

    uint256 total = this.unlockableEcosystem(block.timestamp);
    uint256 remain = total - _ecosystem;
    if (remain > 0) {
      _ecosystem = _ecosystem + remain;
      _token.transfer(receiver, remain);
    }
    
    emit EcosystemReleased(receiver, remain);
  }

  function unlockableTeam(uint ts) public view returns(uint256) {
    if (_startLockTime == 0) return 0;
    if (ts < _startLockTime) return 0;

    // 6 months lock
    if (ts - _startLockTime < LOCK_TIME) return 0;

    uint256 QUARTERLY = 3 * 30 * 86400;
    uint256 currentTranche = (ts - _startLockTime - LOCK_TIME) / QUARTERLY + 1;
    uint256 total = currentTranche * TEAM_PER_TRANCHE;

    if (total >= TEAM) {
      return TEAM;
    }

    return total;
  }

  event TeamReleased(address receiver, uint256 amount);
  function unlockTeam(address receiver) public onlyRole(TEAM_ROLE) {
    require(_startLockTime != 0, 'InternalTokenLock: not started');
    require(_team < TEAM, 'InternalTokenLock: end of unlock');

    uint256 total = this.unlockableTeam(block.timestamp);
    uint256 remain = total - _team;
    if (remain > 0) {
      _team = _team + remain;
      _token.transfer(receiver, remain);
    }
    
    emit TeamReleased(receiver, remain);
  }

  function unlockableAdvisor(uint ts) public view returns(uint256) {
    if (_startLockTime == 0) return 0;
    if (ts < _startLockTime) return 0;

    // 6 months lock
    if (ts - _startLockTime < LOCK_TIME) return 0;

    uint QUARTERLY = 3 * 30 * 86400;
    uint currentTranche = (ts - _startLockTime - LOCK_TIME) / QUARTERLY + 1;
    uint256 total = currentTranche * ADVISOR_PER_TRANCHE;

    if (total >= ADVISOR) {
      return ADVISOR;
    }

    return total;
  }

  event AdvisorReleased(address receiver, uint256 amount);
  function unlockAdvisor(address receiver) public onlyRole(ADVISOR_ROLE) {
    require(_startLockTime != 0, 'InternalTokenLock: not started');
    require(_advisor < ADVISOR, 'InternalTokenLock: end of unlock');

    uint256 total = this.unlockableAdvisor(block.timestamp);
    uint256 remain = total - _advisor;
    if (remain > 0) {
      _advisor = _advisor + remain;
      _token.transfer(receiver, remain);
    }
    
    emit AdvisorReleased(receiver, remain);
  }
}
