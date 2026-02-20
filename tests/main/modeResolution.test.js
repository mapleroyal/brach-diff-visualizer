import { describe, expect, it, vi } from "vitest";
import { resolveComparisonRefs } from "../../src/main/git/gitAnalyzer";
describe("mode resolution", () => {
  it("resolves tip-to-tip refs directly", async () => {
    const refs = await resolveComparisonRefs(
      {
        raw: vi.fn(),
      },
      "main",
      "feature/auth",
      "tip-to-tip"
    );
    expect(refs).toEqual({
      leftRef: "main",
      rightRef: "feature/auth",
    });
  });
  it("resolves merge-base refs with git raw merge-base", async () => {
    const raw = vi.fn().mockResolvedValueOnce("abc123\n");
    const refs = await resolveComparisonRefs(
      {
        raw,
      },
      "main",
      "feature/auth",
      "merge-base"
    );
    expect(raw).toHaveBeenCalledWith(["merge-base", "main", "feature/auth"]);
    expect(refs).toEqual({
      leftRef: "abc123",
      rightRef: "feature/auth",
      mergeBase: "abc123",
    });
  });
});
