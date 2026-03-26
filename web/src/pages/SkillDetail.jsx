import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchRegistry } from "../utils/registry.js";

const REPO_URL =
    typeof __REPO_URL__ !== "undefined"
        ? __REPO_URL__
        : "https://github.com/CrestronEng/CrestronAISkills";

const s = {
    page: { maxWidth: "860px", margin: "0 auto", padding: "40px 24px" },
    back: { color: "var(--link)", textDecoration: "none", fontSize: "0.9rem", display: "inline-block", marginBottom: "24px" },
    header: { marginBottom: "28px" },
    name: { fontSize: "1.8rem", fontWeight: 800, marginBottom: "8px" },
    description: { color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "16px" },
    tags: { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" },
    tag: {
        background: "var(--tag-bg)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "3px 10px",
        fontSize: "0.8rem",
        color: "var(--text-muted)",
        cursor: "pointer",
        textDecoration: "none",
    },
    meta: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px",
        marginBottom: "28px",
    },
    metaItem: { display: "flex", flexDirection: "column", gap: "4px" },
    metaLabel: { fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" },
    metaValue: { fontSize: "0.9rem", fontWeight: 500 },
    installBox: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
        marginBottom: "28px",
    },
    installTitle: { fontWeight: 700, marginBottom: "16px", fontSize: "1rem" },
    codeBlock: {
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "12px 16px",
        fontFamily: "monospace",
        fontSize: "0.88rem",
        color: "var(--link)",
        marginBottom: "12px",
        overflowX: "auto",
    },
    hint: { color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.5 },
    links: { display: "flex", gap: "16px", marginTop: "12px" },
    linkBtn: {
        color: "var(--link)",
        fontSize: "0.88rem",
        textDecoration: "none",
    },
    notFound: { textAlign: "center", padding: "80px 24px", color: "var(--text-muted)" },
};

export default function SkillDetail() {
    const { name } = useParams();
    const [skill, setSkill] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRegistry()
            .then((r) => {
                const found = (r.skills || []).find((s) => s.name === name);
                setSkill(found || null);
            })
            .finally(() => setLoading(false));
    }, [name]);

    if (loading) return <div style={{ ...s.page, color: "var(--text-muted)" }}>Loading…</div>;

    if (!skill) {
        return (
            <div style={s.notFound}>
                <p style={{ fontSize: "1.2rem", marginBottom: "12px" }}>Skill not found: <strong>{name}</strong></p>
                <Link to="/search" style={{ color: "var(--link)" }}>← Browse all skills</Link>
            </div>
        );
    }

    const rawBase = `${REPO_URL.replace("github.com", "raw.githubusercontent.com")}/main/${skill.path}`;
    const skillRepoPath = `${REPO_URL}/tree/main/${skill.path}`;

    return (
        <div style={s.page}>
            <Link to="/search" style={s.back}>← Back to search</Link>

            <div style={s.header}>
                <h1 style={s.name}>{skill.name}</h1>
                <p style={s.description}>{skill.description}</p>
                <div style={s.tags}>
                    {(skill.tags || []).map((tag) => (
                        <Link key={tag} to={`/search?tags=${tag}`} style={s.tag}>
                            {tag}
                        </Link>
                    ))}
                </div>
            </div>

            <div style={s.meta}>
                <div style={s.metaItem}>
                    <span style={s.metaLabel}>Version</span>
                    <span style={s.metaValue}>v{skill.version}</span>
                </div>
                <div style={s.metaItem}>
                    <span style={s.metaLabel}>Author</span>
                    <a
                        href={`https://github.com/${skill.author}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...s.metaValue, color: "var(--link)", textDecoration: "none" }}
                    >
                        @{skill.author}
                    </a>
                </div>
                <div style={s.metaItem}>
                    <span style={s.metaLabel}>License</span>
                    <span style={s.metaValue}>{skill.license || "MIT"}</span>
                </div>
                {skill.homepage && (
                    <div style={s.metaItem}>
                        <span style={s.metaLabel}>Homepage</span>
                        <a href={skill.homepage} target="_blank" rel="noopener noreferrer" style={{ ...s.metaValue, color: "var(--link)", textDecoration: "none" }}>
                            Visit ↗
                        </a>
                    </div>
                )}
            </div>

            <div style={s.installBox}>
                <div style={s.installTitle}>Installation</div>

                <p style={{ ...s.hint, marginBottom: "12px" }}>
                    <strong>Option 1</strong> — Copy to your repo's <code>.github/</code> folder or personal instructions folder:
                </p>
                <div style={s.codeBlock}>
                    # Download skill to your repo's .github/ folder{"\n"}
                    curl -o .github/{skill.name}.md {rawBase}/skill.md{"\n\n"}
                    # Or copy to personal Copilot instructions folder{"\n"}
                    curl -o ~/.copilot/instructions/{skill.name}.md {rawBase}/skill.md
                </div>

                <p style={{ ...s.hint, marginBottom: "12px" }}>
                    <strong>Option 2</strong> — View and copy manually:
                </p>

                <div style={s.links}>
                    <a href={`${skillRepoPath}/skill.md`} target="_blank" rel="noopener noreferrer" style={s.linkBtn}>
                        View skill content ↗
                    </a>
                    <a href={skillRepoPath} target="_blank" rel="noopener noreferrer" style={s.linkBtn}>
                        View source ↗
                    </a>
                </div>
            </div>
        </div>
    );
}
