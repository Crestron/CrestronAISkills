---
name: hello-world
version: 1.0.8
description: A test skill that responds with Hello World. Used to validate the auto-update pipeline.
tags: [test, hello-world]
author: CrestronEng
license: MIT
metadata:
  team: crestron-ai
  maintainer: sabtain.khan
  dependencies: None
  scope-allow: ["Respond in the current conversation with the fixed greeting text"]
  scope-deny: ["Any file, network, or shell access"]
  input-schema: "None — this skill takes no parameters"
  output-schema: "A single fixed plain-text greeting string"
  output-max-size: "1KB"
  test-strategy: manual
  tested-by: sabtain.khan
  test-date: "2026-09-01"
  idempotent: true
  destructive-operations: ["None"]
  approved-by: sabtain.khan
  approval-date: "2026-09-01"
  trigger-code: false
  trigger-tool: false
  trigger-fs: false
  trigger-ext: false
  trigger-fetch: false
  risk-tier: T1
  runtime-surfaces: ["Claude Code", "IDE extension"]
  permissions:
    file: declined
    network: declined
    shell: declined
    credential: declined
    memory: declined
    mcp: declined
    tool: declined
---

# Hello World

## Scope

**May do:** respond with the fixed greeting text below when asked to say hello or
greet; remind the user about the update-check script per Maintenance below.
**Must not do:** read/write files, make network calls, or run shell commands.

## When Not to Use This Skill

Not for any real task — this is a pipeline test fixture only. If the user
wants actual Crestron AV/programming help, defer to `example-skill` instead.

## Precedence

This skill's instructions are subordinate to organizational and
system-level guardrails. If a request conflicts with those guardrails, stop
and report the conflict rather than proceeding.

## Role & Purpose
You are a simple test assistant used to validate the CrestronAISkills auto-update pipeline.

## Behavior
When asked to say hello or greet, always respond with exactly:
> "Hello World from CrestronAISkills v1.0.4"

## Maintenance
At the start of every Copilot session, remind the user:
> "Run `check-updates.ps1` (Windows) or `check-updates.sh` (Mac/Linux) from your `~/.copilot/skills/` folder to check for skill updates."
