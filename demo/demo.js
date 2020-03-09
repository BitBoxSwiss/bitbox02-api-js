import { isErrorAbort, constants, getDevicePath, BitBox02API, getKeypathFromString, HARDENED } from './bitbox02-api.js'

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

            document.getElementById("close").addEventListener("click", () => {
                this.api.close();
                reset();
            });

            await this.api.connect(
                pairingCode => {
                    document.getElementById("intro").style.display = "none";
                    document.getElementById("pairing").style.display = "flex";
                    document.getElementById("pairingCode").innerHTML = pairingCode.replace("\n", "<br/>");
                },
                () => {
                    return new Promise(resolve => {
                        pairingOKButton.disabled = false;
                        pairingOKButton.addEventListener("click", resolve);
                    });
                },
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

// Start the demo
document.getElementById("demo").addEventListener("click", runDemo);

// Get ethereum xpub for given keypath
ethPub.addEventListener("click", async () => {
    const ethPub = await device.api.ethGetRootPubKey("m/44'/60'/0'/0");
    alert(ethPub);
});

// Get ethereum address for given keypath
// Only displays address on device, does not return. For verification, derive address from xpub
ethAddr.addEventListener("click", async () => {
    await device.api.ethDisplayAddress("m/44'/60'/0'/0/0");
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

document.getElementById("btcAddressSimple").addEventListener("click", async () => {
    await device.api.btcDisplayAddressSimple(
        constants.messages.BTCCoin.BTC,
        getKeypathFromString("m/49'/0'/0'/0/0"),
        constants.messages.BTCScriptConfig_SimpleType.P2WPKH_P2SH,
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
            "prevOutValue": "60005000", // satoshis as a decimal string
            "sequence": 0xFFFFFFFF,
            "keypath": [84 + HARDENED, 0 + HARDENED, bip44Account, 0, 0],
        },
        {
            "prevOutHash": new Uint8Array(32).fill(49), // arbitrary constant
            "prevOutIndex": 1,
            "prevOutValue": "60005000", // satoshis as a decimal string
            "sequence": 0xFFFFFFFF,
            "keypath": [84 + HARDENED, 0 + HARDENED, bip44Account, 0, 1],
        }
    ];
    const outputs = [
        {
            "ours": true, // change
            "keypath": [84 + HARDENED, 0 + HARDENED, bip44Account, 1, 0],
            "value": "100000000", // satoshis as a decimal string
        },
        {
            "ours": false,
            "type": constants.messages.BTCOutputType.P2WSH,
            "hash": new Uint8Array(32).fill(49), // arbitrary constant
            "value": "20000000", // satoshis as a decimal string,
        },
    ];
    try {
        const signatures = await device.api.btcSignSimple(
            constants.messages.BTCCoin.BTC,
            constants.messages.BTCScriptConfig_SimpleType.P2WPKH,
            [84 + HARDENED, 0 + HARDENED, bip44Account],
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
