import React, { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

const s = {
    backdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(16, 24, 40, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 200,
    },
    dialog: {
        background: "#fff",
        borderRadius: "var(--radius)",
        boxShadow: "0 20px 50px rgba(16, 24, 40, 0.25)",
        width: "100%",
        maxWidth: "720px",
        maxHeight: "calc(100vh - 48px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    head: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "18px 24px",
        borderBottom: "1px solid var(--border)",
    },
    title: { fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)" },
    close: {
        background: "transparent",
        border: "none",
        fontSize: "1.5rem",
        lineHeight: 1,
        color: "var(--text-muted)",
        cursor: "pointer",
        padding: "4px 8px",
    },
    body: { padding: "8px 24px 20px", overflowY: "auto", lineHeight: 1.6, fontSize: "0.92rem" },
    sectionTitle: {
        fontSize: "0.75rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--text-muted)",
        margin: "18px 0 6px",
    },
    foot: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        padding: "14px 24px",
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
    },
    btnPrimary: {
        background: "var(--accent)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius)",
        padding: "8px 16px",
        fontSize: "0.88rem",
        fontWeight: 600,
        cursor: "pointer",
    },
    btnSecondary: {
        background: "#fff",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "8px 16px",
        fontSize: "0.88rem",
        cursor: "pointer",
    },
    pre: {
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
        paddingRight: "72px",
        margin: "10px 0",
        overflowX: "auto",
        fontSize: "0.84rem",
    },
    copy: {
        position: "absolute",
        top: "8px",
        right: "8px",
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "2px 10px",
        fontSize: "0.75rem",
        color: "var(--accent)",
        cursor: "pointer",
    },
    inlineCode: {
        background: "var(--tag-bg)",
        borderRadius: "4px",
        padding: "1px 5px",
        fontSize: "0.85em",
    },
    missing: { color: "var(--text-muted)", fontStyle: "italic" },
};

// Plain text of a rendered code element, for the copy buttons.
function textOf(node) {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(textOf).join("");
    return textOf(node.props?.children);
}

function useCopy() {
    const [copied, setCopied] = useState(false);
    const copy = (text) =>
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    return [copied, copy];
}

function CodeBlock({ children }) {
    const [copied, copy] = useCopy();
    const text = textOf(children).replace(/\n$/, "");
    return (
        <pre style={s.pre}>
            <button type="button" style={s.copy} onClick={() => copy(text)} aria-label="Copy command">
                {copied ? "Copied" : "Copy"}
            </button>
            {children}
        </pre>
    );
}

const markdownComponents = {
    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
    code: ({ className, children }) =>
        className ? <code className={className}>{children}</code> : <code style={s.inlineCode}>{children}</code>,
    // README-internal anchors (#...) mean nothing inside the pop-up; show them as text.
    a: ({ href, children }) =>
        href?.startsWith("#") ? (
            <strong>{children}</strong>
        ) : (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--link)" }}>
                {children}
            </a>
        ),
};

function Section({ title, markdown }) {
    return (
        <>
            <div style={s.sectionTitle}>{title}</div>
            {markdown ? (
                <Markdown components={markdownComponents}>{markdown}</Markdown>
            ) : (
                <p style={s.missing}>Instructions not found.</p>
            )}
        </>
    );
}

/**
 * Pop-up with one tool's install and auto-update steps, rendered from Readme.md.
 */
export default function InstallModal({ tool, install, update, onClose }) {
    const closeRef = useRef(null);
    const [copiedAll, copyAll] = useCopy();

    useEffect(() => {
        const previous = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
            previous?.focus?.();
        };
    }, [onClose]);

    const allSteps = [`# ${tool.name}`, "## Install", install, "## Keep skills up to date", update]
        .filter(Boolean)
        .join("\n\n");

    return (
        <div style={s.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div style={s.dialog} role="dialog" aria-modal="true" aria-labelledby="install-modal-title">
                <div style={s.head}>
                    <span id="install-modal-title" style={s.title}>{tool.name}</span>
                    <button ref={closeRef} type="button" style={s.close} onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div style={s.body}>
                    <Section title="Install" markdown={install} />
                    <Section title="Keep skills up to date" markdown={update} />
                </div>
                <div style={s.foot}>
                    <button type="button" style={s.btnSecondary} onClick={onClose}>Close</button>
                    <button type="button" style={s.btnPrimary} onClick={() => copyAll(allSteps)}>
                        {copiedAll ? "Copied" : "Copy all steps"}
                    </button>
                </div>
            </div>
        </div>
    );
}
