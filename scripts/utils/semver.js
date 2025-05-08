/**
 * parseVersion
 * Parses a semantic version string into an array of numbers.
 * @param {string} v
 * @returns {number[]} - The parsed version as an array of numbers
 */
function parseVersion(v) {
  return v.replace(/^v/, "").split(".").map(Number);
}

/**
 * Bumps the version based on the type of change.
 * @param {string} current
 * @param {string} type
 * @returns {string} - The new version
 */
function bumpVersion(current, type) {
  const [major, minor, patch] = parseVersion(current);
  if (type === "major") return `v${major + 1}.0.0`;
  if (type === "minor") return `v${major}.${minor + 1}.0`;
  return `v${major}.${minor}.${patch + 1}`;
}

/**
 * detectSemverType
 * Decides bump level based on transformed commits.
 * @param {{subject: string, isBreaking: boolean}[]} commits
 * @returns {"major"|"minor"|"patch"}
 */
function detectSemverType(commits) {
  if (commits.some((c) => c.isBreaking)) return "major";
  if (commits.some((c) => /^feat(\([^)]*\))?:/i.test(c.subject)))
    return "minor";
  if (commits.some((c) => /^fix(\([^)]*\))?:/i.test(c.subject))) return "patch";
  return "patch";
}

/**
 * isSemverGreater
 * Compares two semantic versions.
 * @param {number} a
 * @param {number} b
 * @returns {boolean} - True if a > b
 */
function isSemverGreater(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return false;
}

module.exports = {
  bumpVersion,
  parseVersion,
  isSemverGreater,
  detectSemverType,
};
