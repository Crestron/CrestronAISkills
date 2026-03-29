import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRegistry } from "../utils/registry.js";
import SkillCard from "../components/SkillCard.jsx";
import Logo from "../components/Logo.jsx";

const REPO_URL =
    typeof __REPO_URL__ !== "undefined"
        ? __REPO_URL__
        : "https://github.com/CrestronEng/CrestronAISkills";

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
    btnSecondary: {
        background: "transparent",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "10px 22px",
        fontSize: "0.95rem",
        textDecoration: "none",
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
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1px",
        marginTop: "48px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "var(--border)",
    },
    feature: {
        background: "var(--surface)",
        padding: "24px 20px",
    },
    featureTitle: { fontWeight: 600, marginBottom: "6px", fontSize: "0.9rem" },
    featureDesc: { color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.5 },
    loading: { color: "var(--text-muted)", textAlign: "center", padding: "40px" },
};

const FEATURES = [
    { title: "Search Skills", desc: "Find skills by keyword, tag, or author instantly." },
    { title: "One-Command Install", desc: "Install any skill directly from the Copilot CLI terminal." },
    { title: "Web Marketplace", desc: "Browse and discover skills in your browser." },
    { title: "Publish Your Own", desc: "Share your skills with the team via a simple pull request." },
];

export default function Home() {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);

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
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                    <Logo size={56} color="var(--link)" />
                </div>
                <h1 style={s.heroTitle}>CrestronAISkills</h1>
                <p style={s.heroSub}>
                    An internal marketplace for GitHub Copilot skills. Browse, install, and
                    auto-update skills built for Crestron engineers.
                </p>
                <div style={s.heroBtns}>
                    <Link to="/search" style={s.btnPrimary}>
                        Browse Skills
                    </Link>
                    <a href={`${REPO_URL}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer" style={s.btnSecondary}>
                        Submit a Skill
                    </a>
                </div>
                <div style={s.features}>
                    {FEATURES.map((f) => (
                        <div key={f.title} style={s.feature}>
                            <div style={s.featureTitle}>{f.title}</div>
                            <div style={s.featureDesc}>{f.desc}</div>
                        </div>
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
                    <p style={{ color: "var(--text-muted)" }}>
                        No skills in the registry yet.{" "}
                        <a href={`${REPO_URL}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--link)" }}>
                            Be the first to submit one!
                        </a>
                    </p>
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
