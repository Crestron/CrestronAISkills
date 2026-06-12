import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    base: process.env.VITE_BASE_PATH || "/",
    build: {
        outDir: "dist",
    },
    define: {
        __REGISTRY_URL__: JSON.stringify(
            process.env.VITE_REGISTRY_URL || "/registry.json"
        ),
        __REPO_URL__: JSON.stringify(
            process.env.VITE_REPO_URL || "https://github.com/Crestron/CrestronAISkills"
        ),
    },
});
