import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchRegistry } from "../utils/registry.js";
const s = {
    page: { maxWidth: "860px", margin: "0 auto", padding: "40px 24px" },
    back: { color: "var(--link)", textDecoration: "none", fontSize: "0.9rem", display: "inline-block", marginBottom: "24px" },
    header: { marginBottom: "24px" },
    name: { fontSize: "1.8rem", fontWeight: 800, marginBottom: "8px" },
    description: { color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "14px" },
    tags: { display: "flex", gap: "6px", flexWrap: "wrap" },
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
    tabBar: {
        display: "flex",
        borderBottom: "1px solid var(--border)",
        marginBottom: "28px",
        gap: "0",
    },
    tab: (active) => ({
        padding: "10px 20px",
        fontSize: "0.9rem",
        fontWeight: active ? 600 : 400,
        color: active ? "var(--text)" : "var(--text-muted)",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        cursor: "pointer",
        marginBottom: "-1px",
        transition: "color 0.15s",
    }),
    meta: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px",
        marginBottom: "24px",
    },
    metaItem: { display: "flex", flexDirection: "column", gap: "4px" },
    metaLabel: { fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" },
    metaValue: { fontSize: "0.9rem", fontWeight: 500 },
    box: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
        marginBottom: "24px",
    },
    boxTitle: { fontWeight: 600, marginBottom: "16px", fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" },
    hint: { color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.6 },
    pre: {
        background: "#fff",
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

const TABS = ["Overview", "Instructions", "Install"];

export default function SkillDetail() {
    const { name } = useParams();
    const [skill, setSkill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState(null);
    const [activeTab, setActiveTab] = useState("Overview");

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
        fetch(`${import.meta.env.BASE_URL}skills/${skill.name}/SKILL.md`)
            .then((r) => r.ok ? r.text() : null)
            .then((text) => setContent(text))
            .catch(() => setContent(null));
    }, [skill]);

    const bodyContent = content
        ? content.replace(/^---[\s\S]*?---\n?/, "").trim()
        : null;

    if (loading) return <div style={{ ...s.page, color: "var(--text-muted)" }}>Loading…</div>;

    if (!skill) {
        return (
            <div style={s.notFound}>
                <p style={{ fontSize: "1.2rem", marginBottom: "12px" }}>Skill not found: <strong>{name}</strong></p>
                <Link to="/search" style={{ color: "var(--link)" }}>Back to search</Link>
            </div>
        );
    }

    return (
        <div style={s.page}>
            <Link to="/search" style={s.back}>Back to search</Link>

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

            <div style={s.tabBar}>
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        style={s.tab(activeTab === tab)}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === "Overview" && (
                <div style={s.meta}>
                    <div style={s.metaItem}>
                        <span style={s.metaLabel}>Version</span>
                        <span style={s.metaValue}>v{skill.version}</span>
                    </div>
                    <div style={s.metaItem}>
                        <span style={s.metaLabel}>Author</span>
                        <span style={s.metaValue}>{skill.author}</span>
                    </div>
                    <div style={s.metaItem}>
                        <span style={s.metaLabel}>License</span>
                        <a
                            href="https://www.crestron.com/SWToolsLicensetxt"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...s.metaValue, color: "var(--link)", textDecoration: "none" }}
                        >
                            Software Development Tools License
                        </a>
                    </div>
                    {skill.homepage && (
                        <div style={s.metaItem}>
                            <span style={s.metaLabel}>Homepage</span>
                            <a href={skill.homepage} target="_blank" rel="noopener noreferrer" style={{ ...s.metaValue, color: "var(--link)", textDecoration: "none" }}>
                                Visit
                            </a>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "Instructions" && (
                <div style={s.box}>
                    <div style={s.boxTitle}>Skill Instructions</div>
                    {bodyContent
                        ? <pre style={s.pre}>{bodyContent}</pre>
                        : <p style={s.hint}>Instructions not available.</p>
                    }
                </div>
            )}

            {activeTab === "Install" && (
                <div style={s.box}>
                    <div style={s.boxTitle}>Install This Skill</div>
                    <p style={s.hint}>
                        Install <code>{skill.name}@crestron-ai-skills</code> from the Crestron AI Skills plugin marketplace in your AI tool.
                        It updates through your tool's marketplace updates. To add the marketplace, see the steps for your tool
                        on the <Link to="/" style={{ color: "var(--link)" }}>home page</Link>.
                    </p>
                </div>
            )}
        </div>
    );
}

