


1. deploy token
```
npx hardhat run scripts/deploy-token --network bsctest

```
2. internal token lock
```
TOKEN_ADDRESS={token_address_above} npx hardhat run scripts/deploy-internal-token-lock.js --network bsctest
```

3. sales
```
TOKEN_ADDRESS=0x738708F3B57C142E88f051938a1cEDfC7A162574 npx hardhat run scripts/deploy-sale.js --network bsctest

```



KWS deployed to: 0x738708F3B57C142E88f051938a1cEDfC7A162574



TESTNET:


KWS              : 0x6805211479c51Df6815eDD3273c6AFcfB2A4dbc3
InternalTokenLock: 0x73444062Ee72674bd75aA77A3F8DD6c88eD26E93

Sale
```
{
  "ANGEL": "0xa357F2cb7C980BC61B1677b9F74fbef452f25497",
  "SEED": "0x05DD5e6F831be617e032408368ceD2Df3f2544fB",
  "PRIVATE": "0x8956A2EdF1D707f6C1E7D263537cB18B0196FAdE",
  "TOKEN": "0x6805211479c51Df6815eDD3273c6AFcfB2A4dbc3",
  "USDT": "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
  "BUSD": "0x8301F2213c0eeD49a7E28Ae4c3e91722919B8B47"
}
```




MAINNET:

KWS              : 0x5D0E95C15cA50F13fB86938433269D03112409Fe
InternalTokenLock: 0x38035330c4d5feBB3c64232A4FC1f5f0eF59e5F0

Sale
```
{
    "ANGEL": "0xBB13f0f189BFf97C993A22782311A3535591f0EF",
    "SEED": "0x5f5CD5FA4bB610626E461f9b261853C4d5623731",
    "PRIVATE": "0x19Da85e061b7aB021d8a6E8fA43979F0CF2Ad69f",
    "TOKEN": "0x5D0E95C15cA50F13fB86938433269D03112409Fe",
    "USDT": "0x55d398326f99059fF775485246999027B3197955",
    "BUSD": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
}
```


# Change log
2021-09-22:
- ITC-01: 
  - We use tokenReceived as hook api. In development, we will apply for Game feature.
  - InternalTokenLock.sol will be configured and transferred to the generated contract in the future (DAO/Game, etc.)
- ITR-01: Same as above
- SCK-01: Fixed
- SCK-02,SCK-03: it's our business model. The investors have agreed with our conditions and signed SAFT contract. We are responsible to transfer the project's token to investors as signed SAFT

