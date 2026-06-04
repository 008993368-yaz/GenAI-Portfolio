import { describe, it, expect } from "vitest";
import { revealCount } from "./streamingReveal";

describe("revealCount", () => {
  it("reveals characters proportional to elapsed time and cps", () => {
    expect(revealCount(1000, 170, 1000)).toBe(170);
  });

  it("never exceeds the available target length", () => {
    expect(revealCount(1000, 170, 5)).toBe(5);
  });

  it("reveals nothing at time zero", () => {
    expect(revealCount(0, 170, 100)).toBe(0);
  });

  it("floors fractional character counts", () => {
    expect(revealCount(100, 170, 1000)).toBe(17);
  });
});
