


1. deploy token
```
npx hardhat run scripts/deploy-token --network bsctest

```
2. internal token lock
```
TOKEN_ADDRESS={token_address_above} npx hardhat run scripts/deploy-internal-token-lock.js --network bsctest
```






TESTNET:

KWS              : 0x6805211479c51Df6815eDD3273c6AFcfB2A4dbc3
InternalTokenLock: 0x73444062Ee72674bd75aA77A3F8DD6c88eD26E93

Sale
{
  "ANGEL": "0x1C25B45CCD28d73387CbD8de591EA2eF2bd1B5bA",
  "SEED": "0x2ad8F6A307aEfD1CC817Bd9Eb1187D1725B4fA87",
  "PRIVATE": "0x7ca96A782E8AD06E6F5Ab0b8aCB811169fCFe1C7",
  "TOKEN": "0x963b10368E4DB64a0F2f213164DB1390dBD97978",
  "USDT": "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
  "BUSD": "0x8301F2213c0eeD49a7E28Ae4c3e91722919B8B47"
}


MAINNET:

KWS              : 0x963b10368E4DB64a0F2f213164DB1390dBD97978
InternalTokenLock: 0xd404c042d4D24ab070ed60633e7187C847cE5E10



# Change log
2021-09-22:
- ITC-01: 
  - We use tokenReceived as hook api. In development, we will apply for Game feature.
  - InternalTokenLock.sol will be configured and transferred to the generated contract in the future (DAO/Game, etc.)
- ITR-01: Same as above
- SCK-01: Fixed
- SCK-02,SCK-03: it's our business model. The investors have agreed with our conditions and signed SAFT contract. We are responsible to transfer the project's token to investors as signed SAFT

