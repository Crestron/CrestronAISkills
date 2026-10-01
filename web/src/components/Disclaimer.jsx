import React from "react";

const LICENSE_URL =
    "https://www.crestron.com/Legal/software-license-agreement/Software-Development-Tools-License-Agreement";
const AI_TERMS_URL = "https://www.crestron.com/Legal/AITerms";

const s = {
    text: { color: "var(--text-muted)", fontSize: "0.76rem", lineHeight: 1.6 },
    label: { color: "var(--text)" },
    link: { color: "var(--link)", wordBreak: "break-word" },
};

/**
 * Crestron legal disclaimer for AI Skills, rendered as fine print in the site footer.
 */
export default function Disclaimer({ style }) {
    return (
        <p style={{ ...s.text, ...style }}>
            <strong style={s.label}>Disclaimer:</strong> Crestron AI Skills are licensed under Crestron’s Software Development Tools License
            Agreement available at{" "}
            <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" style={s.link}>
                {LICENSE_URL}
            </a>
            , and are further subject to Crestron’s Artificial Intelligence Terms of Use, available at{" "}
            <a href={AI_TERMS_URL} target="_blank" rel="noopener noreferrer" style={s.link}>
                www.crestron.com/Legal/AITerms
            </a>
            . By enabling, accessing, downloading, installing, activating or otherwise using the
            Crestron AI Skill or any portion thereof, in whole or in part, you agree to be bound both
            on your own behalf and as an authorized representative of any third party for which you
            are using the Crestron AI Skill, to the above license agreement and AI terms.
        </p>
    );
}
