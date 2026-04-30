import { QuizResult } from '../types';

export function exportResultsToCSV(results: QuizResult[]) {
  if (results.length === 0) return;

  const headers = ['Student Name', 'Quiz ID', 'Score', 'Total Questions', 'Percentage', 'Violations', 'Time Taken (s)', 'Completion Date'];
  
  const rows = results.map(r => [
    r.studentName,
    r.quizId,
    r.score,
    r.totalQuestions,
    ((r.score / r.totalQuestions) * 100).toFixed(2) + '%',
    r.violations.length,
    r.timeTaken,
    new Date(r.completedAt).toLocaleString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `quiz_results_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
