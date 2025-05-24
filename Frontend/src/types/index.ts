export type User = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "student";
  first_name: string;
  last_name: string;
  name?: string; // Optional for backward compatibility
};

export type Question = {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
    is_correct: boolean;
  }[];
  type: "single_choice" | "multiple_choice";
  difficulty: "easy" | "medium" | "hard";
  score: number;
  createdAt: string;
  updatedAt: string;
  category?: string;
};

export type Exam = {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  totalScore: number;
  passingScore: number;
  questions: string[]; // Array of question IDs
  assignedUsers: string[]; // Array of user IDs
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published" | "archived";
};

export type ExamResult = {
  id?: string;
  examId: string;
  userId: string;
  score: number;
  status: "passed" | "failed";
  passed: boolean;
  answers: {
    questionId: string;
    selectedChoices: string[];
    isCorrect: boolean;
    score: number;
  }[];
  startedAt?: string;
  completedAt: string;
  createdAt?: string;
};

export type DashboardStats = {
  totalExams: number;
  totalUsers: number;
  totalQuestions: number;
  totalAdmins: number;
  totalStudents: number;
  publishedExams: number;
  draftExams: number;
  totalResults: number;
  passRate: number;
  recentExams: Exam[];
  recentResults: ExamResult[];
};
