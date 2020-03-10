import './bitbox02-api-go.js';

import { getKeypathFromString, getCoinFromKeypath, getCoinFromChainId } from './utils.js';

const api = bitbox02;
export const constants = bitbox02.constants;
export const isErrorAbort = bitbox02.IsErrorAbort;
export const HARDENED = 0x80000000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Will try for 1 second to find a device through the bridge.
export async function getDevicePath() {
    const attempts = 10;
    for (let i=0; i<attempts; i++){
        let response;
        try {
            response = await fetch("http://localhost:8178/api/v1/devices", {
                method: 'GET',
                headers: {},
            });
        } catch {
            throw new Error('BitBoxBridge not found');
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

export class BitBox02API {
    constructor(devicePath)  {
        this.devicePath = devicePath;
        this.opened = false;
    }

    /**
     * @param showPairingCb Callback that is used to show pairing code. Must not block.
     * @param userVerify Promise that should resolve once the user wants to continue.
     * @param handleAttastionCb Callback that should handle the bool attestation result. Must not block.
     * @param onCloseCb Callback that's called when the websocket connection is closed.
     * @param setStatusCb Callback that lets the API set the status received from the device.
     * @return Promise that will resolve once the pairing is complete.
     */
    connect (showPairingCb, userVerify, handleAttestationCb, onCloseCb, setStatusCb) {
        const self = this;
        self.opened = true;
        return new Promise((resolve, reject) => {
            function onWrite(bytes) {
                if (self.socket.readyState != WebSocket.OPEN) {
                    console.log("Error, trying to write to closed socket");
                    return;
                }
                self.socket.send(bytes);
            }

            self.socket = new WebSocket("ws://127.0.0.1:8178/api/v1/socket/" + self.devicePath)
            self.socket.binaryType = 'arraybuffer'
            self.socket.onopen = async function (event) {
                try {
                    self.fw = api.New(onWrite);

                    // Turn all Async* methods into promises.
                    for (const key in self.firmware().js) {
                        if (key.startsWith("Async")) {
                            self.firmware().js[key] = promisify(self.firmware().js[key]);
                        }
                    }

                    self.firmware().SetOnEvent(ev => {
                        if (ev === constants.Event.StatusChanged && self.firmware()) {
                            setStatusCb(self.firmware().Status());
                        }
                        if (ev === constants.Event.StatusChanged && self.firmware().Status() === constants.Status.Unpaired) {
                            const [channelHash] = self.firmware().ChannelHash();
                            showPairingCb(channelHash);
                        }
                        if (ev === constants.Event.AttestationCheckDone) {
                            handleAttestationCb(self.firmware().Attestation());
                        }
                        if (ev === constants.Event.StatusChanged && self.firmware().Status() === constants.Status.RequireFirmwareUpgrade) {
                            self.socket.close();
                            reject('Firmware upgrade required');
                        }
                        if (ev === constants.Event.StatusChanged && self.firmware().Status() === constants.Status.RequireAppUpgrade) {
                            self.socket.close();
                            reject('Unsupported firmware');
                        }
                        if (ev === constants.Event.StatusChanged && self.firmware().Status() === constants.Status.Uninitialized) {
                            self.socket.close();
                            reject('Uninitialized');
                        }
                    });

                    await self.firmware().js.AsyncInit();
                    switch(self.firmware().Status()) {
                        case constants.Status.PairingFailed:
                            self.socket.close();
                            throw new Error("Pairing rejected");
                        case constants.Status.Unpaired:
                            await userVerify()
                            await self.firmware().js.AsyncChannelHashVerify(true);
                            break;
                        case constants.Status.Initialized:
                            // Pairing skipped.
                            break;
                        default:
                            throw new Error("Unexpected status: " + self.firmware().Status() + "," + constants.Status.Unpaired);
                    }

                    resolve();
                } catch(err) {
                    reject(err);
                }
            }
            self.socket.onerror = function(event) {
                reject("Your BitBox02 is busy");
            }
            self.socket.onmessage = function(event) {
                self.firmware().js.OnRead(new Uint8Array(event.data));
            }
            self.socket.onclose = function(event) {
                onCloseCb();
            }
        });
    }

    /**
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
     * Display a single-sig address on the device. The address to be shown in the wallet is usually derived from the xpub (see `btcXPub` and account type.
     * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
     * @param keypath address-level keypath, for example `getKeypathFromString("m/49'/0'/0'/1/10")`.
     *                Note: the keypaths are strictly enforced according to bip44, and must match the provided script/address types.
     * @param simpleType is the address type - `constants.messages.BTCScriptConfig_SimpleType.*`, for example `constants.messages.BTCScriptConfig_SimpleType.P2WPKH_P2SH` for `3...` segwit addresses.
     */
    async btcDisplayAddressSimple(coin, keypath, simpleType) {
        const display = true;
        return this.firmware().js.AsyncBTCAddressSimple(
            coin,
            keypath,
            simpleType,
            display,
        );
    }

    /**
     * Sign a single-sig transaction.
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
    async btcSignSimple(
        coin,
        simpleType,
        keypathAccount,
        inputs,
        outputs,
        version,
        locktime) {
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
     * Register a multisig account on the device with a user chosen name. If it is already registered, this does nothing.
     * A multisig account must be registered before it can be used to show multisig addresses or sign multisig transactions.
     * Note:
     * Currently, only P2WSH (bech32) multisig accounts on the keypath `m/48'/<coin>'/<account>'/2'` are supported.
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
    async btcMaybeRegisterScriptConfig(account, getName) {
        const isRegistered = await this.firmware().js.AsyncBTCIsScriptConfigRegistered(account);
        if (!isRegistered) {
            await this.firmware().js.AsyncBTCRegisterScriptConfig(account, await getName());
        }
    }

    /*
     * Display a multisig address on the device. `btcMaybeRegisterScriptConfig` should be called beforehand.
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

    /*
     * Sign a multisig transaction. `btcMaybeRegisterScriptConfig` should be called beforehand.
     * @param account same as in `btcMaybeRegisterScriptConfig`.
     * Other params and return are the same as in `btcSignSimple`.
     */
    async btcSignMultisig(
        account,
        inputs,
        outputs,
        version,
        locktime) {
        return this.firmware().js.AsyncBTCSignMultisig(
            account,
            inputs,
            outputs,
            version,
            locktime,
        );
    }

    /**
     * @param keypath account keypath in string format
     * Currently only two keypaths are supported:
     * - `m/44'/60'/0'/0` for mainnet and
     * - `m/44'/1'/0'/0`  for Rinkeby and Ropsten testnets
     * @returns string; ethereum extended public key
     */
    async ethGetRootPubKey(keypath) {
        const keypathArray = getKeypathFromString(keypath);
        const coin = getCoinFromKeypath(keypathArray);
        const xpub = await this.firmware().js.AsyncETHPub(
            coin,
            keypathArray,
            constants.messages.ETHPubRequest_OutputType.XPUB,
            false,
            new Uint8Array()
        );
        return xpub
    };

    /**
     * @param keypath string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
     * Displays the address of the provided ethereum account on device screen
     * Only displays address on device, does not return. For verification, derive address from xpub
     */
    async ethDisplayAddress(keypath) {
        const keypathArray = getKeypathFromString(keypath);
        // FIXME: see def of `getCoinFromPath()`, since we use the same keypath for Ropsten and Rinkeby,
        // the title for Rinkeby addresses will show 'Ropsten' instead
        const coin = getCoinFromKeypath(keypathArray);
        this.firmware().js.AsyncETHPub(
            coin,
            keypathArray,
            constants.messages.ETHPubRequest_OutputType.ADDRESS,
            true,
            new Uint8Array()
        );
    };

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
    async ethSignTransaction(signingData) {
        try {
            const sig = await this.fw.js.AsyncETHSign(
                getCoinFromChainId(signingData.chainId),
                getKeypathFromString(signingData.keypath),
                signingData.tx.nonce,
                signingData.tx.gasPrice,
                signingData.tx.gasLimit,
                signingData.tx.to,
                signingData.tx.value,
                signingData.tx.data
            );
            const vOffset = signingData.chainId * 2 + 8;
            const result = {
                r: sig.slice(0, 0 + 32),
                s: sig.slice(0 + 32, 0 + 32 + 32),
                v: [parseInt(sig.slice(64), 16) + 27 + vOffset]
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

    /** @param msgData is an object including the keypath and the message as bytes:
     *
     * const msgData = {
     *     keypath    // string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
     *     message    // Buffer/Uint8Array
     * }
     *
     * @returns Object; result with the signature bytes r, s, v
     * result = {
     *     r: Uint8Array(32)
     *     s: Uint8Array(32)
     *     v: Uint8Array(1)
     * }
     */
    async ethSignMessage(msgData) {
        try {
            const keypath = getKeypathFromString(msgData.keypath);
            const sig = await this.firmware().js.AsyncETHSignMessage(
                getCoinFromKeypath(keypath),
                keypath,
                msgData.message
            );

            const result = {
                r: sig.slice(0, 0 + 32),
                s: sig.slice(0 + 32, 0 + 32 + 32),
                v: [parseInt(sig.slice(64), 16) + 27]
            };
            return result;
        } catch(err) {
            if (api.IsErrorAbort(err)) {
                throw new Error('User abort');
            } else {
                throw new Error(err.Message);
            }
        }
    }

    /**
     * @returns True if the connection has been opened and successfully established.
     */
    connectionValid() {
        return this.opened && this.socket.readyState == WebSocket.OPEN;
    }

    /**
     * @returns False if connection wasn't opened
     */
    close() {
        if (!this.connectionValid()) {
            return false;
        }
        this.socket.close();
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
