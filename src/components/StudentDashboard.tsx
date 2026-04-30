import React, { useState, useEffect } from 'react';
import { Search, Play, History, LogOut, Award, AlertCircle, ShieldCheck, Trophy, ArrowRight, Activity, UserCircle2, Clock, Eye, BookOpen, Calendar, ChevronRight, LayoutDashboard, Filter, AlertTriangle } from 'lucide-react';
import { Quiz, QuizResult, User } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
  onStartQuiz: (quizId: string) => void;
}

export default function StudentDashboard({ user, onLogout, onStartQuiz }: StudentDashboardProps) {
  const [quizIdSearch, setQuizIdSearch] = useState('');
  const [pastResults, setPastResults] = useState<QuizResult[]>([]);
  const [assignedQuizzes, setAssignedQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch results for THIS student
    const qResults = query(collection(db, 'results'), where('studentId', '==', user.uid));
    const unsubResults = onSnapshot(qResults, (snapshot) => {
      setPastResults(snapshot.docs.map(doc => doc.data() as QuizResult));
    });

    // 2. Fetch quizzes assigned to this student (via their teacherIds)
    const teachersList = user.teacherIds || [];
    const qQuizzes = query(
      collection(db, 'quizzes'), 
      where('teacherId', 'in', [...teachersList, 'admin'].slice(0, 10))
    );
    const unsubQuizzes = onSnapshot(qQuizzes, (snapshot) => {
      setAssignedQuizzes(snapshot.docs.map(doc => doc.data() as Quiz));
      setIsLoading(false);
    });

    return () => { 
      unsubResults(); 
      unsubQuizzes(); 
    };
  }, [user.uid, user.teacherIds]);

  const handleJoin = async () => {
    const code = quizIdSearch.trim().toUpperCase();
    if (!code) return;
    
    setError('');
    try {
      const quizDoc = await getDoc(doc(db, 'quizzes', code));
      if (!quizDoc.exists()) {
        setError('System Error: Reference code not found.');
      } else {
        const quiz = quizDoc.data() as Quiz;
        const now = Date.now();
        
        if (quiz.isLocked) {
          setError('This assessment is currently locked by the administrator.');
        } else if (quiz.startTime && now < quiz.startTime) {
          setError(`This assessment is scheduled to start at ${new Date(quiz.startTime).toLocaleString()}.`);
        } else if (quiz.endTime && now > quiz.endTime) {
          setError('This assessment session has already concluded.');
        } else {
          onStartQuiz(quiz.id);
        }
      }
    } catch (err) {
      setError('An error occurred while validating the session code.');
    }
    
    if (error) setTimeout(() => setError(''), 4000);
  };

  const gpa = pastResults.length 
    ? (pastResults.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0) / pastResults.length * 100).toFixed(0) 
    : '0';

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar - Student Mini */}
      <aside className="w-24 bg-white border-r border-slate-200 flex flex-col items-center py-10 gap-10 shadow-sm fixed h-full z-10">
         <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-200 transform hover:scale-110 transition-transform">T</div>
         <nav className="flex-1 flex flex-col gap-6">
            <SidebarIcon icon={<Activity className="w-6 h-6" />} active />
            <SidebarIcon icon={<History className="w-6 h-6" />} />
            <SidebarIcon icon={<Trophy className="w-6 h-6" />} />
         </nav>
         <button onClick={onLogout} className="p-4 text-slate-300 hover:text-red-500 transition-colors group">
            <LogOut className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
         </button>
      </aside>

      <main className="flex-1 ml-24 p-16 overflow-y-auto">
        <header className="flex justify-between items-end mb-16">
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3 leading-none">Think Quiz</h1>
            <p className="text-slate-400 font-medium text-lg italic">Welcome back, <span className="text-blue-600 font-bold">Candidate {user.name.split(' ')[0]}</span>. System status: Optimized.</p>
          </div>
          <div className="flex gap-6">
             <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                   <ShieldCheck className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">Protocol Status</p>
                   <p className="text-sm font-black text-slate-900 leading-none">Verified Identity</p>
                </div>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Join Panel */}
          <section className="lg:col-span-2 space-y-12">
            <div className="bg-white rounded-[3.5rem] p-14 text-slate-900 border border-slate-200 shadow-2xl shadow-indigo-100 relative overflow-hidden group">
               <div className="relative z-10">
                  <h2 className="text-4xl font-black mb-5 tracking-tight uppercase italic">Access Assessment</h2>
                  <p className="text-slate-500 text-lg mb-10 max-w-lg leading-relaxed italic font-medium">"Validate your unique session token to commence. Our integrity protocols are active and will monitor focus-integrity levels."</p>
                  
                  <div className="flex gap-4 max-w-xl">
                    <div className="flex-1 relative">
                       <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                       <input 
                        type="text" 
                        value={quizIdSearch}
                        onChange={e => setQuizIdSearch(e.target.value.toUpperCase())}
                        placeholder="SESSION CODE"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-6 pl-16 pr-8 font-black tracking-[0.4em] text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all text-2xl uppercase placeholder:tracking-normal placeholder:text-slate-300"
                       />
                    </div>
                    <button 
                      onClick={handleJoin}
                      className="bg-indigo-600 text-white px-10 py-6 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-3 text-lg uppercase tracking-widest"
                    >
                      Initialize <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mt-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-100 flex items-center gap-3 text-sm font-bold backdrop-blur-sm">
                         <AlertCircle className="w-5 h-5 text-red-400 shrink-0" /> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
               
               {/* Design Elements */}
               <div className="absolute right-[-5%] top-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
               <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
            </div>

            {/* Assessment Queue */}
            {assignedQuizzes.length > 0 && (
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3 tracking-tight">
                   <Clock className="w-7 h-7 text-blue-500" /> Assigned Sessions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {assignedQuizzes.filter(q => !q.isLocked).map(quiz => (
                     <motion.div 
                      whileHover={{ scale: 1.02 }}
                      key={quiz.id} 
                      className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group cursor-pointer"
                      onClick={() => onStartQuiz(quiz.id)}
                     >
                        <div className="flex justify-between items-start mb-6">
                           <div className="p-3 bg-blue-50 rounded-xl">
                              <BookOpen className="w-6 h-6 text-blue-600" />
                           </div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">ID: {quiz.id}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">{quiz.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-6 font-medium italic">"{quiz.description}"</p>
                        <div className="flex items-center gap-4 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                           <Play className="w-3.5 h-3.5" /> Start Assessment
                        </div>
                     </motion.div>
                   ))}
                </div>
              </div>
            )}

            {/* Achievement Repository */}
            <div>
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                    <History className="w-7 h-7 text-slate-400" /> Performance Repository
                 </h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pastResults.length} Sessions Logged</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {pastResults.length === 0 ? (
                  <div className="md:col-span-2 bg-white border-4 border-dashed border-slate-100 rounded-[3rem] p-24 text-center">
                    <Award className="w-24 h-24 mx-auto mb-8 opacity-5 text-slate-900" />
                    <p className="text-xl font-black text-slate-300 uppercase tracking-widest">Repository Vacant</p>
                  </div>
                ) : (
                  pastResults.slice().reverse().map(result => {
                    const quiz = assignedQuizzes.find(q => q.id === result.quizId);
                    const percentage = (result.score / result.totalQuestions) * 100;
                    const canSeeDetails = quiz?.scoreReveal === 'immediate';
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={result.id} 
                        className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:border-slate-400 transition-all cursor-default"
                      >
                         <div className="flex justify-between items-start mb-8">
                            <div className="max-w-[70%]">
                               <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 truncate">{quiz?.title || 'Academic Session'}</h3>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  {result.quizId} <span className="opacity-30">•</span> {new Date(result.completedAt).toLocaleDateString()}
                               </p>
                            </div>
                            <div className={cn(
                               "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm",
                               result.grade === 'Excellent' ? "bg-emerald-500 text-white" :
                               result.grade === 'Pass' ? "bg-blue-600 text-white" :
                               "bg-red-600 text-white"
                            )}>
                              {result.grade}
                            </div>
                         </div>

                         <div className="p-8 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
                            <div className="flex justify-between items-end mb-4">
                               <p className="text-5xl font-black text-slate-900 leading-none">{result.score}<span className="text-2xl text-slate-300 ml-1">/{result.totalQuestions}</span></p>
                               <span className="text-lg font-black text-slate-900 font-mono tracking-tighter">{percentage.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-3.5 bg-white rounded-full overflow-hidden border border-slate-100">
                               <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  percentage >= 80 ? "bg-emerald-400" : 
                                  percentage >= 50 ? "bg-blue-500" : "bg-red-500"
                                )} 
                               />
                            </div>
                         </div>

                         <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-300" /> {result.timeTaken}s Execution</span>
                            
                            {canSeeDetails ? (
                               <span className="flex items-center gap-2 text-emerald-600 group-hover:underline cursor-pointer">
                                  <Eye className="w-4 h-4" /> Insight Available
                               </span>
                            ) : (
                               <span className="flex items-center gap-2 text-amber-600">
                                  <AlertCircle className="w-4 h-4" /> Finalizing Review
                               </span>
                            )}
                         </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* User Profile / Status Panel */}
          <aside className="space-y-10">
             <section className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-xl text-center relative overflow-hidden">
                <div className="w-32 h-32 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl relative z-10 group-hover:scale-105 transition-transform">
                   <UserCircle2 className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-2 leading-none">{user.name}</h3>
                <p className="text-sm text-slate-400 font-bold mb-10 tracking-wide uppercase">{user.email}</p>
                
                <div className="grid grid-cols-2 gap-8 pt-10 border-t border-slate-100">
                   <div>
                      <p className="text-3xl font-black text-slate-900 leading-none mb-2">{pastResults.length}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessions</p>
                   </div>
                   <div>
                      <p className="text-3xl font-black text-slate-900 leading-none mb-2">{gpa}%</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Score</p>
                   </div>
                </div>
             </section>

             <section className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-8">
                      <ShieldCheck className="w-7 h-7 text-indigo-600" />
                      <h3 className="text-2xl font-black tracking-tight text-slate-900">Security Memo</h3>
                   </div>
                   <ul className="space-y-6">
                      {[
                        "Focus-Mode (visibility API) is strictly monitored.",
                        "Browser-exit triggers immediate flag generation.",
                        "Full-screen is mandatory for protocol compliance."
                      ].map((item, i) => (
                        <li key={i} className="flex gap-4 group/item">
                           <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 shrink-0 group-hover/item:scale-150 transition-transform" />
                           <p className="text-sm text-slate-500 font-medium italic leading-relaxed">{item}</p>
                        </li>
                      ))}
                   </ul>
                </div>
                <div className="absolute right-[-10%] bottom-[-5%] opacity-[0.03] w-48 h-48 rotate-[15deg] text-indigo-600">
                   <ShieldCheck className="w-full h-full" />
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
      "p-5 rounded-3xl transition-all relative group",
      active ? "bg-blue-600 text-white shadow-xl shadow-blue-500/40" : "text-slate-300 hover:bg-slate-100 hover:text-slate-600"
    )}>
      {icon}
      {active && <span className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-2 h-8 bg-blue-600 rounded-l-full" />}
    </button>
  );
}
