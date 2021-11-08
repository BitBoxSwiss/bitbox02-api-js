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

FROM golang:1.16-buster
RUN curl -o /gopherjs.tar.gz -sSL https://github.com/gopherjs/gopherjs/archive/refs/tags/1.16.4+go1.16.7.tar.gz
RUN mkdir /gopherjs && tar -xf /gopherjs.tar.gz --strip-components=1 -C /gopherjs
RUN cd /gopherjs && go build
ENV PATH="/gopherjs/:${PATH}"
CMD ["bash"]
