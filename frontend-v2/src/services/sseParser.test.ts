import { describe, it, expect } from "vitest";
import { createSSEParser } from "./sseParser";

describe("createSSEParser", () => {
  it("parses a single complete record", () => {
    const push = createSSEParser();
    expect(push('data: {"type":"token","text":"hi"}\n\n')).toEqual([
      { type: "token", text: "hi" },
    ]);
  });

  it("reassembles a record split across chunks", () => {
    const push = createSSEParser();
    expect(push('data: {"type":"to')).toEqual([]);
    expect(push('ken","text":"hi"}\n\n')).toEqual([{ type: "token", text: "hi" }]);
  });

  it("parses multiple records in one chunk", () => {
    const push = createSSEParser();
    expect(
      push('data: {"type":"token","text":"a"}\n\ndata: {"type":"done"}\n\n')
    ).toEqual([
      { type: "token", text: "a" },
      { type: "done" },
    ]);
  });

  it("ignores malformed records without throwing", () => {
    const push = createSSEParser();
    expect(push("data: not-json\n\n")).toEqual([]);
  });
});
