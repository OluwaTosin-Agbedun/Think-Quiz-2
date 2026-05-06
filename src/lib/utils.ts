import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateGrade(score: number, total: number, scale?: { pass: number, excellent: number }) {
  const percentage = (score / total) * 100;
  const s = scale || { pass: 50, excellent: 85 };
  if (percentage >= s.excellent) return "Excellent";
  if (percentage >= s.pass) return "Pass";
  return "Fail";
}
