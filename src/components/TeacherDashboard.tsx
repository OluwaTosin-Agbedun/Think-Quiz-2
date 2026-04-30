import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Download, BarChart3, Users, Clock, LogOut, 
  LayoutDashboard, BookOpen, Settings, Lock, Unlock, ChevronRight, 
  ExternalLink, MousePointer2, ShieldAlert
} from 'lucide-react';
import { Quiz, QuizResult } from '../types';
import { exportResultsToCSV } from '../utils/csvExport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TeacherDashboardProps {
  onLogout: () => void;
  on创造Quiz: () => void;
}

export default function TeacherDashboard({ onLogout, on创造Quiz }: TeacherDashboardProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  useEffect(() => {
    let savedQuizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
    let savedResults = JSON.parse(localStorage.getItem('quiz_results') || '[]');
    
    // Initial Mock Data if empty
    if (savedQuizzes.length === 0) {
      const mockQuiz: Quiz = {
        id: 'DEMO123',
        teacherId: 'u1',
        title: 'Integrity & Ethics 101',
        description: 'A study on academic integrity and modern focus techniques for assessments.',
        questions: [
          { id: '1', text: 'What is the primary goal of EduQuiz Pro?', options: ['Gaming', 'Integrity', 'Social Media', 'Shopping'], correctAnswer: 1 },
          { id: '2', text: 'Which detection monitors tab switching?', options: ['Thermal', 'Visibility API', 'GPS', 'Bluetooth'], correctAnswer: 1 }
        ],
        timeLimitPerQuestion: 30,
        gradeScale: { pass: 50, excellent: 80 },
        isLocked: false,
        createdAt: Date.now()
      };
      savedQuizzes = [mockQuiz];
      localStorage.setItem('quizzes', JSON.stringify(savedQuizzes));
    }

    if (savedResults.length === 0) {
      const mockResults: QuizResult[] = [
        { id: 'r1', quizId: 'DEMO123', studentId: 's1', studentName: 'Alice Johnson', score: 2, grade: 'Excellent', totalQuestions: 2, violations: [], timeTaken: 45, completedAt: Date.now() - 86400000 },
        { id: 'r2', quizId: 'DEMO123', studentId: 's2', studentName: 'Bob Smith', score: 1, grade: 'Pass', totalQuestions: 2, violations: [{ type: 'tab-switch', timestamp: Date.now() }], timeTaken: 60, completedAt: Date.now() - 43200000 },
        { id: 'r3', quizId: 'DEMO123', studentId: 's3', studentName: 'Charlie Davis', score: 0, grade: 'Fail', totalQuestions: 2, violations: [{ type: 'tab-switch', timestamp: Date.now() }, { type: 'fullscreen-exit', timestamp: Date.now() }], timeTaken: 30, completedAt: Date.now() - 10000 }
      ];
      savedResults = mockResults;
      localStorage.setItem('quiz_results', JSON.stringify(savedResults));
    }

    setQuizzes(savedQuizzes);
    setResults(savedResults);
  }, []);

  const deleteQuiz = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      const updated = quizzes.filter(q => q.id !== id);
      setQuizzes(updated);
      localStorage.setItem('quizzes', JSON.stringify(updated));
      if (selectedQuizId === id) setSelectedQuizId(null);
    }
  };

  const toggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = quizzes.map(q => q.id === id ? { ...q, isLocked: !q.isLocked } : q);
    setQuizzes(updated);
    localStorage.setItem('quizzes', JSON.stringify(updated));
  };

  const copyLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/quiz/${id}`;
    navigator.clipboard.writeText(link);
    alert('Quiz link copied to clipboard!');
  };

  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);
  const filteredResults = selectedQuizId ? results.filter(r => r.quizId === selectedQuizId) : results;

  const scoreDistribution = [
    { range: '0-20%', count: filteredResults.filter(r => (r.score / r.totalQuestions) <= 0.2).length },
    { range: '21-40%', count: filteredResults.filter(r => (r.score / r.totalQuestions) > 0.2 && (r.score / r.totalQuestions) <= 0.4).length },
    { range: '41-60%', count: filteredResults.filter(r => (r.score / r.totalQuestions) > 0.4 && (r.score / r.totalQuestions) <= 0.6).length },
    { range: '61-80%', count: filteredResults.filter(r => (r.score / r.totalQuestions) > 0.6 && (r.score / r.totalQuestions) <= 0.8).length },
    { range: '81-100%', count: filteredResults.filter(r => (r.score / r.totalQuestions) > 0.8).length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-slate-900 text-slate-300 border-r border-slate-800 p-6 flex flex-col fixed h-full z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
           <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">Q</div>
           <span className="font-bold text-white text-xl tracking-tight">EduQuiz Pro</span>
        </div>

        <nav className="flex-1 space-y-2">
           <SidebarItem icon={<LayoutDashboard className="w-5 h-5"/>} label="Overview" active={!selectedQuizId} onClick={() => setSelectedQuizId(null)} />
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pt-6 pb-2 px-2 border-t border-slate-800 mt-4">My Assessments</p>
           <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
             {quizzes.map(q => (
               <SidebarItem 
                key={q.id} 
                icon={<BookOpen className="w-5 h-5"/>} 
                label={q.title} 
                active={selectedQuizId === q.id} 
                onClick={() => setSelectedQuizId(q.id)}
               />
             ))}
           </div>
           <button 
            onClick={on创造Quiz}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-blue-400 hover:bg-blue-600/10 hover:text-blue-300 font-bold text-sm mt-4 border border-blue-900/30"
           >
             <Plus className="w-5 h-5" /> New Assessment
           </button>
        </nav>

        <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-6">
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Authenticated</p>
           <p className="text-sm font-bold text-white truncate px-1">it.support@mekaria.edu.ng</p>
        </div>

        <button 
          onClick={onLogout}
          className="flex items-center gap-3 text-slate-500 hover:text-white transition-colors p-4 mt-auto border-t border-slate-800"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-72 p-10 bg-slate-50">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              {selectedQuiz ? selectedQuiz.title : 'Dashboard Overview'}
            </h1>
            <p className="text-slate-500">
              {selectedQuiz ? `Unique ID: ${selectedQuiz.id} • ${selectedQuiz.questions.length} Questions` : 'Aggregate performance metrics across all active quizzes.'}
            </p>
          </div>
          {selectedQuiz && (
            <div className="flex gap-3">
               <button 
                onClick={(e) => copyLink(selectedQuiz.id, e)}
                className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
               >
                 <ExternalLink className="w-4 h-4" /> Share
               </button>
               <button 
                onClick={(e) => toggleLock(selectedQuiz.id, e)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all border",
                  selectedQuiz.isLocked ? "bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200" : "bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200"
                )}
               >
                 {selectedQuiz.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                 {selectedQuiz.isLocked ? "Locked" : "Open"}
               </button>
               <button 
                onClick={(e) => deleteQuiz(selectedQuiz.id, e)}
                className="p-2 bg-red-100 border border-red-200 text-red-600 rounded-xl hover:bg-red-200 transition-all"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          )}
        </header>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard label="Completions" value={filteredResults.length.toString()} icon={<Users className="w-5 h-5 text-blue-600" />} />
          <StatCard 
            label="Avg. Score" 
            value={filteredResults.length ? ((filteredResults.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0) / filteredResults.length) * 100).toFixed(0) + '%' : '0%'} 
            icon={<BarChart3 className="w-5 h-5 text-emerald-600" />} 
          />
          <StatCard label="Violation Rate" value={filteredResults.length ? ((filteredResults.filter(r => r.violations.length > 0).length / filteredResults.length) * 100).toFixed(0) + '%' : '0%'} icon={<ShieldAlert className="w-5 h-5 text-red-600" />} />
          <StatCard label="Avg. Time" value={filteredResults.length ? (filteredResults.reduce((acc, r) => acc + r.timeTaken, 0) / filteredResults.length).toFixed(0) + 's' : '0s'} icon={<Clock className="w-5 h-5 text-amber-600" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
             <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={40} fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </section>

          <section className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl flex flex-col">
             <h2 className="text-xl font-bold mb-6">Internal Audit</h2>
             <div className="space-y-6 flex-1">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                   <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Integrity Level</p>
                   {filteredResults.length > 0 && (filteredResults.filter(r => r.violations.length > 0).length / filteredResults.length) > 0.3 ? (
                      <p className="text-amber-400 font-bold flex items-center gap-2 italic uppercase">High Violation Risk</p>
                   ) : (
                      <p className="text-emerald-400 font-bold flex items-center gap-2 uppercase tracking-tight">Verified Secure</p>
                   )}
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                   <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Most missed question</p>
                   <p className="text-sm font-medium leading-relaxed italic">
                     {selectedQuiz ? selectedQuiz.questions[0].text : 'Select an assessment to view details.'}
                   </p>
                </div>
                <button
                  onClick={() => exportResultsToCSV(filteredResults)}
                  disabled={filteredResults.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 mt-4"
                >
                  <Download className="w-5 h-5" /> Export Data
                </button>
             </div>
          </section>
        </div>

        <section className="mt-10 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
           <table className="w-full text-left">
             <thead>
               <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                 <th className="px-8 py-5">Student</th>
                 <th className="px-8 py-5">Performance</th>
                 <th className="px-8 py-5 text-center">Security Logs</th>
                 <th className="px-8 py-5 text-right">Date</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {filteredResults.map(res => (
                 <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-8 py-6 font-bold text-slate-900">{res.studentName}</td>
                   <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border mr-3",
                        res.grade === 'Excellent' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        res.grade === 'Pass' ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-red-100 text-red-700 border-red-200"
                      )}>{res.grade}</span>
                      <span className="text-slate-500 font-mono text-sm">{res.score}/{res.totalQuestions}</span>
                   </td>
                   <td className="px-8 py-6">
                      <div className="flex justify-center gap-1">
                        {[...Array(res.violations.length)].map((_, i) => (
                           <div key={i} className="w-3 h-1.5 bg-red-500 rounded-full" />
                        ))}
                        {res.violations.length === 0 && <div className="w-3 h-1.5 bg-emerald-500 rounded-full" />}
                      </div>
                   </td>
                   <td className="px-8 py-6 text-right text-slate-400 text-sm">
                     {new Date(res.completedAt).toLocaleDateString()}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </section>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
      )}
    >
      <span className={active ? "text-white" : "text-slate-600 group-hover:text-slate-400"}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
       <div className="relative z-10">
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
         <p className="text-3xl font-black text-slate-900">{value}</p>
       </div>
       <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity">
         {icon}
       </div>
    </div>
  );
}
