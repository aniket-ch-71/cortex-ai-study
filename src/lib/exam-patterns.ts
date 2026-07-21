// Real Indian competitive exam patterns: hierarchy, subjects, timing, marking.

export type Section = {
  name: string;
  questions: number;
  marks: number;
};

export type ExamPattern = {
  totalQuestions: number;
  timeMinutes: number;
  negativeMarking: number; // negative number e.g. -0.5
  sections: Section[];
  cutoffPct?: number; // typical cutoff (% of max marks)
};

export const EXAM_CATEGORIES = [
  "SSC",
  "Bank",
  "UPSC",
  "Railway",
  "JEE",
  "NEET",
  "GATE",
  "NDA/CDS",
  "CAT",
  "Board",
] as const;

export type ExamCategory = (typeof EXAM_CATEGORIES)[number];

export const SUB_EXAMS: Record<ExamCategory, string[]> = {
  SSC: ["SSC CGL", "SSC CHSL", "SSC MTS", "SSC GD", "SSC CPO", "SSC Stenographer"],
  Bank: ["SBI PO", "SBI Clerk", "IBPS PO", "IBPS Clerk", "RRB PO", "RRB Clerk", "NABARD"],
  UPSC: ["UPSC CSE Prelims", "UPSC CSE Mains", "UPSC CAPF", "State PSC"],
  Railway: ["RRB NTPC", "RRB Group D", "RRB ALP", "RRB JE"],
  JEE: ["JEE Main", "JEE Advanced"],
  NEET: ["NEET UG", "NEET PG"],
  GATE: ["GATE CS", "GATE ECE", "GATE ME", "GATE CE", "GATE EE"],
  "NDA/CDS": ["NDA", "CDS", "AFCAT"],
  CAT: ["CAT", "MAT", "XAT"],
  Board: [
    "CBSE 10th",
    "CBSE 12th",
    "ICSE 10th",
    "ICSE 12th",
    "State Board 10th",
    "State Board 12th",
  ],
};

// Subject options keyed by sub-exam. "All Sections"/"All Subjects" means full pattern.
export const SUB_EXAM_SUBJECTS: Record<string, string[]> = {
  "SSC CGL": [
    "All Sections",
    "General Intelligence & Reasoning",
    "General Awareness",
    "Quantitative Aptitude",
    "English Comprehension",
  ],
  "SSC CHSL": [
    "All Sections",
    "General Intelligence",
    "General Awareness",
    "Quantitative Aptitude",
    "English Language",
  ],
  "SSC MTS": [
    "All Sections",
    "Numerical & Mathematical Ability",
    "Reasoning & Problem Solving",
    "General Awareness",
    "English & Comprehension",
  ],
  "SSC GD": [
    "All Sections",
    "General Intelligence & Reasoning",
    "General Knowledge & Awareness",
    "Elementary Mathematics",
    "English/Hindi",
  ],
  "SSC CPO": [
    "All Sections",
    "General Intelligence & Reasoning",
    "General Knowledge",
    "Quantitative Aptitude",
    "English Language",
  ],
  "SSC Stenographer": [
    "All Sections",
    "General Intelligence & Reasoning",
    "General Awareness",
    "English Language & Comprehension",
  ],
  "SBI PO": [
    "All Sections",
    "Reasoning Ability",
    "Quantitative Aptitude",
    "English Language",
    "General/Financial Awareness",
    "Computer Aptitude",
  ],
  "SBI Clerk": [
    "All Sections",
    "Reasoning Ability",
    "Quantitative Aptitude",
    "English Language",
    "General/Financial Awareness",
  ],
  "IBPS PO": [
    "All Sections",
    "Reasoning Ability",
    "Quantitative Aptitude",
    "English Language",
    "General/Financial Awareness",
  ],
  "IBPS Clerk": [
    "All Sections",
    "Reasoning Ability",
    "Quantitative Aptitude",
    "English Language",
    "General Awareness",
  ],
  "RRB PO": ["All Sections", "Reasoning Ability", "Quantitative Aptitude", "English Language"],
  "RRB Clerk": ["All Sections", "Reasoning Ability", "Quantitative Aptitude", "English Language"],
  NABARD: [
    "All Sections",
    "Reasoning",
    "Quantitative Aptitude",
    "English",
    "Computer Knowledge",
    "General Awareness",
  ],
  "RRB NTPC": [
    "All Sections",
    "Mathematics",
    "General Intelligence",
    "General Awareness",
    "General Science",
  ],
  "RRB Group D": [
    "All Sections",
    "Mathematics",
    "General Intelligence",
    "General Awareness",
    "General Science",
  ],
  "RRB ALP": ["All Sections", "Mathematics", "General Intelligence", "General Science"],
  "RRB JE": ["All Sections", "Mathematics", "General Intelligence", "General Awareness", "General Science"],
  "JEE Main": ["All Subjects", "Physics", "Chemistry", "Mathematics"],
  "JEE Advanced": ["All Subjects", "Physics", "Chemistry", "Mathematics"],
  "NEET UG": ["All Subjects", "Physics", "Chemistry", "Biology"],
  "NEET PG": ["All Subjects", "Anatomy", "Physiology", "Pathology", "Pharmacology", "Medicine"],
  "GATE CS": [
    "All Topics",
    "Data Structures",
    "Algorithms",
    "Operating Systems",
    "DBMS",
    "Computer Networks",
    "TOC",
    "Digital Logic",
    "Computer Organization",
  ],
  "GATE ECE": ["All Topics", "Networks", "Signals", "Electronics", "Communications", "Control Systems"],
  "GATE ME": ["All Topics", "Thermodynamics", "Fluid Mechanics", "Manufacturing", "Strength of Materials"],
  "GATE CE": ["All Topics", "Structures", "Geotechnical", "Transportation", "Environmental"],
  "GATE EE": ["All Topics", "Power Systems", "Machines", "Control", "Power Electronics"],
  "UPSC CSE Prelims": ["All", "General Studies Paper 1", "CSAT Paper 2"],
  "UPSC CSE Mains": ["All", "Essay", "GS Paper 1", "GS Paper 2", "GS Paper 3", "GS Paper 4"],
  "UPSC CAPF": ["All", "General Ability & Intelligence", "General Studies"],
  "State PSC": ["All", "General Studies", "Aptitude"],
  CAT: [
    "All Sections",
    "Verbal Ability & RC",
    "Data Interpretation & LR",
    "Quantitative Ability",
  ],
  MAT: ["All Sections", "Language Comprehension", "Mathematical Skills", "Data Analysis", "Reasoning", "Indian & Global Environment"],
  XAT: ["All Sections", "Verbal & Logical Ability", "Decision Making", "Quantitative Ability", "GK"],
  NDA: ["All", "Mathematics", "General Ability Test"],
  CDS: ["All", "English", "General Knowledge", "Mathematics"],
  AFCAT: ["All", "General Awareness", "Verbal Ability", "Numerical Ability", "Reasoning"],
  "CBSE 10th": ["All Subjects", "Mathematics", "Science", "Social Science", "English"],
  "CBSE 12th": [
    "All Subjects",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "History",
    "Geography",
    "Economics",
    "English",
  ],
  "ICSE 10th": ["All Subjects", "Mathematics", "Science", "Social Studies", "English"],
  "ICSE 12th": [
    "All Subjects",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Economics",
    "English",
  ],
  "State Board 10th": ["All Subjects", "Mathematics", "Science", "Social Science", "English"],
  "State Board 12th": [
    "All Subjects",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Economics",
    "English",
  ],
};

// Real exam patterns. Defaults applied for sub-exams not explicitly listed.
export const EXAM_PATTERNS: Record<string, ExamPattern> = {
  "SSC CGL": {
    totalQuestions: 100,
    timeMinutes: 60,
    negativeMarking: -0.5,
    cutoffPct: 60,
    sections: [
      { name: "General Intelligence & Reasoning", questions: 25, marks: 2 },
      { name: "General Awareness", questions: 25, marks: 2 },
      { name: "Quantitative Aptitude", questions: 25, marks: 2 },
      { name: "English Comprehension", questions: 25, marks: 2 },
    ],
  },
  "SSC CHSL": {
    totalQuestions: 100,
    timeMinutes: 60,
    negativeMarking: -0.5,
    cutoffPct: 55,
    sections: [
      { name: "General Intelligence", questions: 25, marks: 2 },
      { name: "General Awareness", questions: 25, marks: 2 },
      { name: "Quantitative Aptitude", questions: 25, marks: 2 },
      { name: "English Language", questions: 25, marks: 2 },
    ],
  },
  "SSC MTS": {
    totalQuestions: 90,
    timeMinutes: 90,
    negativeMarking: -1,
    cutoffPct: 50,
    sections: [
      { name: "Numerical & Mathematical Ability", questions: 20, marks: 3 },
      { name: "Reasoning & Problem Solving", questions: 20, marks: 3 },
      { name: "General Awareness", questions: 25, marks: 3 },
      { name: "English & Comprehension", questions: 25, marks: 3 },
    ],
  },
  "SSC GD": {
    totalQuestions: 80,
    timeMinutes: 60,
    negativeMarking: -0.5,
    cutoffPct: 45,
    sections: [
      { name: "General Intelligence & Reasoning", questions: 20, marks: 2 },
      { name: "General Knowledge & Awareness", questions: 20, marks: 2 },
      { name: "Elementary Mathematics", questions: 20, marks: 2 },
      { name: "English/Hindi", questions: 20, marks: 2 },
    ],
  },
  "SSC CPO": {
    totalQuestions: 200,
    timeMinutes: 120,
    negativeMarking: -0.25,
    cutoffPct: 55,
    sections: [
      { name: "General Intelligence & Reasoning", questions: 50, marks: 1 },
      { name: "General Knowledge", questions: 50, marks: 1 },
      { name: "Quantitative Aptitude", questions: 50, marks: 1 },
      { name: "English Language", questions: 50, marks: 1 },
    ],
  },
  "JEE Main": {
    totalQuestions: 75,
    timeMinutes: 180,
    negativeMarking: -1,
    cutoffPct: 35,
    sections: [
      { name: "Physics", questions: 25, marks: 4 },
      { name: "Chemistry", questions: 25, marks: 4 },
      { name: "Mathematics", questions: 25, marks: 4 },
    ],
  },
  "JEE Advanced": {
    totalQuestions: 54,
    timeMinutes: 180,
    negativeMarking: -2,
    cutoffPct: 35,
    sections: [
      { name: "Physics", questions: 18, marks: 4 },
      { name: "Chemistry", questions: 18, marks: 4 },
      { name: "Mathematics", questions: 18, marks: 4 },
    ],
  },
  "NEET UG": {
    totalQuestions: 180,
    timeMinutes: 200,
    negativeMarking: -1,
    cutoffPct: 50,
    sections: [
      { name: "Physics", questions: 45, marks: 4 },
      { name: "Chemistry", questions: 45, marks: 4 },
      { name: "Biology", questions: 90, marks: 4 },
    ],
  },
  "IBPS PO": {
    totalQuestions: 100,
    timeMinutes: 60,
    negativeMarking: -0.25,
    cutoffPct: 55,
    sections: [
      { name: "Reasoning Ability", questions: 35, marks: 1 },
      { name: "Quantitative Aptitude", questions: 35, marks: 1 },
      { name: "English Language", questions: 30, marks: 1 },
    ],
  },
  "SBI PO": {
    totalQuestions: 100,
    timeMinutes: 60,
    negativeMarking: -0.25,
    cutoffPct: 55,
    sections: [
      { name: "Reasoning Ability", questions: 35, marks: 1 },
      { name: "Quantitative Aptitude", questions: 35, marks: 1 },
      { name: "English Language", questions: 30, marks: 1 },
    ],
  },
  "SBI Clerk": {
    totalQuestions: 100,
    timeMinutes: 60,
    negativeMarking: -0.25,
    cutoffPct: 55,
    sections: [
      { name: "English Language", questions: 30, marks: 1 },
      { name: "Reasoning Ability", questions: 35, marks: 1 },
      { name: "Quantitative Aptitude", questions: 35, marks: 1 },
    ],
  },
  "IBPS Clerk": {
    totalQuestions: 100,
    timeMinutes: 60,
    negativeMarking: -0.25,
    cutoffPct: 55,
    sections: [
      { name: "English Language", questions: 30, marks: 1 },
      { name: "Reasoning Ability", questions: 35, marks: 1 },
      { name: "Quantitative Aptitude", questions: 35, marks: 1 },
    ],
  },
  "UPSC CSE Prelims": {
    totalQuestions: 100,
    timeMinutes: 120,
    negativeMarking: -0.66,
    cutoffPct: 45,
    sections: [{ name: "General Studies Paper 1", questions: 100, marks: 2 }],
  },
  CAT: {
    totalQuestions: 66,
    timeMinutes: 120,
    negativeMarking: -1,
    cutoffPct: 50,
    sections: [
      { name: "Verbal Ability & RC", questions: 24, marks: 3 },
      { name: "Data Interpretation & LR", questions: 20, marks: 3 },
      { name: "Quantitative Ability", questions: 22, marks: 3 },
    ],
  },
  "GATE CS": {
    totalQuestions: 65,
    timeMinutes: 180,
    negativeMarking: -0.33,
    cutoffPct: 30,
    sections: [
      { name: "General Aptitude", questions: 10, marks: 1 },
      { name: "Core CS Subjects", questions: 55, marks: 2 },
    ],
  },
  "RRB NTPC": {
    totalQuestions: 100,
    timeMinutes: 90,
    negativeMarking: -0.33,
    cutoffPct: 50,
    sections: [
      { name: "Mathematics", questions: 30, marks: 1 },
      { name: "General Intelligence", questions: 30, marks: 1 },
      { name: "General Awareness", questions: 40, marks: 1 },
    ],
  },
  "RRB Group D": {
    totalQuestions: 100,
    timeMinutes: 90,
    negativeMarking: -0.33,
    cutoffPct: 40,
    sections: [
      { name: "Mathematics", questions: 25, marks: 1 },
      { name: "General Intelligence", questions: 30, marks: 1 },
      { name: "General Science", questions: 25, marks: 1 },
      { name: "General Awareness", questions: 20, marks: 1 },
    ],
  },
  NDA: {
    totalQuestions: 270,
    timeMinutes: 300,
    negativeMarking: -0.83,
    cutoffPct: 35,
    sections: [
      { name: "Mathematics", questions: 120, marks: 2.5 },
      { name: "General Ability Test", questions: 150, marks: 4 },
    ],
  },
};

// Default pattern when sub-exam not in the table.
const DEFAULT_PATTERN: ExamPattern = {
  totalQuestions: 50,
  timeMinutes: 60,
  negativeMarking: 0,
  cutoffPct: 50,
  sections: [{ name: "All", questions: 50, marks: 1 }],
};

export function getPattern(subExam: string): ExamPattern {
  return EXAM_PATTERNS[subExam] ?? DEFAULT_PATTERN;
}

// Returns true if the chosen subject represents the full multi-section exam.
export function isAllSections(subject: string): boolean {
  return /^All( Sections| Subjects| Topics)?$/i.test(subject.trim());
}

export const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40, 50, 80, 100] as const;
