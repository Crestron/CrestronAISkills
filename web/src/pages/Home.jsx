import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { extractSection } from "../utils/readmeSections.js";
import InstallModal from "../components/InstallModal.jsx";
import TOOLS from "../data/install-sections.json";
// Bundled at build time, so the pop-ups always match the README and never call GitHub.
import README from "../../../Readme.md?raw";

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
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
    },
    toolName: { fontWeight: 600, fontSize: "1.05rem", color: "var(--link)" },
    toolDesc: { color: "var(--text-muted)", fontSize: "0.86rem", lineHeight: 1.5, flex: 1 },
    toolLink: { color: "var(--link)", fontSize: "0.86rem", fontWeight: 600 },
};

const FEATURES = [
    { title: "Search Skills", desc: "Find skills by keyword, tag, or author instantly." },
    { title: "Install Per Skill", desc: "Every skill is its own plugin — install only the ones you need." },
    { title: "Web Marketplace", desc: "Browse and discover skills in your browser." },
    { title: "Auto-Updates", desc: "Skills stay current through your AI tool's marketplace updates." },
];

export default function Home() {
    const [activeTool, setActiveTool] = useState(null);
    const closeModal = useCallback(() => setActiveTool(null), []);
    const location = useLocation();

    // HashRouter owns the URL hash, so in-page jumps (e.g. header "Get Started") arrive via router state.
    useEffect(() => {
        const target = location.state?.scrollTo;
        if (target) document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
    }, [location.key]);

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

            <div id="get-started" style={{ ...s.section, scrollMarginTop: "64px" }}>
                <div style={s.sectionTitle}>Get Started</div>
                <div className="tool-grid" style={s.toolGrid}>
                    {TOOLS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTool(t)}
                            style={s.toolCard}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--link)")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                            <span style={s.toolName}>{t.name}</span>
                            <span style={s.toolDesc}>{t.desc}</span>
                            <span style={s.toolLink}>View instructions →</span>
                        </button>
                    ))}
                </div>
            </div>
            {activeTool && (
                <InstallModal
                    tool={activeTool}
                    install={extractSection(README, activeTool.install)}
                    update={extractSection(README, activeTool.update)}
                    onClose={closeModal}
                />
            )}

        </div>
    );
}
