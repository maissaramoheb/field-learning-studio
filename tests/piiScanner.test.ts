import { describe, it, expect } from "vitest";
import { runSandboxSafetyCheck } from "@/lib/sandboxParser";

describe("v0.8 Baseline: PII / Sensitivity Scanner Characterization", () => {
  it("flags notes containing email addresses", () => {
    expect(runSandboxSafetyCheck("Contact field coordinator at sarah.lead@ngo.org for data.")).toBe(true);
    expect(runSandboxSafetyCheck("Send follow-up to info@unicef-partner.net immediately.")).toBe(true);
  });

  it("flags notes containing standard phone number formats", () => {
    expect(runSandboxSafetyCheck("Call local nurse at +1 555-123-4567 regarding vaccines.")).toBe(true);
    expect(runSandboxSafetyCheck("Emergency hotline (800) 555-0199 was posted.")).toBe(true);
    expect(runSandboxSafetyCheck("Reached supervisor at 555.234.5678 after the visit.")).toBe(true);
  });

  it("flags notes containing exact calendar dates", () => {
    expect(runSandboxSafetyCheck("Session was conducted on 2026-03-15 in District Hall.")).toBe(true);
    expect(runSandboxSafetyCheck("Distribution took place on 03/15/2026 with 40 mothers.")).toBe(true);
    expect(runSandboxSafetyCheck("Incident logged 12-04-2025 during evening shift.")).toBe(true);
  });

  it("flags notes containing child or age indicators", () => {
    expect(runSandboxSafetyCheck("We interviewed a beneficiary named Fatima about the rations.")).toBe(true);
    expect(runSandboxSafetyCheck("A student called Omar reported cold food in the hall.")).toBe(true);
    expect(runSandboxSafetyCheck("Spoke with a young girl age 11 regarding water access.")).toBe(true);
    expect(runSandboxSafetyCheck("A 14 years old student described walking barriers.")).toBe(true);
  });

  it("flags notes containing sensitive protection trigger words", () => {
    expect(runSandboxSafetyCheck("Participants discussed physical abuse in local transit.")).toBe(true);
    expect(runSandboxSafetyCheck("Community focal points reported recurring gender violence.")).toBe(true);
    expect(runSandboxSafetyCheck("The nurse flagged a severe medical condition among three infants.")).toBe(true);
    expect(runSandboxSafetyCheck("Adolescent pregnancy was identified as a major dropout driver.")).toBe(true);
    expect(runSandboxSafetyCheck("Girls reported harassment along the canal path after dusk.")).toBe(true);
    expect(runSandboxSafetyCheck("A verbal assault incident was recorded at the gate.")).toBe(true);
  });

  it("flags notes exceeding the 800-character safety threshold", () => {
    const longText = "Clean observation sentence without any PII indicators. ".repeat(20);
    expect(longText.length).toBeGreaterThan(800);
    expect(runSandboxSafetyCheck(longText)).toBe(true);
  });

  it("returns false for clean, generic field monitoring notes", () => {
    const cleanNote1 = "Field team visited the community center and observed that dialogue sessions were scheduled after school hours with good attendance.";
    const cleanNote2 = "Community members stated that transport subsidies helped increase regular participation in vocational workshops.";
    const cleanNote3 = "Teachers reported that clean drinking water access in dining halls improved daily student retention.";

    expect(runSandboxSafetyCheck(cleanNote1)).toBe(false);
    expect(runSandboxSafetyCheck(cleanNote2)).toBe(false);
    expect(runSandboxSafetyCheck(cleanNote3)).toBe(false);
  });

  it("returns false for empty or falsy inputs", () => {
    expect(runSandboxSafetyCheck("")).toBe(false);
  });
});
