const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const updateVersion = require("../update-version");

jest.mock("fs");
jest.mock("child_process");

describe("updateVersion", () => {
  const originalPkg = { version: "1.0.0" };

  beforeEach(() => {
    fs.readFileSync.mockReturnValue(JSON.stringify(originalPkg));
    fs.existsSync.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("throws if version is missing", () => {
    expect(() => updateVersion(undefined, "main")).toThrow(
      "VERSION argument is required"
    );
  });

  test("throws if targetBranch is missing", () => {
    expect(() => updateVersion("1.1.0", undefined)).toThrow(
      "TARGET_BRANCH argument is required"
    );
  });

  test("skips if version is same", () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({ version: "1.1.0" }));
    expect(updateVersion("1.1.0", "main")).toBe("skipped");
    expect(child_process.execSync).not.toHaveBeenCalled();
  });

  test("updates version and pushes", () => {
    const version = "1.1.0";
    const branch = "main";

    const result = updateVersion(version, branch);
    expect(child_process.execSync).toHaveBeenCalledWith(
      `npm version ${version} --no-git-tag-version`,
      expect.anything()
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      "git add package.json",
      expect.anything()
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `git commit -m "bot: bump version to ${version}"`,
      expect.anything()
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      `git push origin HEAD:${branch}`,
      expect.anything()
    );
    expect(result).toBe("updated");
  });
});
