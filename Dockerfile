# Copyright 2020 Shift Cryptosecurity AG
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

FROM golang:1.14-buster
RUN go get golang.org/dl/go1.12.17
RUN go1.12.17 download
RUN curl -o /gopherjs.tar.gz -sSL https://github.com/gopherjs/gopherjs/archive/fce0ec30dd00773d3fa974351d04ce2737b5c4d9.tar.gz
RUN mkdir /gopherjs && tar -xf /gopherjs.tar.gz --strip-components=1 -C /gopherjs
RUN cd /gopherjs && go mod init github.com/gopherjs/gopherjs && go build

CMD ["bash"]
