![BitBox02 Logo](assets/bitbox02.png)

# BitBox02 API - Methods

The [BitBox02 JavaScript library](https://github.com/digitalbitbox/bitbox02-api-js) supports the methods documented below.

For a fully functional sandbox implementation see [`demo/demo.js`](https://github.com/digitalbitbox/bitbox02-api-js/blob/master/demo/demo.js).

## Bitcoin

The following methods implement Bitcoin functionality.

### btcXPub

Get a Bitcoin xPub key for a given coin and derivation path.

```javascript
/**
 * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
 * @param keypath account-level keypath, for example `getKeypathFromString("m/49'/0'/0'")`.
 * @param xpubType xpub version - `constants.messages.BTCXPubType.*`, for example `constants.messages.BTCXPubType.YPUB`.
 * @param display if true, the device device will show the xpub on the screen before returning.
 * @return the xpub string.
 */
const xPub = await BitBox02.btcXPub(coin, keypath, xpubType, display);
```

### btcDisplayAddressSimple

Display a Bitcoin single-sig address on the device.
Return a promise with the address after users confirmation or throw "aborted by the user" error.
The address to be shown in the wallet is usually derived from the xpub (see `btcXPub`) and account type.

```javascript
/**
 * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
 * @param keypath address-level keypath, for example `getKeypathFromString("m/49'/0'/0'/1/10")`.
 *                Note: the keypaths are strictly enforced according to bip44, and must match the provided script/address types.
 * @param simpleType is the address type - `constants.messages.BTCScriptConfig_SimpleType.*`, for example `constants.messages.BTCScriptConfig_SimpleType.P2WPKH_P2SH` for `3...` segwit addresses.
 * @param display wheter to display the address on the device for user confirmation, default true.
 * @return promise with address string or reject with aborted error
 */
const address = await BitBox02.btcDisplayAddressSimple(coin, keypath, simpleType);
```

### btcSignSimple

Sign a Bitcoin single-sig transaction.

```javascript
/**
 * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
 * @param simpleType same as in `btcDisplayAddresssimple`.
 * @param keypathAccount account-level keypath, for example `getKeypathFromString("m/84'/0'/0'")`.
 *                       All inputs and changes must be from this account.
 * @param inputs array of input objects, with each input:
 *               {
 *                 "prevOutHash": Uint8Array(32),
 *                 "prevOutIndex": number,
 *                 "prevOutValue": string, // satoshis as a decimal string,
 *                 "sequence": number, // usually 0xFFFFFFFF
 *                 "keypath": [number], // usually keypathAccount.concat([change, address]),
 *               }
 * @param outputs array of output objects, with each output being either regular output or a change output:
 *                Change outputs:
 *                {
 *                  "ours": true,
 *                  "keypath": [number], // usually keypathAccount.concat([1, <address>]),
 *                  "value": string, // satoshis as a decimal string,
 *                }
 *                Regular outputs:
 *                {
 *                  "ours": false,
 *                  "type": constants.messages.BTCOutputType.P2WSH // e.g. constants.messages.BTCOutputType.P2PKH,
 *                  // pubkey or script hash. 20 bytes for P2PKH, P2SH, P2WPKH. 32 bytes for P2WSH.
 *                  "hash": new Uint8Array(20) | new Uint8Array(32)
 *                  "value": string, // satoshis as a decimal string,
 *                }
 * @param version Transaction version, usually 1 or 2.
 * @param locktime Transaction locktime, usually 0.
 * @return Array of 64 byte signatures, one per input.
 */
const signatures = await btcSignSimple(coin, simpleType, keypathAccount, inputs, outputs, version, locktime);
```

### btcSignMessage

Sign a Bitcoin message on the device.

```javascript
 /**
  * @param coin Coin to target - `constants.messages.BTCCoin.*`. Currenty must be `constants.messages.BTCCoin.BTC`.
  * @param simpleType same as in `btcDisplayAddressSimple`.
  * @param keypath address-level keypath, for example `getKeypathFromString("m/49'/0'/0'/0/0")`.
  * @param message Buffer/Uint8Array
  * @returns Object
  *     {
  *         signature: Uint8Array(64)
  *         recID: number
  *         electrumSignature: Uint8Array(65)
  *     }
  */
const signedMessage = await btcSignMessage(coin, simpleType, keypath, message);
```


### btcMaybeRegisterScriptConfig

Register a Bitcoin multisig account on the device with a user chosen name.
If it is already registered, this does nothing.
A multisig account must be registered before it can be used to show multisig addresses or sign multisig transactions.k

Note: Currently, only P2WSH (bech32) multisig accounts on the keypath `m/48'/<coin>'/<account>'/2'` are supported.

```javascript
/**
 * @param account account object details:
 * {
 *   "coin": constants.messages.BTCCoin, // for example constants.messages.BTCCoin.BTC
 *   "keypathAccount": [number], // account-level keypath, for example `getKeypathFromString("m/48'/0'/0'/2'")`.
 *   "threshold": number, // signing threshold, e.g. 2.
 *   "xpubs": [string], // list of account-level xpubs given in any format. One of them must belong to the connected BitBox02.
 *   "ourXPubIndex": nmber, // index of the currently connected BitBox02's multisig xpub in the xpubs array, e.g. 0.
 * }
 * @param getName: async () => string - If the account is unknown to the device, this function will be called to get an
 *                 account name from the user. The resulting name must be between 1 and 30 ascii chars.
 */
await btcMaybeRegisterScriptConfig(account, getName);
```

### btcDisplayAddressMultisig

Display a Bitcoin multisig address on the device.
`btcMaybeRegisterScriptConfig` should be called beforehand.

```javascript
/*
 * @param account same as in `btcMaybeRegisterScriptConfig`.
 * @param keypath address-level keypath from the account, usually `account.keypathAccount.concat([0, address])`.
 */
await btcDisplayAddressMultisig(account, keypath);
```

### btcSignMultisig

Sign a Bitcoin multisig transaction.
`btcMaybeRegisterScriptConfig` should be called beforehand.

```javascript
/*
 * @param account same as in `btcMaybeRegisterScriptConfig`.
 * Other params and return are the same as in `btcSignSimple`.
 */
await btcSignMultisig(account, inputs, outputs, version, locktime);
```

## Ethereum

The following methods implement Ethereum functionality.
These are only supported by the "BitBox02 Multi edition".

### ethGetRootPubKey

Get Ethereum xPub key for a given coin and derivation path.

```javascript
/**
 * @param keypath account keypath in string format
 * Currently only two keypaths are supported:
 * - `m/44'/60'/0'/0` for mainnet and
 * - `m/44'/1'/0'/0`  for Rinkeby and Ropsten testnets
 * @returns string; ethereum extended public key
 */
const rootPub = await BitBox02.ethGetRootPubKey(keypath: string);
```

### ethDisplayAddress

Display an Ethereum address on the device screen for verification.

```javascript
/**
 * @param keypath string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
 */
await BitBox02.ethDisplayAddress(keypath);
```

### ethSignTransaction

Signs an Ethereum transaction on the device.

To sign Ethereum transactions, we recommend using the [`Transaction` type](https://github.com/ethereumjs/ethereumjs-tx/blob/master/src/transaction.ts) provided by the `ethereumjs` library.
Then use this method to send the data to the device and get the signature bytes.

```javascript
/**
 * @param signingData Object;
 * signingData = {
 *     keypath, // string, e.g. m/44'/60'/0'/0/0
 *     chainId, // number, currently 1, 3 or 4 for Mainnet, Ropsten and Rinkeby respectively
 *     tx       // Object, either as provided by the `Transaction` type from `ethereumjs` library
 *              // or including `nonce`, `gasPrice`, `gasLimit`, `to`, `value`, and `data` as byte arrays
 * }
 * @returns Object; result with the signature bytes r, s, v
 * result = {
 *     r: Uint8Array(32)
 *     s: Uint8Array(32)
 *     v: Uint8Array(1)
 * }
 */
const result = await BitBox02.ethSignTransaction(signingData);
```

### ethSignMessage

Sign an Ethereum message on the device.

```javascript
/** @param msgData is an object including the keypath and the message as bytes/Buffer:
  *
  * const msgData = {
  *     keypath    // string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
  *     message    // Buffer/Uint8Array
  *   }
  *
  * @returns Object; result with the signature bytes r, s, v
  * result = {
  *   r: Uint8Array(32)
  *   s: Uint8Array(32)
  *   v: Uint8Array(1)
  * }
  */
const result = await BitBox02.ethSignMessage(msgData);
```
