"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDevicePath = getDevicePath;
exports.BitBox02API = exports.HARDENED = exports.isErrorAbort = exports.constants = void 0;

require("./bitbox02-api-go.js");

var _utils = require("./utils.js");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var api = bitbox02;
var constants = bitbox02.constants;
exports.constants = constants;
var isErrorAbort = bitbox02.IsErrorAbort;
exports.isErrorAbort = isErrorAbort;
var HARDENED = 0x80000000;
exports.HARDENED = HARDENED;
var webHID = 'WEBHID';

function sleep(ms) {
  return new Promise(function (resolve) {
    return setTimeout(resolve, ms);
  });
} // If WebHID support is present, this returns the constant "WEBHID". Otherwise,
// will try for 1 second to find a device through the bridge, check if
// there is exactly one connected BitBox02, and return its bridge device path.


function getDevicePath() {
  return _getDevicePath.apply(this, arguments);
}

function _getDevicePath() {
  _getDevicePath = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee14() {
    var attempts, i, response, errorMessage, devices, devicePath;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            if (!navigator.hid) {
              _context14.next = 2;
              break;
            }

            return _context14.abrupt("return", webHID);

          case 2:
            attempts = 10;
            i = 0;

          case 4:
            if (!(i < attempts)) {
              _context14.next = 36;
              break;
            }

            response = void 0;
            errorMessage = void 0;
            _context14.prev = 7;
            _context14.next = 10;
            return fetch("http://localhost:8178/api/v1/devices", {
              method: 'GET',
              headers: {}
            });

          case 10:
            response = _context14.sent;

            if (!(!response.ok && response.status === 403)) {
              _context14.next = 16;
              break;
            }

            errorMessage = 'Origin not whitelisted';
            throw new Error();

          case 16:
            if (response.ok) {
              _context14.next = 19;
              break;
            }

            errorMessage = 'Unexpected';
            throw new Error();

          case 19:
            _context14.next = 24;
            break;

          case 21:
            _context14.prev = 21;
            _context14.t0 = _context14["catch"](7);
            throw new Error(errorMessage ? errorMessage : 'BitBoxBridge not found');

          case 24:
            _context14.next = 26;
            return response.json();

          case 26:
            devices = _context14.sent.devices;

            if (!(devices.length !== 1)) {
              _context14.next = 31;
              break;
            }

            _context14.next = 30;
            return sleep(100);

          case 30:
            return _context14.abrupt("continue", 33);

          case 31:
            devicePath = devices[0].path;
            return _context14.abrupt("return", devicePath);

          case 33:
            i++;
            _context14.next = 4;
            break;

          case 36:
            throw new Error("Expected one BitBox02");

          case 37:
          case "end":
            return _context14.stop();
        }
      }
    }, _callee14, null, [[7, 21]]);
  }));
  return _getDevicePath.apply(this, arguments);
}

function promisify(f) {
  return function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return new Promise(function (resolve, reject) {
      return f.apply(void 0, [function () {
        for (var _len2 = arguments.length, results = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          results[_key2] = arguments[_key2];
        }

        var err = results.pop();

        if (err !== null) {
          return reject(err);
        }

        return resolve.apply(void 0, results);
      }].concat(args));
    });
  };
}

var setOutputDefaults = function setOutputDefaults(outputs) {
  // Workaround for gopherjs: all fields must be set for Go to be able to parse the structure,
  // even though some fields are optional some of the time.
  for (var i = 0; i < outputs.length; i++) {
    outputs[i] = Object.assign({
      type: 0,
      hash: new Uint8Array(0),
      keypath: []
    }, outputs[i]);
  }
};

var BitBox02API = /*#__PURE__*/function () {
  /**
   * @param devicePath See `getDevicePath()`.
  */
  function BitBox02API(devicePath) {
    var _this = this;

    _classCallCheck(this, BitBox02API);

    _defineProperty(this, "connectWebsocket", function (onMessageCb) {
      var socket = new WebSocket("ws://127.0.0.1:8178/api/v1/socket/" + _this.devicePath);
      return new Promise(function (resolve, reject) {
        socket.binaryType = 'arraybuffer';

        socket.onmessage = function (event) {
          onMessageCb(new Uint8Array(event.data));
        };

        socket.onclose = function (event) {
          if (_this.onCloseCb) {
            _this.onCloseCb();
          }
        };

        socket.onopen = function (event) {
          resolve({
            onWrite: function onWrite(bytes) {
              if (socket.readyState != WebSocket.OPEN) {
                console.error("attempted write to a closed socket");
                return;
              }

              socket.send(bytes);
            },
            close: function close() {
              return socket.close();
            },
            valid: function valid() {
              return socket.readyState == WebSocket.OPEN;
            }
          });
        };

        socket.onerror = function (event) {
          reject("Your BitBox02 is busy");
        };
      });
    });

    _defineProperty(this, "connectWebHID", /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(onMessageCb) {
        var vendorID, productID, device, devices, d, onInputReport;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                vendorID = 0x03eb;
                productID = 0x2403;
                _context.prev = 2;
                _context.next = 5;
                return navigator.hid.requestDevice({
                  filters: [{
                    vendorID: vendorID,
                    productID: productID
                  }]
                });

              case 5:
                devices = _context.sent;
                d = devices[0]; // Filter out other products that might be in the list presented by the Browser.

                if (d.productName.includes('BitBox02')) {
                  device = d;
                }

                _context.next = 13;
                break;

              case 10:
                _context.prev = 10;
                _context.t0 = _context["catch"](2);
                return _context.abrupt("return", null);

              case 13:
                if (device) {
                  _context.next = 15;
                  break;
                }

                return _context.abrupt("return", null);

              case 15:
                _context.next = 17;
                return device.open();

              case 17:
                onInputReport = function onInputReport(event) {
                  onMessageCb(new Uint8Array(event.data.buffer));
                };

                device.addEventListener("inputreport", onInputReport);
                return _context.abrupt("return", {
                  onWrite: function onWrite(bytes) {
                    if (!device.opened) {
                      console.error("attempted write to a closed HID connection");
                      return;
                    }

                    device.sendReport(0, bytes);
                  },
                  close: function close() {
                    device.close().then(function () {
                      device.removeEventListener("inputreport", onInputReport);

                      if (_this.onCloseCb) {
                        _this.onCloseCb();
                      }
                    });
                  },
                  valid: function valid() {
                    return device.opened;
                  }
                });

              case 20:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[2, 10]]);
      }));

      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }());

    this.devicePath = devicePath; // connection is an object with three keys once the connection is established:
    // onWrite(bytes): send bytes
    // close():  close the connection
    // valid(): bool - is the connection still alive?

    this.connection = null;
    this.onCloseCb = null;

    if (navigator.hid) {
      navigator.hid.addEventListener("disconnect", function () {
        if (_this.onCloseCb) {
          _this.onCloseCb();
        }
      });
    }
  }

  _createClass(BitBox02API, [{
    key: "connect",
    value:
    /**
     * @param showPairingCb Callback that is used to show pairing code. Must not block.
     * @param userVerify Promise that should resolve once the user wants to continue.
     * @param handleAttastionCb Callback that should handle the bool attestation result. Must not block.
     * @param onCloseCb Callback that's called when the websocket connection is closed.
     * @param setStatusCb Callback that lets the API set the status received from the device.
     * @return Promise that will resolve once the pairing is complete.
     */
    function () {
      var _connect = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(showPairingCb, userVerify, handleAttestationCb, onCloseCb, setStatusCb) {
        var _this2 = this;

        var onMessage, useBridge, key;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                this.onCloseCb = onCloseCb;

                onMessage = function onMessage(bytes) {
                  if (_this2.connectionValid()) {
                    _this2.firmware().js.OnRead(bytes);
                  }
                };

                useBridge = this.devicePath !== webHID;

                if (!useBridge) {
                  _context2.next = 9;
                  break;
                }

                _context2.next = 6;
                return this.connectWebsocket(onMessage);

              case 6:
                this.connection = _context2.sent;
                _context2.next = 12;
                break;

              case 9:
                _context2.next = 11;
                return this.connectWebHID(onMessage);

              case 11:
                this.connection = _context2.sent;

              case 12:
                if (this.connection) {
                  _context2.next = 14;
                  break;
                }

                throw new Error("Could not establish a connection to the BitBox02");

              case 14:
                if (useBridge) {
                  this.fw = api.NewDeviceBridge(this.connection.onWrite);
                } else {
                  this.fw = api.NewDeviceWebHID(this.connection.onWrite);
                } // Turn all Async* methods into promises.


                for (key in this.firmware().js) {
                  if (key.startsWith("Async")) {
                    this.firmware().js[key] = promisify(this.firmware().js[key]);
                  }
                }

                this.firmware().SetOnEvent(function (ev) {
                  if (ev === constants.Event.StatusChanged && _this2.firmware()) {
                    setStatusCb(_this2.firmware().Status());
                  }

                  if (ev === constants.Event.StatusChanged && _this2.firmware().Status() === constants.Status.Unpaired) {
                    var _this2$firmware$Chann = _this2.firmware().ChannelHash(),
                        _this2$firmware$Chann2 = _slicedToArray(_this2$firmware$Chann, 1),
                        channelHash = _this2$firmware$Chann2[0];

                    showPairingCb(channelHash);
                  }

                  if (ev === constants.Event.AttestationCheckDone) {
                    handleAttestationCb(_this2.firmware().Attestation());
                  }

                  if (ev === constants.Event.StatusChanged && _this2.firmware().Status() === constants.Status.RequireFirmwareUpgrade) {
                    _this2.connection.close();

                    throw new Error('Firmware upgrade required');
                  }

                  if (ev === constants.Event.StatusChanged && _this2.firmware().Status() === constants.Status.RequireAppUpgrade) {
                    _this2.connection.close();

                    throw new Error('Unsupported firmware');
                  }

                  if (ev === constants.Event.StatusChanged && _this2.firmware().Status() === constants.Status.Uninitialized) {
                    _this2.connection.close();

                    throw new Error('Uninitialized');
                  }
                });
                _context2.next = 19;
                return this.firmware().js.AsyncInit();

              case 19:
                _context2.t0 = this.firmware().Status();
                _context2.next = _context2.t0 === constants.Status.PairingFailed ? 22 : _context2.t0 === constants.Status.Unpaired ? 24 : _context2.t0 === constants.Status.Initialized ? 29 : 30;
                break;

              case 22:
                this.connection.close();
                throw new Error("Pairing rejected");

              case 24:
                _context2.next = 26;
                return userVerify();

              case 26:
                _context2.next = 28;
                return this.firmware().js.AsyncChannelHashVerify(true);

              case 28:
                return _context2.abrupt("break", 31);

              case 29:
                return _context2.abrupt("break", 31);

              case 30:
                throw new Error("Unexpected status: " + this.firmware().Status() + "," + constants.Status.Unpaired);

              case 31:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function connect(_x2, _x3, _x4, _x5, _x6) {
        return _connect.apply(this, arguments);
      }

      return connect;
    }() // --- Bitcoin methods ---

    /**
     * # Get a Bitcoin xPub key for a given coin and derivation path.
     *
     * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
     * @param keypath account-level keypath, for example `getKeypathFromString("m/49'/0'/0'")`.
     * @param xpubType xpub version - `constants.messages.BTCXPubType.*`, for example `constants.messages.BTCXPubType.YPUB`.
     * @param display if true, the device device will show the xpub on the screen before returning.
     * @return the xpub string.
     */

  }, {
    key: "btcXPub",
    value: function () {
      var _btcXPub = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(coin, keypath, xpubType, display) {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                return _context3.abrupt("return", this.firmware().js.AsyncBTCXPub(coin, keypath, xpubType, display));

              case 1:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function btcXPub(_x7, _x8, _x9, _x10) {
        return _btcXPub.apply(this, arguments);
      }

      return btcXPub;
    }()
    /**
     * Display a single-sig address on the device. The address to be shown in the wallet is usually derived
     * from the xpub (see `btcXPub` and account type.
     *
     * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
     * @param keypath address-level keypath, for example `getKeypathFromString("m/49'/0'/0'/1/10")`.
     * @param simpleType is the address type - `constants.messages.BTCScriptConfig_SimpleType.*`, for example `constants.messages.BTCScriptConfig_SimpleType.P2WPKH_P2SH` for `3...` segwit addresses.
     * @param display wheter to display the address on the device for user confirmation, default true.
     * @return promise with address string or reject with aborted error
     */

  }, {
    key: "btcDisplayAddressSimple",
    value: function () {
      var _btcDisplayAddressSimple = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(coin, keypath, simpleType) {
        var display,
            _args4 = arguments;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                display = _args4.length > 3 && _args4[3] !== undefined ? _args4[3] : true;
                return _context4.abrupt("return", this.firmware().js.AsyncBTCAddressSimple(coin, keypath, simpleType, display));

              case 2:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function btcDisplayAddressSimple(_x11, _x12, _x13) {
        return _btcDisplayAddressSimple.apply(this, arguments);
      }

      return btcDisplayAddressSimple;
    }()
    /**
     * # Sign a single-sig transaction.
     *
     * @param coin Coin to target - `constants.messages.BTCCoin.*`, for example `constants.messages.BTCCoin.BTC`.
     * @param simpleType same as in `btcDisplayAddressSimple`.
     * @param keypathAccount account-level keypath, for example `getKeypathFromString("m/84'/0'/0'")`.
     * @param inputs array of input objects
     *     {
     *       "prevOutHash": Uint8Array(32),
     *       "prevOutIndex": number,
     *       "prevOutValue": string, // satoshis as a decimal string,
     *       "sequence": number, // usually 0xFFFFFFFF
     *       "keypath": [number], // usually keypathAccount.concat([change, address]),
     *     }
     * @param outputs array of output objects, with each output being either regular output or a change output
     *    Change outputs:
     *        {
     *            "ours": true,
     *            "keypath": [number], // usually keypathAccount.concat([1, <address>]),
     *            "value": string, // satoshis as a decimal string,
     *        }
     *    Regular outputs:
     *        {
     *            "ours": false,
     *            "type": constants.messages.BTCOutputType.P2WSH // e.g. constants.messages.BTCOutputType.P2PKH,
     *            // pubkey or script hash. 20 bytes for P2PKH, P2SH, P2WPKH. 32 bytes for P2WSH.
     *            "hash": new Uint8Array(20) | new Uint8Array(32)
     *            "value": string, // satoshis as a decimal string,
     *        }
     * @param version Transaction version, usually 1 or 2.
     * @param locktime Transaction locktime, usually 0.
     * @return Array of 64 byte signatures, one per input.
     */

  }, {
    key: "btcSignSimple",
    value: function () {
      var _btcSignSimple = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(coin, simpleType, keypathAccount, inputs, outputs, version, locktime) {
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                setOutputDefaults(outputs);
                return _context5.abrupt("return", this.firmware().js.AsyncBTCSignSimple(coin, simpleType, keypathAccount, inputs, outputs, version, locktime));

              case 2:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function btcSignSimple(_x14, _x15, _x16, _x17, _x18, _x19, _x20) {
        return _btcSignSimple.apply(this, arguments);
      }

      return btcSignSimple;
    }()
    /**
     * Sign a Bitcoin message on the device.
     * @param coin Coin to target - `constants.messages.BTCCoin.*`. Currenty must be `constants.messages.BTCCoin.BTC`.
     * @param simpleType same as in `btcDisplayAddressSimple`.
     * @param keypath address-level keypath, for example `getKeypathFromString("m/49'/0'/0'/0/0")`.
     * @param message Buffer/Uint8Array
     * @returns Object
     *     {
     *         signature: Uint8Array(64)
     *         recID: number
     *         electrumSignature: Uint8Array(65)
     *     }
     */

  }, {
    key: "btcSignMessage",
    value: function () {
      var _btcSignMessage = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(coin, simpleType, keypath, message) {
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                return _context6.abrupt("return", this.firmware().js.AsyncBTCSignMessage(coin, simpleType, keypath, message));

              case 1:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function btcSignMessage(_x21, _x22, _x23, _x24) {
        return _btcSignMessage.apply(this, arguments);
      }

      return btcSignMessage;
    }()
    /**
     * # Register a multisig account on the device with a user chosen name. If it is already registered, this does nothing.
     * # A multisig account must be registered before it can be used to show multisig addresses or sign multisig transactions.
     * # Note:
     * # Currently, only P2WSH (bech32) multisig accounts on the keypath `m/48'/<coin>'/<account>'/2'` are supported.
     *
     * @param account account object details:
     *     {
     *         "coin": constants.messages.BTCCoin, // for example constants.messages.BTCCoin.BTC
     *         "keypathAccount": [number], // account-level keypath, for example `getKeypathFromString("m/48'/0'/0'/2'")`.
     *         "threshold": number, // signing threshold, e.g. 2.
     *         "xpubs": [string], // list of account-level xpubs given in any format. One of them must belong to the connected BitBox02.
     *         "ourXPubIndex": nmber, // index of the currently connected BitBox02's multisig xpub in the xpubs array, e.g. 0.
     *     }
     * @param getName: async () => string - If the account is unknown to the device, this function will be called to get an
     *                 account name from the user. The resulting name must be between 1 and 30 ascii chars.
     */

  }, {
    key: "btcMaybeRegisterScriptConfig",
    value: function () {
      var _btcMaybeRegisterScriptConfig = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(account, getName) {
        var isRegistered;
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _context7.next = 2;
                return this.firmware().js.AsyncBTCIsScriptConfigRegistered(account);

              case 2:
                isRegistered = _context7.sent;

                if (isRegistered) {
                  _context7.next = 11;
                  break;
                }

                _context7.t0 = this.firmware().js;
                _context7.t1 = account;
                _context7.next = 8;
                return getName();

              case 8:
                _context7.t2 = _context7.sent;
                _context7.next = 11;
                return _context7.t0.AsyncBTCRegisterScriptConfig.call(_context7.t0, _context7.t1, _context7.t2);

              case 11:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function btcMaybeRegisterScriptConfig(_x25, _x26) {
        return _btcMaybeRegisterScriptConfig.apply(this, arguments);
      }

      return btcMaybeRegisterScriptConfig;
    }()
    /**
     * # Display a multisig address on the device. `btcMaybeRegisterScriptConfig` should be called beforehand.
     *
     * @param account same as in `btcMaybeRegisterScriptConfig`.
     * @param keypath address-level keypath from the account, usually `account.keypathAccount.concat([0, address])`.
     */

  }, {
    key: "btcDisplayAddressMultisig",
    value: function () {
      var _btcDisplayAddressMultisig = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(account, keypath) {
        var display;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                display = true;
                return _context8.abrupt("return", this.firmware().js.AsyncBTCAddressMultisig(account, keypath, display));

              case 2:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function btcDisplayAddressMultisig(_x27, _x28) {
        return _btcDisplayAddressMultisig.apply(this, arguments);
      }

      return btcDisplayAddressMultisig;
    }()
    /**
     * # Sign a multisig transaction. `btcMaybeRegisterScriptConfig` should be called beforehand.
     *
     * @param account same as in `btcMaybeRegisterScriptConfig`.
     * Other params and return are the same as in `btcSignSimple`.
     */

  }, {
    key: "btcSignMultisig",
    value: function () {
      var _btcSignMultisig = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(account, inputs, outputs, version, locktime) {
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                setOutputDefaults(outputs);
                return _context9.abrupt("return", this.firmware().js.AsyncBTCSignMultisig(account, inputs, outputs, version, locktime));

              case 2:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function btcSignMultisig(_x29, _x30, _x31, _x32, _x33) {
        return _btcSignMultisig.apply(this, arguments);
      }

      return btcSignMultisig;
    }() // --- End Bitcoin methods ---
    // --- Ethereum methods ---

    /**
     * # Get Ethereum xPub key for a given coin and derivation path.
     *
     * @param keypath account keypath in string format
     * Currently only two keypaths are supported:
     *     - `m/44'/60'/0'/0` for mainnet and
     *     - `m/44'/1'/0'/0`  for Rinkeby and Ropsten testnets
     * @returns string; ethereum extended public key
     */

  }, {
    key: "ethGetRootPubKey",
    value: function () {
      var _ethGetRootPubKey = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(keypath) {
        var keypathArray, coin, xpub;
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                keypathArray = (0, _utils.getKeypathFromString)(keypath);
                coin = (0, _utils.getCoinFromKeypath)(keypathArray);
                _context10.next = 4;
                return this.firmware().js.AsyncETHPub(coin, keypathArray, constants.messages.ETHPubRequest_OutputType.XPUB, false, new Uint8Array());

              case 4:
                xpub = _context10.sent;
                return _context10.abrupt("return", xpub);

              case 6:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function ethGetRootPubKey(_x34) {
        return _ethGetRootPubKey.apply(this, arguments);
      }

      return ethGetRootPubKey;
    }()
  }, {
    key: "ethDisplayAddress",
    value:
    /**
     * Display an Ethereum address on the device screen for verification.
     *
     * @param keypath string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
     * @param display wheter to display the address on the device for user confirmation, default true.
     * @returns promise with the ETH address or reject with aborted error
     */
    function () {
      var _ethDisplayAddress = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(keypath) {
        var display,
            keypathArray,
            coin,
            _args11 = arguments;
        return regeneratorRuntime.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                display = _args11.length > 1 && _args11[1] !== undefined ? _args11[1] : true;
                keypathArray = (0, _utils.getKeypathFromString)(keypath); // FIXME: see def of `getCoinFromPath()`, since we use the same keypath for Ropsten and Rinkeby,
                // the title for Rinkeby addresses will show 'Ropsten' instead

                coin = (0, _utils.getCoinFromKeypath)(keypathArray);
                return _context11.abrupt("return", this.firmware().js.AsyncETHPub(coin, keypathArray, constants.messages.ETHPubRequest_OutputType.ADDRESS, display, new Uint8Array()));

              case 4:
              case "end":
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function ethDisplayAddress(_x35) {
        return _ethDisplayAddress.apply(this, arguments);
      }

      return ethDisplayAddress;
    }()
  }, {
    key: "ethSignTransaction",
    value:
    /**
     * # Signs an Ethereum transaction on the device.
     *
     * We recommend using the [`Transaction` type](https://github.com/ethereumjs/ethereumjs-tx/blob/master/src/transaction.ts) provided by the `ethereumjs` library.\
     *
     * @param signingData Object
     *     {
     *         keypath, // string, e.g. m/44'/60'/0'/0/0
     *         chainId, // number, currently 1, 3 or 4 for Mainnet, Ropsten and Rinkeby respectively
     *         tx       // Object, either as provided by the `Transaction` type from `ethereumjs` library
     *                  // or including `nonce`, `gasPrice`, `gasLimit`, `to`, `value`, and `data` as byte arrays
     *     }
     * @returns Object; result with the signature bytes r, s, v
     *     {
     *         r: Uint8Array(32)
     *         s: Uint8Array(32)
     *         v: Uint8Array(1)
     *     }
     */
    function () {
      var _ethSignTransaction = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(signingData) {
        var sig, vOffset, result;
        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _context12.prev = 0;
                _context12.next = 3;
                return this.fw.js.AsyncETHSign((0, _utils.getCoinFromChainId)(signingData.chainId), (0, _utils.getKeypathFromString)(signingData.keypath), signingData.tx.nonce, signingData.tx.gasPrice, signingData.tx.gasLimit, signingData.tx.to, signingData.tx.value, signingData.tx.data);

              case 3:
                sig = _context12.sent;
                vOffset = signingData.chainId * 2 + 8;
                result = {
                  r: sig.slice(0, 0 + 32),
                  s: sig.slice(0 + 32, 0 + 32 + 32),
                  v: [parseInt(sig.slice(64), 16) + 27 + vOffset]
                };
                return _context12.abrupt("return", result);

              case 9:
                _context12.prev = 9;
                _context12.t0 = _context12["catch"](0);

                if (!api.IsErrorAbort(_context12.t0)) {
                  _context12.next = 15;
                  break;
                }

                throw new Error('User abort');

              case 15:
                throw new Error(_context12.t0.Message);

              case 16:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12, this, [[0, 9]]);
      }));

      function ethSignTransaction(_x36) {
        return _ethSignTransaction.apply(this, arguments);
      }

      return ethSignTransaction;
    }()
  }, {
    key: "ethSignMessage",
    value:
    /**
     * # Sign an Ethereum message on the device.
     *
     * @param msgData is an object including the keypath and the message as bytes
     *     {
     *         keypath    // string, e.g. m/44'/60'/0'/0/0 for the first mainnet account
     *         message    // Buffer/Uint8Array
     *     }
     * @returns Object; result with the signature bytes r, s, v
     *     {
     *         r: Uint8Array(32)
     *         s: Uint8Array(32)
     *         v: Uint8Array(1)
     *     }
     */
    function () {
      var _ethSignMessage = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee13(msgData) {
        var keypath, sig, result;
        return regeneratorRuntime.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                _context13.prev = 0;
                keypath = (0, _utils.getKeypathFromString)(msgData.keypath);
                _context13.next = 4;
                return this.firmware().js.AsyncETHSignMessage((0, _utils.getCoinFromKeypath)(keypath), keypath, msgData.message);

              case 4:
                sig = _context13.sent;
                result = {
                  r: sig.slice(0, 0 + 32),
                  s: sig.slice(0 + 32, 0 + 32 + 32),
                  v: [parseInt(sig.slice(64), 16) + 27]
                };
                return _context13.abrupt("return", result);

              case 9:
                _context13.prev = 9;
                _context13.t0 = _context13["catch"](0);

                if (!api.IsErrorAbort(_context13.t0)) {
                  _context13.next = 15;
                  break;
                }

                throw new Error('User abort');

              case 15:
                throw new Error(_context13.t0.Message);

              case 16:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13, this, [[0, 9]]);
      }));

      function ethSignMessage(_x37) {
        return _ethSignMessage.apply(this, arguments);
      }

      return ethSignMessage;
    }() // --- End Ethereum methods ---

    /**
     * @returns True if the connection has been opened and successfully established.
     */

  }, {
    key: "connectionValid",
    value: function connectionValid() {
      return this.connection && this.connection.valid();
    }
    /**
     * @returns False if connection wasn't opened
     */

  }, {
    key: "close",
    value: function close() {
      if (!this.connectionValid()) {
        return false;
      }

      this.connection.close();
      this.connection = null;
      return true;
    }
    /**
     * Use the return value of this function to communicate with device
     * @return Undefined if connection wasn't opened
     */

  }, {
    key: "firmware",
    value: function firmware() {
      if (!this.connectionValid()) {
        throw new Error('Device or websocket not connected');
      }

      return this.fw;
    }
  }]);

  return BitBox02API;
}();

exports.BitBox02API = BitBox02API;