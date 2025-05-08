const {
  classifyCommit,
  buildMarkdown,
} = require("../../release-process/generate-changelog");

describe("classifyCommit", () => {
  it("detects breaking change by '!:'", () => {
    const result = classifyCommit("feat!: add something", "");
    expect(result.isBreaking).toBe(true);
    expect(result.subject).toBe("feat!: add something");
  });

  it("detects breaking change by 'BREAKING CHANGE:' in body", () => {
    const result = classifyCommit(
      "feat: something",
      "BREAKING CHANGE: affects everything"
    );
    expect(result.isBreaking).toBe(true);
  });

  it("normalizes [FEATURE] to feat:", () => {
    const result = classifyCommit("[FEATURE] Add search", "");
    expect(result.subject).toBe("feat: Add search");
  });

  it("normalizes [FIX] to fix:", () => {
    const result = classifyCommit("[FIX] Fix error", "");
    expect(result.subject).toBe("fix: Fix error");
  });

  it("normalizes [INFRA] to infra:", () => {
    const result = classifyCommit("[INFRA] Update CI", "");
    expect(result.subject).toBe("infra: Update CI");
  });
});

describe("buildMarkdown", () => {
  it("builds markdown from grouped sections", () => {
    const version = "v1.2.3";
    const date = "2025-05-07";
    const groups = {
      MAJOR: "- breaking",
      FEAT: "- feat",
      FIX: "",
      INFRA: "",
      OTHER: "- misc",
    };
    const output = buildMarkdown(version, date, groups);
    expect(output).toContain("## v1.2.3 (2025-05-07)");
    expect(output).toContain("### 🚨 Breaking Changes\n- breaking");
    expect(output).toContain("### ✨ Feature\n- feat");
    expect(output).toContain("### 🗃 Other\n- misc");
  });
});
