import { FieldLearningStudioApp } from "@/components/FieldLearningStudioApp";
import { communityBridgesCase } from "@/data/cases/communityBridgesCase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace · Field Learning Studio",
  description: "Active inquiry workspace for field material, evidence synthesis, and defensible reporting.",
};

export default function StudioPage() {
  return (
    <FieldLearningStudioApp
      demoCase={communityBridgesCase}
    />
  );
}
