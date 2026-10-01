import React from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import Header from "./components/Header.jsx";
import Disclaimer from "./components/Disclaimer.jsx";
import Logo from "./components/Logo.jsx";
import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import SkillDetail from "./pages/SkillDetail.jsx";

const s = {
    app: { display: "flex", flexDirection: "column", minHeight: "100vh" },
    main: { flex: 1 },
    footer: {
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "36px 24px 28px",
        color: "var(--text-muted)",
        fontSize: "0.82rem",
        marginTop: "48px",
    },
    footerInner: { maxWidth: "1100px", margin: "0 auto" },
    footerTop: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        paddingBottom: "20px",
        borderBottom: "1px solid var(--border)",
        marginBottom: "20px",
    },
    footerLinks: { display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" },
    footerLink: { color: "var(--text)", textDecoration: "none", fontSize: "0.85rem" },
    copyright: { marginTop: "16px", fontSize: "0.78rem" },
};

const LEGAL_LINKS = [
    {
        label: "Software Development Tools License Agreement",
        href: "https://www.crestron.com/Legal/software-license-agreement/Software-Development-Tools-License-Agreement",
    },
    { label: "AI Terms of Use", href: "https://www.crestron.com/Legal/AITerms" },
];

const REPO_URL =
    typeof __REPO_URL__ !== "undefined"
        ? __REPO_URL__
        : "https://github.com/Crestron/CrestronAISkills";

export default function App() {
    return (
        <HashRouter>
            <div style={s.app}>
                <Header />
                <main style={s.main}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/search" element={<Search />} />
                        <Route path="/skills/:name" element={<SkillDetail />} />
                    </Routes>
                </main>
                <footer style={s.footer}>
                    <div style={s.footerInner}>
                        <div style={s.footerTop}>
                            <Logo height={18} />
                            <nav style={s.footerLinks}>
                                <Link to="/search" style={s.footerLink}>Browse Skills</Link>
                                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" style={s.footerLink}>GitHub</a>
                                {LEGAL_LINKS.map((l) => (
                                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={s.footerLink}>
                                        {l.label}
                                    </a>
                                ))}
                            </nav>
                        </div>
                        <Disclaimer />
                        <div style={s.copyright}>
                            © {new Date().getFullYear()} Crestron Electronics, Inc. All rights reserved.
                        </div>
                    </div>
                </footer>
            </div>
        </HashRouter>
    );
}
