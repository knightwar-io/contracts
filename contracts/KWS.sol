// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./interfaces/ITokenReceiver.sol";

contract KWS is ERC20PresetMinterPauser, Ownable {
  using Address for address;

  constructor() ERC20PresetMinterPauser("KnightWar Share", "KWS") {}


  uint256 internal _totalMinted = 5 * 10 ** 8 * (10 ** 18);

  /**
   * @dev Creates `amount` new tokens for `to`.
   *
   * See {ERC20-_mint}.
   *
   * Requirements:
   *
   * - the caller must have the `MINTER_ROLE`.
   */
  function mint(address to, uint256 amount) public override(ERC20PresetMinterPauser) {
    require(_totalMinted >= amount, "KWS: Reach total supply");
    ERC20PresetMinterPauser.mint(to, amount);
    _totalMinted = _totalMinted - amount;
  }

  mapping(address => bool) internal _tokenReceivers;
  function isTokenReceiver(address addr) public view returns(bool) {
    return _tokenReceivers[addr];
  }

  function setTokenReceiver(address addr, bool status) public onlyOwner() {
    _tokenReceivers[addr] = status;
  }

  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {
    // self implement a part of IERC777
    if (to.isContract() && _tokenReceivers[to]) {
      ITokenReceiver(to).tokensReceived(address(this), from, to, amount);
    }
  }
}
