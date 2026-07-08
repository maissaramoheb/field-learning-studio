import { FieldLearningStudioApp } from "@/components/FieldLearningStudioApp";
import { communityBridgesCase } from "@/data/cases/communityBridgesCase";

export default function Home() {
  return (
    <FieldLearningStudioApp
      demoCase={communityBridgesCase}
    />
  );
}
