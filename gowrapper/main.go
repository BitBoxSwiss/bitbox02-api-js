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
	"encoding/json"
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
		"IsErrorAbort": func(jsError map[string]interface{}) bool {
			return firmware.IsErrorAbort(fromJSError(jsError))
		},
		"New": newJSDevice,
		"constants": map[string]interface{}{
			"Product": map[string]interface{}{
				"BitBox02Multi":      common.ProductBitBox02Multi,
				"BitBox02BTCOnly":    common.ProductBitBox02BTCOnly,
				"BitBoxBaseStandard": common.ProductBitBoxBaseStandard,
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
				"ETHCoin":                    messages.ETHCoin_value,
				"ETHPubRequest_OutputType":   messages.ETHPubRequest_OutputType_value,
				"BTCCoin":                    messages.BTCCoin_value,
				"BTCScriptConfig_SimpleType": messages.BTCScriptConfig_SimpleType_value,
				"BTCOutputType":              messages.BTCOutputType_value,
				"BTCXPubType":                messages.BTCPubRequest_XPubType_value,
			},
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

func (device *jsDevice) AsyncBTCXPub(
	done func(string, error),
	coin messages.BTCCoin,
	keypath []uint32,
	xpubType messages.BTCPubRequest_XPubType,
	display bool) {
	go func() {
		xpub, err := device.device.BTCXPub(coin, keypath, xpubType, display)
		done(xpub, err)
	}()
}

func (device *jsDevice) AsyncBTCAddressSimple(
	done func(string, *jsError),
	coin messages.BTCCoin,
	keypath []uint32,
	simpleType messages.BTCScriptConfig_SimpleType,
	display bool) {
	go func() {
		address, err := device.device.BTCAddress(
			coin,
			keypath,
			firmware.NewBTCScriptConfigSimple(simpleType),
			display)
		done(address, toJSError(err))
	}()
}

// ugly hack because I don't know how to internalize structs automatically.
func convertViaJSON(in interface{}, out interface{}) error {
	jsonBytes, err := json.Marshal(in)
	if err != nil {
		return err
	}
	return json.Unmarshal(jsonBytes, out)
}

type uint64AsDecimalString uint64

func (u *uint64AsDecimalString) UnmarshalJSON(bytes []byte) error {
	var str string
	if err := json.Unmarshal(bytes, &str); err != nil {
		return err
	}
	int, ok := new(big.Int).SetString(str, 10)
	if !ok {
		return errors.New("expected decimal string as value")
	}
	*u = uint64AsDecimalString(int.Uint64())
	return nil
}

type btcSignInputRequest struct {
	PrevOutHash  []byte                `json:"prevOutHash"`
	PrevOutIndex uint32                `json:"prevOutIndex"`
	PrevOutValue uint64AsDecimalString `json:"prevOutValue"`
	Sequence     uint32                `json:"sequence"`
	Keypath      []uint32              `json:"keypath"`
}

func (input *btcSignInputRequest) toInput() *messages.BTCSignInputRequest {
	return &messages.BTCSignInputRequest{
		PrevOutHash:  input.PrevOutHash,
		PrevOutIndex: input.PrevOutIndex,
		PrevOutValue: uint64(input.PrevOutValue),
		Sequence:     input.Sequence,
		Keypath:      input.Keypath,
	}
}

type btcSignOutputRequest struct {
	Ours    bool                   `json:"ours"`
	Type    messages.BTCOutputType `json:"type"`
	Value   uint64AsDecimalString  `json:"value"`
	Hash    []byte                 `json:"hash"`
	Keypath []uint32               `json:"keypath"`
}

func (output *btcSignOutputRequest) toOutput() *messages.BTCSignOutputRequest {
	return &messages.BTCSignOutputRequest{
		Ours:    output.Ours,
		Type:    output.Type,
		Value:   uint64(output.Value),
		Hash:    output.Hash,
		Keypath: output.Keypath,
	}
}

func convertInputsAndOutputs(
	inputs []map[string]interface{}, // matches []*btcSignInputRequest
	outputs []map[string]interface{}, // matches []*btcSignOutputRequest,
) ([]*messages.BTCSignInputRequest, []*messages.BTCSignOutputRequest, error) {
	// Seems there is no easy way to convert js objects...

	var theInputs []*btcSignInputRequest
	if err := convertViaJSON(inputs, &theInputs); err != nil {
		return nil, nil, err
	}
	theInputs2 := make([]*messages.BTCSignInputRequest, len(theInputs))
	for i, input := range theInputs {
		theInputs2[i] = input.toInput()
	}
	var theOutputs []*btcSignOutputRequest
	if err := convertViaJSON(outputs, &theOutputs); err != nil {
		return nil, nil, err
	}
	theOutputs2 := make([]*messages.BTCSignOutputRequest, len(theOutputs))
	for i, output := range theOutputs {
		theOutputs2[i] = output.toOutput()
	}
	return theInputs2, theOutputs2, nil
}

func (device *jsDevice) AsyncBTCSignSimple(
	done func([][]byte, *jsError),
	coin messages.BTCCoin,
	simpleType messages.BTCScriptConfig_SimpleType,
	keypathAccount []uint32,
	inputs []map[string]interface{}, // matches []*btcSignInputRequest
	outputs []map[string]interface{}, // matches []*btcSignOutputRequest
	version uint32,
	locktime uint32,
) {
	go func() {
		theInputs, theOutputs, err := convertInputsAndOutputs(inputs, outputs)
		if err != nil {
			done(nil, toJSError(err))
			return
		}
		signatures, err := device.device.BTCSign(
			coin,
			firmware.NewBTCScriptConfigSimple(simpleType),
			keypathAccount,
			theInputs,
			theOutputs,
			version,
			locktime,
		)
		done(signatures, toJSError(err))
	}()
}

type btcMultisigConfig struct {
	Coin           messages.BTCCoin `json:"coin"`
	KeypathAccount []uint32         `json:"keypathAccount"`
	Threshold      uint32           `json:"threshold"`
	XPubs          []string         `json:"xpubs"`
	OurXPubIndex   uint32           `json:"ourXPubIndex"`
}

func (config *btcMultisigConfig) toScriptConfig() (*messages.BTCScriptConfig, error) {
	return firmware.NewBTCScriptConfigMultisig(
		config.Threshold,
		config.XPubs,
		config.OurXPubIndex,
	)
}

func (device *jsDevice) AsyncBTCIsScriptConfigRegistered(
	done func(bool, *jsError),
	scriptConfig map[string]interface{}, // maches *btcMultisigconfig
) {
	go func() {
		var conf btcMultisigConfig
		if err := convertViaJSON(scriptConfig, &conf); err != nil {
			done(false, toJSError(err))
			return
		}
		scriptConfig, err := conf.toScriptConfig()
		if err != nil {
			done(false, toJSError(err))
			return
		}
		result, err := device.device.BTCIsScriptConfigRegistered(
			conf.Coin, scriptConfig, conf.KeypathAccount)
		done(result, toJSError(err))
	}()
}

func (device *jsDevice) AsyncBTCRegisterScriptConfig(
	done func(*jsError),
	scriptConfig map[string]interface{}, // maches *btcMultisigconfig,
	name string) {
	go func() {
		var conf btcMultisigConfig
		if err := convertViaJSON(scriptConfig, &conf); err != nil {
			done(toJSError(err))
			return
		}
		scriptConfig, err := conf.toScriptConfig()
		if err != nil {
			done(toJSError(err))
			return
		}
		err = device.device.BTCRegisterScriptConfig(conf.Coin, scriptConfig, conf.KeypathAccount, name)
		done(toJSError(err))
	}()
}

func (device *jsDevice) AsyncBTCAddressMultisig(
	done func(string, *jsError),
	scriptConfig map[string]interface{}, // maches *btcMultisigconfig,
	keypath []uint32,
	display bool) {
	go func() {
		var conf btcMultisigConfig
		if err := convertViaJSON(scriptConfig, &conf); err != nil {
			done("", toJSError(err))
			return
		}
		scriptConfig, err := conf.toScriptConfig()
		if err != nil {
			done("", toJSError(err))
			return
		}
		address, err := device.device.BTCAddress(
			conf.Coin,
			keypath,
			scriptConfig,
			display)
		done(address, toJSError(err))
	}()
}

func (device *jsDevice) AsyncBTCSignMultisig(
	done func([][]byte, *jsError),
	scriptConfig map[string]interface{}, // maches *btcMultisigconfig,
	inputs []map[string]interface{}, // matches []*btcSignInputRequest
	outputs []map[string]interface{}, // matches []*btcSignOutputRequest
	version uint32,
	locktime uint32,
) {
	go func() {
		var conf btcMultisigConfig
		if err := convertViaJSON(scriptConfig, &conf); err != nil {
			done(nil, toJSError(err))
			return
		}
		scriptConfig, err := conf.toScriptConfig()
		if err != nil {
			done(nil, toJSError(err))
			return
		}

		theInputs, theOutputs, err := convertInputsAndOutputs(inputs, outputs)
		if err != nil {
			done(nil, toJSError(err))
			return
		}
		signatures, err := device.device.BTCSign(
			conf.Coin,
			scriptConfig,
			conf.KeypathAccount,
			theInputs,
			theOutputs,
			version,
			locktime,
		)
		done(signatures, toJSError(err))
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
	nonce []byte,
	gasPrice []byte,
	gasLimit []byte,
	recipient []byte,
	value []byte,
	data []byte) {
	go func() {

		// TODO: Get rid of these intermediate conversions and pass bytes to firmware directly through ETHSign
		gasPriceBigInt := new(big.Int).SetBytes(gasPrice)
		valueBigInt := new(big.Int).SetBytes(value)

		nonceInt := new(big.Int).SetBytes(nonce).Uint64()
		gasLimitInt := new(big.Int).SetBytes(gasLimit).Uint64()

		if len(recipient) != 20 {
			done(nil, toJSError(errors.New("invalid recipient length")))
			return
		}
		recipient20 := [20]byte{}
		copy(recipient20[:], recipient)
		sig, err := device.device.ETHSign(
			coin, keypath, nonceInt, gasPriceBigInt, gasLimitInt, recipient20, valueBigInt, data)
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
