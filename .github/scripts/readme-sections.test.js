const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

// The portal's Get Started pop-ups render Readme.md sections by heading
// (web/src/data/install-sections.json). Renaming a heading in the README would
// silently show "Instructions not found" on the portal — fail here instead.
const root = path.join(__dirname, "..", "..");
const tools = JSON.parse(fs.readFileSync(path.join(root, "web/src/data/install-sections.json"), "utf8"));
const readme = fs.readFileSync(path.join(root, "Readme.md"), "utf8");

test("every portal install/update heading exists in Readme.md with content", async () => {
  const { extractSection } = await import(pathToFileURL(path.join(root, "web/src/utils/readmeSections.js")).href);
  for (const tool of tools) {
    for (const key of ["install", "update"]) {
      const section = extractSection(readme, tool[key]);
      assert.ok(section, `${tool.name}: heading "${tool[key]}" not found in Readme.md`);
      assert.ok(section.length > 20, `${tool.name}: section "${tool[key]}" is empty`);
    }
  }
});

test("extractSection stops at the next heading of the same or higher level", async () => {
  const { extractSection } = await import(pathToFileURL(path.join(root, "web/src/utils/readmeSections.js")).href);
  const md = "## A\nintro\n### B\nb text\n```\n# not a heading\n```\n#### B1\nnested\n### C\nc text\n";
  assert.equal(extractSection(md, "B"), "b text\n```\n# not a heading\n```\n#### B1\nnested");
  assert.equal(extractSection(md, "C"), "c text");
  assert.equal(extractSection(md, "Missing"), null);
});
