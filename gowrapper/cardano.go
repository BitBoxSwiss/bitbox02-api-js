// Copyright 2021 Shift Crypto AG
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
	"errors"
	"math/big"

	"github.com/digitalbitbox/bitbox02-api-go/api/firmware/messages"
	"github.com/gopherjs/gopherjs/js"
)

type cardanoInput struct {
	*js.Object
	Keypath      []uint32 `js:"keypath"`
	PrevOutHash  []byte   `js:"prevOutHash"`
	PrevOutIndex uint32   `js:"prevOutIndex"`
}

func (input *cardanoInput) toInput() (*messages.CardanoSignTransactionRequest_Input, error) {
	return &messages.CardanoSignTransactionRequest_Input{
		Keypath:      input.Keypath,
		PrevOutHash:  input.PrevOutHash,
		PrevOutIndex: input.PrevOutIndex,
	}, nil
}

type cardanoScriptConfig struct {
	*js.Object
	// Poor man's union: one of the fields must be set.
	PkhSkh *struct {
		*js.Object
		KeypathPayment []uint32 `js:"keypathPayment"`
		KeypathStake   []uint32 `js:"keypathStake"`
	} `js:"pkhSkh"`
}

func (addr *cardanoScriptConfig) toScriptConfig() *messages.CardanoScriptConfig {
	if addr.Object == js.Undefined {
		return nil
	}
	if addr.PkhSkh.Object != js.Undefined {
		return &messages.CardanoScriptConfig{Config: &messages.CardanoScriptConfig_PkhSkh_{
			PkhSkh: &messages.CardanoScriptConfig_PkhSkh{
				KeypathPayment: addr.PkhSkh.KeypathPayment,
				KeypathStake:   addr.PkhSkh.KeypathStake,
			},
		}}
	}
	return nil
}

type cardanoOutput struct {
	*js.Object
	EncodedAddress string               `js:"encodedAddress"`
	Value          string               `js:"value"`
	ScriptConfig   *cardanoScriptConfig `js:"scriptConfig"`
}

func (output *cardanoOutput) toOutput() (*messages.CardanoSignTransactionRequest_Output, error) {
	value, ok := new(big.Int).SetString(output.Value, 10)
	if !ok {
		return nil, errors.New("expected decimal string as value")
	}
	return &messages.CardanoSignTransactionRequest_Output{
		EncodedAddress: output.EncodedAddress,
		Value:          value.Uint64(),
		ScriptConfig:   output.ScriptConfig.toScriptConfig(),
	}, nil
}

type keypath struct {
	*js.Object
	Keypath []uint32 `js:"keypath"`
}

type cardanoCertificate struct {
	*js.Object
	// Poor man's union: one of the fields must be set.
	StakeRegistration   *keypath `js:"stakeRegistration"`
	StakeDeregistration *keypath `js:"stakeDeregistration"`
	StakeDelegation     *struct {
		*js.Object
		Keypath     []uint32 `js:"keypath"`
		PoolKeyhash []byte   `js:"poolKeyhash"`
	} `js:"stakeDelegation"`
}

func (cert *cardanoCertificate) toCertificate() (*messages.CardanoSignTransactionRequest_Certificate, error) {
	if cert.StakeRegistration.Object != js.Undefined {
		return &messages.CardanoSignTransactionRequest_Certificate{
			Cert: &messages.CardanoSignTransactionRequest_Certificate_StakeRegistration{
				StakeRegistration: &messages.Keypath{
					Keypath: cert.StakeRegistration.Keypath,
				},
			},
		}, nil
	}
	if cert.StakeDeregistration.Object != js.Undefined {
		return &messages.CardanoSignTransactionRequest_Certificate{
			Cert: &messages.CardanoSignTransactionRequest_Certificate_StakeDeregistration{
				StakeDeregistration: &messages.Keypath{
					Keypath: cert.StakeDeregistration.Keypath,
				},
			},
		}, nil
	}
	if cert.StakeDelegation.Object != js.Undefined {
		return &messages.CardanoSignTransactionRequest_Certificate{
			Cert: &messages.CardanoSignTransactionRequest_Certificate_StakeDelegation_{
				StakeDelegation: &messages.CardanoSignTransactionRequest_Certificate_StakeDelegation{
					Keypath:     cert.StakeDelegation.Keypath,
					PoolKeyhash: cert.StakeDelegation.PoolKeyhash,
				},
			},
		}, nil
	}
	return nil, errors.New("One of stakeRegistration, stakeDeregistration, stakeDelegation must be set")
}

type cardanoWithdrawal struct {
	*js.Object
	Keypath []uint32 `js:"keypath"`
	Value   string   `js:"value"`
}

func (w *cardanoWithdrawal) toWithdrawal() (*messages.CardanoSignTransactionRequest_Withdrawal, error) {
	value, ok := new(big.Int).SetString(w.Value, 10)
	if !ok {
		return nil, errors.New("expected decimal string as value")
	}
	return &messages.CardanoSignTransactionRequest_Withdrawal{
		Keypath: w.Keypath,
		Value:   value.Uint64(),
	}, nil
}

func convertCardano(
	inputs []*cardanoInput,
	outputs []*cardanoOutput,
	certificates []*cardanoCertificate,
	withdrawals []*cardanoWithdrawal,
) (
	[]*messages.CardanoSignTransactionRequest_Input,
	[]*messages.CardanoSignTransactionRequest_Output,
	[]*messages.CardanoSignTransactionRequest_Certificate,
	[]*messages.CardanoSignTransactionRequest_Withdrawal,
	error) {
	convertedInputs := make([]*messages.CardanoSignTransactionRequest_Input, len(inputs))
	for i, input := range inputs {
		var err error
		convertedInputs[i], err = input.toInput()
		if err != nil {
			return nil, nil, nil, nil, err
		}
	}
	convertedOutputs := make([]*messages.CardanoSignTransactionRequest_Output, len(outputs))
	for i, output := range outputs {
		var err error
		convertedOutputs[i], err = output.toOutput()
		if err != nil {
			return nil, nil, nil, nil, err
		}
	}
	convertedCertificates := make([]*messages.CardanoSignTransactionRequest_Certificate, len(certificates))
	for i, certificate := range certificates {
		var err error
		convertedCertificates[i], err = certificate.toCertificate()
		if err != nil {
			return nil, nil, nil, nil, err
		}
	}
	convertedWithdrawals := make([]*messages.CardanoSignTransactionRequest_Withdrawal, len(withdrawals))
	for i, withdrawal := range withdrawals {
		var err error
		convertedWithdrawals[i], err = withdrawal.toWithdrawal()
		if err != nil {
			return nil, nil, nil, nil, err
		}
	}
	return convertedInputs, convertedOutputs, convertedCertificates, convertedWithdrawals, nil
}

func (device *jsDevice) AsyncCardanoXPubs(
	done func([][]byte, *jsError),
	keypaths [][]uint32,
) {
	go func() {
		xpubs, err := device.device.CardanoXPubs(keypaths)
		done(xpubs, toJSError(err))
	}()
}

func (device *jsDevice) AsyncCardanoAddress(
	done func(string, *jsError),
	network messages.CardanoNetwork,
	scriptConfig *cardanoScriptConfig,
	display bool,
) {
	go func() {
		address, err := device.device.CardanoAddress(network, scriptConfig.toScriptConfig(), display)
		done(address, toJSError(err))
	}()
}

func (device *jsDevice) AsyncCardanoSignTransaction(
	done func(map[string]interface{}, *jsError),
	network messages.CardanoNetwork,
	inputs []*cardanoInput,
	outputs []*cardanoOutput,
	fee string,
	ttl string,
	certificates []*cardanoCertificate,
	withdrawals []*cardanoWithdrawal,
	validityIntervalStart string,
) {
	go func() {
		ttlInt, ok := new(big.Int).SetString(ttl, 10)
		if !ok {
			done(nil, toJSError(errors.New("expected decimal string as value")))
			return
		}

		feeInt, ok := new(big.Int).SetString(fee, 10)
		if !ok {
			done(nil, toJSError(errors.New("expected decimal string as value")))
			return
		}
		validityIntervalStartInt, ok := new(big.Int).SetString(validityIntervalStart, 10)
		if !ok {
			done(nil, toJSError(errors.New("expected decimal string as value")))
			return
		}

		convertedInputs, convertedOutputs, convertedCertificates, convertedWithdrawals, err := convertCardano(inputs, outputs, certificates, withdrawals)
		if err != nil {
			done(nil, toJSError(err))
			return
		}
		response, err := device.device.CardanoSignTransaction(
			&messages.CardanoSignTransactionRequest{
				Network:               network,
				Inputs:                convertedInputs,
				Outputs:               convertedOutputs,
				Ttl:                   ttlInt.Uint64(),
				Fee:                   feeInt.Uint64(),
				Certificates:          convertedCertificates,
				Withdrawals:           convertedWithdrawals,
				ValidityIntervalStart: validityIntervalStartInt.Uint64(),
			},
		)
		if err != nil {
			done(nil, toJSError(err))
			return
		}
		shelleyWitnesses := make([]map[string]interface{}, len(response.ShelleyWitnesses))
		for i, w := range response.ShelleyWitnesses {
			shelleyWitnesses[i] = map[string]interface{}{
				"signature": w.Signature,
				"publicKey": w.PublicKey,
			}
		}
		done(map[string]interface{}{
			"shelleyWitnesses": shelleyWitnesses,
		}, nil)
	}()
}
