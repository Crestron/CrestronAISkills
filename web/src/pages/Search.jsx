import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchRegistry, searchSkills, getAllTags } from "../utils/registry.js";
import SkillCard from "../components/SkillCard.jsx";

const s = {
    layout: { display: "flex", maxWidth: "1100px", margin: "0 auto", padding: "32px 24px", gap: "28px" },
    sidebar: { width: "220px", flexShrink: 0 },
    sidebarTitle: { fontWeight: 600, marginBottom: "12px", fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" },
    tagBtn: (active) => ({
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--text-muted)",
        border: "none",
        borderRadius: "4px",
        padding: "5px 8px",
        fontSize: "0.85rem",
        cursor: "pointer",
        textAlign: "left",
        marginBottom: "2px",
    }),
    main: { flex: 1, minWidth: 0 },
    searchBar: {
        width: "100%",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "10px 14px",
        color: "var(--text)",
        fontSize: "1rem",
        marginBottom: "24px",
        outline: "none",
    },
    resultsInfo: { color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "16px" },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "16px",
    },
    empty: { color: "var(--text-muted)", padding: "40px 0", textAlign: "center" },
};

export default function Search() {
    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState(params.get("q") || "");
    const [selectedTags, setSelectedTags] = useState(
        params.get("tags") ? params.get("tags").split(",") : []
    );
    const [allSkills, setAllSkills] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRegistry()
            .then((r) => {
                const skills = r.skills || [];
                setAllSkills(skills);
                setAllTags(getAllTags(skills));
            })
            .finally(() => setLoading(false));
    }, []);

    const results = searchSkills(allSkills, query, selectedTags);

    const toggleTag = (tag) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    useEffect(() => {
        const p = {};
        if (query) p.q = query;
        if (selectedTags.length) p.tags = selectedTags.join(",");
        setParams(p, { replace: true });
    }, [query, selectedTags]);

    return (
        <div style={s.layout}>
            <aside style={s.sidebar}>
                <div style={s.sidebarTitle}>Filter by Tag</div>
                {selectedTags.length > 0 && (
                    <button
                        style={{ ...s.tagBtn(false), color: "var(--link)", marginBottom: "8px" }}
                        onClick={() => setSelectedTags([])}
                    >
                        Clear filters
                    </button>
                )}
                {allTags.map(({ tag, count }) => (
                    <button
                        key={tag}
                        style={s.tagBtn(selectedTags.includes(tag))}
                        onClick={() => toggleTag(tag)}
                    >
                        <span>{tag}</span>
                        <span>{count}</span>
                    </button>
                ))}
            </aside>

            <main style={s.main}>
                <input
                    style={s.searchBar}
                    type="text"
                    placeholder="Search skills by name, tag, or description…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                {loading ? (
                    <div style={s.empty}>Loading…</div>
                ) : (
                    <>
                        <div style={s.resultsInfo}>
                            {results.length} skill{results.length !== 1 ? "s" : ""} found
                            {query && ` for "${query}"`}
                            {selectedTags.length > 0 && ` in [${selectedTags.join(", ")}]`}
                        </div>
                        {results.length > 0 ? (
                            <div style={s.grid}>
                                {results.map((skill) => (
                                    <SkillCard key={skill.name} skill={skill} />
                                ))}
                            </div>
                        ) : (
                            <div style={s.empty}>
                                No skills found. Try a different query or clear the filters.
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
