export type Role = 'admin' | 'teacher' | 'student';

export type QuestionType = 'single' | 'multiple' | 'text';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: number | number[] | string;
}

export interface GradeScale {
  pass: number;
  excellent: number;
}

export interface Quiz {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  questions: Question[];
  timeLimitPerQuestion: number;
  gradeScale: GradeScale;
  isLocked: boolean;
  scoreReveal: 'immediate' | 'manual';
  startTime?: number | null;
  endTime?: number | null;
  createdAt: number;
}

export interface Violation {
  type: 'tab-switch' | 'focus-loss' | 'fullscreen-exit';
  timestamp: number;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  score: number;
  grade: string;
  totalQuestions: number;
  violations: Violation[];
  questions: Question[];
  answers: (number | number[] | string | null)[];
  timeTaken: number;
  completedAt: number;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  teacherIds?: string[]; // For students, identifying their assigned teachers
}
