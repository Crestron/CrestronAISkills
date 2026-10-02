import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchRegistry } from "../utils/registry.js";
import SkillCard from "../components/SkillCard.jsx";

const s = {
    hero: {
        textAlign: "center",
        padding: "72px 24px 48px",
        borderBottom: "1px solid var(--border)",
    },
    heroTitle: { fontSize: "2.4rem", fontWeight: 800, marginBottom: "16px" },
    heroSub: { color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: "560px", margin: "0 auto 32px" },
    heroBtns: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" },
    btnPrimary: {
        background: "var(--accent)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius)",
        padding: "10px 22px",
        fontSize: "0.95rem",
        fontWeight: 600,
        textDecoration: "none",
        cursor: "pointer",
    },
    section: { padding: "48px 24px", maxWidth: "1100px", margin: "0 auto" },
    sectionTitle: { fontSize: "1.3rem", fontWeight: 700, marginBottom: "24px" },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "16px",
    },
    features: {
        display: "grid",
        gap: "1px",
        marginTop: "48px",
        border: "1px solid var(--accent)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "rgba(255, 255, 255, 0.25)",
    },
    // Informational (non-clickable) tiles use solid Crestron blue to read differently from link cards.
    feature: {
        background: "var(--accent)",
        padding: "24px 20px",
    },
    featureTitle: { fontWeight: 600, marginBottom: "6px", fontSize: "0.9rem", color: "#fff" },
    featureDesc: { color: "rgba(255, 255, 255, 0.82)", fontSize: "0.88rem", lineHeight: 1.5 },
    sectionSub: { color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, marginTop: "-14px", marginBottom: "24px" },
    toolGrid: { display: "grid", gap: "16px" },
    toolCard: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        textDecoration: "none",
        color: "var(--text)",
        transition: "border-color 0.15s",
    },
    toolName: { fontWeight: 600, fontSize: "1.05rem", color: "var(--link)" },
    toolDesc: { color: "var(--text-muted)", fontSize: "0.86rem", lineHeight: 1.5, flex: 1 },
    toolLink: { color: "var(--link)", fontSize: "0.86rem", fontWeight: 600 },
    loading: { color: "var(--text-muted)", textAlign: "center", padding: "40px" },
};

const FEATURES = [
    { title: "Search Skills", desc: "Find skills by keyword, tag, or author instantly." },
    { title: "One-Command Install", desc: "Install any skill directly from the Copilot CLI terminal." },
    { title: "Web Marketplace", desc: "Browse and discover skills in your browser." },
    { title: "Auto-Updates", desc: "Installed skills stay current with weekly update checks." },
];

const REPO_URL =
    typeof __REPO_URL__ !== "undefined"
        ? __REPO_URL__
        : "https://github.com/Crestron/CrestronAISkills";

// Anchors must match the "Add the Marketplace as a Plugin" headings in Readme.md.
const TOOLS = [
    { name: "Claude Code", desc: "Add the marketplace from the CLI or with /plugin in a session.", anchor: "claude-code-cli" },
    { name: "Claude Desktop", desc: "Add the marketplace from Customize → Plugins in the Claude app.", anchor: "claude-desktop-app" },
    { name: "GitHub Copilot CLI", desc: "Add the marketplace with copilot plugin commands.", anchor: "github-copilot-cli" },
    { name: "VS Code", desc: "Add the marketplace to GitHub Copilot agent plugins in VS Code.", anchor: "github-copilot-in-vs-code" },
];

export default function Home() {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    // HashRouter owns the URL hash, so in-page jumps (e.g. header "Get Started") arrive via router state.
    useEffect(() => {
        const target = location.state?.scrollTo;
        if (target) document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
    }, [location.key]);

    useEffect(() => {
        fetchRegistry()
            .then((r) => setSkills(r.skills || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const featured = skills.slice(0, 6);

    return (
        <div>
            <div style={s.hero}>
                <h1 style={s.heroTitle}>Crestron AI Skills</h1>
                <p style={s.heroSub}>
                    Browse, install, and auto-update AI skills built for Crestron.
                </p>
                <div style={s.heroBtns}>
                    <Link to="/search" style={s.btnPrimary}>
                        Browse Skills
                    </Link>
                </div>
                <div className="feature-grid" style={s.features}>
                    {FEATURES.map((f) => (
                        <div key={f.title} style={s.feature}>
                            <div style={s.featureTitle}>{f.title}</div>
                            <div style={s.featureDesc}>{f.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div id="get-started" style={{ ...s.section, borderBottom: "1px solid var(--border)", scrollMarginTop: "64px" }}>
                <div style={s.sectionTitle}>Get Started</div>
                <p style={s.sectionSub}>
                    Add Crestron AI Skills as a plugin marketplace in your AI tool, then install the{" "}
                    <code>crestron-ai-skills</code> plugin.
                </p>
                <div className="feature-grid" style={s.toolGrid}>
                    {TOOLS.map((t) => (
                        <a
                            key={t.anchor}
                            href={`${REPO_URL}#${t.anchor}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={s.toolCard}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--link)")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                            <span style={s.toolName}>{t.name}</span>
                            <span style={s.toolDesc}>{t.desc}</span>
                            <span style={s.toolLink}>View instructions →</span>
                        </a>
                    ))}
                </div>
            </div>

            <div style={s.section}>
                <div style={s.sectionTitle}>
                    {loading ? "Loading skills…" : `All Skills (${skills.length})`}
                </div>
                {loading ? (
                    <div style={s.loading}>Fetching registry…</div>
                ) : featured.length > 0 ? (
                    <div style={s.grid}>
                        {featured.map((skill) => (
                            <SkillCard key={skill.name} skill={skill} />
                        ))}
                    </div>
                ) : (
                    <p style={{ color: "var(--text-muted)" }}>No skills in the registry yet.</p>
                )}
                {!loading && skills.length > 6 && (
                    <div style={{ marginTop: "24px", textAlign: "center" }}>
                        <Link to="/search" style={{ color: "var(--link)", fontSize: "0.9rem" }}>
                            View all {skills.length} skills →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
