import React from "react";

/**
 * CrestronAISkills brand mark — a node-network SVG representing connected AI skills.
 * size: px dimension (square). color: CSS color string.
 */
export default function Logo({ size = 28, color = "currentColor" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="CrestronAISkills"
        >
            {/* Central hub */}
            <circle cx="16" cy="16" r="3.5" fill={color} />

            {/* Spokes */}
            <line x1="16" y1="12.5" x2="16" y2="5"   stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="19.5" x2="16" y2="27"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12.5" y1="16" x2="5"  y2="16"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="19.5" y1="16" x2="27" y2="16"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />

            {/* Diagonal spokes */}
            <line x1="13.5" y1="13.5" x2="7.5"  y2="7.5"  stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="18.5" y1="18.5" x2="24.5" y2="24.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="18.5" y1="13.5" x2="24.5" y2="7.5"  stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="13.5" y1="18.5" x2="7.5"  y2="24.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

            {/* Outer nodes — cardinal */}
            <circle cx="16" cy="4"  r="2" fill={color} />
            <circle cx="16" cy="28" r="2" fill={color} />
            <circle cx="4"  cy="16" r="2" fill={color} />
            <circle cx="28" cy="16" r="2" fill={color} />

            {/* Outer nodes — diagonal (smaller) */}
            <circle cx="7"  cy="7"  r="1.5" fill={color} opacity="0.6" />
            <circle cx="25" cy="25" r="1.5" fill={color} opacity="0.6" />
            <circle cx="25" cy="7"  r="1.5" fill={color} opacity="0.6" />
            <circle cx="7"  cy="25" r="1.5" fill={color} opacity="0.6" />
        </svg>
    );
}
