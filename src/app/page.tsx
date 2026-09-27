import { LandingPage } from "@/components/landing/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Field Learning Studio · From field material to a defensible professional draft",
  description:
    "Evidence synthesis workspace for evaluators, MEL teams, and consultancies. Structure qualitative observations, track unbroken lineage, and generate professional learning briefs.",
};

export default function Home() {
  return <LandingPage />;
}
