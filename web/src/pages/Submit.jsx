import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../utils/github.js";

const REPO_URL =
    typeof __REPO_URL__ !== "undefined"
        ? __REPO_URL__
        : "https://github.com/CrestronAISkills/CrestronAISkills";

const s = {
    page: { maxWidth: "760px", margin: "0 auto", padding: "40px 24px" },
    title: { fontSize: "1.6rem", fontWeight: 800, marginBottom: "8px" },
    subtitle: { color: "var(--text-muted)", marginBottom: "32px" },
    form: { display: "flex", flexDirection: "column", gap: "20px" },
    label: { fontWeight: 500, fontSize: "0.9rem", marginBottom: "6px", display: "block" },
    input: {
        width: "100%",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "10px 14px",
        color: "var(--text)",
        fontSize: "0.95rem",
        outline: "none",
    },
    textarea: {
        width: "100%",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "10px 14px",
        color: "var(--text)",
        fontSize: "0.88rem",
        fontFamily: "monospace",
        resize: "vertical",
        outline: "none",
        minHeight: "120px",
    },
    hint: { fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" },
    btn: {
        background: "var(--accent)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius)",
        padding: "11px 24px",
        fontSize: "0.95rem",
        fontWeight: 600,
        cursor: "pointer",
        alignSelf: "flex-start",
    },
    loginBox: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "40px",
        textAlign: "center",
        color: "var(--text-muted)",
    },
};

const SKILL_JSON_TEMPLATE = `{
  "name": "your-skill-name",
  "version": "1.0.0",
  "description": "What your skill does (10-200 chars)",
  "tags": ["tag1", "tag2"],
  "author": "your-github-username",
  "entry": "extension.mjs",
  "license": "MIT",
  "homepage": "https://github.com/you/your-skill"
}`;

export default function Submit({ onLoginClick }) {
    const user = getStoredUser();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        description: "",
        manifest: SKILL_JSON_TEMPLATE,
    });

    const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        const prTitle = `feat: add ${form.name || "new-skill"}`;
        const prBody = encodeURIComponent(
            `## New Skill Submission\n\n` +
            `**Skill name:** \`${form.name}\`\n\n` +
            `**Description:** ${form.description}\n\n` +
            `### Checklist\n` +
            `- [ ] I have added \`skills/${form.name}/skill.json\`\n` +
            `- [ ] I have added \`skills/${form.name}/extension.mjs\`\n` +
            `- [ ] I have added \`skills/${form.name}/README.md\`\n` +
            `- [ ] My skill passes local testing\n` +
            `- [ ] I have read [CONTRIBUTING.md](CONTRIBUTING.md)\n`
        );
        const url = `${REPO_URL}/compare/main...${user?.login}:main?expand=1&title=${encodeURIComponent(prTitle)}&body=${prBody}`;
        window.open(url, "_blank", "noopener");
    };

    if (!user) {
        return (
            <div style={s.page}>
                <div style={s.loginBox}>
                    <p style={{ marginBottom: "16px", fontSize: "1rem" }}>
                        You need to be logged in to submit a skill.
                    </p>
                    <button style={s.btn} onClick={onLoginClick}>
                        Login with GitHub
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={s.page}>
            <h1 style={s.title}>Submit a Skill</h1>
            <p style={s.subtitle}>
                Logged in as <strong>@{user.login}</strong>. Fill in the details below — we'll open a
                pre-filled pull request on GitHub for you.
            </p>

            <form style={s.form} onSubmit={handleSubmit}>
                <div>
                    <label style={s.label}>Skill Name *</label>
                    <input
                        style={s.input}
                        type="text"
                        placeholder="e.g. crestron-helper"
                        value={form.name}
                        onChange={update("name")}
                        required
                        pattern="^[a-z][a-z0-9-]*[a-z0-9]$"
                    />
                    <p style={s.hint}>Kebab-case, lowercase (e.g. my-skill)</p>
                </div>

                <div>
                    <label style={s.label}>Description *</label>
                    <input
                        style={s.input}
                        type="text"
                        placeholder="What does your skill do?"
                        value={form.description}
                        onChange={update("description")}
                        required
                        minLength={10}
                        maxLength={200}
                    />
                </div>

                <div>
                    <label style={s.label}>skill.json Preview</label>
                    <textarea
                        style={s.textarea}
                        value={form.manifest}
                        onChange={update("manifest")}
                        rows={12}
                    />
                    <p style={s.hint}>
                        Edit this as a reference — the actual files must be in your PR branch.
                    </p>
                </div>

                <div>
                    <p style={{ ...s.hint, marginBottom: "12px" }}>
                        Clicking below opens a GitHub pull request. You'll need to push your skill
                        files to a branch first.{" "}
                        <a
                            href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--link)" }}
                        >
                            Read the contribution guide →
                        </a>
                    </p>
                    <button type="submit" style={s.btn}>
                        Open Pull Request on GitHub ↗
                    </button>
                </div>
            </form>
        </div>
    );
}
