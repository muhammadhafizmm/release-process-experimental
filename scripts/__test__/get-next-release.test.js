const { execSync } = require("child_process");
const fs = require("fs");

jest.mock("child_process");
jest.mock("fs");
jest.mock("../utils/semver", () => ({
  bumpVersion: jest.fn(),
  detectSemverType: jest.fn(),
}));
jest.mock("../utils/github", () => ({
  getCommits: jest.fn(),
}));

const { bumpVersion, detectSemverType } = require("../utils/semver");
const { getCommits } = require("../utils/github");
const getNextStableVersion = require("../get-next-release");

describe("getNextStableVersion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return bumped version based on commits and tags", () => {
    execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return "";
      if (cmd === "git tag --sort=-creatordate") {
        return ["v1.2.0", "v1.1.0", "v1.0.0"].join("\n");
      }
    });

    getCommits.mockReturnValue(["feat: something"]);
    detectSemverType.mockReturnValue("minor");
    bumpVersion.mockReturnValue("v1.3.0");

    const version = getNextStableVersion("origin/rc", "HEAD");
    expect(execSync).toHaveBeenCalledWith("git fetch --tags");
    expect(execSync).toHaveBeenCalledWith("git tag --sort=-creatordate", {
      encoding: "utf-8",
    });
    expect(getCommits).toHaveBeenCalledWith("origin/rc", "HEAD");
    expect(detectSemverType).toHaveBeenCalledWith(["feat: something"]);
    expect(bumpVersion).toHaveBeenCalledWith("v1.2.0", "minor");
    expect(version).toBe("v1.3.0");
  });

  it("should default to v1.0.0 if no tags exist", () => {
    execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return "";
      if (cmd === "git tag --sort=-creatordate") return "";
    });

    getCommits.mockReturnValue(["fix: a bug"]);
    detectSemverType.mockReturnValue("patch");
    bumpVersion.mockReturnValue("v1.0.1");

    const version = getNextStableVersion("origin/rc", "HEAD");
    expect(bumpVersion).toHaveBeenCalledWith("v1.0.0", "patch");
    expect(version).toBe("v1.0.1");
  });

  it("should write version to GITHUB_OUTPUT if env set", () => {
    process.env.GITHUB_OUTPUT = "/tmp/fake_output";
    execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return "";
      if (cmd === "git tag --sort=-creatordate") return "v1.2.3";
    });

    getCommits.mockReturnValue(["feat: cool stuff"]);
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
