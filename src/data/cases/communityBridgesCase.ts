import type { DemoCase } from "@/lib/types";
import { DEMO_AUDIT } from "@/lib/storage/normalization";

export const communityBridgesCase: DemoCase = {
  id: "community-bridges",
  project: "Community Bridges Initiative",
  subtitle: "Youth and Women's Participation in Local Peacebuilding",
  status: "Fictional demo case",
  safetyNote: "This workspace uses fictional data only and remains local to the demo app.",
  phaseStatus: "Phase 1 fictional demo case",
  futurePhase: "Future phases may introduce outcome-level integration and additional districts.",
  context:
    "A fictional community engagement and social cohesion initiative across several districts focused on youth participation, women's safe access, community centers, training, partner coordination, and local stakeholder engagement.",
  evidenceBase: {
    sourceRecords: 12,
    evidenceEntries: 20,
    findings: 8,
    lessonsLearned: 7,
    goodPractices: 4,
    recommendations: 10,
  },
  executiveSummary:
    "The Community Bridges Initiative shows credible evidence that community centers, practical participation opportunities, and trusted facilitation can improve youth and women's engagement in local peacebuilding. The strongest learning is that participation improved when access barriers were addressed, roles were clear, and activities produced visible community value. The evidence also shows risks around safety, selection transparency, coordination, and overclaiming outcome-level change.",
  keyMessages: [
    "Evidence supports access-focused, center-based engagement as a practical entry point for participation.",
    "Women's meaningful participation required safe access, preparatory spaces, and careful facilitation in mixed forums.",
    "Youth engagement was strongest when training connected to visible local action and small grants.",
    "Coordination routines and feedback loops are necessary to protect trust and reduce duplication.",
    "The current evidence base is useful for learning but should not overclaim long-term peacebuilding outcomes.",
  ],
  limitations: [
    "The demo evidence is fictional and designed for product validation only.",
    "Most evidence is qualitative or monitoring-based, with limited outcome verification.",
    "Some stakeholder groups, including persons with disabilities and outlying villages, are underrepresented.",
    "Sensitive issues are summarized at a high level to avoid exposing identifiable details.",
  ],
  purpose:
    "To evaluate how safe, community-centered participation hubs, dedicated youth micro-grants, and trusted dialogue facilitation enable young women and marginalized youth to participate in local peacebuilding across divided urban districts, and to isolate operational bottlenecks before expansion.",
  background:
    "Initiated across three municipal zones facing post-conflict polarization and socioeconomic stagnation. Traditional municipal councils systematically underrepresented women and youth, while earlier interventions suffered from elite capture and lack of transparent grant selection. This study captures early-to-midline implementation learning.",
  intendedAudience:
    "Municipal Social Cohesion Steering Committee, Donor Program Oversight Board, and District Civil Society Alliances.",
  decisionUse:
    "Mid-term operational adjustments for community center safety protocols, reallocation of Phase 2 small grant funds, and institutionalization of cross-district dialogue forums.",
  geography: "Al Noor District, River East, and North Ridge (3 urban municipal sectors).",
  timeframe: "February 2026 – May 2026 (Midline Field Inquiry Cycle).",
  ownerLead: "Dr. Laila Al-Mansoor (Principal MEL Advisor)",
  questions: [
    {
      id: "RQ-1",
      question:
        "How effectively do community center spaces reduce barriers to participation for young women and marginalized youth?",
      shortLabel: "Safe Access & Youth Participation",
      criterion: "Effectiveness & Inclusion",
      isPrimary: true,
      order: 1,
      isActive: true,
      subQuestions: [
        "What specific schedule and security provisions most increase women's daytime attendance?",
        "Do youth perceive center facilities as politically neutral and safe?",
      ],
    },
    {
      id: "RQ-2",
      question:
        "To what extent do youth micro-grant initiatives foster cross-community cooperation versus local competition?",
      shortLabel: "Micro-Grant Cohesion Impact",
      criterion: "Coherence & Social Cohesion",
      isPrimary: false,
      order: 2,
      isActive: true,
      subQuestions: [
        "How are joint projects between neighboring districts received by community elders?",
      ],
    },
    {
      id: "RQ-3",
      question:
        "What governance and feedback mechanisms are required to ensure equitable selection and participant safeguarding?",
      shortLabel: "Selection Equity & Safeguarding",
      criterion: "Accountability & Protection",
      isPrimary: false,
      order: 3,
      isActive: true,
    },
    {
      id: "RQ-4",
      question:
        "How sustainable are community center activities without continued external operational subsidies?",
      shortLabel: "Institutional Sustainability",
      criterion: "Sustainability & Ownership",
      isPrimary: false,
      order: 4,
      isActive: true,
    },
  ],
  scopeConfig: {
    targetSites: ["Al Noor District", "River East", "North Ridge"],
    isSingleSiteStudy: false,
    targetStakeholderGroups: [
      "Youth participants",
      "Women representatives",
      "Community center coordinators",
      "Local government officials",
      "Community elders",
    ],
    scopeStatement:
      "Covers community-level civic activities, safe spaces, training sessions, and micro-grant disbursements in the 3 designated municipal districts during the initial 18 months of implementation.",
    inScope: [
      "Community center daily operations and event attendance",
      "Women-only preparatory circles and dialogue forums",
      "Youth committee micro-grant selection and project execution",
      "District coordination routines and stakeholder feedback channels",
      "Facilitator safeguarding protocols and reporting mechanisms",
    ],
    outOfScope: [
      "Formal municipal political election outcomes",
      "Large-scale municipal infrastructure rehabilitation outside community centers",
      "Macro-level national peace accords or legislative reform",
      "Direct household cash assistance programming",
    ],
    assumptions: [
      "Local municipal councils continue honoring community center neutrality",
      "Security conditions permit daily daytime center access without curfews",
      "Youth and women participants feel safe attending daytime events without retaliation",
    ],
    constraints: [
      "Evening mobility constraints for female participants due to poor public lighting",
      "Limited formal baseline socioeconomic data at neighborhood level",
      "Intermittent local mobile connectivity for digital intake synchronization",
    ],
    plannedMethods: [
      {
        method: "Focus Group Discussion",
        targetSourceCount: 12,
        plannedCount: 12,
        description: "Disaggregated by gender and youth age cohorts across all 3 districts",
      },
      {
        method: "Key Informant Interview",
        targetSourceCount: 15,
        plannedCount: 15,
        description: "Municipal officials, center directors, and traditional community leaders",
      },
      {
        method: "Direct Observation",
        targetSourceCount: 8,
        plannedCount: 8,
        description: "Structured observation of mixed dialogue and training sessions",
      },
      {
        method: "Document Review",
        targetSourceCount: 6,
        plannedCount: 6,
        description: "Project monitoring logs, attendance rosters, and grant applications",
      },
      {
        method: "Community Meeting",
        targetSourceCount: 4,
        plannedCount: 4,
        description: "Open neighborhood feedback and validation sessions",
      },
    ],
  },
  framework: {
    name: "Community Peacebuilding & Inclusive Governance Framework",
    description:
      "Five analytical lenses designed to examine relational trust, structural access, and operational safety without imposing rigid institutional standards.",
    themes: [
      {
        id: "THM-1",
        name: "Access & Inclusion Barriers",
        shortLabel: "Access",
        description: "Physical, cultural, logistical, and safety factors influencing initial participation.",
        guidingQuestion: "What conditions make participation physically and socially accessible for underrepresented groups?",
        order: 1,
        isActive: true,
      },
      {
        id: "THM-2",
        name: "Safe Space & Facilitation Quality",
        shortLabel: "Safe Space",
        description: "Emotional safety, trusted moderation, and conflict-sensitive dialogue dynamics.",
        guidingQuestion: "How do facilitation methods and environment quality influence participant openness and safety?",
        order: 2,
        isActive: true,
      },
      {
        id: "THM-3",
        name: "Civic Efficacy & Practical Action",
        shortLabel: "Efficacy",
        description: "Tangible outcomes, skills applied, youth agency, and visible community contributions.",
        guidingQuestion: "Do participants experience concrete influence and visible results from their engagement?",
        order: 3,
        isActive: true,
      },
      {
        id: "THM-4",
        name: "Institutional Trust & Governance",
        shortLabel: "Governance",
        description: "Transparency, feedback loops, grievance handling, and leadership credibility.",
        guidingQuestion: "How transparent and accountable are decision-making and selection procedures perceived to be?",
        order: 4,
        isActive: true,
      },
      {
        id: "THM-5",
        name: "Resource Equity & Fairness",
        shortLabel: "Equity",
        description: "Distribution of mini-grants, center resources, and opportunities across sub-groups.",
        guidingQuestion: "Are benefits distributed equitably without perceived favoritism or elite capture?",
        order: 5,
        isActive: true,
      },
    ],
  },
  teamRoles: [
    {
      id: "ROLE-1",
      role: "lead",
      actor: { kind: "human", displayName: "Dr. Laila Al-Mansoor" },
      notes: "Principal MEL Advisor, overall methodological integrity and reporting",
    },
    {
      id: "ROLE-2",
      role: "researcher",
      actor: { kind: "human", displayName: "Kareem Zeid" },
      notes: "Lead Field Researcher, youth focus groups and observational logging",
    },
    {
      id: "ROLE-3",
      role: "researcher",
      actor: { kind: "human", displayName: "Samira Haddad" },
      notes: "Field Researcher, women's peace circles and safe access interviews",
    },
    {
      id: "ROLE-4",
      role: "debrief_supervisor",
      actor: { kind: "human", displayName: "Dr. Laila Al-Mansoor" },
      notes: "Daily debrief synthesis and fieldwork prioritization",
    },
    {
      id: "ROLE-5",
      role: "reviewer",
      actor: { kind: "human", displayName: "Nadia Farouk" },
      notes: "Evidence Reviewer, source attribution and ethical anonymization verification",
    },
    {
      id: "ROLE-6",
      role: "analyst",
      actor: { kind: "human", displayName: "Tariq Vance" },
      notes: "Senior Analyst, comparative cross-district synthesis and matrix triangulation",
    },
    {
      id: "ROLE-7",
      role: "validator",
      actor: { kind: "human", displayName: "Elena Rostova" },
      notes: "External Peer Validator, claim boundary defense and limitation audits",
    },
    {
      id: "ROLE-8",
      role: "approver",
      actor: { kind: "human", displayName: "Marcus Chen" },
      notes: "Head of Program Quality, learning brief publication sign-off",
    },
  ],
  sources: [
    {
      id: "SRC-001",
      title: "Youth focus group summary",
      sourceType: "Focus group discussion",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-02-12",
      stakeholderType: "Youth participants",
      location: "Al Noor District",
      summary:
        "Youth participants discussed barriers to attendance, committee roles, and interest in practical community action.",
      sensitivityFlag: "Low",
    },
    {
      id: "SRC-002",
      title: "Women's peace circle notes",
      sourceType: "Focus group discussion",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-02-15",
      stakeholderType: "Women representatives",
      location: "River East",
      summary:
        "Women participants reflected on safe access, mixed dialogue spaces, childcare, and transport concerns.",
      sensitivityFlag: "Medium",
    },
    {
      id: "SRC-003",
      title: "Community center attendance log",
      sourceType: "Monitoring record",
      materialCategory: "secondary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-02-28",
      stakeholderType: "Community center coordinators",
      location: "Three districts",
      summary:
        "Attendance patterns across youth dialogue, women's groups, and mixed community sessions.",
      sensitivityFlag: "None",
    },
    {
      id: "SRC-004",
      title: "Training reflection forms",
      sourceType: "Training feedback",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-04",
      stakeholderType: "Youth and women trainees",
      location: "Central training hub",
      summary:
        "Participant reflections on practical relevance, confidence, and need for post-training support.",
      sensitivityFlag: "Low",
    },
    {
      id: "SRC-005",
      title: "Local council interview summary",
      sourceType: "Key informant interview",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-07",
      stakeholderType: "Local authorities",
      location: "Municipal offices",
      summary:
        "Council members described their expectations, role clarity needs, and perceptions of youth and women's participation.",
      sensitivityFlag: "Low",
    },
    {
      id: "SRC-006",
      title: "Partner coordination minutes",
      sourceType: "Meeting minutes",
      materialCategory: "secondary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-09",
      stakeholderType: "Implementing partners",
      location: "Coordination forum",
      summary:
        "Partner discussion of outreach duplication, shared scheduling, referral issues, and coordination routines.",
      sensitivityFlag: "None",
    },
    {
      id: "SRC-007",
      title: "Facilitator field diary",
      sourceType: "Observation notes",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-14",
      stakeholderType: "Field facilitators",
      location: "Multiple communities",
      summary:
        "Facilitator notes on trust, rumor management, meeting dynamics, and participation barriers.",
      sensitivityFlag: "Medium",
    },
    {
      id: "SRC-008",
      title: "Safety and sensitivity log",
      sourceType: "Protection log",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-18",
      stakeholderType: "Community protection focal points",
      location: "River East and Al Noor",
      summary:
        "Non-identifying log of access, safety, and rumor issues raised during implementation.",
      sensitivityFlag: "High",
    },
    {
      id: "SRC-009",
      title: "Youth small grants completion notes",
      sourceType: "Grant monitoring notes",
      materialCategory: "secondary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-25",
      stakeholderType: "Youth committees",
      location: "Two community centers",
      summary:
        "Completion notes for youth-led micro-actions including cleanup days, mediation theatre, and community noticeboards.",
      sensitivityFlag: "Low",
    },
    {
      id: "SRC-010",
      title: "Stakeholder mapping workshop output",
      sourceType: "Workshop output",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-27",
      stakeholderType: "Mixed community stakeholders",
      location: "District workshop",
      summary:
        "Mapping of actors, influence, inclusion gaps, and safe engagement channels.",
      sensitivityFlag: "Medium",
    },
    {
      id: "SRC-011",
      title: "Donor quarterly narrative draft",
      sourceType: "Narrative report draft",
      materialCategory: "supervisory_interpretation",
      audit: DEMO_AUDIT,
      date: "2026-04-02",
      stakeholderType: "Programme team",
      location: "Programme office",
      summary:
        "Draft synthesis of implementation progress, outputs, early learning, and evidence limitations.",
      sensitivityFlag: "Low",
    },
    {
      id: "SRC-012",
      title: "Community feedback hotline digest",
      sourceType: "Feedback digest",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-04-05",
      stakeholderType: "Community members",
      location: "Programme-wide",
      summary:
        "Aggregated anonymous feedback on selection criteria, communication, timing, and perceived fairness.",
      sensitivityFlag: "Medium",
    },
  ],
  evidence: [
    {
      id: "EV-001",
      sourceId: "SRC-001",
      stakeholderType: "Youth participants",
      rawEvidence:
        "Youth attendance improved when dialogue sessions were scheduled after school and work hours.",
      primaryTheme: "Youth Participation",
      secondaryTheme: "Access",
      evidenceStrength: "High",
      sensitivityFlag: "Low",
      potentialFinding:
        "Flexible scheduling increased youth participation in community center activities.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-002",
      sourceId: "SRC-002",
      stakeholderType: "Women representatives",
      rawEvidence:
        "Women reported higher participation when sessions were near transport routes and childcare was informally arranged.",
      primaryTheme: "Women's Participation",
      secondaryTheme: "Safe Access",
      evidenceStrength: "High",
      sensitivityFlag: "Medium",
      potentialFinding:
        "Women's attendance was shaped by practical access and care responsibilities.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-003",
      sourceId: "SRC-001",
      stakeholderType: "Youth participants",
      rawEvidence:
        "Mixed youth committees produced stronger action plans when young women and young men worked from a shared template.",
      primaryTheme: "Inclusive Governance",
      secondaryTheme: "Youth Leadership",
      evidenceStrength: "Medium",
      sensitivityFlag: "Low",
      potentialFinding:
        "Structured committee tools improved the quality of youth-led proposals.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-004",
      sourceId: "SRC-003",
      stakeholderType: "Community center coordinators",
      rawEvidence:
        "Center-based sessions had steadier attendance than sessions held at municipal offices.",
      primaryTheme: "Community Centers",
      secondaryTheme: "Access",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      potentialFinding:
        "Community centers reduced travel and formality barriers for participation.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-005",
      sourceId: "SRC-004",
      stakeholderType: "Youth and women trainees",
      rawEvidence:
        "Participants valued mediation and listening skills but asked for coaching after the training.",
      primaryTheme: "Capacity Building",
      secondaryTheme: "Mentoring",
      evidenceStrength: "Medium",
      sensitivityFlag: "Low",
      potentialFinding:
        "Training increased confidence but follow-up support was insufficient.",
      qaStatus: "Needs Review",
    },
    {
      id: "EV-006",
      sourceId: "SRC-005",
      stakeholderType: "Local authorities",
      rawEvidence:
        "Council members supported the initiative but requested clearer expectations for their role in community forums.",
      primaryTheme: "Stakeholder Engagement",
      secondaryTheme: "Role Clarity",
      evidenceStrength: "Medium",
      sensitivityFlag: "Low",
      potentialFinding:
        "Local stakeholder buy-in depended on clear role definition.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-007",
      sourceId: "SRC-006",
      stakeholderType: "Implementing partners",
      rawEvidence:
        "Two partners conducted similar outreach in the same neighborhoods during the same week.",
      primaryTheme: "Coordination",
      secondaryTheme: "Efficiency",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      potentialFinding:
        "Coordination gaps created outreach duplication and potential community fatigue.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-008",
      sourceId: "SRC-002",
      stakeholderType: "Women representatives",
      rawEvidence:
        "Some young women spoke less in mixed forums unless they had prepared points in women-only sessions first.",
      primaryTheme: "Gender Sensitivity",
      secondaryTheme: "Voice",
      evidenceStrength: "High",
      sensitivityFlag: "Medium",
      potentialFinding:
        "Preparatory spaces improved young women's voice in mixed dialogue.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-009",
      sourceId: "SRC-008",
      stakeholderType: "Community protection focal points",
      rawEvidence:
        "A rumor about participant selection was addressed through facilitator visits before it escalated into a boycott.",
      primaryTheme: "Conflict Sensitivity",
      secondaryTheme: "Rumor Management",
      evidenceStrength: "Medium",
      sensitivityFlag: "High",
      potentialFinding:
        "Rapid rumor response protected participation and reduced escalation risk.",
      qaStatus: "Warning",
    },
    {
      id: "EV-010",
      sourceId: "SRC-003",
      stakeholderType: "Community center coordinators",
      rawEvidence:
        "Attendance dropped during the harvest period, especially among working youth.",
      primaryTheme: "Access",
      secondaryTheme: "Seasonality",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      potentialFinding:
        "Seasonal livelihoods affected attendance and should inform scheduling.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-011",
      sourceId: "SRC-009",
      stakeholderType: "Youth committees",
      rawEvidence:
        "Youth-led small grants produced visible quick wins, but committees said budgets were too small for larger priorities.",
      primaryTheme: "Small Grants",
      secondaryTheme: "Youth Leadership",
      evidenceStrength: "Medium",
      sensitivityFlag: "Low",
      potentialFinding:
        "Small grants helped participation feel practical but require realistic sizing.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-012",
      sourceId: "SRC-005",
      stakeholderType: "Local authorities",
      rawEvidence:
        "Older male stakeholders were more supportive of women's participation when activities were framed around community service.",
      primaryTheme: "Stakeholder Buy-In",
      secondaryTheme: "Framing",
      evidenceStrength: "Medium",
      sensitivityFlag: "Medium",
      potentialFinding:
        "Framing participation around shared community benefit reduced resistance.",
      qaStatus: "Needs Review",
      reviewStatus: "needs_clarification",
    },
    {
      id: "EV-013",
      sourceId: "SRC-012",
      stakeholderType: "Community members",
      rawEvidence:
        "Feedback messages questioned how trainees and youth grant committees were selected.",
      primaryTheme: "Accountability",
      secondaryTheme: "Transparency",
      evidenceStrength: "High",
      sensitivityFlag: "Medium",
      potentialFinding:
        "Selection transparency affected trust in the programme.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-014",
      sourceId: "SRC-007",
      stakeholderType: "Field facilitators",
      rawEvidence:
        "Facilitators reported stronger trust where they were known locally or paired with a respected local volunteer.",
      primaryTheme: "Trust",
      secondaryTheme: "Local Facilitation",
      evidenceStrength: "Medium",
      sensitivityFlag: "Low",
      potentialFinding:
        "Local facilitator credibility helped build trust with community members.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-015",
      sourceId: "SRC-004",
      stakeholderType: "Youth and women trainees",
      rawEvidence:
        "Some participants found the conflict analysis module too theoretical and asked for more role-play examples.",
      primaryTheme: "Learning Design",
      secondaryTheme: "Practicality",
      evidenceStrength: "Medium",
      sensitivityFlag: "Low",
      potentialFinding:
        "Training design needs more practice-based methods for varied literacy levels.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-016",
      sourceId: "SRC-006",
      stakeholderType: "Implementing partners",
      rawEvidence:
        "After partners introduced a shared calendar, overlapping outreach activities decreased.",
      primaryTheme: "Coordination",
      secondaryTheme: "Shared Planning",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      potentialFinding:
        "Simple shared planning tools improved partner coordination.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-017",
      sourceId: "SRC-008",
      stakeholderType: "Women representatives",
      rawEvidence:
        "Women requested safer return transport when events ended after dark.",
      primaryTheme: "Women's Participation",
      secondaryTheme: "Safety",
      evidenceStrength: "High",
      sensitivityFlag: "High",
      potentialFinding:
        "Safe transport is a condition for sustained women's participation.",
      qaStatus: "Warning",
    },
    {
      id: "EV-018",
      sourceId: "SRC-001",
      stakeholderType: "Youth participants",
      rawEvidence:
        "Youth committee attendance declined when meeting agendas were not shared in advance.",
      primaryTheme: "Inclusive Governance",
      secondaryTheme: "Communication",
      evidenceStrength: "Medium",
      sensitivityFlag: "Low",
      potentialFinding:
        "Predictable committee communication supported youth engagement.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-019",
      sourceId: "SRC-011",
      stakeholderType: "Programme team",
      rawEvidence:
        "The quarterly narrative had strong output numbers but limited evidence of changed relationships or conflict outcomes.",
      primaryTheme: "Evidence Quality",
      secondaryTheme: "Outcome Evidence",
      evidenceStrength: "High",
      sensitivityFlag: "Low",
      potentialFinding:
        "The evidence base should not overclaim peacebuilding outcomes.",
      qaStatus: "Reviewed",
    },
    {
      id: "EV-020",
      sourceId: "SRC-010",
      stakeholderType: "Mixed community stakeholders",
      rawEvidence:
        "The stakeholder map underrepresented persons with disabilities and villages far from community centers.",
      primaryTheme: "Inclusion",
      secondaryTheme: "Representation",
      evidenceStrength: "Medium",
      sensitivityFlag: "Medium",
      potentialFinding:
        "The engagement approach needs stronger inclusion checks for less visible groups.",
      qaStatus: "Needs Review",
    },
    {
      id: "EV-021",
      sourceId: "SRC-012",
      stakeholderType: "Youth participants",
      rawEvidence:
        "Informal rumor circulating in youth messaging channels alleged that participation stipends were being selectively delayed by local council liaisons.",
      primaryTheme: "Accountability",
      secondaryTheme: "Transparency",
      evidenceStrength: "Low",
      sensitivityFlag: "High",
      potentialFinding:
        "Youth participants voiced suspicion over stipend timelines, though municipal financial logs showed standard disbursement.",
      qaStatus: "Warning",
      validationStatus: "Rejected",
      reviewStatus: "excluded",
      exclusionReason:
        "Single uncorroborated third-party allegation of financial irregularities. Excluded from analytical synthesis because the claim could not be verified through an independent source or documentary evidence.",
    },
  ],
  findings: [
    {
      id: "FND-001",
      statement:
        "Community centers improved access to participation, but scheduling must reflect livelihoods and seasonality.",
      explanation:
        "Attendance was steadier in community centers and improved when sessions were scheduled outside work and school hours. The harvest-period drop shows access planning must remain adaptive.",
      supportingEvidenceIds: ["EV-001", "EV-004", "EV-010"],
      contradictoryEvidence:
        "High attendance was not consistent during harvest periods, especially among working youth.",
      evidenceStrength: "High",
      programmeImplication:
        "The programme should keep center-based delivery but use locally validated activity calendars.",
      linkedRecommendationIds: ["REC-001"],
    },
    {
      id: "FND-002",
      statement:
        "Women's participation increased when safe access, childcare realities, and preparatory spaces were addressed.",
      explanation:
        "Women reported greater participation when sessions were reachable, safety risks were managed, and women-only preparation supported voice in mixed forums.",
      supportingEvidenceIds: ["EV-002", "EV-008", "EV-017"],
      contradictoryEvidence:
        "Mixed forums still limited some young women's participation without preparation.",
      evidenceStrength: "High",
      programmeImplication:
        "Participation targets should include practical safety and voice conditions, not just attendance counts.",
      linkedRecommendationIds: ["REC-002", "REC-003"],
    },
    {
      id: "FND-003",
      statement:
        "Youth engagement was strongest when participation led to visible action and clear committee routines.",
      explanation:
        "Youth committees produced better proposals with structured tools and stayed more engaged when meetings were predictable and tied to practical small grants.",
      supportingEvidenceIds: ["EV-003", "EV-011", "EV-018"],
      contradictoryEvidence:
        "Engagement declined when agendas were not shared and when grant budgets felt unrealistic.",
      evidenceStrength: "Medium",
      programmeImplication:
        "Youth participation should be linked to real decision points, visible outputs, and clear communication.",
      linkedRecommendationIds: ["REC-004"],
    },
    {
      id: "FND-004",
      statement:
        "Partner coordination gaps caused outreach duplication, while a shared calendar reduced overlap.",
      explanation:
        "Partner minutes show duplication in the same neighborhoods before a shared calendar was introduced. The calendar reduced overlap and created a simple coordination routine.",
      supportingEvidenceIds: ["EV-007", "EV-016"],
      contradictoryEvidence:
        "Coordination improved after the shared calendar, suggesting the problem was operational rather than structural.",
      evidenceStrength: "High",
      programmeImplication:
        "Coordination should be treated as an implementation quality function, not an occasional meeting.",
      linkedRecommendationIds: ["REC-005"],
    },
    {
      id: "FND-005",
      statement:
        "Training improved confidence but needs follow-up mentoring and more practical learning methods.",
      explanation:
        "Participants valued mediation and listening content, but asked for coaching and more role-play examples. Training alone was not enough to support application.",
      supportingEvidenceIds: ["EV-005", "EV-015"],
      contradictoryEvidence:
        "Positive training feedback does not yet demonstrate sustained use of skills after the course.",
      evidenceStrength: "Medium",
      programmeImplication:
        "Capacity building should include post-training practice, coaching, and lower-literacy methods.",
      linkedRecommendationIds: ["REC-006"],
    },
    {
      id: "FND-006",
      statement:
        "Conflict sensitivity improved when facilitators could respond quickly to rumors and work through trusted local relationships.",
      explanation:
        "A rumor was contained before escalation, and facilitators reported higher trust when locally known or paired with respected volunteers.",
      supportingEvidenceIds: ["EV-009", "EV-014"],
      contradictoryEvidence:
        "The sensitivity log is non-identifying and should be interpreted cautiously.",
      evidenceStrength: "Medium",
      programmeImplication:
        "Rumor monitoring and local facilitator credibility should be built into delivery plans.",
      linkedRecommendationIds: ["REC-007"],
    },
    {
      id: "FND-007",
      statement:
        "Selection transparency and communication affected community trust in the initiative.",
      explanation:
        "Feedback channels showed concerns about how participants and committees were selected, while youth committee participation declined when agendas were not communicated in advance.",
      supportingEvidenceIds: ["EV-013", "EV-018"],
      contradictoryEvidence:
        "The feedback digest is anonymous and does not show how widespread the concern was.",
      evidenceStrength: "Medium",
      programmeImplication:
        "Transparent selection criteria and predictable communication should be part of accountability practice.",
      linkedRecommendationIds: ["REC-008"],
    },
    {
      id: "FND-008",
      statement:
        "The evidence base is strong on outputs but weaker on outcome-level change and inclusion of less visible groups.",
      explanation:
        "The donor narrative had limited relationship or conflict outcome evidence, and the stakeholder map underrepresented persons with disabilities and remote villages.",
      supportingEvidenceIds: ["EV-019", "EV-020"],
      contradictoryEvidence:
        "Available monitoring data is useful for implementation learning but not sufficient for broad outcome claims.",
      evidenceStrength: "High",
      programmeImplication:
        "Future learning cycles should add outcome probes and inclusion checks before making donor-facing claims.",
      linkedRecommendationIds: ["REC-009", "REC-010"],
    },
  ],
  lessons: [
    {
      id: "LES-001",
      statement:
        "Access barriers are operational as well as social, and they must be managed throughout implementation.",
      whatWorkedOrDidNotWork:
        "Community centers, flexible timing, transport proximity, and safety planning improved participation. Static scheduling did not work during livelihood peaks.",
      whyItHappened:
        "Participants balanced programme activities with work, school, care duties, and safety considerations.",
      conditionsRequired:
        "Local calendars, safe venues, transport checks, and willingness to adjust schedules.",
      evidenceBase: ["EV-001", "EV-002", "EV-004", "EV-010", "EV-017"],
      linkedFindingIds: ["FND-001", "FND-002"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Transferable to other community participation programmes if calendars and safety assumptions are locally validated.",
    },
    {
      id: "LES-002",
      statement:
        "Participation becomes more meaningful when it produces visible community action.",
      whatWorkedOrDidNotWork:
        "Small grants and structured committee tools helped youth see a purpose for participation. Meetings without agendas weakened engagement.",
      whyItHappened:
        "Participants were more motivated when they could connect dialogue to tangible decisions and outputs.",
      conditionsRequired:
        "Small action funds, clear decision rights, simple proposal templates, and meeting discipline.",
      evidenceBase: ["EV-003", "EV-011", "EV-018"],
      linkedFindingIds: ["FND-003"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Relevant for youth engagement and civic participation projects with modest action budgets.",
    },
    {
      id: "LES-003",
      statement:
        "Trust depends on who facilitates and how quickly concerns are addressed.",
      whatWorkedOrDidNotWork:
        "Local facilitator credibility and rapid rumor follow-up protected participation. Slow or distant responses would likely have increased mistrust.",
      whyItHappened:
        "Peacebuilding activities operate in sensitive social environments where rumors shape participation decisions.",
      conditionsRequired:
        "Trusted facilitation teams, escalation protocols, and non-identifying sensitivity logs.",
      evidenceBase: ["EV-009", "EV-014"],
      linkedFindingIds: ["FND-006"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Highly transferable to conflict-sensitive community programming with trained local facilitation.",
    },
    {
      id: "LES-004",
      statement:
        "Coordination quality depends on simple routines, not only formal meetings.",
      whatWorkedOrDidNotWork:
        "The shared calendar reduced duplicated outreach. General coordination meetings alone did not prevent overlap.",
      whyItHappened:
        "Partners needed an operational view of who was doing what, where, and when.",
      conditionsRequired:
        "Shared planning tools, responsible focal points, and routine updates.",
      evidenceBase: ["EV-007", "EV-016"],
      linkedFindingIds: ["FND-004"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Transferable to multi-partner field programmes with overlapping geographies.",
    },
    {
      id: "LES-005",
      statement:
        "Training without follow-up is unlikely to produce sustained practice change.",
      whatWorkedOrDidNotWork:
        "Participants valued the training but needed coaching and more practical exercises.",
      whyItHappened:
        "New facilitation and conflict analysis skills require practice, feedback, and confidence-building.",
      conditionsRequired:
        "Mentoring visits, peer practice, role-play, and applied assignments.",
      evidenceBase: ["EV-005", "EV-015"],
      linkedFindingIds: ["FND-005"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Transferable to most capacity-building components where behavior change is expected.",
    },
    {
      id: "LES-006",
      statement:
        "Gender-sensitive sequencing can improve voice in mixed participation spaces.",
      whatWorkedOrDidNotWork:
        "Women-only preparation helped some young women speak more confidently in mixed forums.",
      whyItHappened:
        "Preparatory spaces lowered social pressure and helped participants clarify points before mixed dialogue.",
      conditionsRequired:
        "Safe preparatory spaces, skilled facilitators, and respect for participants' preferred engagement channels.",
      evidenceBase: ["EV-002", "EV-008", "EV-017"],
      linkedFindingIds: ["FND-002"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Transferable where women or marginalized groups face barriers in mixed public spaces.",
    },
    {
      id: "LES-007",
      statement:
        "Outcome evidence must be planned early if donor-facing claims are expected later.",
      whatWorkedOrDidNotWork:
        "Output monitoring was strong, but relationship change and inclusion evidence were weaker.",
      whyItHappened:
        "The monitoring system emphasized attendance and activities more than outcome probes.",
      conditionsRequired:
        "Outcome-oriented learning questions, light-touch qualitative probes, and inclusion checks.",
      evidenceBase: ["EV-019", "EV-020"],
      linkedFindingIds: ["FND-008"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Transferable to learning-focused grants that need credible donor reporting.",
    },
  ],
  goodPractices: [
    {
      id: "GP-001",
      title: "Community center dialogue slots",
      description:
        "Hold recurring dialogue sessions in familiar community centers and adjust timing around school, work, and seasonal livelihood patterns.",
      whyItWorked:
        "It reduced travel, formality, and timing barriers while keeping the activity visible locally.",
      evidenceBase: ["EV-001", "EV-004", "EV-010"],
      linkedFindingIds: ["FND-001"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      conditionsForReplication:
        "Accessible centers, locally validated schedules, and basic attendance monitoring.",
      risksLimits:
        "Centers can still exclude remote villages if transport and outreach are not addressed.",
      recommendedUse:
        "Use as the default participation venue model, with periodic inclusion checks.",
    },
    {
      id: "GP-002",
      title: "Women's preparation circles before mixed dialogue",
      description:
        "Run short preparatory sessions where women and young women can identify priorities before mixed community forums.",
      whyItWorked:
        "It increased confidence, clarified messages, and reduced pressure in mixed settings.",
      evidenceBase: ["EV-002", "EV-008", "EV-017"],
      linkedFindingIds: ["FND-002"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      conditionsForReplication:
        "Safe timing, trusted facilitators, and clear links between preparation and mixed forums.",
      risksLimits:
        "Preparation should support voice, not segregate decision-making or reduce influence.",
      recommendedUse:
        "Use before high-stakes mixed forums and when participants request it.",
    },
    {
      id: "GP-003",
      title: "Shared partner calendar",
      description:
        "Maintain a simple shared calendar showing outreach plans, target neighborhoods, and responsible partners.",
      whyItWorked:
        "It reduced overlap and made coordination operational.",
      evidenceBase: ["EV-007", "EV-016"],
      linkedFindingIds: ["FND-004"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      conditionsForReplication:
        "Named focal points, weekly updates, and agreement on minimum planning information.",
      risksLimits:
        "The tool will decay if no one owns it or if partners do not update it.",
      recommendedUse:
        "Use in all multi-partner districts before field outreach begins.",
    },
    {
      id: "GP-004",
      title: "Rumor response and facilitator debrief",
      description:
        "Use trusted facilitators to log rumors safely, verify concerns, and respond before tensions escalate.",
      whyItWorked:
        "It combined early warning with local trust and avoided naming sensitive individuals.",
      evidenceBase: ["EV-009", "EV-014"],
      linkedFindingIds: ["FND-006"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      conditionsForReplication:
        "Conflict-sensitivity training, referral boundaries, and non-identifying documentation.",
      risksLimits:
        "Rumor response can create risk if confidentiality or neutrality is not protected.",
      recommendedUse:
        "Use in sensitive implementation areas with clear escalation protocols.",
    },
  ],
  recommendations: [
    {
      id: "REC-001",
      recommendation:
        "Create a locally reviewed activity calendar that adjusts community center sessions around work, school, safety, and seasonal livelihood patterns.",
      linkedFindingId: "FND-001",
      linkedFindingIds: ["FND-001"],
      linkedLessonIds: ["LES-001"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-001", "EV-004", "EV-010"],
      responsibleActor: "Programme manager with community center coordinators",
      priority: "High",
      timeframe: "Next planning cycle",
      feasibility: "High",
      riskSensitivity:
        "Low risk if calendars are validated with diverse participant groups.",
      expectedBenefit:
        "Improved attendance consistency and reduced exclusion due to timing barriers.",
      successIndicator:
        "Session calendar updated monthly and attendance gaps reviewed by participant group.",
    },
    {
      id: "REC-002",
      recommendation:
        "Budget for safe access measures for women, including transport checks, safer session times, and locally appropriate childcare arrangements.",
      linkedFindingId: "FND-002",
      linkedFindingIds: ["FND-002"],
      linkedLessonIds: ["LES-001", "LES-006"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-002", "EV-017"],
      responsibleActor: "Operations lead and gender focal point",
      priority: "High",
      timeframe: "Immediate",
      feasibility: "Medium",
      riskSensitivity:
        "Requires careful confidentiality and no public identification of safety concerns.",
      expectedBenefit:
        "More sustained and safer participation by women and young women.",
      successIndicator:
        "Safety/access checklist completed before each women's or mixed dialogue session.",
    },
    {
      id: "REC-003",
      recommendation:
        "Use women-only preparation sessions before selected mixed forums where participants request additional space to prepare.",
      linkedFindingId: "FND-002",
      linkedFindingIds: ["FND-002"],
      linkedLessonIds: ["LES-006"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-008", "EV-012"],
      responsibleActor: "Gender focal point and lead facilitators",
      priority: "High",
      timeframe: "Within one month",
      feasibility: "High",
      riskSensitivity:
        "Ensure preparatory spaces increase influence in mixed forums rather than replacing it.",
      expectedBenefit:
        "Stronger voice and more specific contributions from women in mixed discussions.",
      successIndicator:
        "Mixed forum notes show women's priorities raised and responded to.",
    },
    {
      id: "REC-004",
      recommendation:
        "Link youth committees to small, realistic action grants and require simple agendas before each committee meeting.",
      linkedFindingId: "FND-003",
      linkedFindingIds: ["FND-003"],
      linkedLessonIds: ["LES-002"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-003", "EV-011", "EV-018"],
      responsibleActor: "Youth engagement officer",
      priority: "High",
      timeframe: "Next grant round",
      feasibility: "Medium",
      riskSensitivity:
        "Selection criteria must be transparent to avoid perceptions of favoritism.",
      expectedBenefit:
        "Youth participation becomes more purposeful and visible to the community.",
      successIndicator:
        "At least 80% of youth meetings have agendas and action points recorded.",
    },
    {
      id: "REC-005",
      recommendation:
        "Make the shared partner calendar mandatory for outreach planning and review it in every coordination meeting.",
      linkedFindingId: "FND-004",
      linkedFindingIds: ["FND-004"],
      linkedLessonIds: ["LES-004"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-007", "EV-016"],
      responsibleActor: "Partner coordination lead",
      priority: "Medium",
      timeframe: "Immediate",
      feasibility: "High",
      riskSensitivity:
        "Low risk; requires consistent partner compliance and light moderation.",
      expectedBenefit:
        "Reduced duplication, lower community fatigue, and clearer partner accountability.",
      successIndicator:
        "No duplicated outreach events in the same neighborhood without explicit justification.",
    },
    {
      id: "REC-006",
      recommendation:
        "Add post-training mentoring, role-play, and applied assignments to the capacity-building package.",
      linkedFindingId: "FND-005",
      linkedFindingIds: ["FND-005"],
      linkedLessonIds: ["LES-005"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-005", "EV-015"],
      responsibleActor: "Training lead",
      priority: "Medium",
      timeframe: "Within two months",
      feasibility: "Medium",
      riskSensitivity:
        "Ensure coaching does not expose sensitive participant experiences in group settings.",
      expectedBenefit:
        "Higher likelihood that training skills are applied in real facilitation and committee work.",
      successIndicator:
        "Participants complete one applied assignment and receive mentor feedback.",
    },
    {
      id: "REC-007",
      recommendation:
        "Formalize a conflict-sensitivity protocol for rumor logging, facilitator debriefs, and escalation thresholds.",
      linkedFindingId: "FND-006",
      linkedFindingIds: ["FND-006"],
      linkedLessonIds: ["LES-003"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-009", "EV-014"],
      responsibleActor: "Conflict sensitivity focal point",
      priority: "High",
      timeframe: "Immediate",
      feasibility: "Medium",
      riskSensitivity:
        "High sensitivity; logs must remain non-identifying and access-controlled in future versions.",
      expectedBenefit:
        "Earlier response to concerns that could undermine participation or community trust.",
      successIndicator:
        "Rumor or sensitivity concerns are reviewed weekly with documented non-identifying actions.",
    },
    {
      id: "REC-008",
      recommendation:
        "Publish plain-language selection criteria and close feedback loops after participant or committee selection decisions.",
      linkedFindingId: "FND-007",
      linkedFindingIds: ["FND-007"],
      linkedLessonIds: ["LES-002"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-013", "EV-018"],
      responsibleActor: "Accountability focal point",
      priority: "High",
      timeframe: "Before next selection round",
      feasibility: "High",
      riskSensitivity:
        "Avoid publishing personal details or creating stigma for selected participants.",
      expectedBenefit:
        "Improved trust, fewer rumors, and more predictable committee engagement.",
      successIndicator:
        "Selection criteria are posted and feedback responses are summarized anonymously.",
    },
    {
      id: "REC-009",
      recommendation:
        "Add a light outcome learning probe to capture relationship change, dispute handling, and perceived social cohesion.",
      linkedFindingId: "FND-008",
      linkedFindingIds: ["FND-008"],
      linkedLessonIds: ["LES-007"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-019"],
      responsibleActor: "MEL lead",
      priority: "Medium",
      timeframe: "Next quarter",
      feasibility: "Medium",
      riskSensitivity:
        "Questions must be conflict-sensitive and avoid forcing disclosure of sensitive incidents.",
      expectedBenefit:
        "More credible donor-facing learning without overclaiming impact.",
      successIndicator:
        "Quarterly brief includes outcome evidence limits and at least three triangulated learning points.",
    },
    {
      id: "REC-010",
      recommendation:
        "Update the stakeholder map to include persons with disabilities, remote villages, and other less visible groups.",
      linkedFindingId: "FND-008",
      linkedFindingIds: ["FND-008"],
      linkedLessonIds: ["LES-007"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-020"],
      responsibleActor: "Inclusion focal point and field coordinators",
      priority: "Medium",
      timeframe: "Within six weeks",
      feasibility: "High",
      riskSensitivity:
        "Engagement must avoid tokenism and protect participants who face social stigma.",
      expectedBenefit:
        "More inclusive outreach and stronger evidence for representation claims.",
      successIndicator:
        "Updated stakeholder map includes inclusion gaps, safe contact channels, and follow-up actions.",
    },
  ],
  patternNotes: [
    {
      id: "PAT-001",
      studyId: "community-bridges",
      statement: "Center-based youth hubs consistently increase daytime attendance when coupled with safe physical access protocols.",
      reasoningType: "pattern",
      explanation: "Direct observations and focus group transcripts show young women attendance tripled once scheduled women-only hours and safe transit arrangements were introduced.",
      evidenceIds: ["EV-001", "EV-003", "EV-007"],
      questionId: "RQ-1",
      frameworkThemeIds: ["TH-1", "TH-2"],
      audit: DEMO_AUDIT,
      createdAt: 1717200000000,
      updatedAt: 1717200000000,
    },
    {
      id: "PAT-002",
      studyId: "community-bridges",
      statement: "Tension between evening curfew safety concerns and youth working hours restricts adult-minor mixed forums.",
      reasoningType: "tension",
      explanation: "Field debriefs and KIIs highlight that evening sessions exclude younger female participants while daytime sessions exclude employed youth.",
      evidenceIds: ["EV-004", "EV-006"],
      questionId: "RQ-1",
      frameworkThemeIds: ["TH-2"],
      contradictionNote: "Daytime-only schedules improve safety but systematically depress young male worker attendance.",
      audit: DEMO_AUDIT,
      createdAt: 1717200000000,
      updatedAt: 1717200000000,
    },
    {
      id: "PAT-003",
      studyId: "community-bridges",
      statement: "Perceived municipal neutrality is contested across district borders.",
      reasoningType: "contradiction",
      explanation: "While central municipal stakeholders describe the dialogue tables as impartial, outlying youth groups perceive facilitators as biased toward council priorities.",
      evidenceIds: ["EV-008", "EV-012"],
      questionId: "RQ-2",
      frameworkThemeIds: ["TH-3"],
      contradictionNote: "Direct conflict between municipal leadership claims and community participant feedback.",
      audit: DEMO_AUDIT,
      createdAt: 1717200000000,
      updatedAt: 1717200000000,
    },
    {
      id: "PAT-004",
      studyId: "community-bridges",
      statement: "Peer-led micro-grant committees mitigate elite capture through localized vetting.",
      reasoningType: "possible_explanation",
      explanation: "Decentralizing grant selection to youth-led review panels resulted in more diverse awardees compared to traditional municipal committee selection.",
      evidenceIds: ["EV-011", "EV-014"],
      questionId: "RQ-3",
      frameworkThemeIds: ["TH-4"],
      audit: DEMO_AUDIT,
      createdAt: 1717200000000,
      updatedAt: 1717200000000,
    },
    {
      id: "PAT-005",
      studyId: "community-bridges",
      statement: "Systemic omission of disabled youth and outlying peri-urban settlements in current evidence base.",
      reasoningType: "evidence_gap",
      explanation: "No primary observation or focus group directly sampled youth with physical disabilities or residents of the informal eastern settlements.",
      evidenceIds: ["EV-020"],
      questionId: "RQ-4",
      frameworkThemeIds: ["TH-5"],
      audit: DEMO_AUDIT,
      createdAt: 1717200000000,
      updatedAt: 1717200000000,
    },
  ],
};
