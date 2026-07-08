import { FieldLearningStudioApp } from "@/components/FieldLearningStudioApp";
import { demoCase } from "@/data/demoCase";
import { generateLearningBriefMarkdown } from "@/lib/generateBrief";
import { generateQAReview } from "@/lib/qa";

export default function Home() {
  const qaItems = generateQAReview(demoCase);
  const learningBriefMarkdown = generateLearningBriefMarkdown(demoCase);

  return (
    <FieldLearningStudioApp
      demoCase={demoCase}
      learningBriefMarkdown={learningBriefMarkdown}
      qaItems={qaItems}
    />
  );
}
