# crestron-ai-skills

Search and inspect skills in the [CrestronAISkills](https://github.com/Crestron/CrestronAISkills) plugin marketplace, directly from your AI tool.

## What it does

Adds one skill (`crestron-ai-skills`) that loads when you ask to browse, search, or install skills from the CrestronAISkills marketplace. It can:

- Search the marketplace by keyword, tag, or author
- Show full details for a specific skill
- Tell you how to install a skill in your tool (skills are installed only through the plugin marketplace)
- List the Crestron skills you already have installed

## Usage

Just talk to Claude, e.g.:

- "Search the Crestron skills registry for AV"
- "Get info on the example-skill Crestron skill"
- "Install the example-skill Crestron skill"
- "What Crestron skills do I have installed?"

No API keys or auth required: it reads the marketplace catalog from this public repository on `raw.githubusercontent.com`.
