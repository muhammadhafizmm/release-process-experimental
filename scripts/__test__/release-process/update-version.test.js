const fs = require("fs");
const child_process = require("child_process");
const updateVersion = require("../../release-process/update-version");
const {
  generateChangelog,
} = require("../../release-process/generate-changelog");

jest.mock("fs");
jest.mock("child_process");
jest.mock("../../release-process/generate-changelog");

describe("updateVersion", () => {
  const originalPkg = { version: "1.0.0" };

  beforeEach(() => {
    fs.readFileSync.mockReturnValue(JSON.stringify(originalPkg));
    generateChangelog.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("throws if version is missing", () => {
    expect(() => updateVersion(undefined, "origin/main", "HEAD")).toThrow(
      "❌ VERSION argument is required"
    );
  });

  test("skips if version is same", () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({ version: "1.1.0" }));
    const result = updateVersion("v1.1.0", "origin/main", "HEAD");
    expect(result).toBe("skipped");
    expect(generateChangelog).not.toHaveBeenCalled();
    expect(child_process.execSync).not.toHaveBeenCalled();
  });

  test("updates version, generates changelog, and pushes tag (non-release)", () => {
    const version = "v1.1.0";
    const base = "origin/main";
    const head = "HEAD";

    const result = updateVersion(version, base, head, false);

    expect(generateChangelog).toHaveBeenCalledWith(
      version,
      "CHANGELOG.md",
      base,
      head
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `npm version ${version} --no-git-tag-version`,
      expect.any(Object)
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `git config user.name "github-actions[bot]"`
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `git config user.email "github-actions[bot]@users.noreply.github.com"`
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `git tag ${version}`,
      expect.any(Object)
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `git push origin ${version}`,
      expect.any(Object)
    );
    expect(result).toBe("updated");
  });

  test("updates version, commits and pushes to release branch", () => {
    const version = "v1.2.0";
    const base = "origin/main";
    const head = "HEAD";

    const result = updateVersion(version, base, head, true);

    expect(generateChangelog).toHaveBeenCalledWith(
      version,
      "CHANGELOG.md",
      base,
      head
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `git add CHANGELOG.md package.json`,
      expect.any(Object)
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `git commit -m "bump: update version to ${version}"`,
      expect.any(Object)
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `git push origin release`,
      expect.any(Object)
    );
    expect(result).toBe("updated");
  });
});
