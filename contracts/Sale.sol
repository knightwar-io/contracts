// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import 'hardhat/console.sol';

import './KWS.sol';

contract Sale {

  using SafeMath for uint256;

  uint256 constant DECIMALS = 10 ** 18;

  // view information, inspired by ERC20
  uint256 internal _totalSupply = 0;

  string internal _name;
  string internal _symbol;

  function name() public view returns(string memory) {
    return _name;
  }

  function symbol() public view returns(string memory) {
    return _symbol;
  }

  function decimals() public pure returns (uint8) {
    return 18; // = DECIMAL of Token (KWS)
  }

  /**
   * total token locked
   */
  function totalSupply() public view returns(uint256) {
    return _totalSupply;
  }

  mapping(address => uint256) _balances;
  mapping(address => uint256) _unlockedBalances;
  function balanceOf(address account) public view returns(uint256) {
    return _balances[account];
  }

  function unlockBalanceOf(address account) public view returns(uint256) {
    return _unlockedBalances[account];
  }

  uint internal _startTime = 0;
  uint internal _endTime = 0;

  function startTime() public view returns(uint) {
    return _startTime;
  }

  function endTime() public view returns(uint) {
    return _endTime;
  }

  address internal _owner;
  modifier onlyOwner() {
    require(_owner == msg.sender);
    _;
  }

  event OnSaleStarted(uint eventTime_);
  event OnSaleEnded(uint eventTime_);

  event OnClaim(address indexed target, uint256 amount);

  event OnSold(address indexed investor, address indexed stable, uint256 token);
  event OnSoldFor(address indexed investor, uint256 token);

  uint256 internal _hardCap;
  function hardCap() public view returns(uint256) {
    return _hardCap;
  }

  uint256 internal _quantity;
  function quantity() public view returns(uint256) {
    return _quantity;
  }

  ERC20 usdt;
  ERC20 busd;

  uint internal _firstUnlock = 0;

  // first unlock per %
  function firstUnlock() public view returns(uint) {
    return _firstUnlock;
  }

  uint internal _lockTime = 0; // 3m = 90d
  function lockTime() public view returns(uint) {
    return _lockTime;
  }

  uint _totalTime = 1;
  uint _totalTranche = 1;

  function timePerTranche() public view returns(uint) {
    return _totalTime.div(_totalTranche);
  }

  constructor(
    string memory name_,
    string memory symbol_,
    uint256 quantity_,
    uint256 hardCap_,
    ERC20 usdt_,
    ERC20 busd_,

    // 0-th
    uint firstUnlock_, // %, 12,5% -> 12,5 * 10 ^ 18, 100% = 100 * 10 ^ 18

    uint totalTime_, // total time to full unlock
    uint totalTranche_,
    uint lockTime_
  ) {
    _name = name_;
    _symbol = symbol_;
    _owner = msg.sender;
    _quantity = quantity_;
    _hardCap = hardCap_;
    usdt = usdt_;
    busd = busd_;

    _firstUnlock = firstUnlock_;
    _totalTime = totalTime_;
    _totalTranche = totalTranche_;
    _lockTime = lockTime_;
  }

  uint256 internal _price;
  function price() public view returns(uint256) {
    return _price;
  }

  // number token per $1
  // 10^-4 * 10 ^ 18 / 10 ^ 18
  // price DECIMALS = 18, Note: Decimal USD is 6 but we use 18
  function setPrice(uint256 price_) public onlyOwner() {
    require(_startTime == 0, "Sale closed or running");
    require(price_ > 0, 'price must be > 0');
    _price = price_;
  }

  KWS internal _token;
  function token() public view returns(address) {
    return address(_token);
  }

  function setToken(KWS token_) public onlyOwner {
    require(_endTime == 0); // not ended
    _token = token_;
  }

  // allow list
  uint internal _total = 0;
  mapping(uint => address) internal _addresses;
  mapping(address => uint256) internal _allowLimits; // number tokens to buy
  mapping(address => bool) internal _allows;

  function isAllow(address account) public view returns(bool) {
    return _allows[account];
  }

  function limitToBuyOf(address account) public view returns(uint256) {
    if (_allows[account]) {
      return _allowLimits[account];
    }

    return 0;
  }

  function investors() public view returns(address[] memory) {
    address[] memory items = new address[](_total);

    uint j = 0;
    for (uint i = 0; i < _total; ++i) {
      if (_allows[_addresses[i]]) {
        items[j++] = _addresses[i];
      }
    }

    return items;
  }

  /**
   * total addresses
   */
  function total() public view returns(uint) {
    return _total;
  }

  function addAllow(address account) public onlyOwner() {
    // // require(_endTime > 0, 'sale closed');
    // require(_allows[account] == false, 'already added'); // not in whitelist
    // require(_total + 1 > _total); // overflow check
    
    // _allows[account] = true;
    // _addresses[_total] = account;
    // ++_total;

    _addAllowWithLimit(account, quantity());
  }

  function addAllowWithLimit(address account, uint256 totalToken) public onlyOwner() {
    _addAllowWithLimit(account, totalToken);
  }

  function _addAllowWithLimit(address account, uint256 totalToken) internal {
    // require(_endTime > 0, 'sale closed');
    require(! _allows[account], 'already added'); // not in whitelist
    require(_total + 1 > _total); // overflow check
    require(totalToken > 0, 'total token must be greather than 0');

    _allows[account] = true;
    _addresses[_total] = account;
    _allowLimits[account] = totalToken;
    ++_total;
  }

  function removeAllow(address account) public onlyOwner() {
    // require(_endTime == 0, 'can not remove after close a sale event');
    require(_allows[account]);
    require(_total > 0);

    // find index
    for (uint i = 0; i < _total; ++i) {
      if (_addresses[i] == account) {
        _addresses[i] = _addresses[_total - 1];
        _allowLimits[account] = 0;
        _total = _total - 1;
        _allows[account] = false;

        // remove
        _totalSupply = _totalSupply.sub(_balances[account]);
        _balances[account] = 0;
        break;
      }
    }
  }

  /**
   * SALE LOGIC
   */
  
  /**
   * start sale
   */
  function start() public onlyOwner() {
    require(address(_token) != address(0), 'token not specified');
    require(_startTime == 0, 'can not restart');
    _startTime = block.timestamp;

    emit OnSaleStarted(_startTime);
  }

  /**
   * close sale
   */
  function close() public onlyOwner() {
    _close();
  }

  function _close() internal {
    require(_startTime > 0, 'not yet started');
    require(_endTime == 0, 'ended');
    _endTime = block.timestamp;
    emit OnSaleEnded(_endTime);
  }
  
  /**
   * amount: amount token to buy ...
   * ...
   */
  function buy(address stable, uint256 amount) public {
    require(_price > 0, 'price must be gt 0');
    require(_startTime > 0 && _endTime == 0, 'not in sale time');
    require(_allows[msg.sender], 'not in allowlist');
    require(stable == address(usdt) || stable == address(busd), 'not allow erc20 token');

    address investor = msg.sender;
    // on sale, mint & transfer to contract address

    // maximum can buy
    uint256 maxCanBuy = _quantity.sub(_totalSupply);
    if (maxCanBuy == 0) {
      // ended
      _close();
      return;
    }

    uint256 actualBuy = amount;
    if (maxCanBuy < amount) {
      actualBuy = maxCanBuy;
    }

    // check buy limit
    uint256 totalCanBuy = 0;
    if (_allowLimits[investor] > 0) {
      uint256 totalBought = _balances[investor];
      if (totalBought < _allowLimits[investor]) {
        totalCanBuy = _allowLimits[investor].sub(totalBought);
      }
    }

    // TODO: check buy limit
    require(actualBuy <= totalCanBuy, 'you are reach limit token can buy');
    uint256 usd = actualBuy.mul(price()).div(DECIMALS); // USD in decimals 18

    ERC20 stableToken = ERC20(stable);

    // because usdt is using decimal 6 => convert to decimal 6 to transfer
    uint256 stableDecimals = 10 ** stableToken.decimals();
    if (DECIMALS > stableDecimals) { // ex: 100 x 10 ^ 18 = 100 x 10 ^ 6 x (18 - 6)
      usd = usd.div(DECIMALS/stableDecimals);
    } else if (DECIMALS < stableDecimals) {
      usd = usd.mul(stableDecimals/DECIMALS);
    }

    require(ERC20(stable).allowance(investor, address(this)) >= usd, 'allowance is not enough to buy');
    require(ERC20(stable).balanceOf(investor) >= usd, 'you can not enough money to buy');

    ERC20(stable).transferFrom(investor, address(this), usd);
    _balances[investor] = _balances[investor].add(actualBuy);
    _totalSupply = _totalSupply.add(actualBuy);

    _token.mint(address(this), actualBuy);

    emit OnSold(investor, stable, actualBuy);
    if (_totalSupply >= _quantity) {
      _close();
    }
  }

  /**
   * buy for
   */
  function buyFor(address receiver, uint256 amount) public onlyOwner() {
    require(_price > 0, 'price must be gt 0');
    require(_startTime > 0 && _endTime == 0, 'not in sale time');

    // assign receiver as investor
    if (!_allows[receiver]) {
      _addAllowWithLimit(receiver, amount);
    }

    address investor = receiver;// msg.sender;
    // on sale, mint & transfer to contract address

    // maximum can buy
    uint256 maxCanBuy = _quantity.sub(_totalSupply);
    if (maxCanBuy == 0) {
      // ended
      _close();
      return;
    }

    uint256 actualBuy = amount;
    if (maxCanBuy < amount) {
      actualBuy = maxCanBuy;
    }

    _balances[investor] = _balances[investor].add(actualBuy);
    _totalSupply = _totalSupply.add(actualBuy);

    _token.mint(address(this), actualBuy);

    emit OnSoldFor(investor, actualBuy);
    if (_totalSupply >= _quantity) {
      _close();
    }
  }

  bool internal claimable = false;

  uint internal _startClaimTime = 0;
  function startClaimTime() public view returns(uint) {
    return _startClaimTime;
  }

  function enableClaim() public onlyOwner {
    require(_endTime > 0, 'must be ended');
    require(! claimable, 'claim started');
    claimable = true;
    _startClaimTime = block.timestamp;

    // start claim
    for (uint i = 0; i < _total; ++i) {
      address target = _addresses[i];
      uint256 release = _balances[target].mul(_firstUnlock).div(100 * DECIMALS);

      if (release > 0) {
        _token.transfer(target, release);
        _balances[target] = _balances[target].sub(release);
        _unlockedBalances[target] = _unlockedBalances[target].add(release);
      }
    }
  }

  /**
   * calc total can unlock
   */
  function unlockable(address investor_, uint currentTime_) public view returns(uint256) {
    if (_balances[investor_] == 0 || currentTime_ <= _startClaimTime) {
      return 0;
    }

    uint256 totalBuyed = _balances[investor_].add(_unlockedBalances[investor_]);
    uint256 totalFirstUnlock = totalBuyed.mul(_firstUnlock).div(100 * DECIMALS);

    if (currentTime_ <= _startClaimTime + _lockTime) {
      return totalFirstUnlock;
    }

    uint deltaTime = currentTime_ - _startClaimTime - _lockTime; // 90 days; // start after 30 day

    // full unlock
    if (deltaTime >= _totalTime) {
      return totalBuyed;
    }

    uint256 totalAfterPreUnlock = totalBuyed.sub(totalFirstUnlock);

    // calc tranche
    uint256 pricePerTranche = totalAfterPreUnlock.div(_totalTranche);

    // currentTranche / totalTranche = deltaTime / totalTime

    // timePerTranche = _totalTime / _totalTranche
    // currentTranche = deltaTime / timePerTranche = deltaTime / (_totalTime / _totalTranche)
    uint currentTranche = deltaTime.mul(_totalTranche).div(_totalTime) + 1;  // a / (b / c) => ac / b, starts with 0
    return currentTranche.mul(pricePerTranche).add(totalFirstUnlock);
  }

  bool internal _pause = false;
  function changeClaimStatus(bool _to) public onlyOwner() {
    _pause = _to;
  }

  function claims() public {
    require(!_pause, 'claim paused');
    require(claimable, 'not ready to claim');

    address investor = msg.sender;
    uint256 totalUnlockable = unlockable(investor, block.timestamp);
    require(totalUnlockable > 0, 'nothing to claim');

    uint256 canClaim = totalUnlockable.sub(_unlockedBalances[investor]);

    if (canClaim > 0) {
      _balances[investor] = _balances[investor].sub(canClaim);
      _unlockedBalances[investor] = _unlockedBalances[investor].add(canClaim);
      _token.transfer(investor, canClaim);
    }

    emit OnClaim(investor, canClaim);
  }

  /**
   * withdraw usdt / busd to wallet
   */
  function withdraw(address _to) public onlyOwner() {
    require(_endTime > 0, 'sale is not ended');

    uint256 totalInBusd = busd.balanceOf(address(this));

    if (totalInBusd > 0) {
      busd.transfer(_to, totalInBusd);
    }

    uint256 totalInUsdt = usdt.balanceOf(address(this));
    if (totalInUsdt > 0) {
      usdt.transfer(_to, totalInUsdt);
    }
  }
}