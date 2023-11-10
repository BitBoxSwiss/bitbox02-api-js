export function getDevicePath(options?: { forceBridge: boolean }): string

type Product = "bitbox02-multi" | "bitbox02-btconly" | "bitboxbase-standard"
type Status = "connected" | "unpaired" | "pairingFailed" | "uninitialized" | "seeded" | "initialized" | "require_firmware_upgrade" | "require_app_upgrade"
type Event = "channelHashChanged" | "statusChanged" | "attestationCheckDone"
type ETHCoinEnum = 0 | 1 | 2
type ETHPubRequest_OutputTypeEnum = 0 | 1
type BTCCoinEnum = 0 | 1 | 2 | 3
type BTCScriptConfig_SimpleTypeEnum = 0 | 1
type BTCOutputTypeEnum = 0 | 1 | 2 | 3 | 4
type BTCXPubTypeEnum = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type CardanoNetworkEnum = 0 | 1

interface Constants {
    Product: {
        BitBox02Multi: "bitbox02-multi",
        BitBox02BTCOnly: "bitbox02-btconly",
        BitBoxBaseStandard: "bitboxbase-standard"
    },
    Status: {
        Connected: "connected",
        Unpaired: "unpaired",
        PairingFailed: "pairingFailed",
        Uninitialized: "uninitialized",
        Seeded: "seeded",
        Initialized: "initialized",
        RequireFirmwareUpgrade: "require_firmware_upgrade",
        RequireAppUpgrade: "require_app_upgrade"
    },
    Event: {
        ChannelHashChanged: "channelHashChanged",
        StatusChanged: "statusChanged",
        AttestationCheckDone: "attestationCheckDone"
    },
    messages: {
        ETHCoin: {
            ETH: 0,
            RopstenETH: 1,
            RinkebyETH: 2
        },
        ETHPubRequest_OutputType: {
            ADDRESS: 0,
            XPUB: 1
        },
        BTCCoin: {
            BTC: 0,
            TBTC: 1,
            LTC: 2,
            TLTC: 3
        },
        BTCScriptConfig_SimpleType: {
            P2WPKH_P2SH: 0,
            P2WPKH: 1
        },
        BTCOutputType: {
            UNKNOWN: 0,
            P2PKH: 1,
            P2SH: 2,
            P2WPKH: 3,
            P2WSH: 4
        },
        BTCXPubType: {
            TPUB: 0,
            XPUB: 1,
            YPUB: 2,
            ZPUB: 3,
            VPUB: 4,
            UPUB: 5,
            CAPITAL_VPUB: 6,
            CAPITAL_ZPUB: 7,
            CAPITAL_UPUB: 8,
            CAPITAL_YPUB: 9
        },
        CardanoNetwork: {
            CardanoMainnet: 0,
            CardanoTestnet: 1
        }
    }
}

export declare const constants: Constants

declare class Firmware {
    Product(): string
}

type Keypath = number[]

type ScriptConfig = {
    pkhSkh: {
        keypathPayment: Keypath
        keypathStake: Keypath
    }
}

type CardanoInput = {
    keypath: Keypath
    prevOutHash: Uint8Array
    prevOutIndex: number
}

type CardanoOutput = {
    encodedAddress: string
    value: string
    scriptConfig?: ScriptConfig
}

type CardanoCertificate =
    | {
        stakeRegistration: {
            keypath: Keypath
        }
    }
    | {
        stakeDeregistration: {
            keypath: Keypath
        }
    }
    | {
        stakeDelegation: {
            keypath: Keypath
            poolKeyhash: Uint8Array
        }
    }

type CardanoWithdrawal = {
    keypath: Keypath
    value: string
}

type CardanoShelleyWitness = {
    signature: Uint8Array
    publicKey: Uint8Array
}

interface AccountConfig {
    coin: BTCCoinEnum
    keypathAccount: Keypath
    threshold: BTCScriptConfig_SimpleTypeEnum
    xpubs: string[]
    ourXPubIndex: number
}

interface EthTransaction {
    keypath: string
    chainId: number
    tx: {
        nonce: Uint8Array
        gasPrice: Uint8Array
        gasLimit: Uint8Array
        to: Uint8Array
        value: Uint8Array
        data: Uint8Array
    }
}

interface EthSignedTx { r: Uint8Array, s: Uint8Array, v: Uint8Array }

interface BTCSignedTx {
    electrumSignature: Uint8Array
    signature: Uint8Array
    recID: number
}

interface InputsPrevInputs {
    prevOutHash: Uint8Array
    prevOutIndex: number
    signatureScript: Uint8Array
    sequence: number
}

interface InputsPrevOutputs {
    value: string // satoshis as a decimal string
    pubkeyScript: Uint8Array
}

interface Inputs {
    prevOutHash: Uint8Array
    prevOutIndex: number
    prevOutValue: string // satoshis as a decimal string
    sequence: number
    keypath: Keypath,
    prevTx: {
        version: number
        locktime: number
        inputs: InputsPrevInputs[]
        outputs: InputsPrevOutputs[]
    }
}

interface OurOutput {
    ours: true
    keypath: Keypath
    "value": "100000000" // satoshis as a decimal string
}

interface TheirsOutput {
    ours: false
    type: BTCOutputTypeEnum
    hash: Uint8Array
    value: "20000000" // satoshis as a decimal string,
}

type Outputs = OurOutput | TheirsOutput

export declare function getKeypathFromString(keypath: string): Keypath

export declare const HARDENED: 2147483648

export declare function isErrorAbort(err: any): boolean

export declare class BitBox02API {
    constructor(devicePath: string)
    connect(
        showPairingCb: (key: string) => void,
        userVerify: () => Promise<void>,
        handleAttestationCb: (attestationCheck: boolean) => void,
        onCloseCb: () => void,
        setStatusCb: (status: string) => void
    )
    close(): boolean
    firmware(): Firmware
    version(): string
    cardanoXPubs(keypaths: Keypath[]): Promise<Uint8Array[]>
    cardanoAddress(
        network: CardanoNetworkEnum,
        scriptConfig: ScriptConfig,
        display?: boolean
    ): Promise<string>
    cardanoSignTransaction(params: {
        network: CardanoNetworkEnum
        inputs: CardanoInput[]
        outputs: CardanoOutput[]
        fee: string
        ttl: string
        certificates: CardanoCertificate[]
        withdrawals: CardanoWithdrawal[]
        validityIntervalStart: string | null
    }): Promise<{
        shelleyWitnesses: CardanoShelleyWitness[]
    }>
    btcDisplayAddressMultisig(account: AccountConfig, keypath: Keypath): Promise<string>
    btcDisplayAddressSimple(coin: BTCCoinEnum, keypat: Keypath, scriptConfig: BTCScriptConfig_SimpleTypeEnum): Promise<string>
    btcMaybeRegisterScriptConfig(account: AccountConfig, name: () => Promise<string>): Promise<void>
    btcSignMessage(coin: BTCCoinEnum, scriptType: BTCScriptConfig_SimpleTypeEnum, keypath: Keypath, message: Uint8Array): Promise<BTCSignedTx>
    btcSignMultisig(
        account: AccountConfig,
        input: Inputs[],
        output: Outputs[],
        version: number,
        locktime: number
    ): Promise<Uint8Array[]>
    btcSignSimple(
        coin: BTCCoinEnum,
        scriptType: BTCScriptConfig_SimpleTypeEnum,
        keypath: Keypath,
        inputs: Inputs[],
        outputs: Outputs[],
        version: number,
        locktime: number
    ): Promise<Uint8Array[]>
    btcXPub(
        coin: BTCCoinEnum,
        keypath: Keypath,
        type: BTCXPubTypeEnum,
        bool: boolean): Promise<string>
    connectionValid(): boolean
    ethDisplayAddress(keypath: string, bool: boolean): Promise<string>
    ethGetRootPubKey(keypath: string): Promise<string>
    ethSignMessage(keypath: string, message: Uint8Array): Promise<EthSignedTx>
    ethSignTransaction(transaction: EthTransaction): Promise<EthSignedTx>
}
