const fs = require("fs");
const child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");
jest.mock("../../release-process/utils/semver", () => ({
  bumpVersion: jest.fn(),
  detectSemverType: jest.fn(),
}));
jest.mock("../../release-process/utils/github", () => ({
  getCommits: jest.fn(),
}));
jest.mock("../../release-process/generate-changelog", () => ({
  classifyCommit: jest.fn((subject, body) => ({ subject, isBreaking: false })),
}));

const {
  bumpVersion,
  detectSemverType,
} = require("../../release-process/utils/semver");
const { getCommits } = require("../../release-process/utils/github");
const { classifyCommit } = require("../../release-process/generate-changelog");

const getNextStableVersion = require("../../release-process/get-next-release");

describe("getNextStableVersion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return bumped version based on commits and tags", () => {
    child_process.execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return "";
      if (cmd === "git tag --sort=-creatordate") {
        return ["v1.2.0", "v1.1.0", "v1.0.0"].join("\n");
      }
    });

    getCommits.mockReturnValue([{ subject: "feat: something", body: "" }]);

    classifyCommit.mockReturnValue({
      subject: "feat: something",
      isBreaking: false,
    });
    detectSemverType.mockReturnValue("minor");
    bumpVersion.mockReturnValue("v1.3.0");

    const version = getNextStableVersion("origin/rc", "HEAD");

    expect(child_process.execSync).toHaveBeenCalledWith("git fetch --tags");
    expect(child_process.execSync).toHaveBeenCalledWith(
      "git tag --sort=-creatordate",
      {
        encoding: "utf-8",
      }
    );
    expect(getCommits).toHaveBeenCalledWith("origin/rc", "HEAD");
    expect(classifyCommit).toHaveBeenCalledWith("feat: something", "");
    expect(detectSemverType).toHaveBeenCalledWith([
      { subject: "feat: something", isBreaking: false },
    ]);
    expect(bumpVersion).toHaveBeenCalledWith("v1.2.0", "minor");
    expect(version).toBe("v1.3.0");
  });

  it("should default to v1.0.0 if no tags exist", () => {
    child_process.execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return "";
      if (cmd === "git tag --sort=-creatordate") return "";
    });

    getCommits.mockReturnValue([{ subject: "fix: bug", body: "" }]);
    classifyCommit.mockReturnValue({ subject: "fix: bug", isBreaking: false });
    detectSemverType.mockReturnValue("patch");
    bumpVersion.mockReturnValue("v1.0.1");

    const version = getNextStableVersion("origin/rc", "HEAD");

    expect(bumpVersion).toHaveBeenCalledWith("v1.0.0", "patch");
    expect(version).toBe("v1.0.1");
  });

  it("should write version to GITHUB_OUTPUT if env set", () => {
    process.env.GITHUB_OUTPUT = "/tmp/fake_output";

    child_process.execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return "";
      if (cmd === "git tag --sort=-creatordate") return "v1.2.3";
    });

    getCommits.mockReturnValue([{ subject: "feat: add", body: "desc" }]);
    classifyCommit.mockReturnValue({ subject: "feat: add", isBreaking: false });
    detectSemverType.mockReturnValue("minor");
    bumpVersion.mockReturnValue("v1.3.0");

    const version = getNextStableVersion("origin/main", "HEAD");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      "/tmp/fake_output",
      "version=v1.3.0\n"
    );
    expect(version).toBe("v1.3.0");

    delete process.env.GITHUB_OUTPUT;
  });
});
