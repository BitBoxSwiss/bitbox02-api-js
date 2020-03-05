# BitBox02 JavaScript library

The JavaScript library is compiled from
[bitbox02-api-go](https://github.com/digitalbitbox/bitbox02-api-go) using GopherJS.

Given that it contains the full client implentation compiled from Go, the library is quite large (~3MB), we recommend lazy-loading it only when necessary.

## Develop locally

To compile:

```sh
$ make dockerinit
$ make dockercompile
```

To run a demo: `$ make servedemo` and visit `localhost:8000`

## Integration

To talk to the device from a browser using this API, you will need the BitBoxBridge: https://github.com/digitalbitbox/bitbox-bridge
To integrate the BitBox02 into your application, your domain will need to be whitelisted in the Bridge. To do so, please submit a Pull Request or an Issue in the [bitbox-bridge](https://github.com/digitalbitbox/bitbox-bridge) repo.

### Install:
```sh
$ npm install bitbox02-api
```

### Import
```javascript
import { BitBox02API, getDevicePath} from 'bitbox02-api';
```

### Initialize
To get the device path, the BitBoxBridge needs to be running

```javascript
const devicePath = await getDevicePath();
const BitBox02 = new BitBox02API(devicePath);
```

### Connect
The `BitBox02API.connect()` method takes 5 arguments:
```javascript
/**
 * @param showPairingCb Callback that is used to show pairing code. Must not block.
 * @param userVerify Promise that should resolve once the user wants to continue.
 * @param handleAttastionCb Callback that should handle the bool attestation result. Must not block.
 * @param onCloseCb Callback that's called when the websocket connection is closed.
 * @param setStatusCb Callback that lets the API set the status received from the device.
 * @return Promise that will resolve once the pairing is complete.
 */
connect (showPairingCb, userVerify, handleAttestationCb, onCloseCb, setStatusCb)
```

For more detailed example see the [Sample integration](https://github.com/digitalbitbox/bitbox02-api-js/blob/master/README.md#sample-integration) below.

### Methods and functions

#### ethGetRootPubKey: Get Ethereum Root Pub Key
Get eth xpub for a given coin and derivation path

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

#### ethSignTransaction: Sign Ethereum transaction
To sign Ethereum transactions, we recommend using the `Transaction` type provided by the `ethereumjs` library https://github.com/ethereumjs/ethereumjs-tx/blob/master/src/transaction.ts.

Then to send the data to the device and get the signature bytes:
```javascript

/**
 * Signs an ethereum transaction on device
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

#### ethSignMessage: Sign Ethereum messages
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

#### ethDisplayAddress: Display Ethereum address on BitBox02 screen for verification
```javascript
/** 
 * @param keypath string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
 */
await BitBox02.ethDisplayAddress(keypath)
```

#### Check if product is supported
To use with Ethereum, the user needs a BB02 Multi and not the Bitcoin Only edition. You can use for the following check:
```javascript
import { api } from 'bitbox02-api';

BitBox02.firmware().Product() === api.common.Product.BitBox02Multi
BitBox02.firmware().Product() === api.common.Product.BitBox02BTCOnly
```

## Sample integration
This is a sample BitBox02Wallet class integration for connecting to the BitBox02 device using the BitBoxBridge and this JS API.
For a functioning sandbox implementation, you can see `demo.js`: https://github.com/digitalbitbox/bitbox02-api-js/blob/master/demo/demo.js

```javascript
import {
  BitBox02API,
  getDevicePath,
  api,
  sanitizeEthTransactionData
} from 'bitbox02-api';

class BitBox02 {
  constructor(logout) {  // You can provide the `logout` callback of your application in the constructor
    this.logout = logout;
    this.status = undefined;
    this.pairingConfirmed = false;
  }

  async init(keypath) {
    try {
      const devicePath = await getDevicePath();
      this.bitbox02API = new BitBox02API(devicePath);

      await this.bitbox02API.connect(

        /** @param showPairingCb
         *  Store the pairing code on the class instance. Show this to the user to compare with code
         *  on the device when `this.status === 'unpaired'`
         */
        pairingCode => {
          this.pairingCode = pairingCode;
        },

        /** @param userVerify
         *  Store the Promise's `resolve` on the class instance to call when the user clicks the corresponding button
         *  in your application after confirming the pairing on device
         */
        async () => {
          return new Promise(resolve => {
            this.pairingConfirmed = true;
            this.pairingConfirmationResolve = resolve;
          });
        },

        /** @param handleAttastionCb
        *  Store the attestation result on the class instance. If attestation fails, the user might have a fake device.
        *  Handle this condition below.
        */
        attestationResult => {
          this.attestation = attestationResult;
        },

        /** @param onCloseCb
        *  Log the user out of your application when device is unplugged/the websocket closes.
        *  Here we use the `logout` function provided in the constructor as the callback.
        */
        () => {
          this.logout();
        },

        /** @param setStatusCb
        *  Store the status on the class instance to take appropriate actions based on status.
        *  All possible status can be found here: https://github.com/digitalbitbox/bitbox02-api-go/blob/master/api/firmware/status.go
        */
        status => {
          this.status = status;
        }
      );
    } catch(e) {
      alert(e);
      this.logout();
      return;
    }

    switch (this.bitbox02API.firmware().Product()) {
        case api.common.Product.BitBox02Multi:
            console.log("This is a BitBox02 Multi");
            break;
        case api.common.Product.BitBox02BTCOnly:
            console.log("This is a BitBox02 BTC-only");
            break;
    }

    // Handle attestattion failure
    if (!this.attestation) {
      alert('Attestation failed');
    }

  }
}

const device = new BitBox02(yourLogoutFunction)
await device.init()

// Now you can call any of the supported API methods documented above e.g.:
const ethPub = await device.BitBox02API.ethGetRootPubKey("m/44'/60'/0'/0");

```
