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

	"github.com/flynn/noise"
)

const localStorageConfigKey = "bitbox02Config"

// noiseKeypair holds a noise keypair.
type noiseKeypair struct {
	Private []byte `json:"private"`
	Public  []byte `json:"public"`
}

// configData holds the persisted app configuration related to bitbox02 devices.
type configData struct {
	AppNoiseStaticKeypair    *noiseKeypair `json:"appNoiseStaticKeypair"`
	DeviceNoiseStaticPubkeys [][]byte      `json:"deviceNoiseStaticPubkeys"`
}

// config perists the bitbox02 related configuration in localStorage.
// See ConfigInterace: https://github.com/digitalbitbox/bitbox02-api-go/blob/e8ae46debc009cfc7a64f45ec191de0220f0c401/api/firmware/device.go#L50
// The format is the same as in the BitBoxApp.
type config struct{}

func (config *config) readConfig() *configData {
	var conf configData
	if err := localStorageGet(localStorageConfigKey, &conf); err != nil {
		return &configData{}
	}
	return &conf
}

func (config *config) storeConfig(conf *configData) error {
	return localStorageSet(localStorageConfigKey, conf)
}

// ContainsDeviceStaticPubkey implements ConfigurationInterface.
func (config *config) ContainsDeviceStaticPubkey(pubkey []byte) bool {
	for _, configPubkey := range config.readConfig().DeviceNoiseStaticPubkeys {
		if bytes.Equal(configPubkey, pubkey) {
			return true
		}
	}
	return false
}

// AddDeviceStaticPubkey implements ConfigurationInterface.
func (config *config) AddDeviceStaticPubkey(pubkey []byte) error {
	if config.ContainsDeviceStaticPubkey(pubkey) {
		// Don't add again if already present.
		return nil
	}

	configData := config.readConfig()
	configData.DeviceNoiseStaticPubkeys = append(configData.DeviceNoiseStaticPubkeys, pubkey)
	return config.storeConfig(configData)
}

// GetAppNoiseStaticKeypair implements ConfigurationInterface.
func (config *config) GetAppNoiseStaticKeypair() *noise.DHKey {
	key := config.readConfig().AppNoiseStaticKeypair
	if key == nil {
		return nil
	}
	return &noise.DHKey{
		Private: key.Private,
		Public:  key.Public,
	}
}

// SetAppNoiseStaticKeypair implements ConfigurationInterface.
func (config *config) SetAppNoiseStaticKeypair(key *noise.DHKey) error {
	configData := config.readConfig()
	configData.AppNoiseStaticKeypair = &noiseKeypair{
		Private: key.Private,
		Public:  key.Public,
	}
	return config.storeConfig(configData)
}
