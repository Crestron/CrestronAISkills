import React, { useEffect, useRef } from "react";

const s = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
    },
    modal: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "32px",
        maxWidth: "440px",
        width: "90%",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    title: { fontSize: "1.2rem", fontWeight: 700 },
    desc: { color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 },
    code: {
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "16px",
        fontFamily: "monospace",
        fontSize: "1.5rem",
        textAlign: "center",
        letterSpacing: "0.3em",
        color: "var(--link)",
        userSelect: "all",
    },
    link: {
        display: "block",
        textAlign: "center",
        color: "var(--link)",
        fontSize: "0.95rem",
    },
    status: { color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" },
    cancelBtn: {
        background: "transparent",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "8px 16px",
        cursor: "pointer",
        alignSelf: "center",
        fontSize: "0.85rem",
    },
    error: { color: "#f85149", fontSize: "0.85rem", textAlign: "center" },
};

export default function LoginModal({ deviceData, onCancel, error }) {
    const ref = useRef(null);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onCancel();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onCancel]);

    if (!deviceData && !error) return null;

    return (
        <div style={s.overlay} onClick={(e) => e.target === ref.current && onCancel()} ref={ref}>
            <div style={s.modal}>
                <div style={s.title}>Login with GitHub</div>
                {error ? (
                    <div style={s.error}>⚠️ {error}</div>
                ) : (
                    <>
                        <div style={s.desc}>
                            1. Copy the code below<br />
                            2. Click the link to open GitHub<br />
                            3. Enter the code and authorize
                        </div>
                        <div style={s.code}>{deviceData.user_code}</div>
                        <a
                            href={deviceData.verification_uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={s.link}
                        >
                            {deviceData.verification_uri} ↗
                        </a>
                        <div style={s.status}>⏳ Waiting for authorization…</div>
                    </>
                )}
                <button style={s.cancelBtn} onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </div>
    );
}
