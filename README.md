# BitBox02 JavaScript library

The API is currenly unstable. Expect frequent breaking changes until we start tagging versions.

The JavaScript library is compiled from
[bitbox02-api-go](https://github.com/digitalbitbox/bitbox02-api-go) using GopherJS.

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
 * @param handleAttastionCb Callback that should print "attestation failed". Must not block.
 * @param onCloseCb Callback thats called when the websocket connection is closed.
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
 */
const rootPub = await BitBox02.ethGetRootPubKey(keypath: string);
```

#### ethSignTransaction: Sign Ethereum transaction
To sign Etehreum transactions, we recommend using the `Transaction` type provided by the `ethereumjs` library https://github.com/ethereumjs/ethereumjs-tx/blob/master/src/transaction.ts and passing this transaction data through our `sanitizeEthTransactionData(sigData)` function to prepare the tx for the API:

```javascript
/** @param sigData should include the following where `tx` is the `Transaction` from `ethereumjs`:
  *
  * const sigData = {
  *     path: keypath     // full Ethereum account keypath string e.g. m/44'/60'/0'/0/0
  *     recipient: tx.to, // Buffer(Uint8Array(20))
  *     tx: {
  *       value           // hex
  *       data            // hex
  *       chainId         // number
  *       nonce           // hex
  *       gasLimit        // hex
  *       gasPrice        // hex
  *      },
  *     data: tx.data // Buffer(Uint8Array)
  *   }
  * ```
  */
function sanitizeEthTransactionData(sigData)
```

Then to send the data to the device and get the signature bytes:
```javascript
import { sanitizeEthTransactionData } from 'bitbox02-api';

const sanitizedData = sanitizeEthTransactionData(sigData);
const result = await BitBox02.ethSignTransaction(sanitizedData);
```

#### ethSignMessage: Sign Ethereum messages
```javascript
/** @param msgData is an object including the account id and the message as bytes/Buffer:
  *
  * const msgData = {
  *     account    // number, account number in the ETH keypath e.g. m/44'/60'/0'/0/<id>
  *     message    // Buffer
  *   }
  */
const result = await BitBox02.ethSignMessage(msgData);
```

#### ethDisplayAddress: Display Ethereum address on BitBox02 screen for verification
```javascript
/** 
 * @param id is a number; account number in the ETH keypath e.g. m/44'/60'/0'/0/<id>:
 */
await BitBox02.ethDisplayAddress(id)
```

#### Check if product is supported
To use with Ethereum, the user needs a BB02 Multi and not the Bitcoin Only edition. You can use for the following check:
```javascript
import { api } from 'bitbox02-api';

BitBox02.fw.Product() === api.common.Product.BitBox02Multi
```

## Sample integration
This is a sample BitBox02Wallet class integration for connecting to the BitBox02 device using the BitBoxBridge and this JS API

```javascript
import {
  BitBox02API,
  getDevicePath,
  api,
  sanitizeEthTransactionData
} from 'bitbox02-api';

class BitBox02Wallet {
  constructor(logout) {  // You can provide the `logout` callback of your application in the constructor
    this.logout = logout;
    this.status = undefined;
    this.pairingConfirmed = false;
  }

  async connect() {
    const devicePath = await getDevicePath();
    this.BitBox02 = new BitBox02API(devicePath);
  }

  async init(keypath) {
    await this.BitBox02.connect(

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

    if (this.BitBox02.fw.Product() !== api.common.Product.BitBox02Multi) {
      throw new Error('Unsupported device');
    }

    // Handle attestattion failure
    if (!this.attestation) {
      errorHandler('Attestation failed');
    }

    const rootPub = await this.BitBox02.ethGetRootPubKey(keypath);
    // Derive accounts from xpub ..., e.g. `this.hdKey = HDKey.fromExtendedKey(rootPub);`

  }

```

## Develop locally

To compile:

```sh
$ make dockerinit
$ make dockercompile
```

To run a demo: `$ make servedemo` and visit `localhost:8000`
