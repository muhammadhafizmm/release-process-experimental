// generate-changelog.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * getDateWIB - Get the current date in 'YYYY-MM-DD' format for Asia/Jakarta timezone
 * @returns {string} - The current date in 'YYYY-MM-DD' format
 */
function getDateWIB() {
  return new Date()
    .toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-");
}

/**
 * getGitHubRepoUrl - Get the GitHub repository URL from the git remote
 * @returns {string} - The GitHub repository URL
 */
function getGitHubRepoUrl() {
  try {
    const remote = execSync("git remote get-url origin", {
      encoding: "utf-8",
    }).trim();
    const sshMatch = remote.match(/^git@github.com:(.*)\.git$/);
    const httpsMatch = remote.match(/^https:\/\/github.com\/(.*?)(\.git)?$/);
    if (sshMatch) return `https://github.com/${sshMatch[1]}`;
    if (httpsMatch) return `https://github.com/${httpsMatch[1]}`;
  } catch (_) {
    console.warn("⚠️ Unable to parse GitHub repository URL");
  }
  return "";
}

/**
 * classifyCommit - Classify the commit type based on the subject and body
 * @param {string} subjectOrig
 * @param {string} body
 * @returns {object} - An object containing the classified subject and breaking change status
 */
function classifyCommit(subjectOrig, body = "") {
  let subject = subjectOrig.trim();
  const isBreaking =
    subject.includes("!:") || body.includes("BREAKING CHANGE:");

  // Match pattern: [TYPE](scope) message
  const scopedMatch = subject.match(/^\[(\w+)\]\(([^)]+)\)\s*(.+)$/);
  if (scopedMatch) {
    const [, type, scope, text] = scopedMatch;
    subject = `${type.toLowerCase()}(${scope}): ${text}`;
  }

  // Match pattern: [TYPE] message
  const typeMatch = subject.match(/^\[(\w+)\]\s*(.+)$/);
  if (typeMatch) {
    const [, type, text] = typeMatch;
    subject = `${type.toLowerCase()}: ${text}`;
  }

  // change "feature" to "feat"
  if (/^feature(\([^)]*\))?:/.test(subject)) {
    subject = subject.replace(/^feature(\([^)]*\))?:/, "feat$1:");
  }

  return { subject, isBreaking };
}

/**
 * buildMarkdown - Build the markdown content for the changelog
 * @param {string} version
 * @param {string} date
 * @param {string} groups
 * @returns {string} - The formatted markdown content
 */
function buildMarkdown(version, date, groups) {
  const sections = {
    MAJOR: "### 🚨 Breaking Changes",
    FEAT: "### ✨ Feature",
    FIX: "### 🐛 Bug Fix",
    INFRA: "### 🔧 Infra Change",
    OTHER: "### 🗃 Other",
  };

  let out = `## ${version} (${date})\n\n`;
  for (const [key, title] of Object.entries(sections)) {
    if (groups[key]) out += `${title}\n${groups[key]}\n`;
  }
  return out.trim().replace(/\n{3,}/g, "\n\n") + "\n\n";
}

/**
 * formatIndentedLines - Format a list of lines with dynamic nested indentation
 * based on bullet type transitions (*, -, •). This ensures consistent markdown
 * formatting that reflects logical structure depth.
 *
 * @param {string[]} lines - Array of lines (from git commit body)
 * @returns {string} - Formatted multiline string with proper indentation
 */
function formatIndentedLines(lines) {
  const indentStack = [];

  return lines
    .map((line) => {
      // Match leading bullet character (*, -, •)
      const match = line.match(/^\s*([-*•])\s+/);
      const currentBullet = match ? match[1] : null;

      if (currentBullet) {
        const lastBullet = indentStack[indentStack.length - 1];

        if (!indentStack.includes(currentBullet)) {
          // New bullet → deeper nesting
          indentStack.push(currentBullet);
        } else {
          // If bullet exists but is not on top, pop until we reach the same
          while (
            indentStack.length &&
            indentStack[indentStack.length - 1] !== currentBullet
          ) {
            indentStack.pop();
          }
        }
      }

      // Determine indentation level (default to 1 level for non-bullet)
      const indentLevel = indentStack.length || 1;
      const indent = "  ".repeat(indentLevel);

      // Return line with correct indentation
      return currentBullet
        ? `${indent}${line.trim()}`
        : `${indent}- ${line.trim()}`;
    })
    .join("\n");
}

/**
 * generateChangelog - Generate a changelog based on git commit messages
 * Generate a changelog based on git commit messages
 * - if the outputFile is provided, it will be updated
 * - if the file already exists, it will be prepended to the file
 * - and created a new file with the same content but without the header as Changelog_temp.md
 * - if the outputFile is not provided, it will be printed to the console
 * @param {string} version - The version number
 * @param {string} outputFile - The output file path
 * @param {string} from - The starting point for the git log
 * @param {string} to - The ending point for the git log
 */
function generateChangelog(
  version,
  outputFile,
  from = "origin/rc",
  to = "HEAD"
) {
  if (!version) throw new Error("VERSION is required");

  execSync("git fetch origin");
  const REPO_URL = getGitHubRepoUrl();
  const TODAY = getDateWIB();

  const COMMIT_DELIM = "\x1f";
  const FIELD_DELIM = "\x1e";

  const rawLog = execSync(
    `git log ${from}..${to} --no-merges --pretty=format:"%s${FIELD_DELIM}%h${FIELD_DELIM}%b${COMMIT_DELIM}"`,
    { encoding: "utf-8" }
  );
  const log = rawLog
    .split(COMMIT_DELIM)
    .map((line) => line.trim())
    .filter(Boolean);

  const groups = { MAJOR: "", FEAT: "", FIX: "", INFRA: "", OTHER: "" };

  // Process each line of the log
  for (const line of log) {
    const [subjectOrig = "", short = "", ...bodyParts] =
      line.split(FIELD_DELIM);
    if (!subjectOrig || !short) continue;
    const body = bodyParts.join(FIELD_DELIM);
    const { subject, isBreaking } = classifyCommit(subjectOrig, body);

    const mainLine = REPO_URL
      ? `- ${subject} [(${short})](${REPO_URL}/commit/${short})`
      : `- ${subject} (${short})`;

    let footerLines = "";
    const lines = body
      .split(FIELD_DELIM)
      .join("\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => {
        return l && !/^Co-authored-by:/i.test(l) && !/^[-*]{3,}$/.test(l);
      });

    if (lines.length > 0) {
      const formattedLines = formatIndentedLines(lines);
      footerLines = formattedLines
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n");
    }

    const lineText = footerLines ? `${mainLine}\n${footerLines}` : mainLine;

    if (isBreaking) {
      groups.MAJOR += lineText + "\n";
    } else if (/^feat(\([^)]*\))?:/.test(subject)) {
      groups.FEAT += lineText + "\n";
    } else if (/^fix(\([^)]*\))?:/.test(subject)) {
      groups.FIX += lineText + "\n";
    } else if (/^infra(\([^)]*\))?:/.test(subject)) {
      groups.INFRA += lineText + "\n";
    } else {
      groups.OTHER += lineText + "\n";
    }
  }

  // Create a summary of the changes
  const output = buildMarkdown(version, TODAY, groups);
  if (outputFile) {
    const fileExt = path.extname(outputFile); // .md
    const fileName = path.basename(outputFile).toLowerCase();
    const header = "# Changelog\n\n";
    if (fileName === "changelog.md") {
      if (fs.existsSync(outputFile)) {
        const existing = fs
          .readFileSync(outputFile, "utf-8")
          .split("\n")
          .slice(1)
          .join("\n");
        fs.writeFileSync(outputFile, header + output + existing);
      } else {
        fs.writeFileSync(outputFile, header + output);
      }

      // Create a temporary file without the header for GitHub release notes
      const strippedOutput = output
        .split("\n")
        .slice(1)
        .join("\n")
        .replace(/^\s*\n/, "");
      const outputFileName = path.basename(outputFile, fileExt);
      fs.writeFileSync(
        path.join(path.dirname(outputFile), `${outputFileName}_temp${fileExt}`),
        header + strippedOutput
      );
    } else {
      fs.writeFileSync(outputFile, header + output);
    }
    console.log(`✅ ${outputFile} updated`);
  } else {
    console.log(output);
  }
}

if (require.main === module) {
  const [, , version, outputFile, from, to] = process.argv;
  generateChangelog(version, outputFile, from, to);
}

module.exports = {
  generateChangelog,
  classifyCommit,
  getGitHubRepoUrl,
  buildMarkdown,
};
