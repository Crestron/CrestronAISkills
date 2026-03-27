# Translation Rules Reference

Full rule set for the `android-string-translator` skill. Applied during Step 4 of the workflow.

---

## String Selection Logic

Apply per string, in this exact priority order:

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | String has `translatable="false"` | **OMIT** — do not write to any locale output file |
| 2 | Marker mode AND string is ABOVE the marker | **COPY VERBATIM** — include in output unchanged |
| 3 | Marker mode AND string is BELOW the marker | **TRANSLATE** |
| 4 | No marker mode | **TRANSLATE** |

> `translatable="false"` always wins. A string tagged with it is never written to any locale file, regardless of its position relative to the marker. Android resolves these at runtime from `values/`.

---

## Keep In English (Never Translate)

Load the full list from the user-provided config (`keep_in_english` field in `translation_config.json`) or from the user directly.

**Crestron project defaults:** `Crestron`, `NTP`, `SNTP`, `Wi-Fi`, `Android`, `Windows`

Rules:
- Keep brand names, product names, and protocol names exactly as written in every locale
- For strings where only PART of the value is a brand name, keep the brand name and translate the rest

**Example:**
```xml
<!-- Source -->
<string name="setup_help">Set up your Crestron device</string>

<!-- Correct German output -->
<string name="setup_help">Richten Sie Ihr Crestron-Gerät ein</string>

<!-- WRONG — brand name translated -->
<string name="setup_help">Richten Sie Ihr Kamm-Gerät ein</string>
```

---

## Abbreviation Rules (Keep Prefix, Translate Noun)

Load from `translate_suffix_nouns` in `translation_config.json` or from the user.

**Crestron project defaults:**

| Prefix | Translatable nouns |
|--------|-------------------|
| `IP` | Address, address |
| `MAC` | Address, address |
| `QR` | Code, code |

Rule: Keep the abbreviation exactly as-is; translate only the following noun.

**Example (`IP Address` → German):**
```xml
<!-- Correct -->
<string name="ip_label">IP Adresse</string>

<!-- WRONG — abbreviation translated -->
<string name="ip_label">IPA Adresse</string>
```

---

## Verbatim String Keys

Load from `keep_strings_verbatim` in `translation_config.json` or from the user.

When a `name` attribute matches an entry in this list, copy the **entire string value** unchanged into every locale file — regardless of language or marker position.

**Crestron project default:** `crestron_control`

---

## Format Preservation Rules

These rules apply to ALL translated strings without exception:

1. **Apostrophe escaping** — preserve `\'` exactly; do NOT convert to `'`
   ```xml
   <!-- Source -->
   <string name="msg">Don\'t disconnect</string>
   <!-- Correct French -->
   <string name="msg">Ne déconnectez pas</string>
   <!-- WRONG — escape dropped -->
   <string name="msg">Don't disconnect</string>
   ```

2. **Line break escaping** — preserve `\n` exactly; do NOT convert to a real newline

3. **XML structure** — preserve all `name` attributes, XML comments, and element order exactly

4. **Output encoding** — valid Android XML, UTF-8 without BOM

5. **String format placeholders** — preserve `%1$s`, `%2$d`, `%s`, `%d` etc. exactly; do not reorder or rename

---

## Regional Variant Rules

Treat each regional locale as **fully distinct** — use locale-appropriate vocabulary and phrasing, not just the base language:

| Variant | Notes |
|---------|-------|
| `fr-rCA` vs `fr` | Canadian French — different spelling conventions and vocabulary |
| `pt-rBR` vs `pt` | Brazilian Portuguese — significantly different vocabulary and idioms |
| `es-rUS` vs `es` | Latin American Spanish — different vocabulary from Castilian Spanish |
| `zh-rCN` vs `zh-rTW` | Simplified vs Traditional characters — entirely different character sets |

Do not copy `fr` output to `fr-rCA` and call it done. Produce locale-appropriate translations independently.

---

## Quality Checks

### Critic Pass
A second, independent model reviews each translation. If the critic flags issues with meaning, tone, or brand-name handling:
- Attempt correction up to `critic_max_retries` times
- If still flagged: apply `critic_on_fail_action` (default: `use_revised`) and log the string for review

### Back-Translation
Re-translate the output back to English and compare against the source. Flag strings where meaning has drifted significantly.

### Ambiguity Handling
If a string has multiple valid translations that carry different nuances, do NOT silently pick one. Include it in the post-run report with both options for human review.
