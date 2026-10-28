# Extension UI Controls Reference

All 19 control types with their complete attribute tables.

The `Req` column describes XSD requiredness. Additional application requirements
and recommended usage are called out separately.

## Table of Contents

1. [Subheader](#1-subheader)
2. [Checkbox](#2-checkbox)
3. [Toggle](#3-toggle)
4. [Toggle Slider](#4-toggle-slider)
5. [Segmented Slider](#5-segmented-slider)
6. [Status and Button](#6-status-and-button)
7. [Status and Navigation](#7-status-and-navigation)
8. [Raise/Lower with Text](#8-raiselower-with-text)
9. [Control Group](#9-control-group)
10. [Button Group](#10-button-group)
11. [Button](#11-button)
12. [Selector Button](#12-selector-button)
13. [List Button](#13-list-button)
14. [Radial Gauge](#14-radial-gauge)
15. [D-Pad](#15-d-pad)
16. [Keypad](#16-keypad)
17. [Thermostat](#17-thermostat)
18. [Text Entry](#18-text-entry)
19. [Text Display](#19-text-display)

---

## 1. Subheader

Section header text. Non-interactive.

```xml
<subheader id="subheaderid" label="^sectionTitle" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Header text |
| `visible` | Boolean | Property | Read | No | Default: true |

---

## 2. Checkbox

Boolean check control.

```xml
<checkbox id="checkboxid" label="^option" value="{isOptionOn}" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Label text |
| `value` | Boolean | Property | **Read/Write** | Yes | Checked state |
| `secondarylabel` | string | Translation, Property | Read | No | Description text below label |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 3. Toggle

On/off switch.

```xml
<toggle id="toggleid" label="^power" value="{isPowerOn}" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Label text |
| `value` | Boolean | Property | **Read/Write** | Yes | Toggle state |
| `secondarylabel` | string | Translation, Property | Read | No | Description text below label |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 4. Toggle Slider

Combined toggle switch + slider. Slider appears when toggle is ON.

```xml
<toggleslider id="togglesliderid" label="^floorlights"
              togglevalue="{toggleon}" slidervalue="{sliderlevel}" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Label text |
| `togglevalue` | Boolean | Property | **Read/Write** | Yes | Toggle state |
| `slidervalue` | number | Property | **Read/Write** | Yes | Slider 0-100. Min/max/step from property def |
| `secondarylabel` | string | Translation, Property | Read | No | Description text below label |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 5. Segmented Slider

Discrete segments (≤5 available values) or continuous slider (range with min/max/step).

**WARNING:** When using this for discrete string values, display labels can be customized but the values themselves must be stringified integers (e.g. "1", "2", "3")
**WARNING:** Available value labels MUST use localization keys, not only text labels. This works around issues rendering unlocalized labels on this control.

```xml
<segmentedslider id="segsliderid" label="^fanspeed" value="{fanlevel}" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Label text |
| `value` | string/number | Property | **Read/Write** | Yes | ≤5 available values → segments. Range → slider. >5 values: use `selectorbutton` |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

**Mode is determined by the bound property's definition:**
- Available values list (≤5 items) → segmented mode
- Range (min/max/stepSize) → continuous slider mode

---

## 6. Status and Button

Label + status text + action button.

```xml
<statusandbutton id="sabid" label="^name" status="{devicestatus}"
                 buttonlabel="^start" buttonaction="command:start"
                 actionparameters="{selectedprogram}"
                 navigation="show:progresspage"
                 statusicon="{stateicon}" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Title text |
| `status` | string | Translation, Property | Read | No | Text below label |
| `buttonlabel` | string | Translation, Property | Read | Yes | Button text |
| `buttonaction` | string | Command | Read | Yes | Command on press |
| `actionparameters` | string | Property, Variable | Read | No | Comma-separated params for action |
| `navigation` | string | Navigation | Read | No | Navigate on press (runs alongside action) |
| `navigationparameters` | string | Property, Variable | Read | No | Params for navigation target |
| `statusicon` | string | Fixed Icon, Property | Read | No | Icon beside status |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

The `buttonaction` attribute on `<statusandbutton>` is marked **Required**.
This means you cannot have a status+button control
that only navigates — it must also fire a command. In cases where no
meaningful command is needed, a lightweight no-op or refresh command
can be used as a workaround.

---

## 7. Status and Navigation

Label + status text with navigation (no action button, just an ellipsis).

```xml
<statusandnavigation id="sanid" label="{label}" status="{subtext}"
                     statusicon="#icArrowUp" navigation="show:detailpage" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Title text |
| `status` | string | Translation, Property | Read | No | Text below label |
| `statusicon` | string | Fixed Icon, Property | Read | No | Icon beside nav |
| `navigation` | string | Navigation | Read | No | Target layout/alert |
| `navigationparameters` | string | Property, Variable | Read | No | Params for target |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 8. Raise/Lower with Text

Increment/decrement buttons with formatted value display.

```xml
<raiselowerwithtext id="rlwtid" label="^humidify"
                    value="{humiditylevel}" valueformat="^humidityformat" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Title text |
| `value` | number | Property | **Read/Write** | Yes | Uses min/max/stepSize from property def |
| `valueformat` | string | Translation, Property | Read | Yes | Format string. `%s` replaced by value (e.g., `"%s dB"`) |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 9. Control Group

Container that removes spacing between child controls. Must contain ≥2 controls.

```xml
<controlgroup visible="{showGroup}">
    <toggle id="t1" label="^opt1" value="{opt1}" />
    <toggle id="t2" label="^opt2" value="{opt2}" />
</controlgroup>
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `visible` | Boolean | Property | Read | No | Default: true |

---

## 10. Button Group

Container for up to 5 buttons (`<button>` or `<selectorbutton>`), normally 2-5.
The XSD permits a single child.

```xml
<buttongroup visible="{showButtons}">
    <button id="btn1" label="^act1" action="command:action1" />
    <button id="btn2" label="^act2" action="command:action2" />
</buttongroup>
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `visible` | Boolean | Property | Read | No | Default: true |

---

## 11. Button

Action button with optional icon and navigation.

```xml
<button id="btnid" label="^name" icon="#icAlertRegular"
        action="command:start" actionparameters="{program}"
        navigation="show:progresspage" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | No | Button text |
| `icon` | string | Fixed Icon, Property | Read | No | Icon from library |
| `action` | string | Command | Read | No | Command on press |
| `actionparameters` | string | Property, Variable | Read | No | Comma-separated params |
| `navigation` | string | Navigation | Read | No | Navigate on press |
| `navigationparameters` | string | Property, Variable | Read | No | Params for target |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 12. Selector Button

Opens selection UI for enumerated values. Collapsed shows current selection; expanded shows radio-button list.

**WARNING:** Available value labels MUST use localization keys, not only text labels. This works around issues rendering unlocalized labels on this control.

```xml
<selectorbutton id="selbtnid" label="^program" value="{programType}" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Label text |
| `value` | string/number | Property | **Read/Write** | Yes | Must have available values in property def. `IsUnavailable` values appear greyed |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 13. List Button

Opens list UI from a collection property. For object lists.

```xml
<listbutton id="lbid" label="^users" source="{userlist}"
            itemlabel="{.name}" action="command:selectuser"
            actionparameters="{.id}" navigation="show:detail"
            navigationparameters="{.}" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Button text |
| `source` | list | Property | Read | Yes | Collection property |
| `itemlabel` | string | Property | Read | Yes | Subproperty for display: `{.name}` |
| `action` | string | Command | Read | No | Command on item select |
| `actionparameters` | string | Property, Variable | Read | No | Only primitives: `{.id}`. Objects NOT allowed |
| `navigation` | string | Navigation | Read | No | Navigate on select |
| `navigationparameters` | string | Property, Variable | Read | No | Full object: `{.}` |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 14. Radial Gauge

Circular progress/timer display. Read-only.

```xml
<radialgauge id="rgid" label="^gaugetitle" radialvalue="{progress}"
             line1label="{timeRemaining}" line2label="{status}"
             line3label="{temp}" gaugefillcolor="#LightBlue" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Title text |
| `radialvalue` | number | Property | Read | Yes | Gauge fill %. Property must have min/max |
| `line1label` | string | Translation, Property | Read | Yes | Center text line 1 |
| `line2label` | string | Translation, Property | Read | No | Center text line 2 |
| `line3label` | string | Translation, Property | Read | No | Center text line 3 |
| `gaugefillcolor` | string | Fixed Color, Property | Read | No | Color from palette (v2.0+) |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 15. D-Pad

Directional pad with 5 command buttons.

```xml
<dpad id="dpadid"
      buttondpadup="command:up" buttondpaddown="command:down"
      buttondpadleft="command:left" buttondpadright="command:right"
      buttondpadcenter="command:select" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `buttondpadup` | string | Command | Read | No | Up command |
| `buttondpaddown` | string | Command | Read | No | Down command |
| `buttondpadleft` | string | Command | Read | No | Left command |
| `buttondpadright` | string | Command | Read | No | Right command |
| `buttondpadcenter` | string | Command | Read | No | Center/OK command |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 16. Keypad

Numeric keypad (0–9) with up to 2 function buttons. Each press sends command with button number parameter.

```xml
<keypad id="kpid" buttonpressaction="command:keypress"
        functionbutton1enabled="#true" functionbutton2enabled="#true"
        functionbutton1label="^clear" functionbutton2label="^dash" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `buttonpressaction` | string | Command | Read | Yes | Command on any key. Param: 0–9 for digits, 10/11 for function buttons |
| `functionbutton1enabled` | Boolean | Fixed Bool, Property | Read | Yes | Show function button 1 |
| `functionbutton2enabled` | Boolean | Fixed Bool, Property | Read | Yes | Show function button 2 |
| `functionbutton1label` | string | Translation, Property | Read | No | Function 1 label |
| `functionbutton2label` | string | Translation, Property | Read | No | Function 2 label |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

For aggregated numeric input (final value only), use `<textentry numericinputonly="#true">` instead.

---

## 17. Thermostat

Temperature control with heat/cool/auto modes and setpoints.

```xml
<thermostat id="thermid" toplefticon="#icClimateRegular"
            title="^thermostat"
            setpointheat="{heatSP}" setpointcool="{coolSP}"
            setpointauto="{autoSP}"
            heatmodeenabled="{heatOn}" coolmodeenabled="{coolOn}"
            automodeenabled="{autoOn}"
            modeicon="{modeIcon}"
            currenttemperature="{currentTemp}"
            currenttemperaturelabel="{tempLabel}"
            temperatureunits="{units}" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `toplefticon` | string | Fixed Icon, Property | Read | No | Title icon |
| `title` | string | Translation, Property | Read | Yes | Title text |
| `setpointheat` | number | Property | **Read/Write** | No | Heat target. Min/max/step required in property def |
| `setpointcool` | number | Property | **Read/Write** | No | Cool target. Min/max/step required in property def |
| `setpointauto` | number | Property | **Read/Write** | No | Auto target (single-setpoint mode only) |
| `heatmodeenabled` | Boolean | Fixed Bool, Property | Read | Yes | Show heat setpoint |
| `coolmodeenabled` | Boolean | Fixed Bool, Property | Read | Yes | Show cool setpoint |
| `automodeenabled` | Boolean | Fixed Bool, Property | Read | Yes | Show auto setpoint. For dual-setpoint auto: set `#false`, enable both heat+cool |
| `modeicon` | string | Fixed Icon, Property | Read | No | Mode indicator icon |
| `currenttemperature` | number | Property | Read | No | Current reading on gauge |
| `currenttemperaturelabel` | string | Translation, Property | Read | No | Label in gauge |
| `temperatureunits` | string | Property | Read | Yes | `"Celsius"` or `"Fahrenheit"` |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

**Mode configurations:**
- **Single auto:** `automodeenabled=true`, others false → one setpoint row
- **Dual auto:** `heatmodeenabled=true`, `coolmodeenabled=true`, `automodeenabled=false` → two setpoint rows
- **Heat only:** `heatmodeenabled=true`, others false
- **Cool only:** `coolmodeenabled=true`, others false

**Dual setpoint constraint:** Heat property min < cool property min; heat max < cool max.

---

## 18. Text Entry

Text input with optional masking and numeric-only keyboard.

```xml
<textentry id="teid" label="^pin" value="$pinentered"
           errortext="{pinerror}" obscureinput="#true"
           numericinputonly="#true" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `label` | string | Translation, Property | Read | Yes | Label text |
| `value` | string/number | Property, Variable | **Write** | Yes | Stores entered text. Often uses `$variable` |
| `errortext` | string | Property | Read | No | Red error message below input |
| `obscureinput` | Boolean | Fixed Bool | Read | No | Mask characters as dots |
| `numericinputonly` | Boolean | Fixed Bool | Read | No | Show numeric keyboard |
| `visible` | Boolean | Property | Read | No | Default: true |
| `enabled` | Boolean | Property | Read | No | Default: true |

---

## 19. Text Display

Read-only text. Title + up to 3 lines.

```xml
<textdisplay id="tdid" title="^humidity"
             line1label="{level}" line2label="{msg}" line3label="{detail}" />
```

| Attribute | Type | Bindings | Access | Req | Notes |
|-----------|------|----------|--------|-----|-------|
| `id` | string | — | — | Yes | Unique ID |
| `title` | string | Translation, Property | Read | Yes | Title text |
| `line1label` | string | Translation, Property | Read | No | Line 1 |
| `line2label` | string | Translation, Property | Read | No | Line 2 |
| `line3label` | string | Translation, Property | Read | No | Line 3 |
| `visible` | Boolean | Property | Read | No | Default: true |
