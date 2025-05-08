const { execSync } = require("child_process");
jest.mock("child_process");

jest.mock("../get-next-release", () => jest.fn(() => "v1.2.0"));
const getNextStableVersion = require("../get-next-release");

const getNextBetaVersion = require("../get-next-prerelease");

describe("getNextBetaVersion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should start new beta if no tag exists", () => {
    execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return;
      if (cmd === "git tag") {
        return "";
      }
    });

    getNextStableVersion.mockReturnValue("v1.0.1");
    const version = getNextBetaVersion("origin/rc", "HEAD");
    expect(version).toBe("v1.0.1-beta.0");
  });

  it("should start new beta from next patch after latest stable if no previous beta exists", () => {
    execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return;
      if (cmd === "git tag") {
        return [
          "v1.0.0",
          "v1.1.0-beta.0",
          "v1.1.0",
          "v1.2.0",
          "v1.3.0-beta.0",
          "v1.3.0",
        ].join("\n");
      }
    });

    getNextStableVersion.mockReturnValue("v1.3.1");
    const version = getNextBetaVersion("origin/rc", "HEAD");
    expect(version).toBe("v1.3.1-beta.0");
  });

  it("should continue from latest higher beta base", () => {
    execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return;
      if (cmd === "git tag") {
        return [
          "v1.2.0-beta.0",
          "v1.2.0",
          "v1.3.0-beta.0",
          "v1.3.0-beta.1",
          "v1.3.0-beta.2",
        ].join("\n");
      }
    });

    getNextStableVersion.mockReturnValue("v1.3.0");
    const version = getNextBetaVersion("origin/rc", "HEAD");
    expect(version).toBe("v1.3.0-beta.3");
  });

  it("should continue old beta because old version is greater than new version", () => {
    execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return;
      if (cmd === "git tag") {
        return ["v1.1.0-beta.0", "v1.1.0-beta.1"].join("\n");
      }
    });

    getNextStableVersion.mockReturnValue("v1.0.1");
    const version = getNextBetaVersion("origin/rc", "HEAD");
    expect(version).toBe("v1.1.0-beta.2");
  });

  it("should start new beta if next stable version greater than current", () => {
    execSync.mockImplementation((cmd) => {
      if (cmd === "git fetch --tags") return;
      if (cmd === "git tag") {
        return ["v1.1.0-beta.0", "v1.1.0-beta.1"].join("\n");
      }
    });

    getNextStableVersion.mockReturnValue("v2.0.0");
    const version = getNextBetaVersion("origin/rc", "HEAD");
    expect(version).toBe("v2.0.0-beta.0");
  });
});
