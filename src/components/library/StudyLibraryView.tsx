"use client";

import React, { useEffect, useState } from "react";
import type { DemoCase, StudyMeta } from "@/lib/types";
import { demoCases } from "@/data/cases";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { DemoStudyCard } from "./DemoStudyCard";
import { StudyCard } from "./StudyCard";
import { EmptyStudyState } from "./EmptyStudyState";
import { getStudyStats, type StudyStats } from "@/lib/storage/studyStore";

interface StudyLibraryViewProps {
  studies: StudyMeta[];
  onSelectStudy: (studyId: string) => void;
  onCreateNewStudy: () => void;
  onCloneDemoStudy: (demoCaseId: string) => Promise<void>;
  onOpenBackupRestore: () => void;
}

export function StudyLibraryView({
  studies,
  onSelectStudy,
  onCreateNewStudy,
  onCloneDemoStudy,
  onOpenBackupRestore,
}: StudyLibraryViewProps) {
  const [studyStatsMap, setStudyStatsMap] = useState<Record<string, StudyStats>>({});

  const editableStudies = React.useMemo(() => studies.filter((s) => !s.isDemoCase), [studies]);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      const statsMap: Record<string, StudyStats> = {};
      for (const study of editableStudies) {
        try {
          const stats = await getStudyStats(study.id);
          statsMap[study.id] = stats;
        } catch {
          // Fall back gracefully if stats query fails
        }
      }
      if (isMounted) {
        setStudyStatsMap(statsMap);
      }
    }
    if (editableStudies.length > 0) {
      loadStats();
    }
    return () => {
      isMounted = false;
    };
  }, [editableStudies]);

  return (
    <main className="fls-dark-workbench min-h-screen text-[var(--foreground)]">
      <div className="fls-frame">
        <div className="fls-library-view" id="study-library-view">
          {/* Masthead Header with Brand & Utilities */}
          <header className="fls-library-masthead">
            <div>
              <h1 className="fls-library-masthead-title">
                Field Learning <strong>Studio</strong>
              </h1>
              <p className="fls-library-masthead-subtitle">
                Your studies and showcase cases. Structure qualitative observations, track
                unbroken evidentiary lineage, and formulate defensible recommendations.
              </p>
            </div>

            <div className="fls-app-utilities">
              <ThemeSwitcher />
              <button
                type="button"
                className="fls-button fls-button-quiet"
                onClick={onOpenBackupRestore}
              >
                Backup / Restore
              </button>
              <button
                type="button"
                className="fls-button fls-button-primary"
                onClick={onCreateNewStudy}
              >
                + New Study
              </button>
            </div>
          </header>

          {/* SECTION 1: SHOWCASE STUDIES */}
          <section className="fls-library-section" aria-labelledby="showcase-studies-heading">
            <div className="fls-library-section-header">
              <div>
                <h2 id="showcase-studies-heading" className="fls-library-section-title">
                  Showcase Studies
                </h2>
                <p className="text-xs text-[var(--muted-soft)] mt-0.5">
                  Curated reference datasets demonstrating complete methodological lineage from field observations to policy draft.
                </p>
              </div>
            </div>

            <div className="fls-library-grid">
              {demoCases.map((demoCase: DemoCase) => (
                <DemoStudyCard
                  key={demoCase.id}
                  demoCase={demoCase}
                  onOpen={onSelectStudy}
                  onClone={onCloneDemoStudy}
                />
              ))}
            </div>
          </section>

          {/* SECTION 2: MY STUDIES */}
          <section className="fls-library-section" aria-labelledby="my-studies-heading">
            <div className="fls-library-section-header">
              <div>
                <h2 id="my-studies-heading" className="fls-library-section-title">
                  My Studies
                </h2>
                <p className="text-xs text-[var(--muted-soft)] mt-0.5">
                  Local editable field studies stored in your browser workspace.
                </p>
              </div>
              {editableStudies.length > 0 && (
                <button
                  type="button"
                  className="fls-button fls-button-quiet text-xs"
                  onClick={onCreateNewStudy}
                >
                  + New Study
                </button>
              )}
            </div>

            {editableStudies.length > 0 ? (
              <div className="fls-library-grid">
                {editableStudies.map((study) => (
                  <StudyCard
                    key={study.id}
                    study={study}
                    stats={studyStatsMap[study.id]}
                    onOpen={onSelectStudy}
                  />
                ))}
              </div>
            ) : (
              <EmptyStudyState onCreateStudy={onCreateNewStudy} />
            )}
          </section>

          {/* SECTION 3: FUTURE CAPABILITY (RESERVED) */}
          <section className="mt-8 pt-6 border-t border-[var(--border)]" aria-labelledby="future-capability-heading">
            <div className="fls-reserve-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-[var(--foreground)]">
                  Import Existing Study / Archive
                </span>
                <span className="fls-tag-primary text-[10px] opacity-75">
                  Phase 2 · Future Capability
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed m-0">
                Intake and automated schema mapping for external evaluation archives, multi-file ZIP bundles, and cross-team studies will be enabled in Phase 2.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
