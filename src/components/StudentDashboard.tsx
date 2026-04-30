import React, { useState, useEffect } from 'react';
import { Search, Play, History, LogOut, Award, AlertCircle, ShieldCheck, Trophy, ArrowRight, Activity } from 'lucide-react';
import { Quiz, QuizResult } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface StudentDashboardProps {
  onLogout: () => void;
  onStartQuiz: (quizId: string) => void;
}

export default function StudentDashboard({ onLogout, onStartQuiz }: StudentDashboardProps) {
  const [quizIdSearch, setQuizIdSearch] = useState('');
  const [pastResults, setPastResults] = useState<QuizResult[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedResults = JSON.parse(localStorage.getItem('quiz_results') || '[]');
    setPastResults(savedResults); 
    setQuizzes(JSON.parse(localStorage.getItem('quizzes') || '[]'));
  }, []);

  const handleJoin = () => {
    const code = quizIdSearch.trim().toUpperCase();
    const quizExists = quizzes.find(q => q.id === code);
    if (quizExists) {
      if (quizExists.isLocked) {
        setError('This assessment is currently locked.');
      } else {
        onStartQuiz(quizExists.id);
      }
    } else {
      setError('System Error: Reference code not found.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const studentName = localStorage.getItem('student_name') || 'Scholar';

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar - Student Mini */}
      <aside className="w-24 bg-white border-r border-slate-200 flex flex-col items-center py-10 gap-10">
         <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-200">Q</div>
         <nav className="flex-1 flex flex-col gap-6">
            <SidebarIcon icon={<Activity className="w-6 h-6" />} active />
            <SidebarIcon icon={<History className="w-6 h-6" />} />
            <SidebarIcon icon={<Trophy className="w-6 h-6" />} />
         </nav>
         <button onClick={onLogout} className="p-4 text-slate-300 hover:text-red-500 transition-colors">
            <LogOut className="w-6 h-6" />
         </button>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Welcome, {studentName}</h1>
            <p className="text-slate-500 font-medium italic">"Precision is the foundation of integrity."</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                   <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
                   <p className="text-sm font-bold text-slate-900 leading-none">Verified Candidate</p>
                </div>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Join Panel */}
          <section className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
               <div className="relative z-10">
                  <h2 className="text-3xl font-black mb-4 tracking-tight">Initiate Assessment</h2>
                  <p className="text-slate-400 text-lg mb-8 max-w-md">Enter your unique evaluation code to begin. Remember to stay in full-screen mode throughout.</p>
                  
                  <div className="flex gap-4 max-w-md">
                    <div className="flex-1 relative">
                       <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                       <input 
                        type="text" 
                        value={quizIdSearch}
                        onChange={e => setQuizIdSearch(e.target.value.toUpperCase())}
                        placeholder="SESSION CODE"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 font-black tracking-[0.3em] text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xl"
                       />
                    </div>
                    <button 
                      onClick={handleJoin}
                      className="bg-white text-slate-900 px-8 py-5 rounded-2xl font-black hover:bg-blue-50 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                    >
                      START <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2 text-sm font-bold">
                       <AlertCircle className="w-4 h-4" /> {error}
                    </motion.div>
                  )}
               </div>
               {/* Design Elements */}
               <div className="absolute right-[-40px] top-[-40px] w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity" />
               <div className="absolute bottom-[-60px] left-[-20px] w-80 h-80 bg-indigo-600 rounded-full blur-[120px] opacity-10 pointer-events-none" />
            </div>

            {/* Achievement History */}
            <div>
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                    <History className="w-6 h-6 text-slate-400" /> Session History
                 </h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{pastResults.length} Records found</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastResults.length === 0 ? (
                  <div className="md:col-span-2 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center text-slate-400">
                    <Award className="w-20 h-20 mx-auto mb-6 opacity-10" />
                    <p className="text-lg font-bold">No sessions completed in this registry.</p>
                  </div>
                ) : (
                  pastResults.slice().reverse().map(result => {
                    const quiz = quizzes.find(q => q.id === result.quizId);
                    const percentage = (result.score / result.totalQuestions) * 100;
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={result.id} 
                        className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative group hover:border-blue-400 transition-all cursor-default"
                      >
                         <div className="flex justify-between items-start mb-6">
                            <div>
                               <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">{quiz?.title || 'System Assessment'}</h3>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{result.quizId} • {new Date(result.completedAt).toLocaleDateString()}</p>
                            </div>
                            <div className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                              result.grade === 'Excellent' ? "bg-emerald-100 border-emerald-200 text-emerald-700" :
                              result.grade === 'Pass' ? "bg-blue-100 border-blue-200 text-blue-700" :
                              "bg-red-100 border-red-200 text-red-700"
                            )}>
                              {result.grade}
                            </div>
                         </div>

                         <div className="p-5 bg-slate-50 rounded-2xl mb-6">
                            <div className="flex justify-between items-end mb-2">
                               <p className="text-4xl font-black text-slate-900">{result.score}<span className="text-xl text-slate-400">/{result.totalQuestions}</span></p>
                               <span className="text-sm font-bold text-slate-500 font-mono">{percentage.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                               <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  percentage >= 80 ? "bg-emerald-500 shadow-sm shadow-emerald-200" : 
                                  percentage >= 50 ? "bg-blue-500 shadow-sm shadow-blue-200" : "bg-red-500 shadow-sm shadow-red-200"
                                )} 
                               />
                            </div>
                         </div>

                         <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {result.timeTaken}s Session</span>
                            <span className={cn(
                              "flex items-center gap-1",
                              result.violations.length > 0 ? "text-red-500" : "text-emerald-500"
                            )}>
                               <ShieldCheck className="w-3 h-3" /> 
                               {result.violations.length > 0 ? `${result.violations.length} INFRACTIONS` : 'INTEGRITY VERIFIED'}
                            </span>
                         </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* User Profile / Status Panel */}
          <aside className="space-y-6">
             <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
                   <UserCircle2 className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-1">{studentName}</h3>
                <p className="text-sm text-slate-500 font-medium mb-6">Class of 2026 • Honors Track</p>
                <div className="pt-6 border-t border-slate-100 flex justify-around">
                   <div>
                      <p className="text-2xl font-black text-slate-900">{pastResults.length}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessions</p>
                   </div>
                   <div className="w-px h-10 bg-slate-100" />
                   <div>
                      <p className="text-2xl font-black text-slate-900">
                        {pastResults.length ? (pastResults.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0) / pastResults.length * 100).toFixed(0) : '0'}%
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global GPA</p>
                   </div>
                </div>
             </section>

             <section className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="text-xl font-bold mb-4">Security Advisory</h3>
                   <ul className="space-y-4 text-sm text-indigo-100 italic">
                      <li className="flex gap-2"><div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" /> Focus-Mode (visibility API) is strictly enforced.</li>
                      <li className="flex gap-2"><div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" /> Attempts to minimize browser result in auto-failure warnings.</li>
                      <li className="flex gap-2"><div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" /> Full-screen is a hard requirement for all assessments.</li>
                   </ul>
                </div>
                <div className="absolute right-[-20%] bottom-[-10%] opacity-10">
                   <ShieldCheck className="w-40 h-40" />
                </div>
             </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SidebarIcon({ icon, active = false }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <button className={cn(
      "p-4 rounded-2xl transition-all",
      active ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-300 hover:bg-slate-50 hover:text-slate-500"
    )}>
      {icon}
    </button>
  );
}
