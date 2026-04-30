export type Role = 'admin' | 'teacher' | 'student';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
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
  score: number;
  grade: string;
  totalQuestions: number;
  violations: Violation[];
  timeTaken: number;
  completedAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
