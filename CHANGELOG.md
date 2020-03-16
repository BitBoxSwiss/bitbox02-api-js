# 0.4.0
- Changed api.firmware.* to constants.* (all constants)
- Changed api.firmware.isErrorAbort to isErrorAbort (direct export)
- api no longer exported (treated as internal).
- add btcXPub, btcMaybeRegisterScriptConfig, btcDisplayAddressMultisig, btcSignMultisig api calls.
- bitobx02-api-go: updated to 49d314b148cccb193e26b5c154044ed7eb819384 (v7.0.0 compatibility)
- Add Jest framework and Travis CI for testing and add unit tests for util functions

# 0.3.0
- Update from Go API: https://github.com/digitalbitbox/bitbox02-api-go/commit/7817ceb1fccc7276f17a6a468221258cbd4d5bac
    - Includes support for firmware 6.1.0 and makes it the lowest supported version
- Update sandbox demo to use a class and abstracted ethereum api methods
- Return arrays instead of Buffers in ethereum signature results and let the caller handle conversion as they require
- Update README and docstrings
- Access `firmwareAPI` more safely by checking if connection is valid first
- Make `AsyncETHSign` in the go wrapper take []byte for all arguments which allows us to completely remove `sanitizeEthTransactionData`
    - Update README and `demo.js` accordingly to reflect these changes
    - TODO: Mirror these changes in ETHSign in the go client and the BitBoxApp to handle Eth TXs the same everywhere

# 0.2.0

- Add CHANGELOG
- Update README
- Add AsyncBTCAddressSimple, AsyncBTCSignSimple
- Add `getCoinFromChainId()`, `getKeypathFromString()`, and `getCoinFromKeypath()` eth utils to handle mainnet and testnet keypaths and coins correctly. Currently only two keypaths are supported:
    - `m/44'/60'/0'/0` for mainnet and
    - `m/44'/1'/0'/0`  for Rinkeby and Ropsten testnets


# 0.1.0

- Publish first API version
