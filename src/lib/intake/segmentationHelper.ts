/**
 * Deterministic helper to segment a source narrative into candidate text segments.
 *
 * NOTE: Candidate segments are NOT evidence.
 * The practitioner must explicitly select and edit segments into observation rows.
 */

export interface CandidateSegment {
  id: string;
  text: string;
  type: "paragraph" | "bullet";
  wordCount: number;
}

export type SplitMode = "paragraphs" | "bullets" | "both";

/**
 * Splits narrative text into candidate segments by paragraphs, bullets, or both.
 * Filter out empty or whitespace-only lines.
 */
export function splitNarrativeIntoSegments(
  text: string,
  mode: SplitMode = "both"
): CandidateSegment[] {
  if (!text || !text.trim()) return [];

  const trimmed = text.trim();
  const segments: CandidateSegment[] = [];

  if (mode === "paragraphs") {
    // Split by double newline (or more)
    const paras = trimmed.split(/\n\s*\n+/);
    paras.forEach((p, idx) => {
      const clean = p.trim();
      if (clean) {
        segments.push({
          id: `seg-p-${idx + 1}`,
          text: clean,
          type: "paragraph",
          wordCount: clean.split(/\s+/).filter(Boolean).length,
        });
      }
    });
  } else if (mode === "bullets") {
    // Split by bullet markers: -, *, •, or numbered (1., 1), etc.) at start of line
    const lines = trimmed.split(/\n+/);
    let currentBullet = "";
    let bulletIdx = 1;

    for (const line of lines) {
      const match = line.match(/^\s*(?:[-*•]|\d+[\.)])\s+(.+)$/);
      if (match) {
        if (currentBullet.trim()) {
          segments.push({
            id: `seg-b-${bulletIdx++}`,
            text: currentBullet.trim(),
            type: "bullet",
            wordCount: currentBullet.trim().split(/\s+/).filter(Boolean).length,
          });
        }
        currentBullet = match[1];
      } else if (currentBullet) {
        // Line continuation of bullet
        currentBullet += " " + line.trim();
      }
    }
    if (currentBullet.trim()) {
      segments.push({
        id: `seg-b-${bulletIdx++}`,
        text: currentBullet.trim(),
        type: "bullet",
        wordCount: currentBullet.trim().split(/\s+/).filter(Boolean).length,
      });
    }
  } else {
    // "both": first split by paragraphs. If a paragraph has bullets, expand its bullets!
    const paras = trimmed.split(/\n\s*\n+/);
    let counter = 1;

    for (const p of paras) {
      const cleanPara = p.trim();
      if (!cleanPara) continue;

      // Check if paragraph contains bullet points
      const lines = cleanPara.split(/\n+/);
      const hasBullets = lines.some((l) => /^\s*(?:[-*•]|\d+[\.)])\s+/.test(l));

      if (hasBullets) {
        let currentBullet = "";
        for (const line of lines) {
          const match = line.match(/^\s*(?:[-*•]|\d+[\.)])\s+(.+)$/);
          if (match) {
            if (currentBullet.trim()) {
              segments.push({
                id: `seg-${counter++}`,
                text: currentBullet.trim(),
                type: "bullet",
                wordCount: currentBullet.trim().split(/\s+/).filter(Boolean).length,
              });
            }
            currentBullet = match[1];
          } else if (currentBullet) {
            currentBullet += " " + line.trim();
          } else if (line.trim()) {
            currentBullet = line.trim();
          }
        }
        if (currentBullet.trim()) {
          segments.push({
            id: `seg-${counter++}`,
            text: currentBullet.trim(),
            type: "bullet",
            wordCount: currentBullet.trim().split(/\s+/).filter(Boolean).length,
          });
        }
      } else {
        segments.push({
          id: `seg-${counter++}`,
          text: cleanPara,
          type: "paragraph",
          wordCount: cleanPara.split(/\s+/).filter(Boolean).length,
        });
      }
    }
  }

  return segments;
}
