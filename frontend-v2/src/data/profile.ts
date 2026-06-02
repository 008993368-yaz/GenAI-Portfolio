/* Single typed source of truth for all portfolio content.
   Edit copy here; every component reads from this file. */

export interface SkillGroup {
  label: string;
  short: string;
  items: string[];
}

export interface Experience {
  role: string;
  company: string;
  location: string;
  period: string;
  bullets: string[];
}

export interface Project {
  index: string;
  name: string;
  tagline: string;
  description: string;
  tech: string[];
  score: number; // pseudo relevance, 0..1
  vector: string;
}

export interface Education {
  school: string;
  degree: string;
  detail: string;
  period: string;
  location: string;
}

export interface SearchEntry {
  id: string; // DOM id to scroll to
  label: string; // human label of the matched section
  type: string; // shown in the readout
  keywords: string[];
}

export const profile = {
  name: "Yazhini Elanchezhian",
  handle: "yazhini.systems",
  initials: "YE",
  role: "Full-stack & GenAI Engineer",
  location: "Redlands, CA",
  email: "yazhini.elanchezhian3368@coyote.csusb.edu",
  phone: "+1 909-871-6890",
  build: "csusb · 2026",

  hero: {
    kicker: "full-stack & gen-ai engineer · redlands ca",
    headStart: "I build software that ",
    headVerbs: ["retrieves", "reasons", "responds"],
    placeholder: "ask my corpus…",
    // Seeded sample exchange shown in the mobile hero before the visitor asks.
    demo: {
      q: "describe yourself",
      a: "I'm Yazhini — an agentic engineer who builds intelligent software end to end, from the agents that reason to the interfaces and cloud around them. I turn ideas into products that are fast, reliable, and genuinely useful.",
      ms: 240,
    },
    // Starter chips: a short label shown, a fuller query sent to the assistant.
    // Desktop shows all three; mobile shows the first two.
    chips: [
      { label: "Experience", q: "Tell me about your experience" },
      { label: "Skills", q: "What's your strongest tech stack?" },
      { label: "Projects", q: "What projects have you built?" },
    ],
  },

  about: {
    // Spoken prompt above the pipeline.
    prompt: "how i build →",
    // Signal-flow stages: brand verb + the real tech behind it. The last
    // stage renders as the pipeline's glowing output (decided by position).
    pipeline: [
      { verb: "retrieves", tech: "pinecone · semantic search" },
      { verb: "reasons", tech: "langchain · agents" },
      { verb: "responds", tech: "fastapi → react" },
    ],
    // Footer line under the pipeline.
    values: "grounded · fast · genuinely useful",
    // Visually-hidden narrative for screen readers + SEO (keeps the prose).
    summary:
      "Full-stack engineer building retrieval-augmented AI: retrieves with Pinecone and semantic search, reasons with LangChain and agents, responds through FastAPI and React — grounded, fast, and genuinely useful.",
  },

  // Config-style manifest shown in the About / context block
  manifest: [
    { k: "focus", v: "rag · semantic search · agents" },
    { k: "now", v: "m.s. computer science, csusb" },
    { k: "prev", v: "engineer @ accenture, 3 yrs" },
    { k: "status", v: "open to summer 2026 internships" },
  ],

  // Compact monospace metrics strip (not big stat cards)
  metrics: [
    { k: "cgpa", v: "4.0" },
    { k: "tenure", v: "3yr" },
    { k: "coverage", v: "90%" },
    { k: "api-latency", v: "-30%" },
  ],

  skills: [
    {
      label: "Languages",
      short: "lang",
      items: ["Python", "JavaScript", "TypeScript", "C#", "HTML5", "CSS / SASS"],
    },
    {
      label: "Frameworks",
      short: "fw",
      items: ["React", "Angular", ".NET MVC", "FastAPI", "LangChain", "Docker"],
    },
    {
      label: "Cloud & Data",
      short: "infra",
      items: [
        "AWS Lambda",
        "CloudWatch",
        "Azure Functions",
        "MySQL",
        "Cosmos DB",
        "Pinecone",
      ],
    },
    {
      label: "Tools",
      short: "tools",
      items: ["Git", "Postman", "Power BI", "Power Apps", "Power Automate", "AEM"],
    },
    {
      label: "Testing",
      short: "test",
      items: ["Jest", "Jasmine", "XUnit", "Agile / Scrum"],
    },
  ] as SkillGroup[],

  experience: [
    {
      role: "Advanced Application Engineering Analyst",
      company: "Accenture",
      location: "India",
      period: "Aug 2022 – May 2025",
      bullets: [
        "Integrated AWS Lambda with a single-page application, connecting AEM backend data flows to frontend systems and cutting API response time by 30% through optimized cloud functions.",
        "Built responsive web apps in HTML5, SASS, and JavaScript with mobile-first, cross-browser focus, lifting user engagement metrics by 15%.",
        "Engineered an end-to-end GenAI automation pipeline that extracts from AEM, transforms with Azure Functions, and stores in Cosmos DB, cutting manual processing effort by 90%.",
        "Shipped a custom Power App with Power BI dashboards and Power Automate workflows, giving 50+ stakeholders real-time analytics and automated reporting.",
        "Drove a unit-testing strategy with Jest, Jasmine, and XUnit across Angular and .NET, reaching 90% coverage and cutting post-release defects by 25%.",
      ],
    },
  ] as Experience[],

  projects: [
    {
      index: "01",
      name: "Gen-AI Portfolio",
      tagline: "a portfolio you can query in natural language",
      description:
        "A full-stack portfolio with a React frontend and an embedded AI chatbot for natural-language questions about my background. The FastAPI + LangChain backend runs semantic search over resume data in Pinecone, with conversation memory and guardrails for off-topic queries.",
      tech: ["React", "FastAPI", "LangChain", "Pinecone", "OpenAI"],
      score: 0.97,
      vector: "0x1a4f",
    },
    {
      index: "02",
      name: "ScholarBot",
      tagline: "an agent that searches the library for you",
      description:
        "A Streamlit assistant built on LangGraph that parses natural-language queries into search parameters and calls the CSUSB library API for articles, books, journals, and dissertations. Stateful multi-turn conversations retain context across a session via InMemorySaver.",
      tech: ["LangGraph", "LangChain", "Streamlit", "Python"],
      score: 0.91,
      vector: "0x2b7c",
    },
  ] as Project[],

  education: [
    {
      school: "California State University, San Bernardino",
      degree: "M.S. Computer Science",
      detail: "cgpa 4.0 / 4.0",
      period: "Aug 2025 – May 2027",
      location: "San Bernardino, CA",
    },
    {
      school: "SASTRA Deemed University",
      degree: "B.Tech, Information & Communication Technology",
      detail: "cgpa 7.43 / 10",
      period: "Jul 2018 – Jul 2022",
      location: "India",
    },
  ] as Education[],

  // Styled placeholders — swap href values when links are ready.
  links: [
    { label: "github", href: "#", placeholder: true },
    { label: "linkedin", href: "#", placeholder: true },
    { label: "resume.pdf", href: "#", placeholder: true },
  ],

  // Index the query console searches against.
  searchIndex: [
    {
      id: "about",
      label: "context",
      type: "section",
      keywords: ["about", "context", "who", "intro", "background", "you", "yazhini", "bio"],
    },
    {
      id: "skills",
      label: "embedding space",
      type: "section",
      keywords: [
        "skills", "stack", "tech", "tools", "frontend", "backend", "languages",
        "react", "python", "typescript", "javascript", "fastapi", "langchain",
        "aws", "azure", "pinecone", "docker", "angular", "testing",
      ],
    },
    {
      id: "work",
      label: "experience",
      type: "section",
      keywords: ["experience", "work", "accenture", "job", "career", "engineer", "analyst", "aws", "lambda"],
    },
    {
      id: "projects",
      label: "results",
      type: "section",
      keywords: ["projects", "rag", "genai", "gen-ai", "scholarbot", "portfolio", "build", "built", "langchain", "agent", "chatbot"],
    },
    {
      id: "education",
      label: "education",
      type: "section",
      keywords: ["education", "school", "csusb", "sastra", "masters", "degree", "gpa", "study", "university"],
    },
    {
      id: "contact",
      label: "contact",
      type: "section",
      keywords: ["contact", "email", "hire", "reach", "hello", "hi", "available", "say"],
    },
  ] as SearchEntry[],
} as const;

export type Profile = typeof profile;
