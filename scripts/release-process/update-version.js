const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { generateChangelog } = require("./generate-changelog");

/**
 * updateVersion
 * Updates the version in package.json, generates changelog, commits, and tags the release.
 * @param {string} version - The new version to update to.
 * @param {string} base - Base commit/branch (for changelog diff).
 * @param {string} head - Head commit/branch (for changelog diff).
 * @param {boolean} isRelease - Whether this is on the 'release' branch.
 * @returns {string} - The result of the update operation ('updated' or 'skipped').
 */
function updateVersion(version, base, head, isRelease = false) {
  if (!version) {
    throw new Error("❌ VERSION argument is required");
  }

  const pkgPath = path.resolve("package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const currentVersion = `v${pkg.version}`;

  if (currentVersion === version) {
    console.warn(
      `⚠️  Version ${version} is already current. Skipping bump but continuing.`
    );
    return "skipped";
  }

  console.log(`📝 Generating changelog for ${version}...`);
  generateChangelog(version, "CHANGELOG.md", base, head);

  console.log(`🔧 Updating version to ${version}`);
  execSync(`npm version ${version} --no-git-tag-version`, { stdio: "inherit" });

  // Set git config
  execSync(`git config user.name "github-actions[bot]"`);
  execSync(
    `git config user.email "github-actions[bot]@users.noreply.github.com"`
  );

  if (isRelease) {
    console.log(`📦 Committing updated version and changelog...`);
    execSync(`git add CHANGELOG.md package.json`, { stdio: "inherit" });
    execSync(`git commit -m "bump: update version to ${version}"`, {
      stdio: "inherit",
    });
  }

  console.log(`🏷️  Creating Git tag ${version}`);
  execSync(`git tag ${version}`, { stdio: "inherit" });
  execSync(`git push origin ${version}`, { stdio: "inherit" });

  if (isRelease) {
    console.log(`🚀 Pushing commit ${version} to release branch...`);
    execSync("git push origin release", { stdio: "inherit" });
  }

  return "updated";
}

// CLI entry
if (require.main === module) {
  const [, , version, base = "origin/main", head = "HEAD", releaseFlag = "rc"] =
    process.argv;
  const isRelease = releaseFlag === "release";
  updateVersion(version, base, head, isRelease);
}

module.exports = updateVersion;
