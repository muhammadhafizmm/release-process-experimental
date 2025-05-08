const { execSync } = require("child_process");
const fs = require("fs");
const { getCommits } = require("./utils/github");
const { bumpVersion, detectSemverType } = require("./utils/semver");
const { classifyCommit } = require("./generate-changelog");

/**
 * getNextStableVersion
 * Calculates the next stable version based on the latest release tag and the commits between two branches.
 * It fetches the latest tags, determines the latest release version, and detects the type of semver bump needed.
 * It then calculates the next version and writes it to the GITHUB_OUTPUT environment variable if available.
 * @param {string} from
 * @param {string} to
 * @returns {string} - The next stable version
 */
function getNextStableVersion(from = "origin/rc", to = "HEAD") {
  console.log(`🔍 Calculating next stable release from ${from} to ${to}`);

  execSync("git fetch --tags");
  const tags = execSync("git tag --sort=-creatordate", { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);

  let latestRelease =
    tags.find((tag) => /^v\d+\.\d+\.\d+$/.test(tag)) || "v1.0.0";
  console.log(`🔖 Latest release tag: ${latestRelease}`);

  const raw = getCommits(from, to);
  const commits = raw.map(({ subject, body }) => classifyCommit(subject, body));
  const semverType = detectSemverType(commits);
  console.log(`🔧 Detected semver bump: ${semverType}`);

  const nextVersion = bumpVersion(latestRelease, semverType);
  console.log(`🚀 Next release version: ${nextVersion}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`);
  }

  return nextVersion;
}

if (require.main === module) {
  const [, , from, to] = process.argv;
  const version = getNextStableVersion(from, to);
  console.log(`VERSION=${version}`);
}

module.exports = getNextStableVersion;
