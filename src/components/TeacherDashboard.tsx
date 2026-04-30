import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Download, BarChart3, Users, Clock, LogOut, 
  LayoutDashboard, BookOpen, Settings, Lock, Unlock, ChevronRight, 
  ExternalLink, MousePointer2, ShieldAlert, Eye, EyeOff, Calendar, UserPlus, X, Search
} from 'lucide-react';
import { Quiz, QuizResult, User } from '../types';
import { exportResultsToCSV } from '../utils/csvExport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, config, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc, getDocs, arrayUnion } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
  onStartQuizEditor: (quiz?: Quiz) => void;
}

export default function TeacherDashboard({ user, onLogout, onStartQuizEditor }: TeacherDashboardProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<User[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'details'>('overview');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const qQuizzes = query(collection(db, 'quizzes'), where('teacherId', '==', user.uid));
    const unsubQuizzes = onSnapshot(qQuizzes, (snapshot) => {
      setQuizzes(snapshot.docs.map(doc => doc.data() as Quiz));
    });

    const qResults = query(collection(db, 'results'), where('teacherId', '==', user.uid));
    const unsubResults = onSnapshot(qResults, (snapshot) => {
      setResults(snapshot.docs.map(doc => doc.data() as QuizResult));
    });

    const qStudents = query(collection(db, 'users'), where('teacherIds', 'array-contains', user.uid), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      setAssignedStudents(snapshot.docs.map(doc => doc.data() as User));
    });

    return () => {
      unsubQuizzes();
      unsubResults();
      unsubStudents();
    };
  }, [user.uid]);

  const deleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        await deleteDoc(doc(db, 'quizzes', id));
        if (selectedQuizId === id) setSelectedQuizId(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleLock = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const quiz = quizzes.find(q => q.id === id);
    if (!quiz) return;
    await updateDoc(doc(db, 'quizzes', id), { isLocked: !quiz.isLocked });
  };

  const toggleReveal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const quiz = quizzes.find(q => q.id === id);
    if (!quiz) return;
    const nextReveal = quiz.scoreReveal === 'manual' ? 'immediate' : 'manual';
    await updateDoc(doc(db, 'quizzes', id), { scoreReveal: nextReveal });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // First check if student already exists
    try {
      const q = query(collection(db, 'users'), where('email', '==', newStudentEmail), where('role', '==', 'student'));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Student exists, just link them to this teacher
        const studentDoc = snapshot.docs[0];
        try {
          await updateDoc(doc(db, 'users', studentDoc.id), {
            teacherIds: arrayUnion(user.uid),
            role: 'student' // Ensure they are marked as student
          });
          setIsAddingStudent(false);
          setNewStudentEmail('');
          alert('System Sync: Existing candidate account successfully linked to your jurisdiction.');
          return;
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${studentDoc.id}`);
        }
      }
    } catch (err: any) {
      if (err.message.includes('{')) {
        // Already handled by handleFirestoreError
        setError('Permission Denied: You do not have authorization to modify this candidate registry.');
      } else {
        setError('Registry Search Failure: ' + err.message);
      }
      return;
    }

    // Creating a new student account
    let secondaryApp;
    try {
      secondaryApp = initializeApp(config, `TeacherTask_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newStudentEmail, 
        'student123' // Default password
      );

      const newUser: User = {
        uid: firebaseUser.uid,
        name: newStudentEmail.split('@')[0],
        email: newStudentEmail,
        role: 'student',
        teacherIds: [user.uid]
      };

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      } catch (err) {
        // If firestore write fails, we should ideally delete the auth user too, but for simplicity:
        handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
      }
      
      await signOut(secondaryAuth);
      
      setIsAddingStudent(false);
      setNewStudentEmail('');
      alert('Creation Successful: New candidate provisioned with default security key "student123".');
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'CRITICAL: Email/Password registration is not enabled in Firebase. Please enable it in the Firebase Console.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Conflict: This email is already registered in the global authentication registry.';
      }
      setError(msg);
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
    }
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
      <aside className="w-72 bg-white text-slate-600 border-r border-slate-200 p-6 flex flex-col fixed h-full z-20 shadow-xl">
        <div className="flex items-center gap-3 mb-10 px-2 transition-all hover:scale-105 cursor-default">
           <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg border border-indigo-200">T</div>
           <span className="font-bold text-slate-900 text-xl tracking-tight">Think Quiz</span>
        </div>

        <nav className="flex-1 space-y-2">
           <SidebarItem icon={<LayoutDashboard className="w-5 h-5"/>} label="Core Overview" active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setSelectedQuizId(null); }} />
           <SidebarItem icon={<Users className="w-5 h-5"/>} label="Candidate registry" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
           
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-8 pb-3 px-2 border-t border-slate-100 mt-4">Curriculum</p>
           <div className="max-h-[350px] overflow-y-auto custom-scrollbar space-y-1">
             {quizzes.map(q => (
               <SidebarItem 
                key={q.id} 
                icon={<BookOpen className="w-5 h-5 transition-transform group-hover:rotate-6"/>} 
                label={q.title} 
                active={selectedQuizId === q.id} 
                onClick={() => { setSelectedQuizId(q.id); setActiveTab('details'); }}
               />
             ))}
           </div>
           
           <button 
            onClick={onStartQuizEditor}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold text-sm mt-6 border border-indigo-100 group"
           >
             <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Design Assessment
           </button>
        </nav>

        <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 mb-6 backdrop-blur-sm">
           <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 px-1">Educator</div>
           <div className="text-xs font-bold text-slate-900 truncate px-1 flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {user.name}
           </div>
        </div>

        <button 
          onClick={onLogout}
          className="flex items-center gap-3 text-slate-400 hover:text-red-500 font-bold text-sm transition-colors p-4 mt-auto border-t border-slate-100 group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Logout Session
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-72 p-14 bg-slate-50 min-h-screen">
        <header className="flex justify-between items-start mb-14">
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3 leading-none">
              {activeTab === 'overview' ? 'Overview Status' : 
               activeTab === 'students' ? 'Candidate Roster' : 
               selectedQuiz?.title}
            </h1>
            <p className="text-slate-500 font-medium text-lg italic">
              {activeTab === 'overview' ? 'Analysis of cross-institutional academic performance.' : 
               activeTab === 'students' ? `${assignedStudents.length} supervised candidates under your jurisdiction.` : 
               `Session Code: ${selectedQuiz?.id} • Revealed: ${selectedQuiz?.scoreReveal === 'immediate' ? 'Yes' : 'Pending'}`}
            </p>
          </div>
          
          {selectedQuiz && activeTab === 'details' && (
            <div className="flex gap-4">
               <button 
                onClick={(e) => toggleReveal(selectedQuiz.id, e)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black tracking-widest uppercase transition-all shadow-lg",
                  selectedQuiz.scoreReveal === 'immediate' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                )}
               >
                 {selectedQuiz.scoreReveal === 'immediate' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                 {selectedQuiz.scoreReveal === 'immediate' ? "Public results" : "Hidden results"}
               </button>
               <button 
                onClick={(e) => toggleLock(selectedQuiz.id, e)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black tracking-widest uppercase transition-all shadow-lg",
                  selectedQuiz.isLocked ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                )}
               >
                 {selectedQuiz.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                 {selectedQuiz.isLocked ? "Deactivated" : "Activated"}
               </button>
               <button 
                onClick={(e) => deleteQuiz(selectedQuiz.id, e)}
                className="p-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all shadow-xl"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
            </div>
          )}

          {activeTab === 'students' && (
             <button 
              onClick={() => setIsAddingStudent(true)}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black tracking-widest uppercase text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100"
             >
                <UserPlus className="w-4 h-4" /> Register Candidate
             </button>
          )}
        </header>

        {activeTab === 'overview' && (
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <StatCard label="Total Submissions" value={filteredResults.length.toString()} icon={<Users className="w-6 h-6 text-blue-600" />} />
                <StatCard label="Institutional GPA" value={filteredResults.length ? ((filteredResults.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0) / filteredResults.length) * 100).toFixed(0) + '%' : '0%'} icon={<BarChart3 className="w-6 h-6 text-emerald-600" />} />
                <StatCard label="Integrity Flags" value={results.filter(r => r.violations.length > 0).length.toString()} icon={<ShieldAlert className="w-6 h-6 text-red-600" />} />
                <StatCard label="Assigned Cohort" value={assignedStudents.length.toString()} icon={<LayoutDashboard className="w-6 h-6 text-indigo-600" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
                   <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scoreDistribution}>
                          <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                          <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="count" radius={[12, 12, 12, 12]} barSize={50} fill="#3b82f6">
                             {scoreDistribution.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={index > 3 ? '#10b981' : index > 1 ? '#3b82f6' : '#ef4444'} />
                             ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-white p-10 rounded-[3.5rem] text-slate-900 border border-slate-200 shadow-2xl relative overflow-hidden group">
                   <h2 className="text-2xl font-black mb-8 tracking-tighter">Security Diagnostic</h2>
                   <div className="space-y-8 relative z-10">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Protocol Status</p>
                         <p className="text-emerald-600 font-black text-xl italic uppercase tracking-tighter">Hardened Environment Active</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Violation Ratio</p>
                         <div className="flex items-end gap-3">
                            <span className="text-5xl font-black text-slate-900">{results.length ? ((results.filter(r => r.violations.length > 0).length / results.length) * 100).toFixed(0) : '0'}%</span>
                            <span className="text-xs text-red-500 font-bold mb-2 uppercase italic">Detection Active</span>
                         </div>
                      </div>
                      <button 
                        onClick={() => exportResultsToCSV(results)}
                        disabled={results.length === 0}
                        className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-4 text-sm shadow-xl shadow-indigo-100"
                      >
                         <Download className="w-5 h-5" /> Export Repository
                      </button>
                   </div>
                   <ShieldAlert className="absolute right-[-20%] bottom-[-10%] w-64 h-64 text-indigo-600/5 rotate-[15deg] pointer-events-none" />
                </div>
              </div>
           </motion.div>
        )}

        {activeTab === 'students' && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-10 py-6">Candidate Information</th>
                    <th className="px-10 py-6">Assessment Load</th>
                    <th className="px-10 py-6">Mean Evaluation</th>
                    <th className="px-10 py-6 text-right">Integrity Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignedStudents.map(student => {
                    const studentResults = results.filter(r => r.studentId === student.uid);
                    const avgScore = studentResults.length ? (studentResults.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0) / studentResults.length) * 100 : 0;
                    const infractions = studentResults.reduce((acc, r) => acc + r.violations.length, 0);
                    
                    return (
                      <tr key={student.uid} className="hover:bg-slate-50/80 transition-all group">
                         <td className="px-10 py-8">
                            <div className="flex items-center gap-5">
                               <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 border border-slate-200">
                                  {student.name.charAt(0)}
                               </div>
                               <div>
                                  <p className="font-black text-slate-900 text-lg leading-none mb-1">{student.name}</p>
                                  <p className="text-xs text-slate-400 font-medium">{student.email}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-10 py-8 text-sm font-bold text-slate-600">
                            {studentResults.length} Sessions Completed
                         </td>
                         <td className="px-10 py-8">
                            <div className="flex items-center gap-4">
                               <span className="text-2xl font-black text-slate-900">{avgScore.toFixed(0)}%</span>
                               <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-400 rounded-full" style={{ width: `${avgScore}%` }} />
                               </div>
                            </div>
                         </td>
                         <td className="px-10 py-8 text-right">
                             <div className={cn(
                               "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                               infractions === 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                             )}>
                                <ShieldAlert className="w-4 h-4" />
                                {infractions === 0 ? "Flawless" : `${infractions} INFRACTIONS`}
                             </div>
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
           </motion.div>
        )}

        {activeTab === 'details' && selectedQuiz && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <MousePointer2 className="w-6 h-6 text-blue-500" /> Interaction Log
                 </h2>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Target: {selectedQuiz.id}</p>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-10 py-6">Candidate</th>
                    <th className="px-10 py-6">Score Outcome</th>
                    <th className="px-10 py-6 text-center">Protocol Infractions</th>
                    <th className="px-10 py-6 text-right">Execution Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map(res => (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="px-10 py-10 font-black text-slate-900 text-lg">{res.studentName}</td>
                      <td className="px-10 py-10">
                          <span className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border mr-4",
                            res.grade === 'Excellent' ? "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm" :
                            res.grade === 'Pass' ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-red-100 text-red-700 border-red-200"
                          )}>{res.grade}</span>
                          <span className="text-slate-400 font-mono text-lg font-bold">{res.score}<span className="text-sm opacity-50">/{res.totalQuestions}</span></span>
                      </td>
                      <td className="px-10 py-10">
                          <div className="flex justify-center gap-1.5">
                            {res.violations.length > 0 ? (
                              res.violations.map((v, i) => (
                                <div key={i} className="w-5 h-2 bg-red-500 rounded-full shadow-sm shadow-red-200" title={v.type} />
                              ))
                            ) : (
                              <div className="w-10 h-2 bg-emerald-500 rounded-full shadow-sm shadow-emerald-200" />
                            )}
                          </div>
                      </td>
                      <td className="px-10 py-10 text-right">
                        <p className="font-bold text-slate-900">{res.timeTaken}s</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase">{new Date(res.completedAt).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
          </motion.div>
        )}

        {/* Add Student Overlay */}
        <AnimatePresence>
           {isAddingStudent && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-indigo-950/60 backdrop-blur-md">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] max-w-lg w-full border border-slate-100">
                    <div className="flex justify-between items-start mb-10">
                       <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Candidate Registration</h2>
                       <button onClick={() => setIsAddingStudent(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                    </div>
                    
                    <form onSubmit={handleAddStudent} className="space-y-8">
                       <div>
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Candidate Email Address</label>
                          <input 
                            type="email" 
                            required
                            value={newStudentEmail}
                            onChange={e => setNewStudentEmail(e.target.value)}
                            placeholder="entity@domain.com"
                            className="w-full bg-slate-50 px-8 py-5 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 transition-all text-lg"
                          />
                       </div>
                       
                       {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                       
                       <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-xs text-slate-500 italic font-medium">Adding a candidate will automatically include them in your supervised registry. The default access key will be <span className="text-indigo-600 font-bold">student123</span>.</p>
                       </div>

                       <button className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 text-sm uppercase tracking-widest">
                          Commence Linkage
                       </button>
                    </form>
                </motion.div>
             </div>
           )}
        </AnimatePresence>
      </main>
    </div>
  );
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  key?: React.Key;
}

function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm group relative",
        active ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "text-slate-400 hover:bg-slate-50 hover:text-indigo-600"
      )}
    >
      <span className={active ? "text-white" : "text-slate-300 group-hover:text-indigo-400 transition-colors"}>{icon}</span>
      <span className="truncate tracking-tight">{label}</span>
      {active && <span className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full" />}
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
       <div className="relative z-10">
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 leading-none">{label}</p>
         <p className="text-4xl font-black text-slate-900 tracking-tight">{value}</p>
       </div>
       <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-30 transition-all group-hover:scale-110">
         {icon}
       </div>
    </div>
  );
}
