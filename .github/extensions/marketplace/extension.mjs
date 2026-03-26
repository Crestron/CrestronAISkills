import { joinSession } from "@github/copilot-sdk/extension";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REGISTRY_URL =
    process.env.CRESTRON_REGISTRY_URL ||
    "https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/main/registry.json";

const SKILLS_BASE_URL =
    process.env.CRESTRON_SKILLS_BASE_URL ||
    "https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/main/skills";

const EXTENSIONS_DIR = join(homedir(), ".copilot", "instructions");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchRegistry() {
    const res = await fetch(REGISTRY_URL);
    if (!res.ok) throw new Error(`Failed to fetch registry: HTTP ${res.status}`);
    return await res.json();
}

function scoreMatch(skill, query) {
    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    let score = 0;
    for (const term of terms) {
        if (skill.name.toLowerCase().includes(term)) score += 10;
        if (skill.description.toLowerCase().includes(term)) score += 5;
        if (skill.tags?.some((t) => t.toLowerCase().includes(term))) score += 8;
        if (skill.author?.toLowerCase().includes(term)) score += 3;
    }
    return score;
}

function formatSkillSummary(skill) {
    const tags = skill.tags?.join(", ") || "";
    return `**${skill.name}** v${skill.version} by ${skill.author}\n${skill.description}\nTags: ${tags}`;
}

function formatSkillDetail(skill) {
    return [
        `## ${skill.name} v${skill.version}`,
        `**Author:** ${skill.author}`,
        `**License:** ${skill.license || "MIT"}`,
        `**Description:** ${skill.description}`,
        `**Tags:** ${skill.tags?.join(", ") || "none"}`,
        skill.homepage ? `**Homepage:** ${skill.homepage}` : null,
        "",
        `**Install command:** install the ${skill.name} skill from the marketplace`,
    ]
        .filter((l) => l !== null)
        .join("\n");
}

function getInstalledSkills() {
    if (!existsSync(EXTENSIONS_DIR)) return [];
    return readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => {
            const skillName = e.name.replace(/\.md$/, "");
            try {
                const content = readFileSync(join(EXTENSIONS_DIR, e.name), "utf8");
                const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
                let version = "unknown";
                let description = "";
                if (fmMatch) {
                    const vMatch = fmMatch[1].match(/^version:\s*(.+)$/m);
                    const dMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
                    if (vMatch) version = vMatch[1].trim();
                    if (dMatch) description = dMatch[1].trim();
                }
                return { name: skillName, version, description };
            } catch {
                return { name: skillName, version: "unknown", description: "" };
            }
        });
}

async function downloadFile(url, destPath) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
    const text = await res.text();
    writeFileSync(destPath, text, "utf8");
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("CrestronAISkills marketplace extension loaded ✓", {
                ephemeral: true,
            });
        },
    },
    tools: [
        // -----------------------------------------------------------------------
        // search_skills
        // -----------------------------------------------------------------------
        {
            name: "search_skills",
            description:
                "Search the CrestronAISkills marketplace for Copilot skills. " +
                "Use this when the user wants to find, discover, or browse skills. " +
                "Returns a list of matching skills with name, description, and tags.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description:
                            "Search query — keywords, tags, or author name. Leave empty to list all skills.",
                    },
                    tag: {
                        type: "string",
                        description: "Filter by a specific tag (e.g. 'automation', 'crestron')",
                    },
                    limit: {
                        type: "number",
                        description: "Maximum number of results to return (default: 10)",
                        default: 10,
                    },
                },
                required: [],
            },
            handler: async (args) => {
                let registry;
                try {
                    registry = await fetchRegistry();
                } catch (err) {
                    return `❌ Could not reach the registry: ${err.message}`;
                }

                let results = registry.skills || [];

                if (args.tag) {
                    results = results.filter((s) =>
                        s.tags?.some((t) => t.toLowerCase() === args.tag.toLowerCase())
                    );
                }

                if (args.query && args.query.trim()) {
                    results = results
                        .map((s) => ({ skill: s, score: scoreMatch(s, args.query) }))
                        .filter(({ score }) => score > 0)
                        .sort((a, b) => b.score - a.score)
                        .map(({ skill }) => skill);
                }

                const limit = args.limit ?? 10;
                results = results.slice(0, limit);

                if (results.length === 0) {
                    return `No skills found${args.query ? ` matching "${args.query}"` : ""}. Try a different search term or browse all skills with no query.`;
                }

                const lines = [
                    `Found ${results.length} skill(s)${args.query ? ` for "${args.query}"` : ""}:\n`,
                    ...results.map((s, i) => `${i + 1}. ${formatSkillSummary(s)}`),
                    "",
                    `Use "get info for <skill-name>" to see full details, or "install <skill-name>" to install.`,
                ];
                return lines.join("\n");
            },
        },

        // -----------------------------------------------------------------------
        // get_skill_info
        // -----------------------------------------------------------------------
        {
            name: "get_skill_info",
            description:
                "Get detailed information about a specific skill in the CrestronAISkills marketplace, " +
                "including its description, version, tags, author, and instructions.",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "The exact name of the skill (e.g. 'example-skill')",
                    },
                },
                required: ["name"],
            },
            handler: async (args) => {
                let registry;
                try {
                    registry = await fetchRegistry();
                } catch (err) {
                    return `❌ Could not reach the registry: ${err.message}`;
                }

                const skill = (registry.skills || []).find(
                    (s) => s.name.toLowerCase() === args.name.toLowerCase()
                );

                if (!skill) {
                    return `Skill "${args.name}" not found in the registry. Use search_skills to find available skills.`;
                }

                const installed = getInstalledSkills();
                const isInstalled = installed.some((s) => s.name === skill.name);

                return [
                    formatSkillDetail(skill),
                    "",
                    isInstalled
                        ? `✅ This skill is already installed (v${installed.find((s) => s.name === skill.name)?.version}).`
                        : `📦 Not installed. Say "install ${skill.name}" to install it.`,
                ].join("\n");
            },
        },

        // -----------------------------------------------------------------------
        // install_skill
        // -----------------------------------------------------------------------
        {
            name: "install_skill",
            description:
                "Download and install a Copilot skill from the CrestronAISkills marketplace into the local " +
                "instructions directory (~/.copilot/instructions/). " +
                "The skill will be available in your next Copilot session.",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "The exact name of the skill to install (e.g. 'example-skill')",
                    },
                    force: {
                        type: "boolean",
                        description: "Overwrite if already installed (default: false)",
                        default: false,
                    },
                },
                required: ["name"],
            },
            handler: async (args) => {
                let registry;
                try {
                    registry = await fetchRegistry();
                } catch (err) {
                    return `❌ Could not reach the registry: ${err.message}`;
                }

                const skill = (registry.skills || []).find(
                    (s) => s.name.toLowerCase() === args.name.toLowerCase()
                );

                if (!skill) {
                    return `Skill "${args.name}" not found. Use search_skills to browse available skills.`;
                }

                const destFile = join(EXTENSIONS_DIR, `${skill.name}.md`);

                if (existsSync(destFile) && !args.force) {
                    return (
                        `Skill "${skill.name}" is already installed. ` +
                        `Use force: true to reinstall/update, or list_installed_skills to see all installed skills.`
                    );
                }

                try {
                    mkdirSync(EXTENSIONS_DIR, { recursive: true });

                    const baseUrl = `${SKILLS_BASE_URL}/${skill.name}`;
                    await downloadFile(`${baseUrl}/skill.md`, destFile);

                    return [
                        `✅ Installed **${skill.name}** v${skill.version} successfully!`,
                        `📁 Location: ${destFile}`,
                        "",
                        `The skill instructions are now available in your Copilot sessions.`,
                    ].join("\n");
                } catch (err) {
                    return `❌ Installation failed: ${err.message}`;
                }
            },
        },

        // -----------------------------------------------------------------------
        // list_installed_skills
        // -----------------------------------------------------------------------
        {
            name: "list_installed_skills",
            description:
                "List all Copilot skills currently installed from the CrestronAISkills marketplace " +
                "on this machine (located in ~/.copilot/instructions/).",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
            handler: async () => {
                const installed = getInstalledSkills();

                if (installed.length === 0) {
                    return (
                        `No marketplace skills are currently installed.\n` +
                        `Use search_skills to browse available skills, then install_skill to install one.`
                    );
                }

                const lines = [
                    `${installed.length} skill(s) installed:\n`,
                    ...installed.map(
                        (s, i) =>
                            `${i + 1}. **${s.name}** v${s.version}${s.description ? ` — ${s.description}` : ""}`
                    ),
                    "",
                    `Installed at: ${EXTENSIONS_DIR}`,
                ];
                return lines.join("\n");
            },
        },
    ],
});
