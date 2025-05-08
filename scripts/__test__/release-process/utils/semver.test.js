const {
  bumpVersion,
  parseVersion,
  isSemverGreater,
  detectSemverType,
} = require("../../../release-process/utils/semver");

describe("parseVersion", () => {
  it("should parse version string to array of numbers", () => {
    expect(parseVersion("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("v0.0.1")).toEqual([0, 0, 1]);
  });
});

describe("bumpVersion", () => {
  it("should bump patch version", () => {
    expect(bumpVersion("v1.2.3", "patch")).toBe("v1.2.4");
  });

  it("should bump minor version and reset patch", () => {
    expect(bumpVersion("v1.2.3", "minor")).toBe("v1.3.0");
  });

  it("should bump major version and reset minor and patch", () => {
    expect(bumpVersion("v1.2.3", "major")).toBe("v2.0.0");
  });
});

describe("isSemverGreater", () => {
  it("should return true if first version is greater", () => {
    expect(isSemverGreater("v1.2.4", "v1.2.3")).toBe(true);
    expect(isSemverGreater("v2.0.0", "v1.9.9")).toBe(true);
    expect(isSemverGreater("v1.0.1", "v1.0.0")).toBe(true);
  });

  it("should return false if first version is lower or equal", () => {
    expect(isSemverGreater("v1.2.3", "v1.2.4")).toBe(false);
    expect(isSemverGreater("v1.0.0", "v1.0.0")).toBe(false);
  });
});

describe("detectSemverType", () => {
  it("should detect major version from BREAKING CHANGE", () => {
    expect(
      detectSemverType([
        { subject: "fix: typo", isBreaking: false },
        { subject: "chore: change internal", isBreaking: true },
      ])
    ).toBe("major");
  });

  it("should detect major version from '!:'", () => {
    expect(
      detectSemverType([
        { subject: "feat!: overhaul structure", isBreaking: true },
      ])
    ).toBe("major");
  });

  it("should detect minor version from feat:", () => {
    expect(
      detectSemverType([{ subject: "feat: new button", isBreaking: false }])
    ).toBe("minor");
  });

  it("should detect patch version from fix:", () => {
    expect(
      detectSemverType([
        { subject: "fix: button alignment", isBreaking: false },
      ])
    ).toBe("patch");
  });

  it("should default to patch for unknown commit messages", () => {
    expect(
      detectSemverType([{ subject: "docs: update README", isBreaking: false }])
    ).toBe("patch");
  });
});
