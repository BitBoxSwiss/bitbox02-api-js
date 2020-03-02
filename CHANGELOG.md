# 0.3.0
- Update from Go API: https://github.com/digitalbitbox/bitbox02-api-go/commit/7817ceb1fccc7276f17a6a468221258cbd4d5bac
    - Includes support for firmware 6.1.0 and makes it the lowest supported version

# 0.2.0

- Add CHANGELOG
- Update README
- Add AsyncBTCAddressSimple, AsyncBTCSignSimple
- Add `getCoinFromChainId()`, `getKeypathFromString()`, and `getCoinFromKeypath()` eth utils to handle mainnet and testnet keypaths and coins correctly. Currently only two keypaths are supported:
    - `m/44'/60'/0'/0` for mainnet and
    - `m/44'/1'/0'/0`  for Rinkeby and Ropsten testnets
  

# 0.1.0

- Publish first API version
