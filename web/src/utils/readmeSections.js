// Extracts one section of Readme.md by its exact heading text: from the heading
// line up to (not including) the next heading of the same or higher level.
// Shared by the portal's install pop-ups and the CI check that every heading in
// web/src/data/install-sections.json still exists in Readme.md.
export function extractSection(markdown, heading) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let level = 0;
  let start = -1;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) inFence = !inFence;
    if (inFence) continue;
    const m = lines[i].match(/^(#{1,6})\s+(.*?)\s*$/);
    if (!m) continue;
    if (start === -1) {
      if (m[2] === heading) {
        level = m[1].length;
        start = i + 1;
      }
    } else if (m[1].length <= level) {
      return lines.slice(start, i).join("\n").trim();
    }
  }
  return start === -1 ? null : lines.slice(start).join("\n").trim();
}
