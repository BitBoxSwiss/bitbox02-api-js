import { api, getDevicePath, BitBox02API } from './bitbox02.js'

const firmwareAPI = api.firmware;

function reset() {
    document.getElementById("demo").disabled = false;
    document.getElementById("pairing").style.display = "none";
    document.getElementById("pairingOK").disabled = true;
    document.getElementById("initialized").style.display = "none";
}

export async function demo() {
    const pairingOKButton = document.getElementById("pairingOK");
    const initializedDiv = document.getElementById("initialized");
    document.getElementById("demo").disabled = true;

    let bitbox02api
    try {
        const devicePath = await getDevicePath();
        bitbox02api = new BitBox02API(devicePath);
        document.getElementById("close").addEventListener("click", () => {
          bitbox02api.close();
          reset();
        });
        await bitbox02api.connect(
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
        );
    } catch(err) {
        alert(err);
        reset();
        return;
    }

    const firmware = bitbox02api.firmware();

    // ready to use
    switch (firmware.Product()) {
        case api.common.Product.BitBox02Multi:
            console.log("This is a BitBox02 Multi");
            break;
        case api.common.Product.BitBox02BTCOnly:
            console.log("This is a BitBox02 BTC-only");
            break;
    }
    console.log("supports ETH? ->", firmware.SupportsETH(firmwareAPI.messages.ETHCoin.ETH));


    document.getElementById("pairing").style.display = "none";
    initializedDiv.style.display = "block";

    // ---- Demo buttons

    const HARDENED = 0x80000000;
    document.getElementById("btcAddressSimple").addEventListener("click", async () => {
        const pub = display => firmware.js.AsyncBTCAddressSimple(
            firmwareAPI.messages.BTCCoin.BTC,
            [49 + HARDENED, 0 + HARDENED, 0 + HARDENED, 0, 0],
            firmwareAPI.messages.BTCScriptConfig_SimpleType.P2WPKH_P2SH,
            display,
        )
        const addr = await pub(false);
        pub(true);
        alert(addr);
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
                "type": firmwareAPI.messages.BTCOutputType.P2WSH,
                "hash": new Uint8Array(32).fill(49), // arbitrary constant
                "value": 1e8 * 0.2,
            },
        ];
        try {
            const signatures = await firmware.js.AsyncBTCSignSimple(
                firmwareAPI.messages.BTCCoin.BTC,
                firmwareAPI.messages.BTCScriptConfig_SimpleType.P2WPKH,
                [84 + HARDENED, 0 + HARDENED, bip44Account],
                inputs,
                outputs,
                version,
                locktime,
            );
            console.log("Signatures: ", signatures);
        } catch(err) {
            if (firmwareAPI.IsErrorAbort(err)) {
                alert("aborted by user");
            } else {
                alert(err.Message);
            }
        }
    });

    document.getElementById("ethPub").addEventListener("click", async () => {
        const pub = display => firmware.js.AsyncETHPub(
            firmwareAPI.messages.ETHCoin.ETH,
            [44 + HARDENED, 60 + HARDENED, 0 + HARDENED, 0, 0],
            firmwareAPI.messages.ETHPubRequest_OutputType.ADDRESS,
            display,
            new Uint8Array(),
        )
        const addr = await pub(false);
        pub(true);
        alert(addr);
    });

    ethSign.addEventListener("click", async () => {
        try {
            const sig = await firmware.js.AsyncETHSign(
                firmwareAPI.messages.ETHCoin.ETH,
                [44 + HARDENED, 60 + HARDENED, 0 + HARDENED, 0, 0],
                8156,
                "6000000000",
                21000,
                new Uint8Array([4, 242, 100, 207, 52, 68, 3, 19, 180, 160, 25, 42, 53, 40, 20, 251, 233, 39, 184, 133]),
                "530564000000000000",
                new Uint8Array([]),
            );
            console.log(sig);
        } catch(err) {
            if (firmwareAPI.IsErrorAbort(err)) {
                alert("aborted by user");
            } else {
                alert(err.Message);
            }
        }
    });

    ethSignMsg.addEventListener("click", async () => {
        try {
            const sig = await firmware.js.AsyncETHSignMessage(
                firmwareAPI.messages.ETHCoin.ETH,
                [44 + HARDENED, 60 + HARDENED, 0 + HARDENED, 0, 0],
                new Uint8Array([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]),
            );
            console.log(sig);
        } catch(err) {
            if (firmwareAPI.IsErrorAbort(err)) {
                alert("aborted by user");
            } else {
                alert(err.Message);
            }
        }
    });
}

document.getElementById("demo").addEventListener("click", demo);
