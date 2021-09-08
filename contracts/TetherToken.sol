// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract TetherToken is ERC20PresetMinterPauser {
    uint8 internal _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20PresetMinterPauser(name_, symbol_) {
        _decimals = decimals_; 
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}