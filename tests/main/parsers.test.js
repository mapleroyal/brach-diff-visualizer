import { describe, expect, it } from "vitest";
import { parseNameStatus, parseNumstat } from "../../src/main/git/parsers";
describe("parsers", () => {
  it("parses name-status output including rename rows", () => {
    const output = [
      "M	src/App.tsx",
      "A	README.md",
      "R100	src/old.ts	src/new.ts",
    ].join("\n");
    const parsed = parseNameStatus(output);
    expect(parsed).toEqual([
      { path: "src/App.tsx", statusCode: "M", previousPath: void 0 },
      { path: "README.md", statusCode: "A", previousPath: void 0 },
      { path: "src/new.ts", statusCode: "R", previousPath: "src/old.ts" },
    ]);
  });
  it("parses numstat output including binary rows", () => {
    const output = ["15	3	src/App.tsx", "-	-	assets/icon.png"].join("\n");
    const parsed = parseNumstat(output);
    expect(parsed).toEqual([
      {
        path: "src/App.tsx",
        added: 15,
        removed: 3,
        binary: false,
        previousPath: void 0,
      },
      {
        path: "assets/icon.png",
        added: 0,
        removed: 0,
        binary: true,
        previousPath: void 0,
      },
    ]);
  });
});
