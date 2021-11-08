import 'regenerator-runtime/runtime'

import { isErrorAbort, constants, getDevicePath, BitBox02API, getKeypathFromString, HARDENED } from 'bitbox02-api'

// data: Uint8Array.
function toBase64(data) {
    return window.btoa(String.fromCharCode.apply(null, data));
}

// data: Uint8Array.
function toHex(data) {
    return [...data].map(b => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function reset() {
    document.getElementById("demo").disabled = false;
    document.getElementById("pairing").style.display = "none";
    document.getElementById("pairingOK").disabled = true;
    document.getElementById("initialized").style.display = "none";
    document.getElementById("intro").style.display = "flex";
}

class BitBox02 {
    constructor(logout) {
        this.logout = logout;
    }

    async init() {
        const pairingOKButton = document.getElementById("pairingOK");
        const initializedDiv = document.getElementById("initialized");
        document.getElementById("demo").disabled = true;
        try {
            const devicePath = await getDevicePath();
            this.api = new BitBox02API(devicePath);

            await this.api.connect(
                pairingCode => {
                    document.getElementById("intro").style.display = "none";
                    document.getElementById("pairing").style.display = "flex";
                    document.getElementById("pairingCode").innerHTML = pairingCode.replace("\n", "<br/>");
                },
                () => new Promise(resolve => {
                    pairingOKButton.disabled = false;
                    pairingOKButton.addEventListener("click", resolve);
                }),
                attestationResult => {
                    console.log("Attestation check:", attestationResult);
                },
                this.logout,
                status => {
                    console.log(status);
                }
            )
        } catch (e) {
            alert(e);
            reset();
            return;
        }
        switch (this.api.firmware().Product()) {
            case constants.Product.BitBox02Multi:
                console.log("This is a BitBox02 Multi");
                let elements = document.getElementsByClassName("bb02-multi");
                for (let i = 0; i < elements.length; i++) {
                    elements[i].disabled = false;
                }
                break;
            case constants.Product.BitBox02BTCOnly:
                console.log("This is a BitBox02 BTC-only");
                break;
        }

        document.getElementById("pairing").style.display = "none";
        document.getElementById("intro").style.display = "none";
        initializedDiv.style.display = "flex";
    }
}

let device;
const runDemo = async () => {
    device  = new BitBox02(reset)
    await device.init();
}

// ---- Demo buttons

window.addEventListener("load", function() {

    // Start the demo
    document.getElementById("demo").addEventListener("click", runDemo);

    // Close the connection (logout).
    document.getElementById("close").addEventListener("click", () => {
        device.api.close();
    });


    // Get ethereum xpub for given keypath
    ethPub.addEventListener("click", async () => {
        const ethPub = await device.api.ethGetRootPubKey("m/44'/60'/0'/0");
        alert(ethPub);
    });

    // Get ethereum address for given keypath
    // Only displays address on device, does not return. For verification, derive address from xpub
    const ethAddrBtn = document.querySelector("#ethAddr");
    ethAddrBtn.addEventListener("click", async () => {
        const address = await device.api.ethDisplayAddress("m/44'/60'/0'/0/0", false);
        ethAddrBtn.textContent = "Confirm the following address on the BitBox:\n" + address;
        ethAddrBtn.className = "btn btn-warning";
        try {
            const addressConfirmed = await device.api.ethDisplayAddress("m/44'/60'/0'/0/0");
            ethAddrBtn.textContent = "Success!:\n" + addressConfirmed;
            ethAddrBtn.className = "btn btn-success";
        } catch (e) {
            ethAddrBtn.textContent = JSON.stringify(e);
            ethAddrBtn.className = "btn btn-danger";
        }
    });

    // Sign ethereum transaction
    ethSign.addEventListener("click", async () => {
        const signingData = {
            keypath: "m/44'/60'/0'/0/0", // mainnet tx needs a mainnet keypath
            chainId: 1,                  // mainnet tx
            tx: {
                nonce: new Uint8Array([0]),
                gasPrice: new Uint8Array([76, 153, 237, 154, 0]),
                gasLimit: new Uint8Array([82, 8]),
                to: new Uint8Array([4, 242, 100, 207, 52, 68, 3, 19, 180, 160, 25, 42, 53, 40, 20, 251, 233, 39, 184, 133]),
                value: new Uint8Array([6, 240, 91, 89, 211, 178, 0, 0]),
                data: new Uint8Array([])
            }
        }
        try {
            const sig = await device.api.ethSignTransaction(signingData);
            console.log(sig);
        } catch(e) {
            alert(e);
        }
    });

    // Sign "hello world" ethereum message
    ethSignMsg.addEventListener("click", async () => {
        try {
            const sig = await device.api.ethSignMessage({
                keypath: "m/44'/60'/0'/0/0",
                // "hello world"
                message: new Uint8Array([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100])
            }
            );
            console.log(sig);
        } catch(e) {
            alert(e)
        }
    });

    // Display single-sig BTC address on device for verification
    const simpleBtn = document.getElementById("btcAddressSimple");
    simpleBtn.addEventListener("click", async () => {
        const address = await device.api.btcDisplayAddressSimple(
            constants.messages.BTCCoin.BTC,
            getKeypathFromString("m/49'/0'/0'/0/0"),
            constants.messages.BTCScriptConfig_SimpleType.P2WPKH_P2SH,
            false,
        );
        simpleBtn.textContent = "Confirm the following address on the BitBox:\n" + address;
        simpleBtn.className = "btn btn-warning";
        try {
            const addressConfirmed = await device.api.btcDisplayAddressSimple(
                constants.messages.BTCCoin.BTC,
                getKeypathFromString("m/49'/0'/0'/0/0"),
                constants.messages.BTCScriptConfig_SimpleType.P2WPKH_P2SH,
            );
            simpleBtn.textContent = "Success!:\n" + addressConfirmed;
            simpleBtn.className = "btn btn-success";
        } catch (e) {
            simpleBtn.textContent = JSON.stringify(e);
            simpleBtn.className = "btn btn-danger";
        }
    });

    // Mock sample single-sig BTC transaction
    function makeExampleTx(keypathAccount) {
        const inputs = [
            {
                "prevOutHash": Uint8Array.from([0xc5, 0x8b, 0x7e, 0x3f, 0x12, 0x00, 0xe0, 0xc0, 0xec, 0x9a, 0x5e, 0x81, 0xe9, 0x25, 0xba, 0xfa, 0xce, 0x2c, 0xc1, 0xd4, 0x71, 0x55, 0x14, 0xf2, 0xd8, 0x20, 0x5b, 0xe2, 0x50, 0x8b, 0x48, 0xee]),
                "prevOutIndex": 1,
                "prevOutValue": "60005000", // satoshis as a decimal string
                "sequence": 0xFFFFFFFF,
                "keypath": keypathAccount.concat([0, 0]),
                "prevTx": {
                    "version": 1,
                    "locktime": 0,
                    "inputs": [
                        {
                            "prevOutHash": new Uint8Array(32).fill(49), // arbitrary constant,
                            "prevOutIndex": 0,
                            "signatureScript": new TextEncoder().encode("some signature script"),
                            "sequence": 0xFFFFFFFF,
                        }
                    ],
                    "outputs": [{
                        "value": "60005000",
                        "pubkeyScript": new TextEncoder().encode("some pubkey script"),
                    }],
                },
            },
            {
                "prevOutHash": Uint8Array.from([0xc5, 0x8b, 0x7e, 0x3f, 0x12, 0x00, 0xe0, 0xc0, 0xec, 0x9a, 0x5e, 0x81, 0xe9, 0x25, 0xba, 0xfa, 0xce, 0x2c, 0xc1, 0xd4, 0x71, 0x55, 0x14, 0xf2, 0xd8, 0x20, 0x5b, 0xe2, 0x50, 0x8b, 0x48, 0xee]),
                "prevOutIndex": 1,
                "prevOutValue": "60005000", // satoshis as a decimal string
                "sequence": 0xFFFFFFFF,
                "keypath": keypathAccount.concat([0, 1]),
                "prevTx": {
                    "version": 1,
                    "locktime": 0,
                    "inputs": [
                        {
                            "prevOutHash": new Uint8Array(32).fill(49), // arbitrary constant,
                            "prevOutIndex": 0,
                            "signatureScript": new TextEncoder().encode("some signature script"),
                            "sequence": 0xFFFFFFFF,
                        }
                    ],
                    "outputs": [{
                        "value": "60005000",
                        "pubkeyScript": new TextEncoder().encode("some pubkey script"),
                    }],
                },
            }
        ];
        const outputs = [
            {
                "ours": true, // change
                "keypath": keypathAccount.concat([1, 0]),
                "value": "100000000", // satoshis as a decimal string
            },
            {
                "ours": false,
                "type": constants.messages.BTCOutputType.P2WSH,
                "hash": new Uint8Array(32).fill(49), // arbitrary constant
                "value": "20000000", // satoshis as a decimal string,
            },
        ];
        const version = 1;
        const locktime = 0;
        return { inputs, outputs, version, locktime };
    }

    // Sign single-sig BTC transaction
    document.getElementById("btcSignSimple").addEventListener("click", async () => {
        const keypathAccount = getKeypathFromString("m/84'/0'/0'");
        const { inputs, outputs, version, locktime } = makeExampleTx(keypathAccount);
        try {
            const signatures = await device.api.btcSignSimple(
                constants.messages.BTCCoin.BTC,
                constants.messages.BTCScriptConfig_SimpleType.P2WPKH,
                keypathAccount,
                inputs,
                outputs,
                version,
                locktime,
            );
            console.log("Signatures: ", signatures);
        } catch(err) {
            console.log(err);
            if (isErrorAbort(err)) {
                alert("aborted by user");
            } else {
                alert(err.Message);
            }
        }
    });

    // Sign single-sig BTC transaction
    document.getElementById("btcSignMsg").addEventListener("click", async () => {
        try {
            const result = await device.api.btcSignMessage(
                constants.messages.BTCCoin.BTC,
                constants.messages.BTCScriptConfig_SimpleType.P2WPKH,
                getKeypathFromString("m/84'/0'/0'/0/0"),
                // "hello world"
                new Uint8Array([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]),
            );
            alert([
                "Signature:",
                toHex(result.signature),
                "Signature (Electrum):" ,
                toBase64(result.electrumSignature),
            ].join("\n"));
            console.log(result);
        } catch(err) {
            console.log(err);
            if (isErrorAbort(err)) {
                alert("aborted by user");
            } else {
                alert(err.Message);
            }
        }
    });

    // Mock sample multi-sig BTC transaction
    async function makeExampleMultisigAccount(keypathAccount) {
        const coin = constants.messages.BTCCoin.BTC;

        const ourXPub = await device.api.btcXPub(coin, keypathAccount, constants.messages.BTCXPubType.ZPUB, false);

        // One of the xpubs must be ours.
        // The xpubs can be provided in any version (xpub, ypub, zpub, etc.).
        const xpubs = [
            ourXPub,
            "Zpub75oAskzNv1fFuPc4ue6dVyZETFdroU4Bw2NNTL6Yz8WzLx3athVwRKmuMoSmwqXFL5jw5ZEdbinsW5TSEiHQTFUuZg4Pk2v2mma1ERpHWgq",
        ];

        const account = {
            "coin": coin,
            "keypathAccount": keypathAccount,
            "threshold": 1,
            "xpubs": xpubs,
            "ourXPubIndex": 0,
        };

        const getName = async () => prompt("Please give a name for the multisig account (max 30 chars)");
        await device.api.btcMaybeRegisterScriptConfig(account, getName);
        return account;
    }

    // Display single-sig BTC address on device for verification
    document.getElementById("btcAddressMultisig").addEventListener("click", async () => {
        const keypath = getKeypathFromString("m/48'/0'/0'/2'/0/0");
        const keypathAccount = keypath.slice(0, keypath.length - 2);

        try {
            const account = await makeExampleMultisigAccount(keypathAccount);
            await device.api.btcDisplayAddressMultisig(account, keypath);
        } catch(err) {
            if (isErrorAbort(err)) {
                alert("aborted by user");
            } else {
                alert(err.Message);
            }
        }
    });

    // Sign multi-sig BTC transaction
    document.getElementById("btcSignMultisig").addEventListener("click", async () => {
        const coin = constants.messages.BTCCoin.BTC;
        const keypathAccount = getKeypathFromString("m/48'/0'/0'/2'");

        const account = await makeExampleMultisigAccount(keypathAccount);

        const { inputs, outputs, version, locktime } = makeExampleTx(keypathAccount);

        try {
            const signatures = await device.api.btcSignMultisig(
                account,
                inputs,
                outputs,
                version,
                locktime,
            );
            console.log("Signatures: ", signatures);
        } catch(err) {
            if (isErrorAbort(err)) {
                alert("aborted by user");
            } else {
                alert(err.Message);
            }
        }
    });

    const cardanoGetAddress = async (display) => device.api.cardanoAddress(
        constants.messages.CardanoNetwork.CardanoMainnet,
        {
            pkhSkh: {
                keypathPayment: getKeypathFromString("m/1852'/1815'/0'/0/0"),
                keypathStake: getKeypathFromString("m/1852'/1815'/0'/2/0"),
            },
        }, display);

    cardanoAddr.addEventListener("click", async () => {
        try {
            const address = await cardanoGetAddress(false);
            cardanoAddr.textContent = "Confirm the following address on the BitBox:\n" + address;
            cardanoAddr.className = "btn btn-warning";

            await cardanoGetAddress(true);
            cardanoAddr.textContent = "Success!:\n" + address;
            cardanoAddr.className = "btn btn-success";
        } catch (e) {
            cardanoAddr.textContent = JSON.stringify(e);
            cardanoAddr.className = "btn btn-danger";
        }
    });

    cardanoPub.addEventListener("click", async () => {
        const xpubs = await device.api.cardanoXPubs([
            getKeypathFromString("m/1852'/1815'/0'"),
            getKeypathFromString("m/1852'/1815'/1'"),
        ]);
        alert("Account #0\n" + toHex(xpubs[0]));
        alert("Account #1\n" + toHex(xpubs[1]));
    });


    cardanoSign.addEventListener("click", async () => {
        const ttl = "41115811";
        const fee = "170499";
        const validityIntervalStart = "41110811";
        const response = await device.api.cardanoSignTransaction({
            network: constants.messages.CardanoNetwork.CardanoMainnet,
            inputs: [{
                "keypath": getKeypathFromString("m/1852'/1815'/0'/0/0"),
                "prevOutHash": fromHex("59864ee73ca5d91098a32b3ce9811bac1996dcbaefa6b6247dcaafb5779c2538"),
                "prevOutIndex": 0,
            }],
            outputs: [{
                "encodedAddress": "addr1q9qfllpxg2vu4lq6rnpel4pvpp5xnv3kvvgtxk6k6wp4ff89xrhu8jnu3p33vnctc9eklee5dtykzyag5penc6dcmakqsqqgpt",
                "value": "1000000",
            },
                      {
                          "encodedAddress": await cardanoGetAddress(false),
                          "value": "4829501",
                          "scriptConfig": {
                              "pkhSkh": {
                                  "keypathPayment": getKeypathFromString("m/1852'/1815'/0'/0/0"),
                                  "keypathStake": getKeypathFromString("m/1852'/1815'/0'/2/0"),
                              },
                          },
            }],
            fee,
            ttl,
            certificates: [
                { "stakeRegistration": {
                    "keypath": getKeypathFromString("m/1852'/1815'/0'/2/0"),
                } },
                { "stakeDelegation": {
                    "keypath": getKeypathFromString("m/1852'/1815'/0'/2/0"),
                    "poolKeyhash": fromHex("92229dcf782ce8a82050fdeecb9334cc4d906c6eb66cdbdcea86fb5f"),
                } }
            ],
            withdrawals: [{ "keypath": getKeypathFromString("m/1852'/1815'/0'/2/0"), value: "12345" }],
            validityIntervalStart,
        });
        console.log("Sign response:", response);
    });

});
