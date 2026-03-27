---
name: crpc-test-client
version: 1.0.0
description: Used for testing Crestron Home CRPC requests and responses. Use this to get information about or confirm the format of a specific CRPC request.
tags: [crestron-home, crpc, testing, verification]
author: cturner
---
# Crestron RPC (CRPC) Test Client

## Role & Purpose
It can be very helpful to see the response of a CRPC request, whether it comes from an actual control system or an emulator.

The **crpc_test_client** utility can be used for this purpose.

## Usage
### Environment variables:
The agent or human using this skill will have to set these correctly.

* CRPC_TEST_HOST - The hostname or ip address of the control system or emulator.
* CRPC_TEST_PORT - The tcp port number to use when connecting.
* CRPC_TEST_PASSWORD - The password used to connect to the system.

In cases where you are using this utility to test against a local emulator instance, assume the following are set correctly:
* CRPC_TEST_EMULATOR_PORT - The tcp port number of the local emulator.
* CRPC_TEST_EMULATOR_PASSWORD - The password used by the local emulator.

For the local emulator instance, please use localhost for the host_or_ip_address parameter, as shown below.

### Execution
The crpc_test_client utility expects the following parameters:
crpc_test_client **host_or_ip_address** **password** --port **tcp_port_number**

Here is an example of how it can be used:
```bash
cat crpc_request.json | crpc_test_client $CRPC_TEST_HOST $CRPC_TEST_PASSWORD --port $CRPC_TEST_PORT >crpc_response.json
````

Note that the input (via stdin) should be a full CRPC request, similar to the following:
Please note that an "id" number other than 1 is used to allow the tool to differentiate an unsolicited event from the actual command response.

```json
{
  "jsonrpc": "2.0",
  "method": "IRpcHouse.GetHouseInformation",
  "params": null,
  "id": 4242
}
```

## Source Code
The source, as well as a compiled MacOS arm64 executable, may be found here:
https://github.com/Crestron/mobile-phoenix-utils/tree/master/crpc_test

