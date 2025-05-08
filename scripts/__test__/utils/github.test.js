const { execSync } = require("child_process");
jest.mock("child_process");

const { getCommits } = require("../../utils/github");
describe("getCommits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return list of commit messages", () => {
    const mockLog = "feat: add feature\nfix: bug fix\nchore: update config";
    execSync.mockReturnValue(mockLog);

    const result = getCommits("origin/main", "HEAD");
    expect(execSync).toHaveBeenCalledWith(
      "git log origin/main..HEAD --no-merges --pretty=format:%s",
      { encoding: "utf-8" }
    );
    expect(result).toEqual([
      "feat: add feature",
      "fix: bug fix",
      "chore: update config",
    ]);
  });

  it("should return empty array if no commits", () => {
    execSync.mockReturnValue("");
    const result = getCommits("origin/main", "HEAD");
    expect(result).toEqual([]);
  });
});
