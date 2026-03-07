/**
 * Fix literal \uXXXX escape sequences in WrappedReport.tsx
 * Replaces surrogate pairs (\uD83D\uDCAC) with actual UTF-8 emoji characters.
 */
const fs = require("fs");
const path = require("path");

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : [path.join(__dirname, "..", "frontend", "src", "components", "WrappedReport.tsx")];

for (const filePath of files) {
  fixFile(filePath);
}

function fixFile(filePath) {
const buf = fs.readFileSync(filePath);
let content = buf.toString("utf-8");

// Work at the byte/string level: find sequences of \uXXXX
// In the file, backslash = 0x5C, u = 0x75, then 4 hex chars
// A surrogate pair is \uD800-\uDBFF followed by \uDC00-\uDFFF

let count = 0;
const result = [];
let i = 0;

while (i < content.length) {
  // Check for \uXXXX pattern
  if (content[i] === "\\" && content[i + 1] === "u" &&
      /^[0-9A-Fa-f]{4}$/.test(content.substring(i + 2, i + 6))) {
    const hex1 = content.substring(i + 2, i + 6);
    const code1 = parseInt(hex1, 16);

    // Check if high surrogate followed by another \uXXXX low surrogate
    if (code1 >= 0xD800 && code1 <= 0xDBFF &&
        content[i + 6] === "\\" && content[i + 7] === "u" &&
        /^[0-9A-Fa-f]{4}$/.test(content.substring(i + 8, i + 12))) {
      const hex2 = content.substring(i + 8, i + 12);
      const code2 = parseInt(hex2, 16);
      if (code2 >= 0xDC00 && code2 <= 0xDFFF) {
        // Valid surrogate pair — convert to real character
        const codePoint = ((code1 - 0xD800) * 0x400) + (code2 - 0xDC00) + 0x10000;
        result.push(String.fromCodePoint(codePoint));
        i += 12; // skip \uXXXX\uXXXX
        count++;
        continue;
      }
    }

    // Non-surrogate BMP character (e.g. \uFE0F)
    if (code1 < 0xD800 || code1 > 0xDFFF) {
      result.push(String.fromCharCode(code1));
      i += 6; // skip \uXXXX
      count++;
      continue;
    }
  }

  result.push(content[i]);
  i++;
}

const output = result.join("");
fs.writeFileSync(filePath, output, "utf-8");

// Verify
const verify = fs.readFileSync(filePath, "utf-8");
const idx = verify.indexOf("cp-hero");
const sample = verify.substring(idx, idx + 50);
const match = sample.match(/emoji:\s*"([^"]+)"/);
if (match) {
  const emoji = match[1];
  const cps = [...emoji].map(c => "U+" + c.codePointAt(0).toString(16).toUpperCase());
  console.log(`Replaced ${count} escape sequences`);
  console.log(`First emoji: "${emoji}" codepoints: ${cps.join(", ")}`);
} else {
  console.log(`Replaced ${count} sequences. Could not verify.`);
}

// Check for remaining
const remaining = output.match(/\\u[0-9A-Fa-f]{4}/g);
console.log(`Remaining \\uXXXX sequences: ${remaining ? remaining.length : 0}`);
} // end fixFile
