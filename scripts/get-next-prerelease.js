const { execSync } = require("child_process");
const getNextStableVersion = require("./get-next-release");
const { isSemverGreater } = require("./utils/semver");

/**
 * getNextBetaVersion
 * Calculates the next beta version based on the latest beta tag and the commits between two branches.
 * It fetches the latest tags, determines the latest beta version, and calculates the next beta version.
 * It then writes the version to the GITHUB_OUTPUT environment variable if available.
 * @param {string} from
 * @param {string} to
 * @returns {string} - The next beta version
 */
function getNextBetaVersion(from = "origin/rc", to = "HEAD") {
  console.log(`🔍 Calculating prerelease from ${from} to ${to}`);
  execSync("git fetch --tags");

  const tags = execSync("git tag", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  const betaTags = tags.filter((tag) => /^v\d+\.\d+\.\d+-beta\.\d+$/.test(tag));
  const latestBeta = betaTags[betaTags.length - 1];
  let latestBetaBase = "";
  let latestBetaNum = 0;

  if (latestBeta) {
    latestBetaBase = latestBeta.replace(/-beta\.\d+$/, "");
    latestBetaNum = parseInt(latestBeta.split("-beta.")[1], 10);
    console.log(`📦 Latest beta tag: ${latestBeta}`);
  }

  let resultVersionBase = getNextStableVersion(from, to);
  const baseBetas = betaTags
    .filter((tag) => tag.startsWith(`${resultVersionBase}-beta.`))
    .map((tag) => parseInt(tag.split(".").pop(), 10));

  let beta;
  if (latestBetaBase && isSemverGreater(latestBetaBase, resultVersionBase)) {
    beta = latestBetaNum + 1;
    resultVersionBase = latestBetaBase;
    console.log(
      `🔁 Continuing from higher beta base: ${latestBetaBase} (next beta.${beta})`
    );
  } else {
    beta = baseBetas.length ? Math.max(...baseBetas) + 1 : 0;
    console.log(
      `🆕 Starting or continuing beta from: ${resultVersionBase} (next beta.${beta})`
    );
  }

  const nextBeta = `${resultVersionBase}-beta.${beta}`;
  console.log(`🚀 Next beta version: ${nextBeta}`);
  return nextBeta;
}

if (require.main === module) {
  const [, , from, to] = process.argv;
  const version = getNextBetaVersion(from, to);
  console.log(`BETA_VERSION=${version}`);
}

module.exports = getNextBetaVersion;
