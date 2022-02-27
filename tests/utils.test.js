import { getChainIDFromKeypath, getKeypathFromString, getCoinFromChainId } from '../src/utils.js';
import { constants, HARDENED } from '../src/index.js';

/**
 * Test getCoinFromChainId
 */

test("Return correct chainId for all supported networks", () => {
    expect(getCoinFromChainId(1)).toBe(constants.messages.ETHCoin.ETH);
    expect(getCoinFromChainId(3)).toBe(constants.messages.ETHCoin.RopstenETH);
    expect(getCoinFromChainId(4)).toBe(constants.messages.ETHCoin.RinkebyETH);
})

/**
 * All other networks currently not supported:
 * Morden (obsolete), Expanse: 2
 * Rootstock mainnet: 30
 * Rootstock testnet: 31
 * Kovan: 42
 * Ethereum Classic mainnet: 61
 * Ethereum Classic testnet: 62
 * Geth private testnets: 1337
 */
test("Don't support other networks", () => {
    expect(() => getCoinFromChainId(2)).toThrow('Unsupported network');
    expect(() => getCoinFromChainId(30)).toThrow('Unsupported network');
    expect(() => getCoinFromChainId(31)).toThrow('Unsupported network');
    expect(() => getCoinFromChainId(42)).toThrow('Unsupported network');
    expect(() => getCoinFromChainId(61)).toThrow('Unsupported network');
    expect(() => getCoinFromChainId(62)).toThrow('Unsupported network');
    expect(() => getCoinFromChainId(1337)).toThrow('Unsupported network');
    expect(() => getCoinFromChainId(-1)).toThrow('Unsupported network');
    expect(() => getCoinFromChainId('mainnet')).toThrow('Unsupported network');
    expect(() => getCoinFromChainId([1])).toThrow('Unsupported network');
})


/**
 * Test getKeypathFromString
 */

test("Keypath must begin with master node 'm/'", () => {
    expect(() => getKeypathFromString("44'/1'/0'/0").toThrow('Invalid keypath'));
    expect(() => getKeypathFromString("m44'/1'/0'/0").toThrow('Invalid keypath'));
    expect(() => getKeypathFromString("m'/44'/1'/0'/0").toThrow('Invalid keypath'));
})

test("Each level must be a number", () => {
    expect(() => getKeypathFromString("m/m/1'/0'/0").toThrow('Invalid keypath'));
    expect(() => getKeypathFromString("m/44'//0'/0").toThrow('Invalid keypath'));
    expect(() => getKeypathFromString("m/44'/'/0'/0").toThrow('Invalid keypath'));
    expect(() => getKeypathFromString("m/44'/0'/!'/0").toThrow('Invalid keypath'));
})

test("No level can be less than 0", () => {
    expect(() => getKeypathFromString("m/-1'/1'/0'/0").toThrow('Invalid keypath'));
    expect(() => getKeypathFromString("m/44'/1'/0'/-24").toThrow('Invalid keypath'));
    expect(() => getKeypathFromString("m/44'/1'/0'/-2147483648").toThrow('Invalid keypath'));
})

test("No level can be more or equal to HARDENED (0x80000000), before hardening", () => {
    expect(() => getKeypathFromString("m/2147483648'/1'/0'/0").toThrow('Invalid keypath'));
    expect(() => getKeypathFromString("m/2147483648/1'/0'/0").toThrow('Invalid keypath'));
    expect(() => getKeypathFromString("m/44'/8147483648/").toThrow('Invalid keypath'));
})

test("Return valid keypath as array", () => {
    expect(getKeypathFromString("m/44'/1'/0'/0")).toEqual([2147483692, 2147483649, 2147483648, 0]);
    expect(getKeypathFromString("m/44'/60'/0'/0")).toEqual([2147483692, 2147483708, 2147483648, 0]);
    expect(getKeypathFromString("m/44'/60'/2'/15")).toEqual([2147483692, 2147483708, 2147483650, 15]);
})

test("Keypath array must be in matching order", () => {
    expect(getKeypathFromString("m/44'/1'/0'/0")).not.toEqual([2147483649, 2147483692, 2147483648, 0]);
    expect(getKeypathFromString("m/44'/60'/0'/0")).not.toEqual([2147483692, 2147483708, 0, 2147483648]);
})

test("Keypath array must have the matching number of levels", () => {
    expect(getKeypathFromString("m/44'/1'/0'/0").length).toBe(4);
    expect(getKeypathFromString("m/44'/60'/0'/0/22").length).toBe(5);
})


/**
 * Test getCoinFromKeypath
 */
test("m/44'/60'/0'/0 returns mainnet coin ETHCoin.ETH", () => {
    expect(getChainIDFromKeypath([44 + HARDENED, 60 + HARDENED, 0 + HARDENED, 0])).toBe(1);
})

test("m/44'/1'/0'/0 returns testnet coin ETHCoin.RopstenETH", () => {
    expect(getChainIDFromKeypath([44 + HARDENED, 1 + HARDENED, 0 + HARDENED, 0])).toBe(3);
})

test("Account other than 44' throws 'Invalid keypath'", () => {
    expect(() => getChainIDFromKeypath([45 + HARDENED, 60 + HARDENED, 0 + HARDENED, 0])).toThrow('Invalid keypath');
    expect(() => getChainIDFromKeypath([44, 60 + HARDENED, 0 + HARDENED, 0])).toThrow('Invalid keypath');
})

test("Wallet other than 60' or 1' throws 'Invalid keypath'", () => {
    expect(() => getChainIDFromKeypath([44 + HARDENED, 0 + HARDENED, 0 + HARDENED, 0])).toThrow('Invalid keypath');
    expect(() => getChainIDFromKeypath([44 + HARDENED, 60, 0 + HARDENED, 0])).toThrow('Invalid keypath');
    expect(() => getChainIDFromKeypath([44 + HARDENED, 1, 0 + HARDENED, 0])).toThrow('Invalid keypath');
})

test("keypath as string throws, must be Uint8Array", () => {
    expect(() => getChainIDFromKeypath("m/44'/60'/0'/0")).toThrow();
})
