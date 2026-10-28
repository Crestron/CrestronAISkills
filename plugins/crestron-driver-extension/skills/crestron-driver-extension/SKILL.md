---
name: crestron-driver-extension
description: >-
  How to create Crestron Home Extension drivers which provide custom user interfaces
  and device control. This uses the Entity Model (v2) Crestron Device Driver SDK.
  Also includes references and domain knowledge for creating and working with these drivers.
  Use this whenever the user is building or editing a Crestron Home extension driver, its UiDefinition.xml, tile/room-page UI, or Entity Model v2 properties/commands — even if they don't say the word extension.
license: Crestron Software Development Tools License Agreement
metadata:
  author: Crestron Electronics, Inc.
  version: "1.4.2"
---

# Crestron Extension Drivers

This skill provides domain knowledge for creating and working with Crestron
Home Extension user interfaces — the XML-based system that lets drivers present
custom UIs in the Crestron Home app.

## Target Environment

Extension drivers run on embedded Crestron control processors with limited CPU and
memory, and a processor is often already running many other drivers near its limits.
Write resource-conscious code: avoid unnecessary allocations, tight polling loops, and
large in-memory structures, and reuse objects where practical. Don't dismiss an
inefficiency as "too small to matter" — these systems are frequently stressed to their
limits.

## Reference Files

These references are authoritative. Before building configuration or UI, read the
relevant reference **in full** and treat it as the source of truth rather than working
from partial recall:

- `references/controls-reference.md` — Full attribute tables for all 19 controls, including binding types, access modes, and usage notes
- `references/configuration.md` — Configuration item definitions, transport/authentication steps, and callback lifecycle
- `references/icons-and-colors.md` — Complete 336-icon library listing and defined colors
- `assets/template` — Copy-paste-rename-able template for creating a new project (or comparison to validate an existing project).

The following external references can be used if information is still missing after referencing the skill content:

- **XSD Schema:** `https://prd-use-rad-assets.azurewebsites.net/ExtensionsSchemaDefinition.xsd`
- **C# SDK docs:** `https://sdkcon78221.crestron.com/sdk/Crestron_Certified_Drivers_SDK/Content/Topics/Driver-SDK-V2/Create-a-Driver/Add-Extension-Support.htm`

## New Driver Workflow - START HERE for new drivers

### 1. Project Setup

When creating a new driver, ALWAYS start by copying the template in `assets/template` and renaming the files.
The JSON file MUST exactly match the csproj file name but with a .json extension.
The csproj contains critical project references, copy steps, and embedded resources.
This is a `net47` project - do **not** change the target framework.

**IMPORTANT:** Do not use any other .NET package references other than what is in the template. That can lead to conflicts with assemblies loaded by other drivers.
If you absolutely must, add the assembly DLL names to the "Dependencies" in the JSON file to ensure they are packaged with the build.
Exceptions to that rule (Do **not** list exceptions in the "Dependencies", they come with the application):

- Newtonsoft.Json v13.0.2 (can add as package reference)

The following data MUST be replaced in the template - if the user did not tell you what to replace it with, prompt them for:

- "Device Type" - must be a value from [The supported type list](https://sdkcon78221.crestron.com/sdk/Crestron_Certified_Drivers_SDK/Content/Topics/Overview/Extension-Device-Categories.htm) which is included inline below. Use in the folder name and in the JSON to replace TemplateDeviceType (remove spaces in filenames though).
- "Manufacturer" - Use in project name and in the JSON to replace TemplateManufacturer.
- "Base Model" - Use in project name and in the JSON to replace TemplateBaseModel.
- "Developer Company" - Use in the JSON to replace "TemplateCompany"
- "Developer Contact" - Use in the JSON to replace "TemplateContact"
- "Developer Email" - Use in the JSON to replace "TemplateEmail"
- "Developer Website" - Use in the JSON to replace "TemplateWebsite"
- "Developer Phone Number" - Use in the JSON to replace "TemplatePhoneNumber"

The project name must also include the transport type - IP, Serial, or CloudConnected.
Replace that in the project name based on the device being integrated.
NOTE: CloudConnected drivers still connect via IP, but they connect to a domain name that relays control instead of directly asking the user for an IP address.

You may need to add explicit references for `net47` such as `System.Net.Http` if you are making HTTP calls.
Those standard references do not need to be listed as "Dependencies" in the JSON since they are included by default in the runtime environment.

#### Supported Extension Device Types

- Amplifier
- Appliance
- Audio Conference
- Audio Processor
- AV Receiver Helper
- Custom Conferencing
- Custom Device
- Date-Time
- Document Camera
- Door Access
- Door Station
- Driveway Heater
- Energy Automation
- Fan
- Fireplace
- Game Console
- Hvac
- Interactive Whiteboard
- Intercom
- IO Device
- iPad Dock
- Irrigation System
- KVM Switch
- License Manager
- Lift
- Logic
- Masking
- Media Player
- NVR
- Notifications
- Outlet
- Projection Screen
- Recorder
- Router
- Scheduler
- Sensor
- Shades
- Shower
- Thermostat
- UI Tiles
- Utility
- Vacuum
- Vehicle
- Video Conference
- Video Wall Processor
- Weather Station


### 2. Define Configuration

The template is set up for an IP-based device. Replace those items with the Serial ones if needed.
CloudConnected drivers have no transport-specific items, but `ConfigurationSteps` must still be present (see the Cloud-Connected Driver Pattern below).

Configuration is JSON-driven. The `ConfigurationSteps` section of the JSON
manifest defines the items, steps, and flow. The SDK renders the config UI
automatically from this JSON — you do NOT build config UI manually.
Always include `Description` on visible configuration items — it provides helper
text to the installer below the input field.

**Important:** Review `references/configuration.md` for detailed guidance on configuration if you need to make changes to the configuration setup.
It also explains how to add custom items to the flow.
NEVER add other items to the Transport step. Authentication.Username/Password go together in their own **isolated** step.
This works around hosting application limitations that show transport steps and authentication steps in bespoke UIs that cannot handle other items in those steps.

#### How It Works

1. **JSON defines the config UI** — `Items` (fields), `Steps` (screens),
   `FirstStep` (entry point), `NextStep` (chaining)
2. **`DelegateDataDrivenConfigurationController`** parses the JSON and
   handles the config flow
3. **Your `ApplyConfigurationItems` callback** receives the values when
   the user completes a step (the `ApplyStep` action) or, on application restart, with all items at once (the `ApplyAll` action).

**Important signature details:**
- The dictionary type is `IDictionary<string, DriverEntityValue?>` (not
  `IReadOnlyDictionary`)
- The return type is `ConfigurationItemErrors` (return `null` for success)

#### Configuration Lifecycle and the Installer Experience

A driver moves through these states: **NotStarted** → **NotConfigured** → **Running**.
The platform promotes a driver to `Running` only once configuration has **completed** —
i.e. all required steps in the flow have been applied. A driver whose `ConfigurationSteps`
has empty `Steps` and `FirstStep: null` has no flow to complete, so it stays
`NotConfigured` forever and never runs.

The intended external flow:
- **One time**, when the dealer adds the device in the application, the installer walks the
  steps and enters settings (`ApplyStep` is called per completed step). When the last step
  is applied, configuration is complete and the driver transitions to `Running`.
- **On every reboot afterward**, the platform restores the saved (`Persistent`) values and
  calls `ApplyConfigurationItems` once with `ApplyAll`. The driver should then "just work"
  by re-establishing its transport and state from those previous settings — no installer
  interaction is expected.

Design `ApplyConfigurationItems` so a single `ApplyAll` with the previously saved values
is enough to fully bring the driver online.

**Return errors sparingly.** Returning a non-null `ConfigurationItemErrors` marks the
device **Not Configured** and interrupts this resume flow, forcing the installer back into
configuration. Only return errors for genuinely unrecoverable input during initial setup;
otherwise log the problem (see Logging) and continue.

**`ConfigurationSteps` is always required in the JSON** — even for cloud-connected drivers.
Omitting it throws a `NullReferenceException` when the configuration controller is
constructed. At minimum, keep the section present.

#### Cloud-Connected Driver Pattern

CloudConnected drivers reach the device through a relay domain instead of a user-supplied
IP. A real cloud-connected driver almost always still needs some installer input — an API
key, account credentials, an OAuth step, a device identifier, etc. — and those items form
its configuration flow normally.

The edge case is a **mock or input-less** cloud driver with no genuine configuration items.
It still needs at least one item and step to complete configuration and reach `Running`,
so add a single benign placeholder — for example a boolean **"Enable Driver"** — purely to
give the flow something to complete:

```json
"ConfigurationSteps": {
    "Items": [
        {"Id": "_Enable_", "Title": "Enable Driver",
         "Description": "Enable this device", "Required": true,
         "Persistent": true, "ValueType": "Boolean", "DefaultValue": "true"}
    ],
    "Steps": [{"StepId": "Setup", "Items": ["_Enable_"], "NextStep": null}],
    "FirstStep": "Setup"
}
```

#### Multi-Step with Authentication

Chain steps using `NextStep`:
```json
{
    "Items": [
        {"Id": "_Host_", "UsageContext": "Network.Address",
         "Title": "IP Address / Hostname", "Description": "Enter the device address",
         "Required": true, "Persistent": true, "ValueType": "String"},
        {"Id": "_Port_", "UsageContext": "Network.Port",
         "Title": "Port", "Description": "Enter the device's network port",
         "Required": true, "Persistent": true, "ValueType": "Number",
         "DefaultValue": "443", "MinValue": 1, "MaxValue": 65535},
        {"Id": "_Username_", "UsageContext": "Authentication.Username",
         "Title": "Username", "Description": "Enter the device account username",
         "Required": true, "Persistent": true,
         "ValueType": "String"},
        {"Id": "_Password_", "UsageContext": "Authentication.Password",
         "Title": "Password", "Description": "Enter the device account password",
         "Required": true, "Persistent": true,
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

### 3. Define Properties and Commands

The attribute system is the primary way to declare capabilities. Attributes
are applied to C# properties, methods, and events on your entity class (which
derives from `ReflectedAttributeDriverEntity`).

#### Namespace Reference

The SDK types live across several namespaces. Here is the canonical mapping:

| Namespace | Key Types |
|-----------|-----------|
| `Crestron.DeviceDrivers.EntityModel` | `DriverAssemblyEntryPoint`, `DriverController`, `DriverControllerCreationArgs` |
| `Crestron.DeviceDrivers.EntityModel.Data` | `DriverEntityValue`, `DriverEntityEvent`, `DriverEntityState` |
| `Crestron.DeviceDrivers.EntityModel.Logging` | `LogEntryLevel` |
| `Crestron.DeviceDrivers.SDK` | `DriverImplementationResources` |
| `Crestron.DeviceDrivers.SDK.EntityModel` | `ReflectedAttributeDriverEntity`, `ConfigurableDriverEntity`, `DispatchingDeviceController`, `DelegateDataDrivenConfigurationController`, `DataDrivenConfigurationControllerArgs`, `IDriverConfigurationController`, `IDriverEntity`, `DriverEntityTransportTxChannel`, `EntityCommandResultCallback<T>`, `ExtensionDoCommandExecutor`, `ExtensionSetPropertyValueExecutor`, `UiDefinitionProperty`, `ConfigurationItemErrors` |
| `Crestron.DeviceDrivers.SDK.EntityModel.Attributes` | `EntityPropertyAttribute`, `EntityCommandAttribute`, `EntityEventAttribute`, `EntityPropertyMetadataAttribute`, `EntityCommandMetadataAttribute`, `EntityEventMetadataAttribute`, `EntityParameterAttribute`, `EntityDataTypeAttribute`, `EntityValueAttribute` |

#### Examples

```csharp
// DO NOT use any special characters in identifiers
[EntityProperty(Id = "DishwasherIsRunning")]
[EntityPropertyMetadata(ExtensionUiProperty = true)] // REQUIRED for properties used in the UI
public bool DishwasherIsRunning { get; private set; }

// Called when the UI sets DishwasherIsRunning via the {DishwasherIsRunning} binding on a control
[EntityCommand(Id = "setDishwasherIsRunning")]
public void SetDishwasherIsRunning(bool value)
{
    DishwasherIsRunning = value;
    // CRITICAL - always notify the application of property changes.
    NotifyPropertyChanged("DishwasherIsRunning", new DriverEntityValue(value));
}

// NOTE: Commands can NEVER be async. Parameters must be simple types to bind to UI controls
// Example of a command that can be triggered by a button in UI XML
[EntityCommand(Id = "StopCycle")]
public void StopCycle()
{
    DishwasherIsRunning = false;
    // CRITICAL - always notify the application of property changes.
    NotifyPropertyChanged("DishwasherIsRunning", new DriverEntityValue(false));
}
```

**NotifyPropertyChanged key must match the property Id (case-sensitive).** If you set
`Id` explicitly on `[EntityProperty]`, pass that exact string to `NotifyPropertyChanged`
(e.g. Id `"DishwasherIsRunning"` → key `"DishwasherIsRunning"`). If you omit `Id`, the SDK
auto-generates the Id as **camelCase** of the C# property name, so the key must be that
camelCase form (e.g. property `ExampleProperty` → key `"exampleProperty"`). A Pascal-case
Id paired with a camelCase key, or vice-versa, silently fails to update the UI.

Properties bound to `selectorbutton` or `segmentedslider` must include
`AvailableValuesLocalizationKeys` rather than only `AvailableValuesLabels`.
For this selector-button example, define `cycleNormal`, `cycleDelicate`, and
`cycleHeavyDuty` in the translations JSON with labels "Normal", "Delicate",
and "Heavy Duty", respectively:

```csharp
[EntityProperty(Id = "CycleMode",
    AvailableValues = new[] { "Normal", "Delicate", "Heavy Duty" },
    AvailableValuesLocalizationKeys = new[] { "cycleNormal", "cycleDelicate", "cycleHeavyDuty" })]
[EntityPropertyMetadata(ExtensionUiProperty = true)]
public string CycleMode { get; private set; }

// Define ranges
[EntityProperty(Id = "SliderProperty", RangeMinimum = 0, RangeMaximum = 100, RangeStepSize = 0.5)]
[EntityPropertyMetadata(ExtensionUiProperty = true)]
public double SliderProperty { get; set; }

// Below example for list controls to set values on a list of complex objects:
// Can optionally return ExtensionOperationResult to set success / error message 
[EntityCommand(Id = "setMyData")] 
public void SetMyData(string objectId, int value) 
{ 
    MyCustomData instance = PropWithCustomData.FirstOrDefault(x => x.ExtensionObjectId == objectId); 
    if (instance != null && instance.MyData != value) 
    { 
        instance.MyData = value; 
        NotifyPropertyChanged("propWithCustomData", CreateValueForObjects(PropWithCustomData));
    } 
} 

public class MyCustomData : ExtensionObject 
{ 
    public MyCustomData(int myData) : base() 
    { 
        MyData = myData; 
    } 
 
    [EntityProperty] 
    public int MyData { get; set; } 
} 

// Since no Id is specified, property is converted to camelCase and will
// be available in extensions as propWithCustomData
// Note that you can still specify an Id if you want to use that instead 
[EntityProperty] 
[EntityPropertyMetadata(ExtensionUiProperty = true)] 
public MyCustomData[] PropWithCustomData { get; private set; } 
```

#### Value System

`DriverEntityValue` — discriminated union struct wrapping runtime values.

##### Supported value types

| Constructor | Stored As | Notes |
|-------------|-----------|-------|
| `bool` | `object` (bool) | |
| `long` | `object` (long) | For `Integer` type |
| `double` | `object` (double) | For `Number` type |
| `string` | `object` (string) | Also used for `LocalizedString`, `Entity`, `Device` |
| `DriverEntityValueList` | list wrapper | For `Array` type |
| `DriverEntityValueDictionary` | dict wrapper | For `Object` type |
| `DriverEntityValueRange` | via dict | For `NumericRange` type |
| `DriverEntityValueRelativeRange` | via dict | For `RelativeRange` type |
| `DriverEntityAvailableValue` | via dict | For `AvailableValue` type |
| `DriverEntityValue[]` | list | Convenience array constructor |

**Type access methods (IMPORTANT — many have non-obvious constraints):**

| Method | Purpose | Constraints |
|--------|---------|-------------|
| `GetValue<T>()` | Extract value by exact type. Works for primitives (`string`, `bool`, `long`, `double`) and dictionary/list wrappers (`DriverEntityValueDictionary`, `DriverEntityValueList`). | Throws on type mismatch; use `GetValueAs<T>()` for typed ranges and available values |
| `TryGetValue<T>(out T)` | Safe version of GetValue — returns false on mismatch | Same types as GetValue |
| `TryGetNonNullValue<T>(out T)` | Like TryGetValue but also fails for null values | Same types as GetValue |
| `GetValueAs<T>()` | Extract with conversion | **T must extend `DriverEntityValueDataStructure`** — cannot use with primitives like `string`! Only works with `DriverEntityValueDictionary`, `DriverEntityValueList`, `DriverEntityValueRange`, `DriverEntityValueRelativeRange`, `DriverEntityAvailableValue` |
| `TryGetValueAs<T>(out T)` | Safe version of GetValueAs | Same constraint as GetValueAs |
| `GetValueAsList<TValue>()` | Convert list elements into a new mutable `List<TValue>` | Use a supported element type, such as `string`, `long`, `double`, `bool`, or an SDK data structure; throws if conversion fails |
| `TryGetValueAsList<TValue>(out List<TValue>)` | Safe list conversion | Returns false if conversion fails |
| `GetValueAsDictionary<TValue>()` | Convert dictionary values into a new mutable `Dictionary<string, TValue>` | Supports primitives and SDK data structures; no `DriverEntityValueDataStructure` generic constraint. Throws if conversion fails |

Numeric ranges, relative ranges, and available values are stored internally as
dictionaries. Use `GetValueAs<DriverEntityValueRange>()`,
`GetValueAs<DriverEntityValueRelativeRange>()`, or
`GetValueAs<DriverEntityAvailableValue>()` to extract their typed wrappers, not
`GetValue<T>()`. Use `GetValue<DriverEntityValueDictionary>()` only when you need
their underlying dictionary representation.

**Common mistake:** To extract nested dictionaries from a `DriverEntityValue`,
use `GetValue<DriverEntityValueDictionary>()` — NOT
`GetValueAsDictionary<DriverEntityValue>()`. The latter throws because
the conversion API does not support `DriverEntityValue` as a target value type,
not because of a generic constraint. Use `GetValue<DriverEntityValueList>()`
similarly when you need the immutable list wrapper without element conversion.

##### DriverEntityValueDictionary

Wrapper class implementing `IDictionary<string, DriverEntityValue>`. This is
the runtime type for object/dictionary values.

Key members:
- `TryGetValue(string key, out DriverEntityValue value)` — safe key lookup
- `ContainsKey(string key)` — check existence
- `Keys` → `ICollection<string>` — all keys
- `Values` → `ICollection<DriverEntityValue>` — all values
- Indexer: `dict["key"]` → `DriverEntityValue`
- Immutable — `Add`, `Remove`, `Clear` throw `NotSupportedException`

**Nested extraction pattern:**
```csharp
// Extract a nested dictionary structure from a command parameter:
// JSON: { "routes": { "main": { "audio": "pandora" } } }

DriverEntityValue routesParam = ...; // from command parameter

// Level 1: Get outer dictionary
var routesDict = routesParam.GetValue<DriverEntityValueDictionary>();

// Level 2: Get inner dictionary by key
DriverEntityValue mainValue;
if (routesDict.TryGetValue("main", out mainValue))
{
    var mainDict = mainValue.GetValue<DriverEntityValueDictionary>();

    // Level 3: Get primitive value
    DriverEntityValue audioValue;
    if (mainDict.TryGetValue("audio", out audioValue))
    {
        string source = audioValue.GetValue<string>(); // "pandora"
    }
}
```

##### DriverEntityValue Is a Struct

`DriverEntityValue` is a **value type** (struct), not a class:
- Cannot be null — use `DriverEntityValue?` (nullable) or `default(DriverEntityValue)` for "no value"
- Default value is `DriverEntityValue` with uninitialized state, not null
- When used as dictionary values (`IDictionary<string, DriverEntityValue>`), the `TryGetValue` pattern works normally since `out` parameters handle structs

##### Constructing DriverEntityValue

Common constructors:
```csharp
// Primitives
new DriverEntityValue(true)           // bool
new DriverEntityValue(42L)            // long (Integer)
new DriverEntityValue(3.14)           // double (Number)
new DriverEntityValue("hello")        // string

// Arrays
new DriverEntityValue(new[] { new DriverEntityValue("a"), new DriverEntityValue("b") })

// Dictionaries (objects) — use IEnumerable<KeyValuePair<string, DriverEntityValue>>
var dict = new Dictionary<string, DriverEntityValue>
{
    { "name", new DriverEntityValue("Zone 1") },
    { "level", new DriverEntityValue(50L) }
};
new DriverEntityValue(dict)

// Ranges
new DriverEntityValueRange(-80.5, 16.5, 0.5)

// Available values
new DriverEntityAvailableValue("value", new DriverEntityLocalizedString("Label", null), false)
```

**Dictionary construction note:** The `DriverEntityValue` constructor for
dictionaries accepts `IEnumerable<KeyValuePair<string, DriverEntityValue>>`.
`Dictionary<string, DriverEntityValue>` already implements that interface, so
pass it directly; no LINQ projection is needed.

For NotifyPropertyChanged, use the following APIs to construct the DriverEntityValue:

| C# Type | Expression |
|---------|-----------|
| `IDictionary<string, T>` + `itemTypeRef` | `CreateValueForEntries<T>(value)` |
| `ICollection<T>` + `itemTypeRef` | `CreateValueForObjects<T>(value)` |
| `ICollection<builtinT>` | `new DriverEntityValue(value)` |
| `IDictionary<string, builtinT>` | `new DriverEntityValue(value)` |
| `bool`, `double`, `long`, `string` | `new DriverEntityValue(value)` |
| SDK structs (Range, RelativeRange, AvailableValue) | `new DriverEntityValue(value)` |
| `int`, `short`, `byte`, `uint`, `ushort`, `sbyte` | `new DriverEntityValue((long)value)` |
| `DriverEntityValue` | `value` |
| Custom class with `[EntityDataType]` | `CreateValueForObject(value)` |


## Architecture Overview

An extension device consists of:
1. **UI Definition** — XML file defining layouts, controls, tiles, and alerts
2. **Language Translations** — Key/value pairs for localization
3. **Properties** — Driver properties marked `ExtensionUiProperty = true`
4. **Commands** — Driver commands invoked by UI controls

The UI XML is delivered to the app via the `extension:uiDefinition` property
(a string containing the XML content). The app renders it and communicates
back through two commands:
- **`extension:doCommand`** — UI triggers a named command with string args
- **`extension:setPropertyValue`** — UI updates a property value via control

The XML can change at runtime by updating the `extension:uiDefinition` property with new content.

## XML Structure

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<uidefinition xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:noNamespaceSchemaLocation="https://prd-use-rad-assets.azurewebsites.net/ExtensionsSchemaDefinition.xsd">
    <version ver="3.0" />
    <tile icon="#icSpa" status="{devicestatus}"
          navigation="show:main"
          showinhomepage="#false" showinroompage="#true" />
    <layouts>
        <layout id="main" isdefaultlayout="#true" title="^deviceName">
            <controls>
                <!-- control elements -->
            </controls>
        </layout>
    </layouts>
    <alerts>
        <!-- alert elements, or self-closing <alerts /> -->
    </alerts>
</uidefinition>
```

**Encoding:** UTF-8 only, NO BOM. Current version: `3.0`.

| Component | Required | Description |
|-----------|----------|-------------|
| `version` | Yes | UI Definition version |
| `tile` | Yes | Home/room tile appearance |
| `layouts` | Yes | Collection of page layouts with controls |
| `alerts` | Yes | Dialog alerts (can be empty `<alerts />`) |

## Binding System

Bindings connect UI attributes to driver data. Each control attribute
documents which binding types it accepts.

| Type | Syntax | Example | Description |
|------|--------|---------|-------------|
| **Translation** | `^key` or `^key\|param` | `label="^power"` | Lookup from translation dictionary. `%s` placeholders filled by params. |
| **Property** | `{propName}` | `value="{volume}"` | Binds to driver property (must have `ExtensionUiProperty = true`) |
| **Fixed Boolean** | `#true` / `#false` | `showinroompage="#true"` | Static boolean |
| **Fixed Icon** | `#iconName` | `icon="#icPower"` | Static icon from library |
| **Fixed Color** | `#colorName` | `gaugefillcolor="#Blue"` | Static color from palette |
| **Variable** | `$varName` | `value="$pin"` | Data passed between layouts. Supports dot notation: `$user.name` |
| **Command** | `command:name` | `action="command:togglePower"` | Triggers `doCommand` call |
| **Navigation** | `show:id` / `showalert:id` / `back` | `navigation="show:settings"` | Navigate between layouts/alerts |

*Note:* When using properties for icons or colors, the property value doesn't need the `#` prefix. That is reserved only for literals in the XML.

### Localization

Localization JSON files (in the Translations folder) are simple key/value pairs.
The app looks up translation keys from the XML and replaces them with the localized string.

```json
{
    "power": "Power",
    "statusMsg": "Status: %s",
    "greeting": "Hello %s, room %s"
}
```

### Translation Parameters

```xml
<!-- Translation: "Status: %s" -->
label="^statusMsg|{currentStatus}"

<!-- Multiple params: "Hello %s, room %s" -->
title="^greeting|$userName|{roomName}"
```

### Variable Object Access

Variables can hold objects. Sub-properties are accessed with dot notation:
```xml
<layout id="detail" inputparameters="$user">
    <controls>
        <textdisplay id="userName" title="^name" line1label="$user.name" />
    </controls>
</layout>
```

## Tile

The tile appears on the home screen and/or room page.

```xml
<tile icon="#icSpa"
      status="{devicestatus}"
      action="command:togglepower"
      navigation="show:main"
      secondaryicon="{statusicon}"
      alticontext="{tempDisplay}"
      showinhomepage="#false"
      showinroompage="#true" />
```

| Attribute | Bindings | Required | Description |
|-----------|----------|----------|-------------|
| `icon` | Fixed icon, property | Yes* | Primary icon |
| `status` | Translation, property | Yes | Status text under title |
| `navigation` | Navigation | No* | Layout to show on tap. *Required unless `action` alone provides the tap behavior. |
| `action` | Command | No | Command on tap. With `action` and no `navigation`, the tap just fires the command; with both, an ellipsis appears. |
| `secondaryicon` | Fixed icon, property | No | Bottom-right icon (room tile only) |
| `alticontext` | Translation, property | No | Short text replacing icon (excludes `icon`) |
| `showinhomepage` | Fixed Boolean | Yes | Usually `#false` |
| `showinroompage` | Fixed Boolean | Yes | Usually `#true` |

## Layouts

```xml
<layout id="settings" isdefaultlayout="#false"
        title="^settingsTitle" subtitle="{devicestatus}"
        inputparameters="$userId">
    <controls>
        <!-- controls here -->
    </controls>
</layout>
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `id` | Yes | Unique identifier, used in navigation |
| `isdefaultlayout` | No | Optional on individual layouts, but the app requires exactly one layout to specify `#true` |
| `title` | No | Page title (translation or property) |
| `subtitle` | No | Subtitle below title |
| `inputparameters` | No | Variables received from navigation. NOT allowed on default layout. |

**Tile-only drivers (no navigable UI):** The schema requires at least one layout, and
the app requires a default layout with `isdefaultlayout="#true"`. If your tile only fires a command (`action` with no
`navigation`), supply a minimal empty default layout so the file validates:

```xml
<layout id="MainPage" isdefaultlayout="#true">
    <controls/>
</layout>
```

A tile with only `action` fires the command without opening this layout.

## Controls Summary

19 control types are available. Before designing or changing a layout, read
`references/controls-reference.md` **in full** — including how composite controls nest
(e.g., a `buttongroup` contains `button` and `selectorbutton` children). Don't restructure
a control into a different shape when the reference shows it already belongs inside another.

| Control | Element | Purpose |
|---------|---------|---------|
| Subheader | `<subheader>` | Section header text |
| Checkbox | `<checkbox>` | Boolean check |
| Toggle | `<toggle>` | On/off switch |
| Toggle Slider | `<toggleslider>` | Toggle + slider combo |
| Segmented Slider | `<segmentedslider>` | Discrete or continuous slider |
| Status + Button | `<statusandbutton>` | Status display with action button |
| Status + Navigation | `<statusandnavigation>` | Status with navigation link |
| Raise/Lower + Text | `<raiselowerwithtext>` | Increment/decrement with display |
| Control Group | `<controlgroup>` | Container for grouping controls |
| Button Group | `<buttongroup>` | Group of up to 5 buttons; normally 2-5 |
| Button | `<button>` | Action button |
| Selector Button | `<selectorbutton>` | Opens selection UI |
| List Button | `<listbutton>` | Opens list UI |
| Radial Gauge | `<radialgauge>` | Circular gauge display |
| D-Pad | `<dpad>` | Directional navigation pad |
| Keypad | `<keypad>` | Numeric entry |
| Thermostat | `<thermostat>` | Temperature control |
| Text Entry | `<textentry>` | Text input field |
| Text Display | `<textdisplay>` | Read-only text (up to 4 lines) |

### Common Control Attributes

Most controls share these attributes:
- `id` (string, required) — unique identifier
- `label` (string, translation/property) — display text
- `visible` (Boolean, property) — dynamic visibility
- `enabled` (Boolean, property) — dynamic enabled state

### Read/Write Properties

Controls with `Read/Write` access (toggle, slider, checkbox, etc.) bind to
a property using `{propertyName}`. When the user changes the control, the app
calls `extension:setPropertyValue` with the property name and new value. The
driver must have a matching `set<PropertyName>(value)` command for this to work
through the `ExtensionSetPropertyValueExecutor`.

**IMPORTANT:** The setter command MUST capitalize PropertyName even if the property name itself is lower-case.
For example, a control with `value="{powerOn}"` requires a command named `setPowerOn(value)` to receive updates.
The parameter name **must** be specifically `value` since the API uses named parameters.
For clarity, it is recommended to name the property with a capital letter as well (e.g. `PowerOn`) to match the command
so everything is consistent.

## Alerts

Two alert types are supported:

### Confirmation Alert
```xml
<confirmation id="deleteConfirm"
              messagelabel="^confirmDeleteMsg"
              proceedbuttonlabel="^delete"
              cancelbuttonlabel="^cancel"
              proceedaction="command:deleteItem"
              inputparameters="$itemId" />
```

### Action Selector Alert
```xml
<actionselector id="modeSelect" title="^selectMode"
                inputparameters="$currentMode">
    <button id="btn1" label="^modeA" action="command:setModeA" />
    <button id="btn2" label="^modeB" action="command:setModeB" />
</actionselector>
```

Navigate to alerts with: `navigation="showalert:deleteConfirm"`

Confirmation alerts also support `actionparameters` and `navigation="back"`:
```xml
<confirmation id="deleteConfirm" inputparameters="$userId"
              messagelabel="^confirmMsg" cancelbuttonlabel="^cancel"
              proceedbuttonlabel="^yes" proceedaction="command:delete"
              actionparameters="$userId" navigation="back" />
```

## Real-World Patterns

### Conditional Enable
Use a property binding on `enabled` to disable controls based on state:
```xml
<toggle id="autoLock" label="^autoLock" value="{AutoLock}" />
<textentry id="autoLockTime" label="^lockTimeSec" value="{AutoLockTime}"
           enabled="{AutoLock}" numericinputonly="#true" />
```
Here `AutoLockTime` is only editable when `AutoLock` is true.

### Object Subproperty Access
Layout titles and control values can reference object subproperties:
```xml
<layout id="userSettings" inputparameters="$User"
        title="$User.Name" subtitle="^userSettings">
    <controls>
        <textentry id="nameEntry" label="^name" value="$User.Name" />
        <toggle id="enabledToggle" label="^enabled" value="$User.Enabled" />
        <selectorbutton id="permSel" label="^permLevel"
                        value="$User.PermissionLevel" />
    </controls>
</layout>
```

### Action + Navigation Combined
A button can execute a command AND navigate in the same press:
```xml
<button id="addUser" label="^addUser" action="command:AddUser"
        navigation="back" actionparameters="$Name,$Pin" />
```

### List with Detail Navigation
Pass the full selected object to a detail layout:
```xml
<listbutton id="activityFeed" label="^activityFeed"
            source="{ActivityFeed}" itemlabel="{.Summary}"
            navigation="show:detailPage" navigationparameters="{.}" />

<layout id="detailPage" inputparameters="$Activity" title="^details">
    <controls>
        <textdisplay id="who" title="^performedBy"
                     line1label="$Activity.UserName" />
        <textdisplay id="when" title="^time"
                     line1label="$Activity.Time" />
    </controls>
</layout>
```

### Secondary Labels
Toggle and toggleslider support `secondarylabel` for status text:
```xml
<toggle id="t1" label="^power" value="{powerOn}"
        secondarylabel="{powerStatus}" />
```

## Driver Integration (C# Entity Model)

Extension support requires these components in the driver:

### Required Capability Members
- **Property:** `extension:uiDefinition` (string) — contains the XML
- **Command:** `extension:doCommand(commandName, args)` → OperationResult
- **Command:** `extension:setPropertyValue(objectId, property, value)` → OperationResult

### Property Metadata
Properties used in the UI must have `ExtensionUiProperty = true` in their
metadata (`DriverEntityPropertyMetadata.ExtensionUiProperty`). This tells
the platform to send these properties to the UI-hosting device.

### Extension UI Properties Must Be Custom (No Namespace)
Extension UI properties and commands must NOT use a `namespace:` prefix.
Use `vacuumStart` not `vacuum:start`. The UI Definition schema does not
allow special characters in names. Namespaced properties are reserved for
Crestron-defined capabilities.

### Online and Ready Indicators

Two platform-recognized properties tell the app whether the device is reachable
(`onlineIndicator:isOnline`) and fully usable (`readyIndicator:isReady`). These are
standard Crestron-defined capabilities, so — unlike custom extension UI properties — they
DO use the `namespace:` prefix. Declare them and keep them updated as connection state
changes:

```csharp
[EntityProperty(Id = "onlineIndicator:isOnline")]
public bool OnlineIndicatorIsOnline { get; private set; }

[EntityProperty(Id = "readyIndicator:isReady")]
public bool ReadyIndicatorIsReady { get; private set; }
```

```csharp
// In the constructor / whenever connectivity changes (key must match the Id exactly):
OnlineIndicatorIsOnline = true;
NotifyPropertyChanged("onlineIndicator:isOnline", new DriverEntityValue(true));
ReadyIndicatorIsReady = true;
NotifyPropertyChanged("readyIndicator:isReady", new DriverEntityValue(true));
```

### Command Routing

**`doCommand` routing:** The `ExtensionDoCommandExecutor` forwards to
matching Entity Model commands by name. Commands can optionally return
`ExtensionOperationResult` with `resultCode` (success/error) and
`userMessage`.

**`setPropertyValue` routing:** The `ExtensionSetPropertyValueExecutor`
looks for commands matching `set<PropertyName>` (first letter capitalized).
For object properties, the command takes `objectId` as its first parameter.
`value` is always the last parameter.
Objects must derive from `ExtensionObject` which provides `ExtensionObjectId`.
This command is executed on the entity for the extension, not the `ExtensionObject`.

`ExtensionObject.ExtensionObjectId` is auto-generated in the `base()`
constructor. This means you must avoid recreating object instances of these
and instead mutate properties in-place to stay in sync with the UI.

### Example Driver Setup (C#)
```csharp
// In entity constructor
var uiDef = UiDefinitionProperty.LoadFromDirectoryIfExists(
    args.DriverDataDirectoryPath, resources.InitLogger, LogEntryLevel.Error);
AddProperty(uiDef, UiDefinitionProperty.Name, uiDef);

var doCmd = new ExtensionDoCommandExecutor(GetCommand, resources.Logger);
AddCommand(this, ExtensionDoCommandExecutor.CommandName, doCmd);

var setProp = new ExtensionSetPropertyValueExecutor(GetCommand, resources.Logger);
AddCommand(this, ExtensionSetPropertyValueExecutor.CommandName, setProp);
```

### Cleanup (Dispose)

To release transports, timers, or HTTP clients, **override** the base entity's existing
`public virtual void Dispose()` method and call `base.Dispose()`.
Do not hide the base method with a non-override
`public void Dispose()`.

Add cleanup for resources owned by the entity before the base call. Make cleanup safe
to call more than once; use `try/finally` if necessary to ensure the base call runs even
when resource cleanup fails. The minimal override is:

```csharp
public override void Dispose()
{
    base.Dispose();
}
```

### PKG File Structure
```
driver.pkg/
├── driver.dll
├── driver.dat
├── uidefinitions/
│   └── UiDefinition.xml
└── translations/
    ├── en-US.json
    └── de-DE.json
```

### Logging

The template's base entity does not provide `ComponentLogger` or `Logger` members.
Obtain an `IComponentLogger` from `resources.Logger` (an `IDriverLogger`) and retain
it for the entity's lifetime. Both interfaces and `LoggingConstants` are in
`Crestron.DeviceDrivers.SDK`.

Add this field to the entity:

```csharp
private readonly IComponentLogger componentLogger;
```

Initialize it in the existing entity constructor, keeping the configuration and UI setup:

```csharp
componentLogger = resources.Logger.GetComponentLogger(
    LoggingConstants.ComponentTypeOther, "MyDriverEntity");
```

Use `componentLogger.Info(string message, params object[] args)` for significant
events, errors, and debugging information; it supports string-format placeholders.
Levels (with named methods) include `Trace`, `Debug`, `Info`, `Warning`, and `Error`.
`Info` is generally enabled by default, so use it for only significant events to avoid log spam, generally limited to the API surface between the driver and the app.
Use `Debug` and `Trace` for verbose logging that is disabled by default.

The hosting application may already log command execution, property changes, and
other lifecycle events. Check its logs before duplicating those messages; enabled
levels and automatic logging depend on the host.

**Do not throw exceptions out of driver code** (commands, configuration callbacks, event
handlers). The host runs many drivers in a shared process, so an unhandled exception can
destabilize other drivers and gives the installer no useful feedback. Catch failures and
log them (`Error` / `Warning`) instead, returning a sensible result where one is expected.

## Validation

- **XSD:** `https://prd-use-rad-assets.azurewebsites.net/ExtensionsSchemaDefinition.xsd`
- **Tool:** VS Code + Red Hat XML extension with schema reference in XML
- **Common errors:** Empty attribute strings, BOM in file, invalid binding
  syntax, duplicate IDs, missing default layout, `inputparameters` on
  default layout
