# example-skill

A starter example skill for the CrestronAISkills marketplace, demonstrating the structure and extension API.

## What It Does

This skill provides a simple greeting tool that demonstrates how to build a Copilot CLI skill. Use it as a template for your own skills.

## Tools Provided

### `greet`
Returns a greeting message.

**Parameters:**
- `name` (string, required) — Name to greet

**Example usage:**
> "Greet me using the example skill"

## Installation

```bash
# Via the CrestronAISkills marketplace extension
skills install example-skill
```

Or manually:
1. Copy this folder to `~/.copilot/extensions/example-skill/`
2. Restart Copilot CLI

## Development

Modify `extension.mjs` to add your own tools. See the [Copilot CLI Extension docs](https://docs.github.com/copilot) for the full API.

## License

MIT
