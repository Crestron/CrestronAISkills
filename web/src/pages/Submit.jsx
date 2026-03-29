import React from "react";

const REPO_URL =
    typeof __REPO_URL__ !== "undefined"
        ? __REPO_URL__
        : "https://github.com/CrestronEng/CrestronAISkills";

const s = {
    page: { maxWidth: "760px", margin: "0 auto", padding: "40px 24px" },
    title: { fontSize: "1.6rem", fontWeight: 800, marginBottom: "8px" },
    subtitle: { color: "var(--text-muted)", marginBottom: "32px", lineHeight: 1.6 },
    section: { marginBottom: "32px" },
    sectionTitle: { fontWeight: 600, fontSize: "1rem", marginBottom: "12px" },
    box: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px 24px",
        marginBottom: "16px",
    },
    step: { display: "flex", gap: "16px", marginBottom: "16px", alignItems: "flex-start" },
    stepNum: {
        minWidth: "28px",
        height: "28px",
        borderRadius: "50%",
        background: "var(--accent)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.8rem",
        fontWeight: 700,
        marginTop: "1px",
    },
    stepText: { fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text)" },
    code: {
        display: "block",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "12px 16px",
        fontFamily: "monospace",
        fontSize: "0.85rem",
        marginTop: "8px",
        whiteSpace: "pre",
        overflowX: "auto",
    },
    btn: {
        background: "var(--accent)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius)",
        padding: "10px 20px",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: "pointer",
        textDecoration: "none",
        display: "inline-block",
        marginTop: "8px",
    },
    hint: { fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6, marginTop: "8px" },
};

const TEMPLATE = `---
name: your-skill-name
version: 1.0.0
description: What your skill does (10–200 chars)
tags: [tag1, tag2]
author: your-github-username
license: MIT
---

# Your Skill Name

## Role & Purpose
Describe the role Copilot takes when using this skill.

## Behavior Guidelines
- Guideline 1
- Guideline 2`;

export default function Submit() {
    return (
        <div style={s.page}>
            <h1 style={s.title}>Submit a Skill</h1>
            <p style={s.subtitle}>
                Share a Copilot skill with the team. Skills are added via a pull request — follow
                the steps below to get started.
            </p>

            <div style={s.section}>
                <div style={s.sectionTitle}>How to Submit</div>

                <div style={s.step}>
                    <div style={s.stepNum}>1</div>
                    <div style={s.stepText}>
                        <strong>Fork or branch this repository</strong> on GitHub, then create the skill folder:
                        <code style={s.code}>skills/your-skill-name/skill.md</code>
                    </div>
                </div>

                <div style={s.step}>
                    <div style={s.stepNum}>2</div>
                    <div style={s.stepText}>
                        <strong>Add your skill.md</strong> using this template:
                        <code style={s.code}>{TEMPLATE}</code>
                    </div>
                </div>

                <div style={s.step}>
                    <div style={s.stepNum}>3</div>
                    <div style={s.stepText}>
                        <strong>Open a pull request</strong> against <code>main</code>. CI will validate
                        your skill automatically. Once merged, it appears in the marketplace.
                    </div>
                </div>
            </div>

            <div style={s.box}>
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>Ready to submit?</div>
                <p style={s.hint}>
                    Read the full contribution guide for frontmatter requirements and CI validation rules.
                </p>
                <a
                    href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={s.btn}
                >
                    Read Contributing Guide
                </a>
            </div>
        </div>
    );
}
