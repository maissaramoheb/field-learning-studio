import { describe, it, expect } from "vitest";
import {
  getNextHumanReadableId,
  getNextSourceId,
  getNextEvidenceId,
  getNextFindingId,
} from "@/lib/idGenerator";

describe("Safe Human-Readable ID Generation", () => {
  it("defaults to 001 when list is empty", () => {
    expect(getNextSourceId([])).toBe("SRC-001");
    expect(getNextEvidenceId([])).toBe("EV-001");
    expect(getNextFindingId([])).toBe("FND-001");
  });

  it("increments sequential IDs correctly", () => {
    expect(getNextSourceId(["SRC-001", "SRC-002"])).toBe("SRC-003");
    expect(getNextEvidenceId(["EV-001", "EV-002", "EV-003"])).toBe("EV-004");
  });

  it("handles gaps safely by choosing highest number + 1", () => {
    expect(getNextSourceId(["SRC-001", "SRC-005", "SRC-002"])).toBe("SRC-006");
  });

  it("handles unordered lists safely", () => {
    expect(getNextSourceId(["SRC-010", "SRC-002", "SRC-007"])).toBe("SRC-011");
  });

  it("ignores sandbox and draft IDs without corrupting the sequence", () => {
    expect(getNextSourceId(["SRC-SBX-001", "SRC-TEMP-002", "invalid-id"])).toBe("SRC-001");
    expect(getNextEvidenceId(["EV-001", "EV-SBX-001", "EV-TEMP"])).toBe("EV-002");
  });

  it("naturally expands beyond 999 without truncation", () => {
    expect(getNextSourceId(["SRC-999"])).toBe("SRC-1000");
    expect(getNextSourceId(["SRC-1050"])).toBe("SRC-1051");
  });

  it("preserves custom padding when requested", () => {
    expect(getNextHumanReadableId("DOC-", ["DOC-01"], 2)).toBe("DOC-02");
  });
});
