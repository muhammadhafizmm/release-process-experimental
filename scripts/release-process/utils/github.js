const { execSync } = require("child_process");

/**
 * getCommits
 * Fetches commit messages (subject + body) between two refs.
 * @param {string} from
 * @param {string} to
 * @returns {{subject: string, body: string}[]}
 */
function getCommits(from, to) {
  const raw = execSync(
    `git log ${from}..${to} --no-merges --pretty=format:%s%n%b%n---END---`,
    { encoding: "utf-8" }
  );

  const commits = raw.split("---END---").map((chunk) => {
    const [subjectLine, ...bodyLines] = chunk.trim().split("\n");
    return {
      subject: subjectLine.trim(),
      body: bodyLines.join("\n").trim(),
    };
  });

  return commits.filter((c) => c.subject);
}

module.exports = { getCommits };
