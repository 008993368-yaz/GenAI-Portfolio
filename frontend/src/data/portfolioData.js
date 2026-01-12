export const portfolioData = {
  personalInfo: {
    name: "YAZHINI ELANCHEZHIAN",
    location: "📍 Redlands, CA",
    phone: "📞 +1 909-871-6890",
    email: "📧 yazhini.elanchezhian3368@coyote.csusb.edu",
    initials: "YE"
  },
  
  summary: "Application Engineer with 3 years of experience building responsive front-end applications using Angular, HTML5, SASS, and JavaScript. Skilled in integrating AWS services, automating workflows with Power Apps, Power BI, and Power Automate, and implementing .NET MVC solutions. Strong background in unit testing (Jest, Jasmine, XUnit) and Agile methodologies, ensuring reliable, user-centric applications. Currently pursuing an MS in Computer Science to deepen expertise in machine learning and data-driven technologies.",
  
  skills: [
    {
      id: 1,
      title: "Programming Languages",
      content: "Python, JavaScript, TypeScript, HTML5, SASS, C#"
    },
    {
      id: 2,
      title: "Frameworks & Architectures",
      content: "Angular, .NET MVC, Single Page Applications (SPA), Docker"
    },
    {
      id: 3,
      title: "Testing",
      content: "Jest, Jasmine, XUnit"
    },
    {
      id: 4,
      title: "Cloud & Dev Tools",
      content: "AWS Lambda, AWS CloudWatch, Postman, Git, Adobe Experience Manager"
    },
    {
      id: 5,
      title: "Databases",
      content: "MySQL, Cosmos DB"
    },
    {
      id: 6,
      title: "BI & Automation",
      content: "Power BI, Power Apps, Power Automate"
    },
    {
      id: 7,
      title: "Methodologies",
      content: "Agile, API Integration"
    }
  ],
  
  projects: [
    {
      id: 1,
      title: "GeoAssist",
      tech: "LangChain, ArcGIS API, MCP",
      description: "Developed an AI-driven geospatial chatbot using LangGraph and LangChain to interpret natural-language location queries and dynamically orchestrate GIS tool calls for geocoding and proximity search.",
      highlights: [
        "Integrated ArcGIS Location Platform services via Model Context Protocol (MCP) server",
        "Enabled agent-based access to geocoding and nearby place search APIs",
        "Returned structured, location-aware responses with facility metadata"
      ],
      githubUrl: "https://github.com/008993368-yaz/landing-page-yz",
      gradient: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
      icon: "🌎",
      visual: ["circle", "bar", "chart"],
      reverse: false
    },
    {
      id: 2,
      title: "ScholarBot",
      tech: "LangGraph, LangChain, Streamlit",
      description: "Developed a Streamlit based Scholar AI Assistant chatbot using LangGraph and LLM-powered query parsing to extract parameters from user prompts, integrated with CSUSB library API.",
      highlights: [
        "Custom \"get_resource\" tool for retrieving academic articles, books, journals, and dissertations",
        "Implemented stateful multi-turn interactions using InMemorySaver",
        "Maintained parameter context for intelligent follow-up questions"
      ],
      githubUrl: "https://github.com/DrAlzahrani2025Projects/team1f25",
      gradient: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
      icon: "📚",
      visual: ["book", "search", "data"],
      reverse: true
    }
  ],
  
  experience: [
    {
      id: 1,
      title: "Advanced Application Engineering Analyst",
      company: "Accenture, India",
      duration: "Aug 2022 - May 2025",
      achievements: [
        "Integrated Amazon Web Services (AWS) Lambda services with a Single Page Application (SPA) by connecting data flows between the backend AEM server and the front-end, reducing API response time by 30% and enabling seamless communication.",
        "Developed front-end applications using HTML5, SASS, and Vanilla JavaScript, ensuring responsive and user-friendly interfaces that reduced bounce rate by 15%.",
        "Engineered an automation workflow for GenAI chatbot by extracting raw data from AEM servers, transforming it with Azure Functions, and storing it in Cosmos DB, reducing manual effort by 90%.",
        "Incorporated a custom Power App with Power BI dashboards, and established seamless connectivity using Power Automate flows, enabling 50+ stakeholders to access real-time insights.",
        "Authored unit tests with Jest, Jasmine, and XUnit for Angular and .NET applications, achieving up to 90% code coverage and reducing post-release defects.",
        "Implemented Adaptive Card technology using the .NET MVC framework, decreasing UI rendering latency by 15% and boosting user engagement.",
        "Collaborated in Agile teams, contributing to sprint planning, reviews, and retrospectives, while proposing process improvements that increased sprint efficiency."
      ]
    }
  ],
  
  education: [
    {
      id: 1,
      degree: "Master of Science in Computer Science",
      institution: "California State University - San Bernardino",
      duration: "Aug 2025 - May 2027 (Expected)",
      gpa: "GPA: 4/4"
    },
    {
      id: 2,
      degree: "Bachelor of Technology in Information & Communication Technology",
      institution: "SASTRA Deemed to be University, India",
      duration: "July 2018 - July 2022",
      gpa: "CGPA: 7.43/10"
    }
  ]
};
