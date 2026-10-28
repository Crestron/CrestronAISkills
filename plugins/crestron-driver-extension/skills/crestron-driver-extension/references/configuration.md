# Configuration Patterns

Comprehensive guide to configuring Crestron device drivers with the
Entity Model SDK. Configuration defines the steps a user follows to
connect a driver to hardware (network addresses, serial settings,
authentication, etc.).

## Configuration Architecture

```
JSON Manifest                     C# Entity
──────────────                    ──────────
ConfigurationSteps {              DelegateDataDrivenConfigurationController(
  Items: [...],                       args,
  Steps: [...],                       ApplyConfigurationItems,
  FirstStep: "..."                    setTransport,
}                                     unsetTransport)
     │                                     │
     ▼                                     ▼
DataDrivenConfigurationControllerArgs  ApplyConfigurationItemValues(
  .FromResources(args, resources,       action, stepId, values)
    controllerId)
```

## JSON ConfigurationSteps

### Item Properties

| Property | Type | Purpose |
|----------|------|---------|
| `Id` | string | Unique identifier, referenced in Steps |
| `UsageContext` | string | Transport/semantic hint (see below) |
| `Title` | string | Display label |
| `Description` | string | Installer helper text; include on visible items |
| `Required` | bool | Must have value to proceed |
| `Persistent` | bool | Saved across reboots |
| `ValueType` | string | `String`, `Number`, `Boolean` |
| `DefaultValue` | string | Pre-filled value |
| `MinValue/MaxValue` | number | Numeric constraints |
| `AvailableValues` | array | Dropdown options |

### UsageContext Values

| Context | Purpose |
|---------|---------|
| `Network.Address` | IP address / hostname |
| `Network.Port` | TCP/UDP port |
| `Com.ChannelId` | COM port selector |
| `Com.Protocol` | Protocol (RS232, RS422, RS485) |
| `Com.BaudRate` | Baud rate |
| `Com.DataBits` | Data bits |
| `Com.StopBits` | Stop bits |
| `Com.Parity` | Parity |
| `Com.HardwareHandshake` | HW flow control |
| `Com.SoftwareHandshake` | SW flow control |
| `Cec.ChannelId` | CEC port selector |
| `Authentication.Username` | Username field |
| `Authentication.Password` | Password field (masked) |
| `Data` | Invisible/internal data |
| *(none)* | Generic prompt (free-form) |

### Step Properties

| Property | Type | Purpose |
|----------|------|---------|
| `StepId` | string | Unique identifier |
| `Items` | array | List of Item IDs shown in this step |
| `NextStep` | string | ID of following step (linear flow) |

## IP Configuration Example

```json
{
    "ConfigurationSteps": {
        "Items": [
            {
                "Id": "_Host_",
                "UsageContext": "Network.Address",
                "Title": "IP Address",
                "Description": "Enter the IP address of the device on the local network",
                "Required": true,
                "Persistent": true,
                "ValueType": "String"
            },
            {
                "Id": "_Port_",
                "UsageContext": "Network.Port",
                "Title": "Port",
                "Description": "TCP port number for device communication",
                "Required": true,
                "Persistent": true,
                "ValueType": "Number",
                "DefaultValue": "80",
                "MinValue": 1,
                "MaxValue": 65535
            }
        ],
        "Steps": [
            {
                "StepId": "Transport",
                "Items": ["_Host_", "_Port_"]
            }
        ],
        "FirstStep": "Transport"
    }
}
```

```csharp
private ConfigurationItemErrors ApplyConfigurationItems(
    DataDrivenConfigurationController.ApplyConfigurationAction action,
    string stepId,
    IDictionary<string, DriverEntityValue?> values
)
{
    switch (action)
    {
        // In this case, we only have one step, so these are the same
        case DataDrivenConfigurationController.ApplyConfigurationAction.ApplyAll:
        case DataDrivenConfigurationController.ApplyConfigurationAction.ApplyStep:
            DriverEntityValue? value;
            string host;
            ushort port;

            // For initial configuration, host and port should always be specified or this should
            // return an error.
            // After initial configuration, if the user changes only one setting, then this will be
            // called with just the one new setting.
            bool hasHost = values.TryGetValue("_Host_", out value) && value.HasValue;
            if (hasHost)
            {
                host = value.Value.GetValue<string>();
            }

            bool hasPort = values.TryGetValue("_Port_", out value) && value.HasValue;
            if (hasPort)
            {
                port = (ushort)value.Value.GetValue<long>();
            }

            // TODO: Validate host, create transport
            // If host is invalid...
            // return new ConfigurationItemErrors(new Dictionary<string, string> { { "_Host_", "Invalid host name" } }, null);
            return null;

        case DataDrivenConfigurationController.ApplyConfigurationAction.ClearValues:
            // This happens when the user goes "back" to a previous step during configuration.
            // In our use case here, this is impossible since there's only one step.
            // This code is just provided for reference.
            // The dictionary of values will have items to clear.
            if (values.ContainsKey("_Host_"))
            {
                // Destroy transport, await new values
            }
            break;
    }

    return null;
}
```

## Serial Configuration Example

```json
{
    "ConfigurationSteps": {
        "Items": [
            {"Id": "_ChannelId_", "UsageContext": "Com.ChannelId",
             "Title": "COM Port", "Description": "Select the device's COM port",
             "Required": true, "Persistent": true,
             "ValueType": "Number"},
            {"Id": "_Protocol_", "UsageContext": "Com.Protocol",
             "Title": "Protocol", "Description": "Select the device's serial protocol",
             "Required": true, "Persistent": true,
             "ValueType": "String", "DefaultValue": "RS232",
             "AvailableValues": ["RS232", "RS422", "RS485"]},
            {"Id": "_BaudRate_", "UsageContext": "Com.BaudRate",
             "Title": "Baud Rate", "Description": "Select the device's configured baud rate",
             "Required": true, "Persistent": true,
             "ValueType": "Number", "DefaultValue": "9600",
             "AvailableValues": ["9600", "19200", "38400", "57600", "115200"]}
        ],
        "Steps": [
            {"StepId": "Transport", "Items": ["_ChannelId_", "_Protocol_", "_BaudRate_"]}
        ],
        "FirstStep": "Transport"
    }
}
```

Serial config uses `DriverEntityTransportTxChannel` for automatic transport
setup through the `SetTransportImplementation` / `UnsetTransportImplementation`
callbacks passed to `DelegateDataDrivenConfigurationController`.

## Authentication Configuration

Add authentication in its own isolated step containing only `Authentication.Username`
and `Authentication.Password`; never combine these items with transport or custom items.
Merge the following fragment into the IP example above, retaining its `_Host_` and
`_Port_` item definitions:

```json
{
    "Items": [
        {"Id": "_Username_", "UsageContext": "Authentication.Username",
         "Title": "Username", "Description": "Enter the device account username",
         "Required": true, "Persistent": true,
         "ValueType": "String"},
        {"Id": "_Password_", "UsageContext": "Authentication.Password",
         "Title": "Password", "Description": "Enter the device account password",
         "Required": true, "Persistent": true,
         "Masked": true,
         "ValueType": "String"}
    ],
    "Steps": [
        {"StepId": "Transport", "Items": ["_Host_", "_Port_"],
         "NextStep": "Auth"},
        {"StepId": "Auth", "Items": ["_Username_", "_Password_"]}
    ],
    "FirstStep": "Transport"
}
```

## Saved Data (Invisible)

Use `UsageContext: "Data"` for internal state persisted across reboots but
not shown in the configuration UI:

```json
{"Id": "LastKnownState", "UsageContext": "Data",
 "Persistent": true, "ValueType": "String"}
```

## Dynamic Configuration

For items whose available values depend on device responses (e.g., discovered
input sources), use multi-step flows where the first step connects, and the
second step queries the device for available options.

## Apply Configuration Actions

On initial configuration, the user typically goes through each step (and the `ApplyStep` and `ClearValues` actions are used).
On subsequent runs of the application, `ApplyAll` is called to initialize the driver.
`ApplyAll` can also be called post-initialization with just a few values to update them.

| Action | When Called | What to Do |
|--------|-----------|------------|
| `ApplyAll` | Saved config restored or values updated after initialization | Apply the supplied values; preserve settings not included in a partial update |
| `ApplyStep` | User completes a single config step | Apply just that step |
| `ClearValues` | Configuration values are cleared, including when navigating back to an earlier step | Clear only the supplied item IDs; disconnect or rebuild resources if those items affect them |

`ClearValues` is not a disposal notification. Preserve unaffected settings so that
the installer can revise a later step without unnecessarily losing earlier input.
Release all owned resources separately in the entity's `Dispose()` override.

Configuration is meant to be done **once**, when the dealer adds the device. On every
later reboot the platform restores the saved values and calls `ApplyAll` so the driver
resumes automatically — design `ApplyAll` to fully bring the driver online from the saved
values alone.

**Return errors sparingly.** A non-null `ConfigurationItemErrors` marks the device **Not
Configured** and forces the installer back into setup. Reserve it for genuinely
unrecoverable input during initial configuration; log other failures instead of throwing
or returning errors.

## Child Devices

A parent driver can create child devices (sub-entities) for multi-zone
receivers, matrix switchers, etc. The parent creates child `IDriverEntity`
instances and passes them to `DispatchingDeviceController`:

```csharp
// In entry point:
var parent = new ParentEntity(args, resources);
var children = new List<ConfigurableDriverEntity>();
for (int i = 0; i < zoneCount; i++)
{
    var zone = new ZoneEntity(args, resources, i);
    children.Add(new ConfigurableDriverEntity(
        zone.ControllerId, zone, zone.ConfigController));
}
var allEntities = new[] { new ConfigurableDriverEntity(
    parent.ControllerId, parent, parent.ConfigController) }
    .Concat(children).ToArray();
return new DispatchingDeviceController(allEntities, args, null);
```

Each child entity has its own `ControllerId`, properties, commands, and events.
The application addresses them individually.
