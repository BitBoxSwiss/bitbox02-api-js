// Copyright 2019 Shift Cryptosecurity AG
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// For full method documentation see: https://github.com/digitalbitbox/bitbox02-api-js/blob/master/docs/methods.md

import { bitbox02 } from './bitbox02-api-go.js';

import { getKeypathFromString, getChainIDFromKeypath, getCoinFromChainId } from './utils.js';

const api = bitbox02;
export const constants = bitbox02.constants;
export const isErrorAbort = bitbox02.IsErrorAbort;
export const HARDENED = 0x80000000;

const webHID = 'WEBHID';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// If WebHID support is present (`navigator.hid` is defined) , this returns the constant "WEBHID".
// Otherwise,  will try for 1 second to find a device through the bridge, check if
// there is exactly one connected BitBox02, and return its bridge device path.
//
// if options.forceBridge is true, the BitBoxBridge will be used regardless of whether WebHID
// support is present.
export async function getDevicePath(options = { forceBridge: false }) {
    const forceBridge = options && options.forceBridge;
    if (navigator.hid && !forceBridge) {
        return webHID;
    }
    const attempts = 10;
    for (let i=0; i<attempts; i++){
        let response;
        let errorMessage;
        try {
            response = await fetch("http://localhost:8178/api/v1/devices", {
                method: 'GET',
                headers: {},
            })
            if (!response.ok && response.status === 403) {
                errorMessage = 'Origin not whitelisted';
                throw new Error();
            } else if (!response.ok) {
                errorMessage = 'Unexpected';
                throw new Error();
            }
        } catch (err) {
            throw new Error(errorMessage ? errorMessage : 'BitBoxBridge not found');
        }
        const devices = (await response.json()).devices;
        if (devices.length !== 1) {
            await sleep(100);
            continue;
        }
        const devicePath = devices[0].path;
        return devicePath;
    }
    throw new Error("Expected one BitBox02");
}

function promisify(f) {
    return function(...args) {
        return new Promise((resolve, reject) => f(
            (...results) => {
                const err = results.pop();
                if (err !== null) {
                    return reject(err);
                }
                return resolve(...results);
            },
            ...args));
    };
}

const setOutputDefaults = outputs =>  {
    // Workaround for gopherjs: all fields must be set for Go to be able to parse the structure,
    // even though some fields are optional some of the time.
    for (let i = 0; i < outputs.length; i++) {
        outputs[i] = Object.assign({
            type: 0,
            payload: new Uint8Array(0),
            keypath: [],
        }, outputs[i]);
    }
}

export class BitBox02API {
    /**
     * @param devicePath See `getDevicePath()`.
    */
    constructor(devicePath)  {
        this.devicePath = devicePath;
        // connection is an object with three keys once the connection is established:
        // onWrite(bytes): send bytes
        // close():  close the connection
        // valid(): bool - is the connection still alive?
        this.connection = null;
        this.onCloseCb = null;

        if (navigator.hid) {
            navigator.hid.addEventListener("disconnect", () => {
                if (this.onCloseCb) {
                    this.onCloseCb();
                }
            });
        }
    }

    connectWebsocket = onMessageCb => {
        const socket = new WebSocket("ws://127.0.0.1:8178/api/v1/socket/" + this.devicePath);
        return new Promise((resolve, reject) => {
            socket.binaryType = 'arraybuffer';
            socket.onmessage = event => { onMessageCb(new Uint8Array(event.data)); };
            socket.onclose = event => {
                if (this.onCloseCb) {
                    this.onCloseCb();
                }
            };
            socket.onopen = function (event) {
                resolve({
                    onWrite: bytes => {
                        if (socket.readyState != WebSocket.OPEN) {
                            console.error("attempted write to a closed socket");
                            return;
                        }
                        socket.send(bytes);
                    },
                    close: () => socket.close(),
                    valid: () => {
                        return socket.readyState == WebSocket.OPEN;
                    },
                });
            };
            socket.onerror = function(event) {
                reject("Your BitBox02 is busy");
            };
        });
    }

    connectWebHID = async (onMessageCb) => {
        const vendorId = 0x03eb;
        const productId = 0x2403;
        let device;
        try {
            const devices = await navigator.hid.requestDevice({filters: [{vendorId, productId}]});
            const d = devices[0];
            // Filter out other products that might be in the list presented by the Browser.
            if (d.productName.includes('BitBox02')) {
                device = d;
            }
        } catch (err) {
            return null;
        }
        if (!device) {
            return null;
        }
        await device.open();
        const onInputReport = event => {
            onMessageCb(new Uint8Array(event.data.buffer));
        };
        device.addEventListener("inputreport", onInputReport);
        return {
            onWrite: bytes => {
                if (!device.opened) {
                    console.error("attempted write to a closed HID connection");
                    return;
                }
                device.sendReport(0, bytes);
            },
            close: () => {
                device.close().then(() => {
                    device.removeEventListener("inputreport", onInputReport);
                    if (this.onCloseCb) {
                        this.onCloseCb();
                    }
                });
            },
            valid: () => device.opened,
        };
    }

    /**
     * @param showPairingCb Callback that is used to show pairing code. Must not block.
     * @param userVerify Promise that should resolve once the user wants to continue.
     * @param handleAttastionCb Callback that should handle the bool attestation result. Must not block.
     * @param onCloseCb Callback that's called when the websocket connection is closed.
     * @param setStatusCb Callback that lets the API set the status received from the device.
     * @return Promise that will resolve once the pairing is complete.
     */
    async connect(showPairingCb, userVerify, handleAttestationCb, onCloseCb, setStatusCb) {
        this.onCloseCb = onCloseCb;
        const onMessage = bytes => {
            if (this.connectionValid()) {
                this.firmware().js.OnRead(bytes);
            }
        };
        const useBridge = this.devicePath !== webHID;
        if (useBridge) {
            this.connection = await this.connectWebsocket(onMessage);
        } else {
            this.connection = await this.connectWebHID(onMessage);
        }
        if (!this.connection) {
            throw new Error("Could not establish a connection to the BitBox02");
        }
        if (useBridge) {
            this.fw = api.NewDeviceBridge(this.connection.onWrite);
        } else {
            this.fw = api.NewDeviceWebHID(this.connection.onWrite);
        }

        // Turn all Async* methods into promises.
        for (const key in this.firmware().js) {
            if (key.startsWith("Async")) {
                this.firmware().js[key] = promisify(this.firmware().js[key]);
            }
        }

        this.firmware().SetOnEvent(ev => {
            if (ev === constants.Event.StatusChanged && this.firmware()) {
                setStatusCb(this.firmware().Status());
            }
            if (ev === constants.Event.StatusChanged && this.firmware().Status() === constants.Status.Unpaired) {
                const [channelHash] = this.firmware().ChannelHash();
                showPairingCb(channelHash);
            }
            if (ev === constants.Event.AttestationCheckDone) {
                handleAttestationCb(this.firmware().Attestation());
            }
            if (ev === constants.Event.StatusChanged && this.firmware().Status() === constants.Status.RequireFirmwareUpgrade) {
                this.connection.close();
                throw new Error('Firmware upgrade required');
            }
            if (ev === constants.Event.StatusChanged && this.firmware().Status() === constants.Status.RequireAppUpgrade) {
                this.connection.close();
                throw new Error('Unsupported firmware');
            }
            if (ev === constants.Event.StatusChanged && this.firmware().Status() === constants.Status.Uninitialized) {
                this.connection.close();
                throw new Error('Uninitialized');
            }
        });

        await this.firmware().js.AsyncInit();
        switch(this.firmware().Status()) {
            case constants.Status.PairingFailed:
                this.connection.close();
                throw new Error("Pairing rejected");
            case constants.Status.Unpaired:
                await userVerify();
                await this.firmware().js.AsyncChannelHashVerify(true);
                break;
            case constants.Status.Initialized:
                // Pairing skipped.
                break;
            default:
                throw new Error("Unexpected status: " + this.firmware().Status() + "," + constants.Status.Unpaired);
        }
    }

    /**
     * @return the firmware version.
     */
    version() {
        return this.firmware().js.Version();
    }

    // --- Bitcoin methods ---

    /**
     * # Get a Bitcoin xPub key for a given coin and derivation path.
     *
     * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
     * @param keypath account-level keypath, for example `getKeypathFromString("m/49'/0'/0'")`.
     * @param xpubType xpub version - `constants.messages.BTCXPubType.*`, for example `constants.messages.BTCXPubType.YPUB`.
     * @param display if true, the device device will show the xpub on the screen before returning.
     * @return the xpub string.
     */
    async btcXPub(coin, keypath, xpubType, display) {
        return this.firmware().js.AsyncBTCXPub(coin, keypath, xpubType, display);
    }

    /**
     * Display a single-sig address on the device. The address to be shown in the wallet is usually derived
     * from the xpub (see `btcXPub` and account type.
     *
     * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
     * @param keypath address-level keypath, for example `getKeypathFromString("m/49'/0'/0'/1/10")`.
     * @param simpleType is the address type - `constants.messages.BTCScriptConfig_SimpleType.*`, for example `constants.messages.BTCScriptConfig_SimpleType.P2WPKH_P2SH` for `3...` segwit addresses.
     * @param display wheter to display the address on the device for user confirmation, default true.
     * @return promise with address string or reject with aborted error
     */
    async btcDisplayAddressSimple(coin, keypath, simpleType, display = true) {
        return this.firmware().js.AsyncBTCAddressSimple(
            coin,
            keypath,
            simpleType,
            display,
        );
    }

    /**
     * # Sign a single-sig transaction.
     *
     * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
     * @param simpleType same as in `btcDisplayAddressSimple`.
     * @param keypathAccount account-level keypath, for example `getKeypathFromString("m/84'/0'/0'")`.
     * @param inputs array of input objects
     *     {
     *       "prevOutHash": Uint8Array(32),
     *       "prevOutIndex": number,
     *       "prevOutValue": string, // satoshis as a decimal string,
     *       "sequence": number, // usually 0xFFFFFFFF
     *       "keypath": [number], // usually keypathAccount.concat([change, address]),
     *     }
     * @param outputs array of output objects, with each output being either regular output or a change output
     *    Change outputs:
     *        {
     *            "ours": true,
     *            "keypath": [number], // usually keypathAccount.concat([1, <address>]),
     *            "value": string, // satoshis as a decimal string,
     *        }
     *    Regular outputs:
     *        {
     *            "ours": false,
     *            "type": constants.messages.BTCOutputType.P2WSH // e.g. constants.messages.BTCOutputType.P2PKH,
     *            // pubkey or script hash or pubkey. 20 bytes for P2PKH, P2SH, P2WPKH. 32 bytes for P2WSH, P2TR.
     *            "payload": new Uint8Array(20) | new Uint8Array(32)
     *            "value": string, // satoshis as a decimal string,
     *        }
     * @param version Transaction version, usually 1 or 2.
     * @param locktime Transaction locktime, usually 0.
     * @return Array of 64 byte signatures, one per input.
     */
    async btcSignSimple(
        coin,
        simpleType,
        keypathAccount,
        inputs,
        outputs,
        version,
        locktime) {
        setOutputDefaults(outputs);
        return this.firmware().js.AsyncBTCSignSimple(
            coin,
            simpleType,
            keypathAccount,
            inputs,
            outputs,
            version,
            locktime,
        );
    }

    /**
     * Sign a Bitcoin message on the device.
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
    async btcSignMessage(
        coin,
        simpleType,
        keypath,
        message) {
        return this.firmware().js.AsyncBTCSignMessage(
            coin,
            simpleType,
            keypath,
            message,
        );
    }

    /**
     * # Register a multisig account on the device with a user chosen name. If it is already registered, this does nothing.
     * # A multisig account must be registered before it can be used to show multisig addresses or sign multisig transactions.
     * # Note:
     * # Currently, only P2WSH (bech32) multisig accounts on the keypath `m/48'/<coin>'/<account>'/2'` are supported.
     *
     * @param account account object details:
     *     {
     *         "coin": constants.messages.BTCCoin, // for example constants.messages.BTCCoin.BTC
     *         "keypathAccount": [number], // account-level keypath, for example `getKeypathFromString("m/48'/0'/0'/2'")`.
     *         "threshold": number, // signing threshold, e.g. 2.
     *         "xpubs": [string], // list of account-level xpubs given in any format. One of them must belong to the connected BitBox02.
     *         "ourXPubIndex": nmber, // index of the currently connected BitBox02's multisig xpub in the xpubs array, e.g. 0.
     *     }
     * @param getName: async () => string - If the account is unknown to the device, this function will be called to get an
     *                 account name from the user. The resulting name must be between 1 and 30 ascii chars.
     */
    async btcMaybeRegisterScriptConfig(account, getName) {
        const isRegistered = await this.firmware().js.AsyncBTCIsScriptConfigRegistered(account);
        if (!isRegistered) {
            await this.firmware().js.AsyncBTCRegisterScriptConfig(account, await getName());
        }
    }

    /**
     * # Display a multisig address on the device. `btcMaybeRegisterScriptConfig` should be called beforehand.
     *
     * @param account same as in `btcMaybeRegisterScriptConfig`.
     * @param keypath address-level keypath from the account, usually `account.keypathAccount.concat([0, address])`.
     */
    async btcDisplayAddressMultisig(account, keypath) {
        const display = true;
        return this.firmware().js.AsyncBTCAddressMultisig(
            account,
            keypath,
            display,
        );
    }

    /**
     * # Sign a multisig transaction. `btcMaybeRegisterScriptConfig` should be called beforehand.
     *
     * @param account same as in `btcMaybeRegisterScriptConfig`.
     * Other params and return are the same as in `btcSignSimple`.
     */
    async btcSignMultisig(
        account,
        inputs,
        outputs,
        version,
        locktime) {
        setOutputDefaults(outputs);
        return this.firmware().js.AsyncBTCSignMultisig(
            account,
            inputs,
            outputs,
            version,
            locktime,
        );
    }


    // --- End Bitcoin methods ---

    // --- Ethereum methods ---

    /**
     * # Get Ethereum xPub key for a given coin and derivation path.
     *
     * @param keypath account keypath in string format
     * Currently only two keypaths are supported:
     *     - `m/44'/60'/0'/0` for mainnet and
     *     - `m/44'/1'/0'/0`  for Rinkeby and Ropsten testnets
     * @returns string; ethereum extended public key
     */
    async ethGetRootPubKey(keypath) {
        const keypathArray = getKeypathFromString(keypath);
        const chainID = getChainIDFromKeypath(keypathArray);
        const xpub = await this.firmware().js.AsyncETHPub(
            chainID,
            keypathArray,
            constants.messages.ETHPubRequest_OutputType.XPUB,
            false,
            new Uint8Array()
        );
        return xpub
    };

    /**
     * Display an Ethereum address on the device screen for verification.
     *
     * @param keypath string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
     * @param display wheter to display the address on the device for user confirmation, default true.
     * @returns promise with the ETH address or reject with aborted error
     */
    async ethDisplayAddress(keypath, display = true) {
        const keypathArray = getKeypathFromString(keypath);
        // FIXME: see def of `getChainIDFromKeypath()`, since we use the same keypath for Ropsten and Rinkeby,
        // the title for Rinkeby addresses will show 'Ropsten' instead
        const chainID = getChainIDFromKeypath(keypathArray);
        return this.firmware().js.AsyncETHPub(
            chainID,
            keypathArray,
            constants.messages.ETHPubRequest_OutputType.ADDRESS,
            display,
            new Uint8Array()
        );
    };

    /**
     * # Signs an Ethereum transaction on the device.
     *
     * We recommend using the [`Transaction` type](https://github.com/ethereumjs/ethereumjs-tx/blob/master/src/transaction.ts) provided by the `ethereumjs` library.\
     *
     * @param signingData Object
     *     {
     *         keypath, // string, e.g. m/44'/60'/0'/0/0
     *         chainId, // number, currently 1, 3 or 4 for Mainnet, Ropsten and Rinkeby respectively
     *         tx       // Object, either as provided by the `Transaction` type from `ethereumjs` library
     *                  // or including `nonce`, `gasPrice`, `gasLimit`, `to`, `value`, and `data` as byte arrays
     *     }
     * @returns Object; result with the signature bytes r, s, v
     *     {
     *         r: Uint8Array(32)
     *         s: Uint8Array(32)
     *         v: Uint8Array(N)
     *     }
     */
    async ethSignTransaction(signingData) {
        try {
            const sig = await this.fw.js.AsyncETHSign(
                signingData.chainId,
                getKeypathFromString(signingData.keypath),
                signingData.tx.nonce,
                signingData.tx.gasPrice,
                signingData.tx.gasLimit,
                signingData.tx.to,
                signingData.tx.value,
                signingData.tx.data
            );
            const vOffset = signingData.chainId * 2 + 8;
            const v = sig[64] + 27 + vOffset;
            // Convert `v` to big-endian Uint8Array.
            const vBuf = new ArrayBuffer(8);
            new DataView(vBuf).setBigUint64(0, BigInt(v));
            let vArr = new Uint8Array(vBuf);
            // Remove leading zeroes.
            vArr = vArr.subarray(vArr.findIndex(el => el != 0));
            const result = {
                r: sig.slice(0, 0 + 32),
                s: sig.slice(0 + 32, 0 + 32 + 32),
                v: vArr,
            };
            return result;
        } catch (err) {
            if (api.IsErrorAbort(err)) {
                throw new Error('User abort');
            } else {
                throw new Error(err.Message);
            }
        }
    };

    /**
     * # Sign an Ethereum message on the device.
     *
     * @param msgData is an object including the keypath and the message as bytes
     *     {
     *         keypath    // string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
     *         message    // Buffer/Uint8Array
     *     }
     * @returns Object; result with the signature bytes r, s, v
     *     {
     *         r: Uint8Array(32)
     *         s: Uint8Array(32)
     *         v: Uint8Array(1)
     *     }
     */
    async ethSignMessage(msgData) {
        try {
            const keypath = getKeypathFromString(msgData.keypath);
            const sig = await this.firmware().js.AsyncETHSignMessage(
                getChainIDFromKeypath(keypath),
                keypath,
                msgData.message
            );

            const result = {
                r: sig.slice(0, 0 + 32),
                s: sig.slice(0 + 32, 0 + 32 + 32),
                v: sig.slice(64), // offset of 27 is already included by bitbox02-api-go
            };
            return result;
        } catch (err) {
            if (api.IsErrorAbort(err)) {
                throw new Error('User abort');
            } else {
                throw new Error(err.Message);
            }
        }
    }

    /**
     * Sign an Ethereum typed data message (EIP-712) on the device.
     *
     * @param msgData is an object including the keypath and the message as bytes
     *     {
     *         chainId    // int, e.g. 1 for mainnet.
     *         keypath    // string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
     *         message    // EIP-712 typed data object, see sandbox for example.
     *     }
     * @returns Object; result with the signature bytes r, s, v
     *     {
     *         r: Uint8Array(32)
     *         s: Uint8Array(32)
     *         v: Uint8Array(1)
     *     }
     */
    async ethSignTypedMessage(msgData) {
        try {
            const sig = await this.firmware().js.AsyncETHSignTypedMessage(
                msgData.chainId,
                getKeypathFromString(msgData.keypath),
                JSON.stringify(msgData.message),
            );
            const result = {
                r: sig.slice(0, 0 + 32),
                s: sig.slice(0 + 32, 0 + 32 + 32),
                v: sig.slice(64), // offset of 27 is already included by bitbox02-api-go
            };
            return result;
        } catch (err) {
            if (api.IsErrorAbort(err)) {
                throw new Error('User abort');
            } else {
                throw new Error(err.Message);
            }
        }
    }

    // --- End Ethereum methods ---

    // --- Cardano methods ---

    /**
     * # Get Cardano xPub keys for a given derivation paths.
     *
     * @param keypaths array of account keypaths, each keypath in in array format
     * @returns string; 64 byte extended public key (32 bytes public key + 32 bytes chain code)
     */
    async cardanoXPubs(keypaths) {
        return await this.firmware().js.AsyncCardanoXPubs(keypaths);
    };

    /**
     * # Get a Cardano address.
     *
     * @param network: See `constants.messages.CardanoNetwork.CardanoMainnet` or `constants.messages.CardanoNetwork.CardanoTestnet`.
     * @param scriptConfig see gowrapper/cardano.go:cardanoScriptConfig
     * @param display wheter to display the address on the device for user confirmation, default true.
     * @return promise with address string or reject with aborted error
     */
    async cardanoAddress(network, scriptConfig, display = true) {
        return await this.firmware().js.AsyncCardanoAddress(network, scriptConfig, display);
    };

    /**
     * # Sign a Cardano transaction.
     *
     * One transaction object is expected, with the following keys:
     * network: Network to target - `constants.messages.CardanoNetwork.*`, for example `constants.messages.CardanoNetwork.CardanoMainnet`.
     * inputs: list of input objects. See see gowrapper/cardano.go:cardanoInput
     * outputs: list of output objects. See see gowrapper/cardano.go:cardanoOutput
     * fee: transaction fee (decimal string)
     * ttl: undefined or transaction time-to-live (non-empty decimal string)
     * certificates: list of certificate objects. see gowrapper/cardano.go:cardanoCertificate
     * withdrawals: list of withdrawal objects. see gowrapper/cardano.go:cardanoWithdrawal
     * validityIntervalstart: transaction validity interval start (decimal string)
     * @return Object { "shelleyWitnesses": [{ "signature": Uint8Array, "publicKey": Uint8Array }] }
     */
    async cardanoSignTransaction({
        network,
        inputs,
        outputs,
        fee,
        ttl,
        certificates,
        withdrawals,
        validityIntervalStart,
    }) {
        // Workaround for gopherjs: all fields must be set for Go to be able to parse the structure,
        // even though some fields are optional.
        for (let i = 0; i < outputs.length; i++) {
            outputs[i] = Object.assign({
                assetGroups: [],
            }, outputs[i]);
        }
        // Undefined (missing) ttl is passed as ttl=0 AND allowZeroTTL=false.
        const allowZeroTTL = !!ttl;
        return await this.firmware().js.AsyncCardanoSignTransaction(
            network,
            inputs || [],
            outputs || [],
            fee,
            ttl || "0",
            certificates || [],
            withdrawals || [],
            validityIntervalStart || "0",
            allowZeroTTL,
        );
    }

    /**
     * @returns True if the connection has been opened and successfully established.
     */
    connectionValid() {
        return this.connection && this.connection.valid();
    }

    /**
     * @returns False if connection wasn't opened
     */
    close() {
        if (!this.connectionValid()) {
            return false;
        }
        this.connection.close();
        this.connection = null;
        return true;
    }

    /**
     * Use the return value of this function to communicate with device
     * @return Undefined if connection wasn't opened
     */
    firmware() {
        if (!this.connectionValid()) {
            throw new Error('Device or websocket not connected')
        }
        return this.fw;
    }
}
