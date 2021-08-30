// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import './KWS.sol';

// lock eco / advisor / team ...
contract InternalTokenLock {

  using SafeMath for uint256;

  KWS internal _token;

  function token() public view returns(address) {
    return address(_token);
  }

  address internal _owner;
  constructor(
    KWS token_,

    address advisorWallet_,
    address ecoSystemWallet_,
    address teamWallet_,
    address liqWallet_
  ) {
    _token = token_;

    _advisorWallet = advisorWallet_;
    _ecoSystemWallet = ecoSystemWallet_;
    _teamWallet = teamWallet_;
    _liqWallet = liqWallet_;

    _owner = msg.sender;
  }

  uint internal _startTime = 0;
  function startTime() public view returns(uint) {
    return _startTime;
  }

  uint256 _preUnlockLiq = 0;
  function start() public {
    require(_startTime == 0);
    require(_owner == msg.sender);

    _startTime = block.timestamp;

    // pre unlock liq 2%
    _liqUnlocked = LIQ * 2 / 100;
    _preUnlockLiq = _liqUnlocked;
    _token.mint(_liqWallet, _liqUnlocked);
    emit OnLiquidity(block.timestamp, _liqUnlocked);
  }

  uint256 constant public DECIMALS = 10 ** 18;
  uint256 constant public ADVISOR = 12000000000 * DECIMALS; // 12%
  uint256 constant public ECOSYSTEM = 36000000000 * DECIMALS; // 36%
  uint256 constant public TEAM = 22000000000 * DECIMALS; // 22%
  uint256 constant public LIQ = 10000000000 * DECIMALS; // 10%

  uint256 internal _advisorUnlocked = 0;
  uint256 internal _ecoSystemUnlocked = 0;
  uint256 internal _teamUnlocked = 0;
  uint256 internal _liqUnlocked = 0;

  address internal _advisorWallet;
  address internal _ecoSystemWallet;
  address internal _teamWallet;
  address internal _liqWallet;

  function liquidityUnlocked() public view returns(uint256) {
    return _liqUnlocked;
  }

  function advisorUnlocked() public view returns(uint256) {
    return _advisorUnlocked;
  }

  function ecoSystemUnlocked() public view returns(uint256) {
    return _ecoSystemUnlocked;
  }

  function teamUnlocked() public view returns(uint256) {
    return _teamUnlocked;
  }

  event OnTeamClaim(uint time, uint256 amount);
  event OnEcoClaim(uint time, uint256 amount);
  event OnAdvisorClaim(uint time, uint256 amount);
  event OnLiquidity(uint time, uint256 amount);

  uint internal _currentTranche = 0;
  function currentTranche() public view returns(uint) {
    return _currentTranche;
  }

  function claims() public returns(bool) {
    require(_startTime > 0, 'please start to claims');

    // calc unlock, per 3 month ...
    uint256 deltaTime = (block.timestamp - _startTime) / 30 days;
    uint256 tranche = deltaTime / 3;

    // transfered
    if (tranche <= _currentTranche) {
      revert('claims to early');
    }
    if (_currentTranche >= 16) {
      revert('end of claims');
    }

    _currentTranche++;
    
    if (_currentTranche >= 1) {
      // ECO
      if (_currentTranche <= 16) {
        uint256 totalUnlock = _currentTranche.mul(3).mul(ECOSYSTEM).div(48);
        if (ECOSYSTEM < totalUnlock) {
          totalUnlock = LIQ;
        }

        uint256 totalCanUnlock = totalUnlock - _ecoSystemUnlocked;

        if (totalCanUnlock > 0) {
          _token.mint(_ecoSystemWallet, totalCanUnlock);
          _ecoSystemUnlocked = _ecoSystemUnlocked.add(totalCanUnlock);

          emit OnEcoClaim(block.timestamp, totalCanUnlock);
        }
      }
      
      // LIQ
      if (_currentTranche <= 8) {
        uint256 totalUnlockLIQ = _currentTranche.mul(3).mul(LIQ).div(24).add(_preUnlockLiq);
        if (LIQ < totalUnlockLIQ) {
          totalUnlockLIQ = LIQ;
        }

        uint256 totalCanUnlockLIQ = totalUnlockLIQ - _liqUnlocked;

        if (totalCanUnlockLIQ > 0) {
          _token.mint(_liqWallet, totalCanUnlockLIQ);
          _liqUnlocked = _liqUnlocked.add(totalCanUnlockLIQ);

          emit OnLiquidity(block.timestamp, totalCanUnlockLIQ);
        }
      }
    }

    if (_currentTranche >= 2) {
      // calc eco unlock
      if (_currentTranche <= 6) {
        uint256 totalUnlock = _currentTranche.mul(3).mul(ADVISOR).div(18);
        if (ADVISOR < totalUnlock) {
          totalUnlock = ADVISOR;
        }

        uint256 totalCanUnlock = totalUnlock - _advisorUnlocked;

        if (totalCanUnlock > 0) {
          _token.mint(_advisorWallet, totalCanUnlock);
          _advisorUnlocked = _advisorUnlocked.add(totalCanUnlock);

          emit OnEcoClaim(block.timestamp, totalCanUnlock);
        }
      }
    }

    if (_currentTranche >= 4) {
      if (_currentTranche <= 12) {
        uint256 totalUnlock = _currentTranche.mul(3).mul(TEAM).div(36);
        if (TEAM < totalUnlock) {
          totalUnlock = TEAM;
        }
        uint256 totalCanUnlock = totalUnlock - _teamUnlocked;

        if (totalCanUnlock > 0) {
          _token.mint(_teamWallet, totalCanUnlock);
          _teamUnlocked = _teamUnlocked.add(totalCanUnlock);

          emit OnAdvisorClaim(block.timestamp, totalCanUnlock);
        }
      }
    }
    
    return true;
  }
}
