import type { DemoCase } from "@/lib/types";
import { DEMO_AUDIT } from "@/lib/storage/normalization";

export const nutritionFieldCase: DemoCase = {
  id: "school-nutrition",
  project: "School Nutrition & Child Wellbeing Field Learning Case",
  subtitle: "A sanitized real-world-inspired field synthesis case",
  status: "Sanitized real-world-inspired case",
  safetyNote: "Sanitized real-world-inspired demo. No identifiable field data is displayed.",
  phaseStatus: "Phase 1 sanitized demo case",
  futurePhase: "Phase 2 may add deeper synthesis, additional anonymized sites, comparative analysis, and refined learning brief outputs after review.",
  context:
    "Demonstrate how real field mission tracker data can be transformed into evidence-backed findings, lessons learned, good practices, recommendations, QA checks, and a learning brief.",
  purposeAndScope:
    "This field learning synthesis captures patterns from the school-level nutrition monitoring program to inform community targeting, food safety protocols, child-led health groups, and referral pathways.",
  keyThemes: [
    "Targeting and vulnerability assessment",
    "Food acceptability and water safety",
    "Gendered household caregiver roles",
    "Child participation mechanisms",
    "School infrastructure and storage constraints",
    "Volunteer capacity and training"
  ],
  safeguardingNotes:
    "Safeguarding and sensitivity protocols were applied: school names were anonymized (School A/B/C/D), direct staff/child quotes paraphrased, team names removed, and health concerns aggregated at the program level.",
  evidenceBase: {
    sourceRecords: 8,
    evidenceEntries: 12,
    findings: 6,
    lessonsLearned: 5,
    goodPractices: 4,
    recommendations: 8,
  },
  executiveSummary:
    "The School Nutrition & Child Wellbeing Field Learning Case demonstrates that integrating health screening with social vulnerability data improves target precision. However, food acceptability, water access, and infrastructure gaps (such as cold storage) remain critical bottlenecks for safety and child retention. Involving child-led health groups offers a viable hygiene messaging channel, but requires careful safeguarding. Sustained impact demands bridging the gender gap in caregiver engagement and standardizing volunteer staff training.",
  keyMessages: [
    "Targeting precision requires combining medical health indicators with household social vulnerability data.",
    "Children's meal engagement is heavily dependent on clean water access and meal acceptability.",
    "Parental nutrition responsibility is highly gendered, requiring targeted father-engagement initiatives.",
    "Child-led school groups effectively amplify hygiene messages when supervised with clear safety boundaries.",
    "Infrastructure gaps in storage and dedicated dining areas directly affect food safety and hygiene.",
    "Teacher and volunteer implementation capacity requires formal training guidelines rather than ad-hoc roles."
  ],
  limitations: [
    "This case is a sanitized demo derived from prior fieldwork. No raw identifiable field data is included.",
    "Observations are focused on School A, School B, and School C, representing selective program geographies.",
    "Medical screenings lack systematic follow-up data because referral loops are rarely closed by local clinics.",
  ],
  purpose:
    "To evaluate whether integrating household socioeconomic vulnerability data with routine school-level health screening enhances targeting precision, and to diagnose critical cold storage, food safety, water sanitation, and caregiver engagement bottlenecks across pilot schools.",
  background:
    "Implemented across 4 pilot primary schools in District 4. The initial pilot delivered daily school meals but revealed alarming disparities: exclusion of non-documented vulnerable children, inadequate food storage facilities, and low father participation in nutrition counselling.",
  intendedAudience:
    "District Health & Education Board, Child Wellbeing Program Directors, School Governing Councils.",
  decisionUse:
    "Refinement of school meal targeting criteria for next academic year, investment prioritization for school kitchen cold-chain equipment, and redesign of father-focused nutrition outreach.",
  geography: "District 4 Catchment: School A, School B, School C, School D (Peri-Urban and Rural Fringe).",
  timeframe: "January 2026 – April 2026 (Term 1 Operational Synthesis).",
  ownerLead: "Tariq Vance (Senior Child Wellbeing Specialist)",
  questions: [
    {
      id: "RQ-NUT-1",
      question:
        "Does the integration of household vulnerability criteria improve meal program targeting precision compared to school-only anthropometric screening?",
      shortLabel: "Targeting Precision & Inclusivity",
      criterion: "Targeting Precision",
      isPrimary: true,
      order: 1,
      isActive: true,
      subQuestions: [
        "How many undocumented children are excluded under existing medical registration criteria?",
      ],
    },
    {
      id: "RQ-NUT-2",
      question:
        "What infrastructure, cold chain, and water sanitation barriers most critically constrain daily food safety in pilot school kitchens?",
      shortLabel: "Kitchen Safety & Storage",
      criterion: "Operational Safety & Infrastructure",
      isPrimary: false,
      order: 2,
      isActive: true,
    },
    {
      id: "RQ-NUT-3",
      question:
        "In what ways do gendered household roles affect parental uptake of nutritional counselling and clinic referral completion?",
      shortLabel: "Caregiver Gender Dynamics",
      criterion: "Equity & Caregiver Engagement",
      isPrimary: false,
      order: 3,
      isActive: true,
    },
    {
      id: "RQ-NUT-4",
      question:
        "How effectively do peer-led student health committees promote hygienic practices without compromising student wellbeing or learning time?",
      shortLabel: "Child Agency & Safeguarding",
      criterion: "Child Participation & Safeguarding",
      isPrimary: false,
      order: 4,
      isActive: true,
    },
  ],
  scopeConfig: {
    targetSites: ["School A", "School B", "School C", "School D"],
    isSingleSiteStudy: false,
    targetStakeholderGroups: [
      "School staff and administrators",
      "Child beneficiaries (grades 3-6)",
      "Mother caregiver groups",
      "Father caregiver circles",
      "Volunteer kitchen staff",
      "District health officers",
    ],
    scopeStatement:
      "Covers school meal preparation, health screenings, caregiver counselling sessions, and student hygiene clubs across the 4 designated pilot schools in District 4.",
    inScope: [
      "Daily kitchen food handling, cold storage, and meal distribution",
      "Medical screening and referral ledgers",
      "Caregiver nutrition counselling sessions and attendance barriers",
      "Child-led health committee activities and hygiene peer education",
      "Water source testing and storage sanitation",
    ],
    outOfScope: [
      "Curriculum syllabus revisions outside health and nutrition modules",
      "Secondary education facilities outside District 4 pilot cluster",
      "Municipal water grid construction or large-scale civil engineering",
      "Regional agricultural food pricing and national import subsidies",
    ],
    assumptions: [
      "Academic terms proceed without extended emergency closures",
      "District health clinic maintains nurse visits for quarterly anthropometric verification",
      "Caregivers provide transparent family composition details during home visits",
    ],
    constraints: [
      "Frequent rural power outages impacting refrigerated medicine and dairy storage",
      "Lack of formalized digital patient records linking school health cards to clinic databases",
      "Severe road flooding during monsoon weeks limiting food delivery access to School C",
    ],
    plannedMethods: [
      {
        method: "Key Informant Interview",
        plannedCount: 10,
        description: "School headmasters, district health officers, and lead nurses",
      },
      {
        method: "Direct Observation",
        plannedCount: 6,
        description: "Kitchen prep, water points, student meal queues, and handwashing stations",
      },
      {
        method: "Focus Group Discussion",
        plannedCount: 8,
        description: "Mother caregivers, father circles, and student health committees",
      },
      {
        method: "Document Review",
        plannedCount: 4,
        description: "Kitchen delivery logs, health screening records, and referral rosters",
      },
    ],
  },
  framework: {
    name: "School Health & Nutrition Systemic Assessment Framework",
    description:
      "Analytical framework examining nutritional equity, clinical validity, food safety infrastructure, and community ownership.",
    themes: [
      {
        id: "NUT-THM-1",
        name: "Targeting Precision & Inclusivity",
        shortLabel: "Targeting",
        description: "Effectiveness of vulnerability indicators in capturing children at risk while minimizing exclusion.",
        guidingQuestion: "How accurately do current criteria reach the most vulnerable children?",
        order: 1,
        isActive: true,
      },
      {
        id: "NUT-THM-2",
        name: "Food Safety & Cold-Chain Integrity",
        shortLabel: "Food Safety",
        description: "Kitchen hygiene, storage adequacy, clean water access, and food handling standards.",
        guidingQuestion: "What physical and procedural factors safeguard food from contamination?",
        order: 2,
        isActive: true,
      },
      {
        id: "NUT-THM-3",
        name: "Caregiver & Gender Dynamics",
        shortLabel: "Caregivers",
        description: "Gender division of household care, clinic visit completion, and parental engagement barriers.",
        guidingQuestion: "How do household gender roles shape uptake of nutritional recommendations?",
        order: 3,
        isActive: true,
      },
      {
        id: "NUT-THM-4",
        name: "Child-Led Health Agency",
        shortLabel: "Child Agency",
        description: "Student committee participation, peer influence, and child safeguarding.",
        guidingQuestion: "How safely and effectively do children advocate for hygiene among peers?",
        order: 4,
        isActive: true,
      },
      {
        id: "NUT-THM-5",
        name: "Referral & Health System Linkages",
        shortLabel: "Referrals",
        description: "Follow-up rate between school screening diagnosis and primary clinic treatment.",
        guidingQuestion: "Where do clinic referral loops break down and why?",
        order: 5,
        isActive: true,
      },
    ],
  },
  teamRoles: [
    {
      id: "NUT-ROLE-1",
      role: "lead",
      actor: { kind: "human", displayName: "Tariq Vance" },
      notes: "Senior Child Wellbeing Specialist, overall inquiry lead",
    },
    {
      id: "NUT-ROLE-2",
      role: "researcher",
      actor: { kind: "human", displayName: "Amina Kassam" },
      notes: "Public Health Researcher, clinical screening and kitchen inspection notes",
    },
    {
      id: "NUT-ROLE-3",
      role: "researcher",
      actor: { kind: "human", displayName: "David Ochieng" },
      notes: "Community Mobilizer, caregiver focus groups and interview notes",
    },
    {
      id: "NUT-ROLE-4",
      role: "debrief_supervisor",
      actor: { kind: "human", displayName: "Tariq Vance" },
      notes: "Daily field debrief facilitation and priority alignment",
    },
    {
      id: "NUT-ROLE-5",
      role: "reviewer",
      actor: { kind: "human", displayName: "Dr. Sarah Jenkins" },
      notes: "Epidemiological Data Reviewer, screening threshold verification",
    },
    {
      id: "NUT-ROLE-6",
      role: "analyst",
      actor: { kind: "human", displayName: "Farah Nour" },
      notes: "Nutrition Data Analyst, inter-school comparative synthesis",
    },
    {
      id: "NUT-ROLE-7",
      role: "validator",
      actor: { kind: "human", displayName: "Dr. Laila Al-Mansoor" },
      notes: "Senior Methodology Validator, peer audit of recommendations",
    },
    {
      id: "NUT-ROLE-8",
      role: "approver",
      actor: { kind: "human", displayName: "Director General, District Education" },
      notes: "Institutional Stakeholder Approver",
    },
  ],
  sources: [
    {
      id: "SRC-NUT-001",
      title: "Staff interview, School A, targeted nutrition model",
      sourceType: "Key informant interview",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-10",
      stakeholderType: "School staff and administrators",
      location: "School A",
      summary:
        "Interview with School A staff discussing targeting criteria, exclusion of highly vulnerable families without health papers, and local targeting evolution.",
      sensitivityFlag: "Low"
    },
    {
      id: "SRC-NUT-002",
      title: "Child focus group, School A, food preference and water concerns",
      sourceType: "Focus group discussion",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-11",
      stakeholderType: "Child participants (Ages 8-12)",
      location: "School A",
      summary:
        "Discussion with children regarding meal preferences, lack of clean water during lunch, and stomach concerns regarding stored food items.",
      sensitivityFlag: "Medium"
    },
    {
      id: "SRC-NUT-003",
      title: "Social worker interview, School A, parent awareness and caregiver roles",
      sourceType: "Key informant interview",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-12",
      stakeholderType: "School social workers",
      location: "School A",
      summary:
        "Interview exploring parent attendance at sessions, gendered caring responsibilities, and financial barriers to implementing diet recommendations at home.",
      sensitivityFlag: "Low"
    },
    {
      id: "SRC-NUT-004",
      title: "Staff interview, School B, universal hot meal implementation",
      sourceType: "Key informant interview",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-15",
      stakeholderType: "School staff and volunteer parents",
      location: "School B",
      summary:
        "Assessment of hot meal implementation, reliance on volunteer cooking staff, and scheduling delays due to agricultural labor priorities.",
      sensitivityFlag: "Low"
    },
    {
      id: "SRC-NUT-005",
      title: "Child focus group, School B, food safety and peer monitoring",
      sourceType: "Focus group discussion",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-16",
      stakeholderType: "Child participants (Ages 10-14)",
      location: "School B",
      summary:
        "Children reflecting on queue management, roles of peer monitors, and issues of bullying by older students when enforcing hygiene rules.",
      sensitivityFlag: "Medium"
    },
    {
      id: "SRC-NUT-006",
      title: "Observation, School B, storage and eating space constraints",
      sourceType: "Field observation log",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-17",
      stakeholderType: "Field monitors",
      location: "School B",
      summary:
        "Physical inspection of food storage conditions, lack of refrigeration/ventilation, and eating area constraints (children eating at classroom desks or stairs).",
      sensitivityFlag: "Medium"
    },
    {
      id: "SRC-NUT-007",
      title: "Staff interview, School C, screening and awareness activities",
      sourceType: "Key informant interview",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-20",
      stakeholderType: "Teachers and healthcare coordinators",
      location: "School C",
      summary:
        "Review of annual medical screenings, lack of clinic supplies for severe cases, and expectations of teachers delivering nutrition content without training.",
      sensitivityFlag: "Low"
    },
    {
      id: "SRC-NUT-008",
      title: "Child session, School C, child participation and awareness tools",
      sourceType: "Observation of activity",
      materialCategory: "primary_evidence",
      audit: DEMO_AUDIT,
      date: "2026-03-21",
      stakeholderType: "Child health committee members",
      location: "School C",
      summary:
        "Review of child-led hygiene awareness session, poster making, and peer education activities.",
      sensitivityFlag: "None"
    }
  ],
  evidence: [
    {
      id: "EV-NUT-001",
      sourceId: "SRC-NUT-001",
      stakeholderType: "School staff and administrators",
      rawEvidence:
        "Targeting relies primarily on health clinic data, but staff note that families with high social vulnerability are frequently excluded because they lack official medical records.",
      primaryTheme: "Targeting and vulnerability assessment",
      secondaryTheme: "Exclusion Risk",
      evidenceStrength: "High",
      sensitivityFlag: "Low",
      potentialFinding:
        "Relying solely on medical documentation for nutrition targeting creates exclusion risks for socially vulnerable families.",
      qaStatus: "Reviewed"
    },
    {
      id: "EV-NUT-002",
      sourceId: "SRC-NUT-002",
      stakeholderType: "Child participants (Ages 8-12)",
      rawEvidence:
        "Children stated they often skip eating the dry snack options because there is no clean water supply available in the school eating area during the lunch period.",
      primaryTheme: "Food acceptability and water safety",
      secondaryTheme: "Water Access",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      potentialFinding:
        "A lack of accessible clean drinking water in the eating area negatively affects children's meal consumption.",
      qaStatus: "Reviewed"
    },
    {
      id: "EV-NUT-003",
      sourceId: "SRC-NUT-003",
      stakeholderType: "School social workers",
      rawEvidence:
        "PTA nutrition awareness sessions are attended exclusively by mothers; fathers do not attend and consider school nutrition a female domestic task.",
      primaryTheme: "Gendered household caregiver roles",
      secondaryTheme: "Father Engagement",
      evidenceStrength: "High",
      sensitivityFlag: "Low",
      potentialFinding:
        "School-level caregiver engagement is highly gendered, with fathers completely absent from nutrition awareness sessions.",
      qaStatus: "Reviewed"
    },
    {
      id: "EV-NUT-004",
      sourceId: "SRC-NUT-008",
      stakeholderType: "Child health committee members",
      rawEvidence:
        "The child-led health committee designed and displayed handwashing posters, which teachers reported led to higher handwashing frequency before meals.",
      primaryTheme: "Child participation mechanisms",
      secondaryTheme: "Hygiene Messaging",
      evidenceStrength: "Medium",
      sensitivityFlag: "None",
      potentialFinding:
        "Child-led committee initiatives can successfully promote mealtime hygiene behaviors among peers.",
      qaStatus: "Reviewed"
    },
    {
      id: "EV-NUT-005",
      sourceId: "SRC-NUT-006",
      stakeholderType: "Field monitors",
      rawEvidence:
        "Food items are kept in a small, unventilated classroom cupboard without refrigeration, showing visible signs of heat degradation during afternoon visits.",
      primaryTheme: "School infrastructure and storage constraints",
      secondaryTheme: "Food Storage Safety",
      evidenceStrength: "High",
      sensitivityFlag: "Medium",
      potentialFinding:
        "Inadequate ventilation and lack of cold storage facilities pose immediate food safety risks.",
      qaStatus: "Reviewed"
    },
    {
      id: "EV-NUT-006",
      sourceId: "SRC-NUT-004",
      stakeholderType: "School staff and volunteer parents",
      rawEvidence:
        "Universal hot meals are regularly delayed or simplified because preparation relies on volunteer mothers who must prioritize seasonal harvest work.",
      primaryTheme: "Volunteer capacity and training",
      secondaryTheme: "Labor Constraints",
      evidenceStrength: "Medium",
      sensitivityFlag: "Low",
      potentialFinding:
        "Reliance on parent volunteers for meal preparation leads to operational delays during peak agricultural seasons.",
      qaStatus: "Reviewed"
    },
    {
      id: "EV-NUT-007",
      sourceId: "SRC-NUT-007",
      stakeholderType: "Teachers and healthcare coordinators",
      rawEvidence:
        "Annual screenings identify moderate malnutrition in students, but referral forms sent to local clinics go unanswered due to lack of supplies and staff.",
      primaryTheme: "Targeting and vulnerability assessment",
      secondaryTheme: "Referral Pathways",
      evidenceStrength: "Medium",
      sensitivityFlag: "Medium",
      potentialFinding:
        "Malnutrition screening is undermined by unclosed referral loops and resource constraints at local health clinics.",
      qaStatus: "Needs Review"
    },
    {
      id: "EV-NUT-008",
      sourceId: "SRC-NUT-005",
      stakeholderType: "Child participants (Ages 10-14)",
      rawEvidence:
        "Peer monitors checking queue order and handwashing stated that older boys occasionally push past them and mock their monitoring role.",
      primaryTheme: "Child participation mechanisms",
      secondaryTheme: "Peer Monitoring Safeguards",
      evidenceStrength: "Medium",
      sensitivityFlag: "Medium",
      potentialFinding:
        "Peer monitoring systems require adult supervision to protect child monitors from peer harassment.",
      qaStatus: "Reviewed"
    },
    {
      id: "EV-NUT-009",
      sourceId: "SRC-NUT-002",
      stakeholderType: "Child participants (Ages 8-12)",
      rawEvidence:
        "Four children reported minor stomach upsets after consuming unpackaged dairy products stored in non-sealed plastic bins.",
      primaryTheme: "Food acceptability and water safety",
      secondaryTheme: "Foodborne Illness Risk",
      evidenceStrength: "Medium",
      sensitivityFlag: "High",
      potentialFinding:
        "Serving unpackaged, improperly stored dairy products creates immediate health and safety concerns for children.",
      qaStatus: "Warning"
    },
    {
      id: "EV-NUT-010",
      sourceId: "SRC-NUT-003",
      stakeholderType: "School social workers",
      rawEvidence:
        "Social workers report that families choose low-cost, processed foods for children at home because raw fresh ingredients are financially inaccessible.",
      primaryTheme: "Gendered household caregiver roles",
      secondaryTheme: "Household Economics",
      evidenceStrength: "Medium",
      sensitivityFlag: "None",
      potentialFinding:
        "Financial barriers prevent parents from applying school-based nutritional guidance at home.",
      qaStatus: "Reviewed"
    },
    {
      id: "EV-NUT-011",
      sourceId: "SRC-NUT-006",
      stakeholderType: "Field monitors",
      rawEvidence:
        "Due to the absence of a canteen or dining room, children eat lunches at their desks or sitting on the dust-covered outdoor staircase.",
      primaryTheme: "School infrastructure and storage constraints",
      secondaryTheme: "Dining Environment",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      potentialFinding:
        "The lack of a clean, dedicated dining space forces children to eat in unhygienic school spaces.",
      qaStatus: "Reviewed"
    },
    {
      id: "EV-NUT-012",
      sourceId: "SRC-NUT-007",
      stakeholderType: "Teachers and healthcare coordinators",
      rawEvidence:
        "Teachers are instructed to deliver weekly nutrition lessons but state they have never received training materials or guidelines on the topic.",
      primaryTheme: "Volunteer capacity and training",
      secondaryTheme: "Teacher Readiness",
      evidenceStrength: "High",
      sensitivityFlag: "Low",
      potentialFinding:
        "Teachers are expected to deliver nutrition curriculum without training, leading to inconsistent messaging.",
      qaStatus: "Reviewed"
    }
  ],
  findings: [
    {
      id: "FND-NUT-001",
      statement:
        "Nutrition programming appears stronger where targeting combines health data with vulnerability information rather than relying only on generic meal provision.",
      explanation:
        "Staff interview data confirms that medical targeting parameters exclude highly vulnerable families who lack clinics/records. In addition, health screenings fail to close loops because referral clinics are under-resourced.",
      supportingEvidenceIds: ["EV-NUT-001", "EV-NUT-007"],
      contradictoryEvidence:
        "Clinic data is accurate for those enrolled, but fails to capture the unregistered population.",
      evidenceStrength: "High",
      programmeImplication:
        "Targeting and screening processes must integrate community social-worker assessments to capture vulnerable out-of-system children.",
      linkedRecommendationIds: ["REC-NUT-001", "REC-NUT-007"]
    },
    {
      id: "FND-NUT-002",
      statement:
        "Food acceptability, water quality, and menu suitability influence children’s engagement with school nutrition programming.",
      explanation:
        "Children report skipping dry meals when clean drinking water is unavailable. Crucially, serving unpackaged dairy items that are stored in open bins has caused reported stomach issues, leading to fear and attendance drops.",
      supportingEvidenceIds: ["EV-NUT-002", "EV-NUT-009"],
      contradictoryEvidence:
        "Children value the program but select meals based on food safety and thirst avoidance.",
      evidenceStrength: "High",
      programmeImplication:
        "The program must couple snack delivery with safe water provision and mandate packaged-only food storage.",
      linkedRecommendationIds: ["REC-NUT-004", "REC-NUT-008"]
    },
    {
      id: "FND-NUT-003",
      statement:
        "Nutrition responsibility at household level is strongly gendered, with mothers more involved in awareness activities while fathers are often less engaged.",
      explanation:
        "PTA attendance logs show absolute maternal representation with no fathers participating, under the belief that nutrition is a domestic task. However, household economics limit mothers' capacity to apply guidance.",
      supportingEvidenceIds: ["EV-NUT-003", "EV-NUT-010"],
      contradictoryEvidence:
        "Fathers control household finances but are disconnected from direct nutrition education sessions.",
      evidenceStrength: "High",
      programmeImplication:
        "Nutrition awareness campaigns must specifically target fathers, framing nutrition around household productivity and health.",
      linkedRecommendationIds: ["REC-NUT-002"]
    },
    {
      id: "FND-NUT-004",
      statement:
        "Child-led mechanisms such as health groups, school committees, and visual awareness activities can strengthen nutrition messaging when properly supervised.",
      explanation:
        "Child-led poster designs successfully increased hygiene behavior. However, child monitors enforcing rules face bullying and mocking by older students when adult supervision is absent.",
      supportingEvidenceIds: ["EV-NUT-004", "EV-NUT-008"],
      contradictoryEvidence:
        "Child health committees are highly motivated but lack the authority to handle older peers without staff presence.",
      evidenceStrength: "Medium",
      programmeImplication:
        "Child-led initiatives should be paired with adult teacher sponsors to ensure safety and authority.",
      linkedRecommendationIds: ["REC-NUT-003", "REC-NUT-008"]
    },
    {
      id: "FND-NUT-005",
      statement:
        "Infrastructure gaps, including storage, refrigeration, electricity, and safe eating spaces, create food safety and implementation risks.",
      explanation:
        "Observation notes show food stored in unventilated cupboards experiencing heat spoilage. Furthermore, lacking canteens forces children to eat on dusty classroom desks or stairs, creating biological contamination risks.",
      supportingEvidenceIds: ["EV-NUT-005", "EV-NUT-011"],
      contradictoryEvidence:
        "Universal meal quotas are delivered, but lack of physical eating infrastructure undermines hygiene.",
      evidenceStrength: "High",
      programmeImplication:
        "Program design must allocate budget for storage upgrades and hygienic dining shelters, treating them as core quality elements.",
      linkedRecommendationIds: ["REC-NUT-005"]
    },
    {
      id: "FND-NUT-006",
      statement:
        "Reliance on non-specialist staff or volunteers limits the quality and sustainability of nutrition support.",
      explanation:
        "Universal hot meals experience disruptions because they rely on volunteer parent labor during harvest seasons. Additionally, teachers are expected to teach nutrition classes without receiving guidelines or training.",
      supportingEvidenceIds: ["EV-NUT-006", "EV-NUT-012"],
      contradictoryEvidence:
        "Volunteers and teachers show goodwill, but lack structural support and capacity tools.",
      evidenceStrength: "High",
      programmeImplication:
        "Establish standardized teacher training guides and coordinate volunteer scheduling around agricultural livelihood shifts.",
      linkedRecommendationIds: ["REC-NUT-006", "REC-NUT-007"]
    }
  ],
  lessons: [
    {
      id: "LES-NUT-001",
      statement:
        "Targeting systems work better when health screening is combined with social vulnerability analysis.",
      whatWorkedOrDidNotWork:
        "Generic clinic rosters failed to identify out-of-system children. Integrating health screenings with local social worker assessments increased inclusion of vulnerable households.",
      whyItHappened:
        "Families facing extreme marginalization often lack administrative documents required to access clinics.",
      conditionsRequired:
        "Collaborative criteria between school social workers, health officers, and community focal points.",
      evidenceBase: ["EV-NUT-001", "EV-NUT-007"],
      linkedFindingIds: ["FND-NUT-001"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Highly transferable to nutrition and school health projects in low-documentation contexts."
    },
    {
      id: "LES-NUT-002",
      statement:
        "School meals alone are not enough; caregiver awareness and home food practices shape programme outcomes.",
      whatWorkedOrDidNotWork:
        "Educating mothers alone did not shift home diets due to budget limits. Engaging fathers (financial gatekeepers) alongside maternal figures is required to support dietary improvements.",
      whyItHappened:
        "Fathers control household budget allocation but were excluded by nutrition messages framed as domestic.",
      conditionsRequired:
        "Livelihood-friendly training times, father-inclusive framing, and low-literacy materials.",
      evidenceBase: ["EV-NUT-003", "EV-NUT-010"],
      linkedFindingIds: ["FND-NUT-003"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Relevant for all domestic health and education initiatives with highly gendered household divisions."
    },
    {
      id: "LES-NUT-003",
      statement:
        "Children can identify practical barriers and communication methods when they are engaged through child-friendly participation tools.",
      whatWorkedOrDidNotWork:
        "Child-led poster designs successfully increased hygiene. However, peer queue-monitoring failed when child monitors faced bullying without adult teacher backing.",
      whyItHappened:
        "Children respond well to peer-group modeling but lack authority to resolve social hierarchy conflicts.",
      conditionsRequired:
        "Adult supervision fallback, clear peer-monitor guidelines, and positive reinforcement.",
      evidenceBase: ["EV-NUT-004", "EV-NUT-008"],
      linkedFindingIds: ["FND-NUT-004"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Transferable to peer-education or child-led hygiene components in primary education."
    },
    {
      id: "LES-NUT-004",
      statement:
        "Food safety infrastructure should be treated as a programme quality issue, not only as logistics.",
      whatWorkedOrDidNotWork:
        "Storing unpackaged cheese in hot, unventilated rooms led to heat spoilage and child illnesses. Standardizing packaged portions and building shade shelters reduced stomach complaints.",
      whyItHappened:
        "High summer temperatures and unventilated storage space degrade raw dairy products rapidly.",
      conditionsRequired:
        "Ventilated cupboards, cold-chain checks, and sealed packaging standards.",
      evidenceBase: ["EV-NUT-005", "EV-NUT-009", "EV-NUT-011"],
      linkedFindingIds: ["FND-NUT-002", "FND-NUT-005"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Critical for school feeding programs operating in warm climates with limited electricity grid infrastructure."
    },
    {
      id: "LES-NUT-005",
      statement:
        "Gender and age patterns affect both participation and continuity of nutritional support.",
      whatWorkedOrDidNotWork:
        "Expected parent volunteer contributions broke down during harvest periods due to gendered agricultural labor constraints.",
      whyItHappened:
        "Mothers who volunteer for preparation also carry heavy harvest and domestic work duties.",
      conditionsRequired:
        "Adaptive seasonal rosters, buffer food stocks, and stipend-based cooking positions.",
      evidenceBase: ["EV-NUT-006", "EV-NUT-012"],
      linkedFindingIds: ["FND-NUT-006"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      transferability:
        "Transferable to community-led programs relying on volunteer community labor."
    }
  ],
  goodPractices: [
    {
      id: "GP-NUT-001",
      title: "Health-informed targeting system",
      description:
        "Establish a joint targeting committee composed of school social workers and clinic staff to screen and register children based on both social vulnerability and clinical malnutrition markers.",
      whyItWorked:
        "It bypassed documentation barriers, catching marginalized children who lacked clinic health cards.",
      evidenceBase: ["EV-NUT-001", "EV-NUT-007"],
      linkedFindingIds: ["FND-NUT-001"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      conditionsForReplication:
        "Social worker presence, standardized vulnerability checklists, and local clinic cooperation.",
      risksLimits:
        "Requires data confidentiality safeguards regarding medical status of families.",
      recommendedUse:
        "Default model for school nutrition programs in high-vulnerability rural districts."
    },
    {
      id: "GP-NUT-002",
      title: "Child-led nutrition awareness groups",
      description:
        "Empower child health committees to design hygiene posters and lead peer handwashing activities, backed by adult teacher advisors.",
      whyItWorked:
        "Peer-designed posters were more relatable than standard agency templates, increasing handwashing rates.",
      evidenceBase: ["EV-NUT-004", "EV-NUT-008"],
      linkedFindingIds: ["FND-NUT-004"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      conditionsForReplication:
        "Simple art materials, active teacher coordinators, and clear peer guidelines.",
      risksLimits:
        "Must avoid burdening children or placing them in disciplinary roles over older peers.",
      recommendedUse:
        "Use in schools to foster active hygiene habits and leadership skills."
    },
    {
      id: "GP-NUT-003",
      title: "Visual and story-based nutrition education",
      description:
        "Develop visual, picture-led nutrition guides showing budget-friendly healthy snack combinations for low-literacy caregivers.",
      whyItWorked:
        "Allowed parents to easily understand and prepare alternative nutritious options within tight budget limits.",
      evidenceBase: ["EV-NUT-003", "EV-NUT-010"],
      linkedFindingIds: ["FND-NUT-003"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      conditionsForReplication:
        "Professional graphic designer, local cost-of-living market research, and community facilitators.",
      risksLimits:
        "Visual guides cannot resolve deep food-insecurity without cash-transfer support.",
      recommendedUse:
        "Use during PTA and caregiver community sessions to make dietary guidance practical."
    },
    {
      id: "GP-NUT-004",
      title: "Integrated school-level evidence tracking",
      description:
        "Use a simple notebook log kept by school social workers linking meal delivery counts, child attendance, food safety issues, and referral statuses.",
      whyItWorked:
        "It provided an early warning for food safety issues (such as dairy spoilage) before they led to wide outbreaks.",
      evidenceBase: ["EV-NUT-005", "EV-NUT-009"],
      linkedFindingIds: ["FND-NUT-002", "FND-NUT-005"],
      lineageStatus: "resolved",
      audit: DEMO_AUDIT,
      conditionsForReplication:
        "Standardized log template, monthly review routines, and clear focal point.",
      risksLimits:
        "Requires consistent data logging discipline by school-level coordinators.",
      recommendedUse:
        "Deploy in all schools as a low-cost, decentralized quality and safety tracking ledger."
    }
  ],
  recommendations: [
    {
      id: "REC-NUT-001",
      recommendation:
        "Strengthen screening and referral pathways for children with nutrition-related needs by establishing joint school-clinic registration protocols.",
      linkedFindingId: "FND-NUT-001",
      linkedFindingIds: ["FND-NUT-001"],
      linkedLessonIds: ["LES-NUT-001"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-NUT-001", "EV-NUT-007"],
      responsibleActor: "School health director and local clinic manager",
      priority: "High",
      timeframe: "Within one month",
      feasibility: "Medium",
      riskSensitivity:
        "Requires strict data confidentiality so child health records are not exposed to peers.",
      expectedBenefit:
        "Closing the referral loop for severely malnourished children, ensuring they receive clinical supply packages.",
      successIndicator:
        "At least 90% of children flagged during school screening have documented clinic follow-ups."
    },
    {
      id: "REC-NUT-002",
      recommendation:
        "Introduce low-literacy caregiver nutrition sessions with attention to both mothers and fathers, adapting scheduling to avoid farming hours.",
      linkedFindingId: "FND-NUT-003",
      linkedFindingIds: ["FND-NUT-003"],
      linkedLessonIds: ["LES-NUT-002"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-NUT-003", "EV-NUT-010"],
      responsibleActor: "School social worker and community outreach coordinators",
      priority: "High",
      timeframe: "Next quarter",
      feasibility: "High",
      riskSensitivity:
        "Low risk; sessions must respect household financial limits and avoid unrealistic food recommendations.",
      expectedBenefit:
        "Increased father participation in nutrition education, leading to better family budget allocation for fresh foods.",
      successIndicator:
        "At least 35% attendance of fathers/male guardians at school nutrition workshops."
    },
    {
      id: "REC-NUT-003",
      recommendation:
        "Create child-friendly visual nutrition awareness materials and supply art materials to child health committees.",
      linkedFindingId: "FND-NUT-004",
      linkedFindingIds: ["FND-NUT-004"],
      linkedLessonIds: ["LES-NUT-003"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-NUT-004"],
      responsibleActor: "Curriculum developer and school arts coordinator",
      priority: "Medium",
      timeframe: "Within two months",
      feasibility: "High",
      riskSensitivity:
        "Ensure child participation remains positive and does not replace regular classroom instruction hours.",
      expectedBenefit:
        "More active child engagement and peer-led hygiene reinforcing school health rules.",
      successIndicator:
        "Child-led committees present hygiene awareness posters in at least 4 assembly sessions."
    },
    {
      id: "REC-NUT-004",
      recommendation:
        "Review menus for acceptability, safety, and dietary restrictions, moving away from loose dairy to sealed single-portion items.",
      linkedFindingId: "FND-NUT-002",
      linkedFindingIds: ["FND-NUT-002"],
      linkedLessonIds: ["LES-NUT-004"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-NUT-002", "EV-NUT-009"],
      responsibleActor: "Nutrition supervisor and procurement officer",
      priority: "High",
      timeframe: "Immediate",
      feasibility: "High",
      riskSensitivity:
        "Transition must avoid increasing plastic waste; prioritize eco-friendly sealed alternatives.",
      expectedBenefit:
        "Immediate reduction in food safety incidents and improved student attendance.",
      successIndicator:
        "All dairy foods are transitioned to sealed, single-portion packages with zero foodborne illness reports."
    },
    {
      id: "REC-NUT-005",
      recommendation:
        "Improve school refrigeration, storage, ventilation, and establish dedicated safe eating spaces.",
      linkedFindingId: "FND-NUT-005",
      linkedFindingIds: ["FND-NUT-005"],
      linkedLessonIds: ["LES-NUT-004"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-NUT-005", "EV-NUT-011"],
      responsibleActor: "Logistics officer and engineering team",
      priority: "High",
      timeframe: "Within three months",
      feasibility: "Medium",
      riskSensitivity:
        "Requires coordination with local education authorities and budget allocations for capital construction.",
      expectedBenefit:
        "Protection of meal storage from heat degradation and hygienic dining space for students.",
      successIndicator:
        "Ventilated food storage rooms constructed and dining shelter structures installed."
    },
    {
      id: "REC-NUT-006",
      recommendation:
        "Clarify minimum training and role expectations for teachers or volunteers supporting nutrition delivery.",
      linkedFindingId: "FND-NUT-006",
      linkedFindingIds: ["FND-NUT-006"],
      linkedLessonIds: ["LES-NUT-005"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-NUT-012"],
      responsibleActor: "Ministry of Education trainer and school principal",
      priority: "Medium",
      timeframe: "Next training cycle",
      feasibility: "High",
      riskSensitivity:
        "Must avoid overloading teachers with extra tasks without adequate recognition or support.",
      expectedBenefit:
        "Standardized, high-quality nutrition messages delivered in classrooms.",
      successIndicator:
        "All teachers receive the nutrition guide and complete a one-day training seminar."
    },
    {
      id: "REC-NUT-007",
      recommendation:
        "Establish a simple monitoring tool linking attendance, meal delivery, child feedback, and follow-up needs.",
      linkedFindingId: "FND-NUT-001",
      linkedFindingIds: ["FND-NUT-001"],
      linkedLessonIds: ["LES-NUT-001"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-NUT-006", "EV-NUT-007"],
      responsibleActor: "MEL coordinator and school registrar",
      priority: "Medium",
      timeframe: "Within one month",
      feasibility: "High",
      riskSensitivity:
        "Low risk; requires simple registers and school social-worker buy-in.",
      expectedBenefit:
        "Real-time monitoring of program participation gaps and seasonal drops.",
      successIndicator:
        "Integrated monitoring registry updated weekly and reviewed during monthly staff meetings."
    },
    {
      id: "REC-NUT-008",
      recommendation:
        "Add safeguarding-sensitive review steps for health-related meal risks and child feedback, ensuring adult backup.",
      linkedFindingId: "FND-NUT-004",
      linkedFindingIds: ["FND-NUT-004"],
      linkedLessonIds: ["LES-NUT-003"],
      audit: DEMO_AUDIT,
      evidenceBase: ["EV-NUT-008", "EV-NUT-009"],
      responsibleActor: "Safeguarding advisor and school principal",
      priority: "High",
      timeframe: "Immediate",
      feasibility: "High",
      riskSensitivity:
        "Crucial; children reporting safety issues must be protected from retaliation or peer bullying.",
      expectedBenefit:
        "Safer child participation and rapid response to foodborne illness concerns.",
      successIndicator:
        "An adult teacher advisor is assigned to peer committees and a child-safe feedback box is operational."
    }
  ]
};
