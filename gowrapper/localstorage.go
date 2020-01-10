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
	"encoding/json"
	"errors"

	"github.com/gopherjs/gopherjs/js"
)

func localStorageSet(key string, value interface{}) error {
	localStorage := js.Global.Get("window").Get("localStorage")
	if localStorage == js.Undefined {
		return errors.New("localStorage not available")
	}
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return err
	}
	localStorage.Call("setItem", key, string(jsonBytes))
	return nil
}

func localStorageGet(key string, value interface{}) error {
	localStorage := js.Global.Get("window").Get("localStorage")
	if localStorage == js.Undefined {
		return errors.New("localStorage not available")
	}
	return json.Unmarshal([]byte(localStorage.Call("getItem", key).String()), value)
}
