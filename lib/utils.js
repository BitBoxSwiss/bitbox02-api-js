"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getKeypathFromString = exports.getCoinFromChainId = exports.getChainIDFromKeypath = void 0;

var _bitbox = require("./bitbox02.js");

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
var getCoinFromChainId = function getCoinFromChainId(chainId) {
  switch (chainId) {
    case 1:
      return _bitbox.constants.messages.ETHCoin.ETH;

    case 3:
      return _bitbox.constants.messages.ETHCoin.RopstenETH;

    case 4:
      return _bitbox.constants.messages.ETHCoin.RinkebyETH;

    default:
      throw new Error('Unsupported network');
  }
};
/**
 * @param keypathString keypath in string format e.g. m/44'/1'/0'/0
 * @returns keypath as array e.g. [2147483692, 2147483649, 2147483648, 0]
 */


exports.getCoinFromChainId = getCoinFromChainId;

var getKeypathFromString = function getKeypathFromString(keypathString) {
  var levels = keypathString.toLowerCase().split('/');
  if (levels[0] !== 'm') throw new Error('Invalid keypath');
  levels = levels.slice(1);
  return levels.map(function (level) {
    var hardened = false;

    if (level.substring(level.length - 1) === "'") {
      hardened = true;
    }

    level = parseInt(level);

    if (isNaN(level) || level < 0 || level >= _bitbox.HARDENED) {
      throw new Error('Invalid keypath');
    }

    if (hardened) level += _bitbox.HARDENED;
    return level;
  });
};
/**
 * @param keypathArray keypath as an array of ints e.g. [2147483692, 2147483649, 2147483648, 0]
 * FIXME: This is a slight hack until the device is provided with the network by the integrating service
 * The only noticeable consequence is that when using the Rinkeby testnet, the user would see 'Ropsten' on device
 * @returns 1 for mainnet ([44, 60]) and 3 for testnets ([44, 1])
 */


exports.getKeypathFromString = getKeypathFromString;

var getChainIDFromKeypath = function getChainIDFromKeypath(keypathArray) {
  if (keypathArray[0] !== 44 + _bitbox.HARDENED) {
    throw new Error('Invalid keypath');
  }

  switch (keypathArray[1]) {
    case 60 + _bitbox.HARDENED:
      return 1;

    case 1 + _bitbox.HARDENED:
      return 3;

    default:
      throw new Error('Invalid keypath');
  }
};

exports.getChainIDFromKeypath = getChainIDFromKeypath;