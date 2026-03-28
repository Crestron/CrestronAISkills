import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import JSZip from "jszip";
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
    downloadBox: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
        marginBottom: "28px",
    },
    downloadTitle: { fontWeight: 700, marginBottom: "16px", fontSize: "1rem" },
    btnRow: { display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" },
    btnPrimary: {
        background: "var(--accent)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius)",
        padding: "10px 20px",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: "pointer",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
    },
    btnSecondary: {
        background: "transparent",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "10px 20px",
        fontSize: "0.9rem",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
    },
    hint: { color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.6 },
    contentBox: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
        marginBottom: "28px",
    },
    contentTitle: { fontWeight: 700, marginBottom: "16px", fontSize: "1rem" },
    pre: {
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "16px",
        fontFamily: "monospace",
        fontSize: "0.85rem",
        lineHeight: 1.6,
        overflowX: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        color: "var(--text)",
    },
    links: { display: "flex", gap: "16px", marginTop: "16px" },
    linkBtn: { color: "var(--link)", fontSize: "0.88rem", textDecoration: "none" },
    notFound: { textAlign: "center", padding: "80px 24px", color: "var(--text-muted)" },
};

export default function SkillDetail() {
    const { name } = useParams();
    const [skill, setSkill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchRegistry()
            .then((r) => {
                const found = (r.skills || []).find((s) => s.name === name);
                setSkill(found || null);
            })
            .finally(() => setLoading(false));
    }, [name]);

    useEffect(() => {
        if (!skill) return;
        fetch(`/skills/${skill.name}/skill.md`)
            .then((r) => r.ok ? r.text() : null)
            .then((text) => setContent(text))
            .catch(() => setContent(null));
    }, [skill]);

    const handleDownload = async () => {
        if (!content) return;
        const RAW_BASE_URL = "https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/gh-pages";
        const PAGES_URL = RAW_BASE_URL;
        const REGISTRY_URL = `${RAW_BASE_URL}/registry.json`;

        const replacePlaceholders = (tmpl) => tmpl
            .replace(/__SKILL_NAME__/g, skill.name)
            .replace(/__SKILL_VERSION__/g, skill.version)
            .replace(/__REGISTRY_URL__/g, REGISTRY_URL)
            .replace(/__PAGES_URL__/g, PAGES_URL);

        // Fetch skill.md, install scripts in parallel from raw.githubusercontent.com
        const [skillResp, psResp, shResp] = await Promise.allSettled([
            fetch(`${RAW_BASE_URL}/skills/${skill.name}/skill.md`),
            fetch(`${PAGES_URL}/install-skill-template.ps1`),
            fetch(`${PAGES_URL}/install-skill-template.sh`),
        ]);
        const skillContent = skillResp.status === "fulfilled" && skillResp.value.ok ? await skillResp.value.text() : content;
        const psTemplate = psResp.status === "fulfilled" && psResp.value.ok ? await psResp.value.text() : "";
        const shTemplate = shResp.status === "fulfilled" && shResp.value.ok ? await shResp.value.text() : "";

        const zip = new JSZip();
        zip.file("skill.md", skillContent);
        if (psTemplate) zip.file("install.ps1", replacePlaceholders(psTemplate));
        if (shTemplate) zip.file("install.sh", replacePlaceholders(shTemplate));

        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${skill.name}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadMdOnly = () => {
        if (!content) return;
        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${skill.name}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        if (!content) return;
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // Strip YAML frontmatter for display
    const bodyContent = content
        ? content.replace(/^---[\s\S]*?---\n?/, "").trim()
        : null;

    if (loading) return <div style={{ ...s.page, color: "var(--text-muted)" }}>Loading…</div>;

    if (!skill) {
        return (
            <div style={s.notFound}>
                <p style={{ fontSize: "1.2rem", marginBottom: "12px" }}>Skill not found: <strong>{name}</strong></p>
                <Link to="/search" style={{ color: "var(--link)" }}>← Browse all skills</Link>
            </div>
        );
    }

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

            <div style={s.downloadBox}>
                <div style={s.downloadTitle}>Get This Skill</div>
                <div style={s.btnRow}>
                    <button style={s.btnPrimary} onClick={handleDownload} disabled={!content}>
                        ⬇ Download &amp; Install
                    </button>
                    <button style={s.btnSecondary} onClick={handleCopy} disabled={!content}>
                        {copied ? "✓ Copied!" : "📋 Copy to clipboard"}
                    </button>
                </div>
                <p style={s.hint}>
                    Download the zip and run <code>install.ps1</code> to install the skill and set up automatic weekly updates.
                </p>
                <div style={s.links}>
                    <a href={skillRepoPath} target="_blank" rel="noopener noreferrer" style={s.linkBtn}>
                        View source ↗
                    </a>
                    <button style={{ ...s.linkBtn, background: "none", border: "none", padding: 0, cursor: "pointer" }} onClick={handleDownloadMdOnly} disabled={!content}>
                        ⬇ Download skill.md only
                    </button>
                </div>
            </div>

            {bodyContent && (
                <div style={s.contentBox}>
                    <div style={s.contentTitle}>Skill Instructions</div>
                    <pre style={s.pre}>{bodyContent}</pre>
                </div>
            )}
        </div>
    );
}