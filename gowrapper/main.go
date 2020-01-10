// Copyright 2020 Shift Cryptosecurity AG
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

package main

import (
	"bytes"
	"encoding/binary"
	"errors"
	"log"
	"math/big"

	"github.com/digitalbitbox/bitbox02-api-go/api/common"
	"github.com/digitalbitbox/bitbox02-api-go/api/firmware"
	"github.com/digitalbitbox/bitbox02-api-go/api/firmware/messages"
	"github.com/gopherjs/gopherjs/js"
)

// whitelistedFirmwareMethods are exposed as-is from firmare.Device.
var whitelistedFirmwareMethods = map[string]*struct{}{
	"Attestation":   nil,
	"SetOnEvent":    nil,
	"Status":        nil,
	"ChannelHash":   nil,
	"Product":       nil,
	"SupportsETH":   nil,
	"SupportsERC20": nil,
}

type bitbox02Logger struct{}

// Error implements firmware.Logger
func (bb02Logger *bitbox02Logger) Error(msg string, err error) {
	log.Println(msg, err)
}

// Info implements firmware.Logger
func (bb02Logger *bitbox02Logger) Info(msg string) {
	log.Println(msg)
}

// Debug implements firmware.Logger
func (bb02Logger *bitbox02Logger) Debug(msg string) {
	log.Println(msg)
}

type bb02Communication struct {
	query func([]byte) ([]byte, error)
	close func()
}

// Query implements firmware.Query.
func (communication *bb02Communication) Query(msg []byte) ([]byte, error) {
	return communication.query(msg)
}

// Close implements firmware.Close.
func (communication *bb02Communication) Close() {
	communication.close()
}

func main() {
	js.Global.Set("bitbox02", map[string]interface{}{
		"common": map[string]interface{}{
			"Product": map[string]interface{}{
				"BitBox02Multi":      common.ProductBitBox02Multi,
				"BitBox02BTCOnly":    common.ProductBitBox02BTCOnly,
				"BitBoxBaseStandard": common.ProductBitBoxBaseStandard,
			},
		},
		"firmware": map[string]interface{}{
			"IsErrorAbort": func(jsError map[string]interface{}) bool {
				return firmware.IsErrorAbort(fromJSError(jsError))
			},
			"Status": map[string]interface{}{
				"Connected":              firmware.StatusConnected,
				"Unpaired":               firmware.StatusUnpaired,
				"PairingFailed":          firmware.StatusPairingFailed,
				"Uninitialized":          firmware.StatusUninitialized,
				"Seeded":                 firmware.StatusSeeded,
				"Initialized":            firmware.StatusInitialized,
				"RequireFirmwareUpgrade": firmware.StatusRequireFirmwareUpgrade,
				"RequireAppUpgrade":      firmware.StatusRequireAppUpgrade,
			},
			"Event": map[string]interface{}{
				"ChannelHashChanged":   firmware.EventChannelHashChanged,
				"StatusChanged":        firmware.EventStatusChanged,
				"AttestationCheckDone": firmware.EventAttestationCheckDone,
			},
			"messages": map[string]interface{}{
				"ETHCoin":                  messages.ETHCoin_value,
				"ETHPubRequest_OutputType": messages.ETHPubRequest_OutputType_value,
				"BTCCoin":                  messages.BTCCoin_value,
			},
			"New": newJSDevice,
		},
	})
}

func newJSDevice(onWrite func([]byte)) *js.Object {
	readChan := make(chan []byte)
	device := firmware.NewDevice(
		nil,
		nil,
		&config{},
		&bb02Communication{
			query: func(msg []byte) ([]byte, error) {
				dataLen := len(msg)
				if dataLen > 0xFFFF {
					panic("msg too large")
				}
				// init frame
				var packet bytes.Buffer
				const cid = 0xff000000
				const bitboxCMD = 0x80 + 0x40 + 0x01
				if err := binary.Write(&packet, binary.BigEndian, uint32(cid)); err != nil {
					panic(err)
				}
				if err := binary.Write(&packet, binary.BigEndian, byte(bitboxCMD)); err != nil {
					panic(err)
				}
				if err := binary.Write(&packet, binary.BigEndian, uint16(dataLen&0xFFFF)); err != nil {
					panic(err)
				}
				packet.Write(msg)
				onWrite(packet.Bytes())
				return <-readChan, nil
			},
			close: func() {

			},
		},
		&bitbox02Logger{},
	)

	// TODO: construct directly from whitelist instead of deleting. The way GopherJS
	// works, there is no js file size savings doing that, so deleting after is okay for
	// now.
	obj := js.MakeWrapper(device)
	for _, key := range js.Keys(obj) {
		if _, ok := whitelistedFirmwareMethods[key]; !ok {
			obj.Delete(key)
		}

	}
	wrapped := &jsDevice{device, readChan}
	obj.Set("js", js.MakeWrapper(wrapped))
	return obj
}

// jsDevice adds additional device methods to be exposed to JavaScript.
//
// All methods starting with Async follow the same pattern: first argument is a "done" callback with
// the first argument being the error, and the rest of the arguments being regular result values.
// Those functions can be used as promises in JavaScript.
type jsDevice struct {
	device   *firmware.Device
	readChan chan<- []byte
}

func (device *jsDevice) OnRead(msg []byte) {
	msg = msg[7:] // TODO: parse and verify u2f header
	device.readChan <- msg
}

func (device *jsDevice) AsyncInit(done func(*jsError)) {
	go func() {
		done(toJSError(device.device.Init()))
	}()
}

func (device *jsDevice) AsyncChannelHashVerify(done func(*jsError), ok bool) {
	go func() {
		device.device.ChannelHashVerify(ok)
		done(nil)
	}()
}

func (device *jsDevice) AsyncETHPub(
	done func(string, *jsError),
	coin messages.ETHCoin,
	keypath []uint32,
	outputType messages.ETHPubRequest_OutputType,
	display bool,
	contractAddress []byte,
) {
	go func() {
		address, err := device.device.ETHPub(coin, keypath, outputType, display, contractAddress)
		done(address, toJSError(err))
	}()
}

// AsyncETHSign is like the wrapped ETHSign, but the *big.Int fields are passed as decimal strings.
func (device *jsDevice) AsyncETHSign(
	done func([]byte, *jsError),
	coin messages.ETHCoin,
	keypath []uint32,
	nonce uint64,
	gasPrice string,
	gasLimit uint64,
	recipient []byte,
	value string,
	data []byte) {
	go func() {
		gasPriceBigInt, ok := new(big.Int).SetString(gasPrice, 10)
		if !ok {
			done(nil, toJSError(errors.New("invalid decimal string")))
			return
		}
		valueBigInt, ok := new(big.Int).SetString(value, 10)
		if !ok {
			done(nil, toJSError(errors.New("invalid decimal string")))
			return
		}
		if len(recipient) != 20 {
			done(nil, toJSError(errors.New("invalid recipient length")))
			return
		}
		recipient20 := [20]byte{}
		copy(recipient20[:], recipient)
		sig, err := device.device.ETHSign(
			coin, keypath, nonce, gasPriceBigInt, gasLimit, recipient20, valueBigInt, data)
		done(sig, toJSError(err))
	}()
}

func (device *jsDevice) AsyncETHSignMessage(
	done func([]byte, *jsError),
	coin messages.ETHCoin,
	keypath []uint32,
	msg []byte) {
	go func() {
		sig, err := device.device.ETHSignMessage(coin, keypath, msg)
		done(sig, toJSError(err))
	}()
}
