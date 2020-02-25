import './bitbox02-api-go.js';

import { getKeypathFromString, getCoinFromKeypath } from './eth-utils';

export const api = bitbox02;
export const firmwareAPI = api.firmware;
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

    // @param showPairingCb Callback that is used to show pairing code. Must not block.
    // @param userVerify Promise that should resolve once the user wants to continue.
    // @param handleAttastionCb Callback that should print "attestation failed". Must not block.
    // @param onCloseCb Callback thats called when the websocket connection is closed.
    // @return Promise that will resolve once the pairing is complete.
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
                    self.fw = firmwareAPI.New(onWrite);

                    // Turn all Async* methods into promises.
                    for (const key in self.fw.js) {
                        if (key.startsWith("Async")) {
                            self.fw.js[key] = promisify(self.fw.js[key]);
                        }
                    }

                    self.fw.SetOnEvent(ev => {
                        if (ev === firmwareAPI.Event.StatusChanged && self.fw) {
                            setStatusCb(self.fw.Status());
                        }
                        if (ev === firmwareAPI.Event.StatusChanged && self.fw.Status() === firmwareAPI.Status.Unpaired) {
                            const [channelHash] = self.fw.ChannelHash();
                            showPairingCb(channelHash);
                        }
                        if (ev === firmwareAPI.Event.AttestationCheckDone) {
                            handleAttestationCb(self.fw.Attestation());
                        }
                        if (ev === firmwareAPI.Event.StatusChanged && self.fw.Status() === firmwareAPI.Status.RequireFirmwareUpgrade) {
                            self.socket.close();
                            reject('Firmware upgrade required');
                        }
                        if (ev === firmwareAPI.Event.StatusChanged && self.fw.Status() === firmwareAPI.Status.RequireAppUpgrade) {
                            self.socket.close();
                            reject('Unsupported firmware');
                        }
                        if (ev === firmwareAPI.Event.StatusChanged && self.fw.Status() === firmwareAPI.Status.Uninitialized) {
                            self.socket.close();
                            reject('Uninitialized');
                        }
                    });

                    await self.fw.js.AsyncInit();
                    switch(self.fw.Status()) {
                        case firmwareAPI.Status.PairingFailed:
                            self.socket.close();
                            throw new Error("Pairing rejected");
                        case firmwareAPI.Status.Unpaired:
                            await userVerify()
                            await self.fw.js.AsyncChannelHashVerify(true);
                            break;
                        case firmwareAPI.Status.Initialized:
                            // Pairing skipped.
                            break;
                        default:
                            throw new Error("Unexpected status: " + self.fw.Status() + "," + firmwareAPI.Status.Unpaired);
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
                self.fw.js.OnRead(new Uint8Array(event.data));
            }
            self.socket.onclose = function(event) {
                onCloseCb();
            }
        });
    }

    // @return the eth xpub for a given coin and derivation keypath
    async ethGetRootPubKey(keypath) {
        const keypathArray = getKeypathFromString(keypath);
        const coin = getCoinFromKeypath(keypathArray);
        const xpub = await this.fw.js.AsyncETHPub(
            coin,
            keypathArray,
            firmwareAPI.messages.ETHPubRequest_OutputType.XPUB,
            false,
            new Uint8Array()
          );
        return xpub
    };

    // Displays the address of the provided ethereum account on device screen
    async ethDisplayAddress(keypath) {
        const keypathArray = getKeypathFromString(keypath);
        // FIXME: see def of `getCoinFromPath()`, since we use the same keypath for Ropsten and Rinkeby,
        // the title for Rinkeby addresses will show 'Ropsten' instead
        const coin = getCoinFromKeypath(keypathArray);
        this.fw.js.AsyncETHPub(
            coin,
            keypathArray,
            firmwareAPI.messages.ETHPubRequest_OutputType.ADDRESS,
            true,
            new Uint8Array()
          );
    };

    // Signs an ethereum transaction on device
    // @return the signature from the device as bytes
    async ethSignTransaction(sigData) {
        try {
            const sig = await this.fw.js.AsyncETHSign(
                sigData.coin,
                sigData.keypath,
                sigData.nonce,
                sigData.gasPrice,
                sigData.gasLimit,
                sigData.recipient,
                sigData.value,
                sigData.data
            );
            const chainId = sigData.chainId;
            const vOffset = chainId * 2 + 8;
            const result = {
                r: new Buffer(sig.slice(0, 0 + 32)),
                s: new Buffer(sig.slice(0 + 32, 0 + 32 + 32)),
                v: new Buffer([parseInt(sig.slice(64), 16) + 27 + vOffset])
            };
            return result;
        } catch (err) {
                if (firmwareAPI.IsErrorAbort(err)) {
                throw new Error('User abort');
            } else {
                throw new Error(err.Message);
            }
        }
    };

    async ethSignMessage(msgData) {
        try {
          const sig = await this.fw.js.AsyncETHSignMessage(
            firmwareAPI.messages.ETHCoin.ETH,
            [44 + HARDENED, 60 + HARDENED, 0 + HARDENED, 0, msgData.account],
            msgData.message
          );

          const result = {
              r: new Buffer(sig.slice(0, 0 + 32)),
              s: new Buffer(sig.slice(0 + 32, 0 + 32 + 32)),
              v: new Buffer([parseInt(sig.slice(64), 16) + 27])
          };
          return result;
        } catch(err) {
          if (firmwareAPI.IsErrorAbort(err)) {
              throw new Error('User abort');
          } else {
              throw new Error(err.Message);
          }
        }
    }

    // @return True if the connection has been opened and successfully established.
    connectionValid() {
        return this.opened && this.socket.readyState == WebSocket.OPEN;
    }

    // @return False if connection wasn't opened
    close() {
        if (!this.connectionValid()) {
            return false;
        }
        this.socket.close();
        return true;
    }

    // Use the return value of this function to communicate with device
    // @return Undefined if connection wasn't opened
    firmware() {
        if (!this.connectionValid()) {
            return undefined;
        }
        return this.fw;
    }
}
