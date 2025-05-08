const { execSync } = require("child_process");
jest.mock("child_process");

const { getCommits } = require("../../../release-process/utils/github");

describe("getCommits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return list of parsed commit objects", () => {
    const mockLog = [
      "feat: add feature\nThis adds new feature X\n---END---",
      "fix: bug fix\nResolves issue Y\nMore details here\n---END---",
      "chore: update config\n---END---",
    ].join("\n");

    execSync.mockReturnValue(mockLog);

    const result = getCommits("origin/main", "HEAD");

    expect(execSync).toHaveBeenCalledWith(
      "git log origin/main..HEAD --no-merges --pretty=format:%s%n%b%n---END---",
      { encoding: "utf-8" }
    );

    expect(result).toEqual([
      {
        subject: "feat: add feature",
        body: "This adds new feature X",
      },
      {
        subject: "fix: bug fix",
        body: "Resolves issue Y\nMore details here",
      },
      {
        subject: "chore: update config",
        body: "",
      },
    ]);
  });

  it("should filter out empty subject entries", () => {
    const mockLog = "\n\n---END---\n\n---END---";
    execSync.mockReturnValue(mockLog);

    const result = getCommits("origin/main", "HEAD");
    expect(result).toEqual([]);
  });

  it("should return empty array if no commits", () => {
    execSync.mockReturnValue("");
    const result = getCommits("origin/main", "HEAD");
    expect(result).toEqual([]);
  });
});
