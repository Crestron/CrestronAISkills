import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";

const s = {
    header: {
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
    },
    brand: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
        textDecoration: "none",
        color: "var(--accent)",
    },
    divider: { width: "1px", height: "22px", background: "var(--border)" },
    product: { fontWeight: 800, fontSize: "1rem", letterSpacing: "0.01em" },
    nav: { display: "flex", alignItems: "center", gap: "24px" },
    navLink: { color: "var(--text)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 },
};

export default function Header() {
    return (
        <header style={s.header}>
            <Link to="/" style={s.brand}>
                <Logo height={20} />
                <span style={s.divider} />
                <span style={s.product}>AI Skills</span>
            </Link>
            <nav style={s.nav}>
                <Link to="/" state={{ scrollTo: "get-started" }} style={s.navLink}>Get Started</Link>
                <Link to="/search" style={s.navLink}>Browse</Link>
            </nav>
        </header>
    );
}
