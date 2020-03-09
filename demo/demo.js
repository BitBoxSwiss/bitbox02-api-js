import { api, getDevicePath, BitBox02API, getKeypathFromString, HARDENED } from './bitbox02.js'

function reset() {
    document.getElementById("demo").disabled = false;
    document.getElementById("pairing").style.display = "none";
    document.getElementById("pairingOK").disabled = true;
    document.getElementById("initialized").style.display = "none";
}

class BitBox02 {
    constructor(logout) {
        this.logout = logout;
        this.status = undefined;
        this.pairingConfirmed = false;
    }

    async init() {
        const pairingOKButton = document.getElementById("pairingOK");
        const initializedDiv = document.getElementById("initialized");
        document.getElementById("demo").disabled = true;
        try {
            const devicePath = await getDevicePath();
            this.bitbox02API = new BitBox02API(devicePath);

            document.getElementById("close").addEventListener("click", () => {
                this.bitbox02API.close();
                reset();
              });

            await this.bitbox02API.connect(
                pairingCode => {
                    document.getElementById("pairing").style.display = "block";
                    document.getElementById("pairingCode").innerHTML = pairingCode.replace("\n", "<br/>");
                },
                () => {
                    return new Promise(resolve => {
                        pairingOKButton.disabled = false;
                        pairingOKButton.addEventListener("click", resolve);
                    });
                },
                attestationResult => {
                    alert("Attestation check: " + attestationResult);
                },
                () => {
                    reset();
                },
                status => {
                    console.log(status);
                }
              )
        } catch (e) {
            alert(e);
            reset();
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

    document.getElementById("pairing").style.display = "none";
    initializedDiv.style.display = "block";

  }
}

let device;
const runDemo = async () => {
    device  = new BitBox02(reset)
    await device.init();
}

// ---- Demo buttons

// Start the demo
document.getElementById("demo").addEventListener("click", runDemo);

// Get ethereum xpub for given keypath
ethPub.addEventListener("click", async () => {
    const ethPub = await device.bitbox02API.ethGetRootPubKey("m/44'/60'/0'/0");
    alert(ethPub);
});

// Get ethereum address for given keypath
// Only displays address on device, does not return. For verification, derive address from xpub
ethAddr.addEventListener("click", async () => {
    await device.bitbox02API.ethDisplayAddress("m/44'/60'/0'/0/0");
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
        const sig = await device.bitbox02API.ethSignTransaction(signingData);
        console.log(sig);
    } catch(e) {
        alert(e);
    }
});

// Sign "hello world" ethereum message
ethSignMsg.addEventListener("click", async () => {
    try {
        const sig = await device.bitbox02API.ethSignMessage({
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

document.getElementById("btcAddressSimple").addEventListener("click", async () => {
    await device.bitbox02API.btcDisplayAddressSimple(
        api.firmware.messages.BTCCoin.BTC,
        getKeypathFromString("m/49'/0'/0'/0/0"),
        api.firmware.messages.BTCScriptConfig_SimpleType.P2WPKH_P2SH,
    );
});

document.getElementById("btcSignSimple").addEventListener("click", async () => {
    const bip44Account = 0 + HARDENED;
    const version = 1;
    const locktime = 0;
    const inputs = [
        {
            "prevOutHash": new Uint8Array(32).fill(49), // arbitrary constant
            "prevOutIndex": 1,
            "prevOutValue": 1e8 * 0.60005,
            "sequence": 0xFFFFFFFF,
            "keypath": [84 + HARDENED, 0 + HARDENED, bip44Account, 0, 0],
        },
        {
            "prevOutHash": new Uint8Array(32).fill(49), // arbitrary constant
            "prevOutIndex": 1,
            "prevOutValue": 1e8 * 0.60005,
            "sequence": 0xFFFFFFFF,
            "keypath": [84 + HARDENED, 0 + HARDENED, bip44Account, 0, 1],
        }
    ];
    const outputs = [
        {
            "ours": true, // change
            "keypath": [84 + HARDENED, 0 + HARDENED, bip44Account, 1, 0],
            "value": 1e8 * 1,
        },
        {
            "ours": false,
            "type": api.firmware.messages.BTCOutputType.P2WSH,
            "hash": new Uint8Array(32).fill(49), // arbitrary constant
            "value": 1e8 * 0.2,
        },
    ];
    try {
        const signatures = await device.bitbox02API.btcSignSimple(
            api.firmware.messages.BTCCoin.BTC,
            api.firmware.messages.BTCScriptConfig_SimpleType.P2WPKH,
            [84 + HARDENED, 0 + HARDENED, bip44Account],
            inputs,
            outputs,
            version,
            locktime,
        );
        console.log("Signatures: ", signatures);
    } catch(err) {
        if (api.firmware.IsErrorAbort(err)) {
            alert("aborted by user");
        } else {
            alert(err.Message);
        }
    }
});
