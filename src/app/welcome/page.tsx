import { LandingPage } from "@/components/landing/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Field Learning Studio · From field material to a defensible draft",
  description:
    "Evidence synthesis workspace for evaluators, MEL teams, and consultancies. Structure qualitative observations, track lineage, and generate professional learning briefs.",
};

export default function WelcomePage() {
  return <LandingPage />;
}
