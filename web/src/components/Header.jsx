import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../utils/github.js";

const REPO_URL =
    typeof __REPO_URL__ !== "undefined"
        ? __REPO_URL__
        : "https://github.com/CrestronEng/CrestronAISkills";

const s = {
    header: {
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: "60px",
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
        gap: "10px",
        textDecoration: "none",
        color: "var(--text)",
        fontWeight: 700,
        fontSize: "1.05rem",
    },
    nav: { display: "flex", alignItems: "center", gap: "20px" },
    navLink: { color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem" },
    btn: {
        background: "var(--accent)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius)",
        padding: "6px 14px",
        fontSize: "0.85rem",
        cursor: "pointer",
        fontWeight: 500,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: "50%",
        verticalAlign: "middle",
        marginRight: 6,
    },
    userBtn: {
        background: "var(--tag-bg)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "5px 12px",
        fontSize: "0.85rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
};

export default function Header({ onLoginClick, onRefreshAuth }) {
    const user = getStoredUser();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        onRefreshAuth?.();
    };

    return (
        <header style={s.header}>
            <Link to="/" style={s.brand}>
                <span>🔧</span>
                <span>CrestronAISkills</span>
            </Link>
            <nav style={s.nav}>
                <Link to="/search" style={s.navLink}>Browse</Link>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" style={s.navLink}>
                    GitHub
                </a>
                {user ? (
                    <>
                        <button style={s.userBtn} onClick={() => navigate("/submit")}>
                            + Submit Skill
                        </button>
                        <button style={{ ...s.userBtn }} onClick={handleLogout} title="Log out">
                            <img src={user.avatar_url} alt={user.login} style={s.avatar} />
                            {user.login}
                        </button>
                    </>
                ) : (
                    <button style={s.btn} onClick={onLoginClick}>
                        Login with GitHub
                    </button>
                )}
            </nav>
        </header>
    );
}
