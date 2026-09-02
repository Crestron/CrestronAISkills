// Shared frontmatter parsing for validate-skill.js and scan-skill-security.js —
// kept in one place so the two scripts can never drift on what counts as
// well-formed frontmatter (the exact problem found in the registry builder,
// which re-implements its own third, independent parser).
const yaml = require("js-yaml");

// Splits `---\n<yaml>\n---\n<body>` and parses the yaml block with a real parser
// instead of hand-rolled regex, so nested arrays/objects (scope-allow, metadata.*)
// parse correctly. Returns {fm, body, malformed} — malformed flags a stray closing
// delimiter or invalid YAML rather than throwing, so callers can report it as a
// normal validation error.
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { fm: null, body: null, malformed: "missing or unterminated frontmatter block" };

  const body = content.slice(match[0].length);
  if (/^\s*---\s*(\r?\n|$)/.test(body)) {
    return { fm: null, body: null, malformed: "duplicate frontmatter-closing '---' — remove the extra delimiter" };
  }

  try {
    const fm = yaml.load(match[1]);
    if (fm === null || typeof fm !== "object" || Array.isArray(fm)) {
      return { fm: null, body: null, malformed: "frontmatter did not parse to a YAML mapping" };
    }
    return { fm, body, malformed: null };
  } catch (e) {
    return { fm: null, body: null, malformed: `invalid YAML — ${e.message}` };
  }
}

const path = require("path");
const fs = require("fs");

const SCRIPT_EXTENSIONS = [".ps1", ".sh", ".py", ".js"];

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

function hasBundledScripts(dir) {
  return listFilesRecursive(dir).some((f) => SCRIPT_EXTENSIONS.includes(path.extname(f)));
}

module.exports = { parseFrontmatter, listFilesRecursive, hasBundledScripts, SCRIPT_EXTENSIONS };
