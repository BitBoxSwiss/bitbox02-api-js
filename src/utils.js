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

import { constants, HARDENED } from './bitbox02.js';

export const getCoinFromChainId = chainId => {
    switch(chainId) {
        case 1:
            return constants.messages.ETHCoin.ETH;
        case 3:
            return constants.messages.ETHCoin.RopstenETH;
        case 4:
            return constants.messages.ETHCoin.RinkebyETH;
        default:
            throw new Error('Unsupported network');
    }
}

/**
 * @param keypathString keypath in string format e.g. m/44'/1'/0'/0
 * @returns keypath as array e.g. [2147483692, 2147483649, 2147483648, 0]
 */
export const getKeypathFromString = keypathString => {
    let levels = keypathString.toLowerCase().split('/');
    if (levels[0] !== 'm') throw new Error('Invalid keypath');
    levels = levels.slice(1);

    return levels.map(level => {
        let hardened = false;
        if (level.substring(level.length - 1) === "'") {
            hardened = true
        }
        level = parseInt(level);
        if (isNaN(level) || level < 0 || level >= HARDENED) {
            throw new Error('Invalid keypath');
        }
        if (hardened) level += HARDENED;
        return level;
    })
}

/**
 * @param keypathArray keypath as an array of ints e.g. [2147483692, 2147483649, 2147483648, 0]
 * FIXME: This is a slight hack until the device is provided with the network by the integrating service
 * The only noticeable consequence is that when using the Rinkeby testnet, the user would see 'Ropsten' on device
 * @returns 1 for mainnet ([44, 60]) and 3 for testnets ([44, 1])
 */
export const getChainIDFromKeypath = keypathArray => {
    if (keypathArray[0] !== 44 + HARDENED) {
        throw new Error('Invalid keypath');
    }
    switch(keypathArray[1]) {
        case 60 + HARDENED:
            return 1;
        case 1 + HARDENED:
            return 3;
        default:
            throw new Error('Invalid keypath');
    }
}
