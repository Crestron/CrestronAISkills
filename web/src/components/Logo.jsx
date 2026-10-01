import React from "react";
import crestronLogo from "../assets/crestron-logo.png";

/**
 * Crestron brand logo (swirl + wordmark).
 * height: px height; width scales to preserve aspect ratio.
 */
export default function Logo({ height = 20 }) {
    return (
        <img
            src={crestronLogo}
            alt="Crestron"
            style={{ height, width: "auto", display: "block" }}
        />
    );
}
