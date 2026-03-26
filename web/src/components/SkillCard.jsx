import React from "react";
import { Link } from "react-router-dom";

const s = {
    card: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        textDecoration: "none",
        color: "var(--text)",
        transition: "border-color 0.15s",
        cursor: "pointer",
    },
    name: { fontSize: "1.05rem", fontWeight: 600, color: "var(--link)" },
    desc: { fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.5 },
    meta: { fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: "12px" },
    tags: { display: "flex", gap: "6px", flexWrap: "wrap" },
    tag: {
        background: "var(--tag-bg)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "2px 8px",
        fontSize: "0.75rem",
        color: "var(--text-muted)",
    },
};

export default function SkillCard({ skill }) {
    return (
        <Link
            to={`/skills/${skill.name}`}
            style={s.card}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--link)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
            <div style={s.name}>{skill.name}</div>
            <div style={s.desc}>{skill.description}</div>
            <div style={s.tags}>
                {(skill.tags || []).map((tag) => (
                    <span key={tag} style={s.tag}>
                        {tag}
                    </span>
                ))}
            </div>
            <div style={s.meta}>
                <span>v{skill.version}</span>
                <span>by {skill.author}</span>
                {skill.license && <span>{skill.license}</span>}
            </div>
        </Link>
    );
}
