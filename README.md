[![BitBox02 Logo](docs/assets/bitbox02.png)](https://github.com/digitalbitbox/bitbox02-api-js/blob/master/docs/methods.md)

# BitBox02 JavaScript library

The JavaScript library is compiled from
[bitbox02-api-go](https://github.com/digitalbitbox/bitbox02-api-go) using GopherJS.

Given that it contains the full client implementation compiled from Go, the library is quite large (~3MB).
We recommend lazy-loading it only when necessary.

## BitBox02

The BitBox02 is a hardware wallet made by [Shift Crypto](https://shiftcrypto.ch) that simplifies secure handling of crypto coins through storing private keys and signing transactions.

## Integration

To enable communication from the browser to the BitBox02, either:
  - WebHID needs to be supported by the browser, e.g. Chrome
  - or the [BitBoxBridge](https://github.com/digitalbitbox/bitbox-bridge) needs to be installed and running

When integrating the BitBox02 into your application, your domain needs to be whitelisted in the BitBoxBridge.
To do so, please submit a Pull Request or an Issue in the [bitbox-bridge](https://github.com/digitalbitbox/bitbox-bridge) repository.
Localhost is already whitelisted, so you can develop locally.

The BitBox02 Javascript library is available as NPM package [bitbox02-api](https://www.npmjs.com/package/bitbox02-api).

### Install

```sh
$ npm install bitbox02-api
```

### Import

```javascript
import { BitBox02API, getDevicePath} from 'bitbox02-api';
```

### Initialize

To get the device path, the BitBoxBridge needs to be running.
If WebHID (`navigator.hid`) is available, `getDevicePath()` returns `"WEBHID"`, which instructs `BitBox02API` to prefer WebHID over the BitBoxBridge.

```javascript
const devicePath = await getDevicePath();
const BitBox02 = new BitBox02API(devicePath);
```

### Connect to device

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

### Check BitBox02 edition

The BitBox02 is available in two editions: "Multi" and "Bitcoin-only".
To check what edition is used, e.g. to make sure that Ethereum functionality is supported, use the following function.

```javascript
import { constants } from 'bitbox02-api';

BitBox02.firmware().Product() === constants.Product.BitBox02Multi
BitBox02.firmware().Product() === constants.Product.BitBox02BTCOnly
```

### Methods

All available methods are documented in [`docs/methods.md`](docs/methods.md).

## Sample integration

This is a sample BitBox02Wallet class integration for connecting to the BitBox02 device using the BitBoxBridge and this JS API.
See [`demo/demo.js`](demo/demo.js) for a fully functional sandbox implementation.

```javascript
import {
  constants,
  BitBox02API,
  getDevicePath,
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
      this.api = new BitBox02API(devicePath);

      await this.api.connect(

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

        /** @param handleAttestationCb
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

    switch (this.api.firmware().Product()) {
        case constants.Product.BitBox02Multi:
            console.log("This is a BitBox02 Multi");
            break;
        case constants.Product.BitBox02BTCOnly:
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
const ethPub = await device.api.ethGetRootPubKey("m/44'/60'/0'/0");

```

## Local development

To compile the library using GopherJS, run the following commands:

```sh
$ make dockerinit
$ make dockercompile
```

To simply run the demo sandbox implementation, run the following command and visit <http://localhost:8000>.

```sh
$ make servedemo
```
