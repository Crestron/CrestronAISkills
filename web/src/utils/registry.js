/**
 * Registry data access utilities.
 * REGISTRY_URL is injected by Vite at build time via define config.
 */

const REGISTRY_URL =
    typeof __REGISTRY_URL__ !== "undefined"
        ? __REGISTRY_URL__
        : "/registry.json";

let registryCache = null;

export async function fetchRegistry() {
    if (registryCache) return registryCache;
    const res = await fetch(REGISTRY_URL);
    if (!res.ok) throw new Error(`Failed to fetch registry: HTTP ${res.status}`);
    registryCache = await res.json();
    return registryCache;
}

export function searchSkills(skills, query, selectedTags) {
    let results = [...skills];

    if (selectedTags && selectedTags.length > 0) {
        results = results.filter((s) =>
            selectedTags.every((tag) => s.tags?.includes(tag))
        );
    }

    if (query && query.trim()) {
        const q = query.toLowerCase().trim();
        const terms = q.split(/\s+/);
        results = results
            .map((s) => {
                let score = 0;
                for (const term of terms) {
                    if (s.name.toLowerCase().includes(term)) score += 10;
                    if (s.description?.toLowerCase().includes(term)) score += 5;
                    if (s.tags?.some((t) => t.toLowerCase().includes(term))) score += 8;
                    if (s.author?.toLowerCase().includes(term)) score += 3;
                }
                return { skill: s, score };
            })
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ skill }) => skill);
    }

    return results;
}

export function getAllTags(skills) {
    const tagCounts = {};
    for (const skill of skills) {
        for (const tag of skill.tags || []) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
    }
    return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count }));
}
