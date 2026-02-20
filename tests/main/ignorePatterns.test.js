import { describe, expect, it } from "vitest";
import { shouldIgnoreFile } from "../../src/main/git/gitAnalyzer";
describe("ignore pattern matching", () => {
  const patterns = [
    "**/.*",
    "__tests__/**",
    "**/*.{md,svg,png,jpg,jpeg}",
    "*.pem",
  ];
  it("matches dotfiles with nested paths", () => {
    expect(shouldIgnoreFile("src/.env", patterns)).toBe(true);
    expect(shouldIgnoreFile(".github/workflows/ci.yml", patterns)).toBe(true);
  });
  it("matches nested test folders", () => {
    expect(
      shouldIgnoreFile("packages/ui/__tests__/button.test.ts", patterns)
    ).toBe(true);
  });
  it("matches extension patterns anywhere in repo", () => {
    expect(shouldIgnoreFile("assets/logo.png", patterns)).toBe(true);
    expect(shouldIgnoreFile("certs/local.pem", patterns)).toBe(true);
    expect(shouldIgnoreFile("src/index.ts", patterns)).toBe(false);
  });
});
