// Copyright 2020 Shift Cryptosecurity AG
// Copyright 2020 Shift Crypto AG
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

	"github.com/digitalbitbox/bitbox02-api-go/api/firmware"
	"github.com/digitalbitbox/bitbox02-api-go/util/errp"
)

type errorType string

const (
	errorTypeGeneric  = "generic"
	errorTypeFirmware = "firmware"
)

// jsError is a union of specific Go error types, with two way conversions between Go<->JS.
type jsError struct {
	ErrorType errorType
	Code      float64
	Message   string
}

func toJSError(err error) *jsError {
	if err == nil {
		return nil
	}
	switch e := errp.Cause(err).(type) {
	case *firmware.Error:
		return &jsError{errorTypeFirmware, float64(e.Code), e.Message}
	default:
		return &jsError{errorTypeGeneric, 0, err.Error()}
	}
}

func fromJSError(jsError map[string]interface{}) error {
	if jsError == nil {
		return nil
	}
	msg := jsError["Message"].(string)
	switch jsError["ErrorType"] {
	case errorTypeFirmware:
		return firmware.NewError(int32(jsError["Code"].(float64)), msg)
	case errorTypeGeneric:
		return errors.New(msg)
	default:
		panic("unexpected error format")
	}
}
