// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface IToken {
  function mint(
    address to,
    uint256 amount
  ) external;

  function transfer(
    address to,
    uint256 amount
  ) external;

  function balanceOf(address to) external returns(uint256);
}