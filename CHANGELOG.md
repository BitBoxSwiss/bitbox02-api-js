# 0.13.0
- Cardano: allow a TTL value of "0" (before "0" would be treated the same as undefined/missing).

# 0.12.0
- Fix WebHID vendor/product filters, fixing WebHID access in Chrome 97+
- Breaking change: rename `hash` to `payload` in Bitcoin outputs in `btcSignSimple()` and `btcSignMultisig()`

# 0.11.0
- Converted bitbox02-api-js to a CommonJS module for better integration with webpack
- Converted the demo to a webpack project

# 0.10.0
- Added Cardano support
- bitbox02-api-go: updated to 93df9155c1466ae51fbe1ce88a963a9ee709070f
- add function to retrieve the firmware version

# 0.9.0

- Updated Go to version 1.16
- Drop requirement for running the BitBoxBridge if WebHID is available in the Browser (Chrome only for now)
- Publish transpiled ES5 code instead of source ES6 code for better compatibility

# 0.8.1
- Added support for display=false argument for ethDisplayAddress and btcDisplayAddressSimple
- Changed demo to show address first and then ask for user confirmation on the BitBox
- Fixed ethDisplayAddress does not return address
- Updated documentation for btcSignMessage

# 0.8.0
- bitbox02-api-go: updated to 3cdcbc6489771e54fdfa18a205416ab1eee291cb
- Added btcSignMessage()

# 0.7.0:
- bitbox02-api-go: updated to f23403837ec161298c08a2e5286bc62f043c3c48

# 0.6.0
- bitbox02-api-go: updated to 753a8f6ca53ee056dcbf6e629c5335096ae116fb (v9.0.0 compatibility)

# 0.5.0
- bitbox02-api-go: updated to f9fe88be0a9b8866533a20d01d264fe42a085fd9 (v8.0.0 compatibility)

# 0.4.1
- Updated BitBoxSandbox demo
   - Add methods documentation in docs/methods.md
   - Sandbox UI improvements

# 0.4.0
- Changed api.firmware.* to constants.* (all constants)
- Changed api.firmware.isErrorAbort to isErrorAbort (direct export)
- api no longer exported (treated as internal).
- add btcXPub, btcMaybeRegisterScriptConfig, btcDisplayAddressMultisig, btcSignMultisig api calls.
- bitbox02-api-go: updated to 49d314b148cccb193e26b5c154044ed7eb819384 (v7.0.0 compatibility)
- Add Jest framework and Travis CI for testing and add unit tests for util functions
- Improve error handling with regards to CORS headers when connecting to the device. We can now correctly identify when the origin is not whitelisted based on the response from the bridge

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
