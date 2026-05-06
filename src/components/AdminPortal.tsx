import React, { useState, useEffect } from 'react';
import { Users, BookOpen, ShieldAlert, Trash2, ArrowUpRight, LogOut, Search, UserPlus, CheckCircle2, ChevronRight, X, Loader2 } from 'lucide-react';
import { User, Quiz } from '../types';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';

interface AdminPortalProps {
  onLogout: () => void;
}

import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { config } from '../lib/firebase';

export default function AdminPortal({ onLogout }: AdminPortalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [assigningStudent, setAssigningStudent] = useState<User | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.includes('security') ? 'security' : location.pathname.includes('quizzes') ? 'quizzes' : 'users';
  
  const [isCreatingUser, setIsCreatingUser] = useState<User['role'] | null>(null);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '' });
  const [createError, setCreateError] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as User));
    });

    const unsubQuizzes = onSnapshot(collection(db, 'quizzes'), (snapshot) => {
      setQuizzes(snapshot.docs.map(doc => doc.data() as Quiz));
    });

    const unsubResults = onSnapshot(collection(db, 'results'), (snapshot) => {
      setResults(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubUsers();
      unsubQuizzes();
      unsubResults();
    };
  }, []);

  const infractions = results.flatMap(r => 
    (r.violations || []).map((v: any) => ({
      ...v,
      studentName: r.studentName,
      quizId: r.quizId
    }))
  ).sort((a, b) => b.timestamp - a.timestamp);

  const totalInfractions = infractions.length;
  const criticalEntities = Array.from(new Set(
    results.filter(r => (r.violations || []).length >= 3).map(r => r.studentId)
  )).length;

  const deleteUser = async (uid: string) => {
    if (window.confirm('Delete this registry entry permanently?')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const promoteUser = async (uid: string, currentRole: User['role']) => {
    const nextRole: User['role'] = currentRole === 'student' ? 'teacher' : currentRole === 'teacher' ? 'admin' : 'student';
    await updateDoc(doc(db, 'users', uid), { role: nextRole });
  };

  const assignToTeacher = async (studentUid: string, teacherUid: string | null) => {
    if (!teacherUid) {
      // Clear all assignments? Or just one?
      // Given the "Remove Assignment" button, let's clear the array
      await updateDoc(doc(db, 'users', studentUid), { teacherIds: [] });
    } else {
      const student = users.find(u => u.uid === studentUid);
      const isAlreadyAssigned = student?.teacherIds?.includes(teacherUid);
      
      if (isAlreadyAssigned) {
        await updateDoc(doc(db, 'users', studentUid), { teacherIds: arrayRemove(teacherUid) });
      } else {
        await updateDoc(doc(db, 'users', studentUid), { teacherIds: arrayUnion(teacherUid) });
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreatingUser) return;
    setCreateError('');
    setIsSubmittingUser(true);

    let secondaryApp;
    try {
      secondaryApp = initializeApp(config, `AdminTask_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newUserForm.email, 
        newUserForm.password
      );

      const newUser: User = {
        uid: firebaseUser.uid,
        name: newUserForm.name,
        email: newUserForm.email,
        role: isCreatingUser
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      await signOut(secondaryAuth);
      
      setIsCreatingUser(null);
      setNewUserForm({ name: '', email: '', password: '' });
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'CRITICAL: Email/Password registration is not enabled in Firebase. Please enable it in the Firebase Console (Authentication > Sign-in method).';
      }
      setCreateError(msg);
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      setIsSubmittingUser(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const teachers = users.filter(u => u.role === 'teacher');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans overflow-hidden">
      <aside className="w-80 border-r border-slate-200 p-10 flex flex-col gap-12 bg-white shadow-xl relative z-20">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-100 text-white">T</div>
          <div>
            <span className="font-black text-2xl tracking-tighter block leading-none">Think Quiz</span>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mt-2">Admin Command</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-4">
          <SidebarLink 
            icon={<Users className="w-6 h-6" />} 
            label="User Registry" 
            active={activeTab === 'users'} 
            onClick={() => navigate('/admin')}
          />
          <SidebarLink 
            icon={<BookOpen className="w-6 h-6" />} 
            label="Knowledge Hub" 
            active={activeTab === 'quizzes'} 
            onClick={() => navigate('/admin/quizzes')}
          />
          <SidebarLink 
            icon={<ShieldAlert className="w-6 h-6" />} 
            label="Security Audit" 
            active={activeTab === 'security'} 
            onClick={() => navigate('/admin/security')}
          />
        </nav>

        <button 
          onClick={onLogout}
          className="flex items-center gap-4 text-slate-400 hover:text-red-600 transition-all mt-auto p-5 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs tracking-[0.2em] uppercase group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Sign Out
        </button>
      </aside>

      <main className="flex-1 p-20 overflow-y-auto relative bg-slate-50 custom-scrollbar">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/[0.03] blur-[150px] rounded-full pointer-events-none" />
        
        <header className="flex justify-between items-end mb-20 relative z-10">
          <div>
            <h1 className="text-6xl font-black mb-5 tracking-tighter leading-none text-slate-900 font-sans uppercase italic">Central Control</h1>
            <p className="text-slate-400 font-bold text-xl italic opacity-60">"Oversight of academic integrity and system hierarchy."</p>
          </div>
          <div className="flex gap-8">
             <StatCard label="Total Entities" value={users.length} />
             <StatCard label="Live Assessments" value={quizzes.length} accent="indigo" />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.section 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="bg-white rounded-[4rem] border border-slate-200 overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-xl">
                <div>
                   <h2 className="text-3xl font-black tracking-tight mb-1">Entity Registry</h2>
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">User Privileges & Associations</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsCreatingUser('teacher')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100"
                  >
                    <UserPlus className="w-4 h-4" /> Educator
                  </button>
                  <button 
                    onClick={() => setIsCreatingUser('student')}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <UserPlus className="w-4 h-4" /> Student
                  </button>
                  <div className="relative group ml-4">
                    <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Filter entities..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-8 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 w-80 transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-100">
                      <th className="px-12 py-8">Entity Profile</th>
                      <th className="px-12 py-8">Authorization</th>
                      <th className="px-12 py-8">Association Status</th>
                      <th className="px-12 py-8 text-right">Directives</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map(user => (
                      <tr key={user.uid} className="hover:bg-indigo-50/50 transition-all group">
                        <td className="px-12 py-10">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-slate-100 rounded-[1.25rem] flex items-center justify-center font-black text-2xl text-slate-400 border border-slate-200 group-hover:scale-105 transition-transform">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                               <p className="font-black text-slate-900 text-xl leading-none mb-2">{user.name}</p>
                               <p className="text-xs text-slate-400 font-mono tracking-tighter">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-12 py-10">
                           <span className={cn(
                             "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border",
                             user.role === 'admin' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' :
                             user.role === 'teacher' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                             'bg-slate-100 border-slate-200 text-slate-500'
                           )}>
                             {user.role}
                           </span>
                        </td>
                         <td className="px-12 py-10 text-sm">
                           {user.role === 'student' ? (
                             <div className="flex flex-wrap gap-2">
                               <button 
                                 onClick={() => setAssigningStudent(user)}
                                 className="font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-2 group/btn transition-all"
                                >
                                 {user.teacherIds && user.teacherIds.length > 0 ? (
                                   <div className="flex flex-wrap gap-2">
                                     {user.teacherIds.map(tId => {
                                       const teacher = teachers.find(t => t.uid === tId);
                                       return (
                                         <span key={tId} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-[10px]">
                                            <span className="w-4 h-4 bg-emerald-100 rounded-md flex items-center justify-center text-[8px] text-emerald-600 font-black">OK</span>
                                            <span className="text-slate-600 font-bold">{teacher?.name || 'Unknown'}</span>
                                         </span>
                                       );
                                     })}
                                     <UserPlus className="w-4 h-4 text-indigo-400 ml-1" />
                                   </div>
                                 ) : (
                                   <span className="flex items-center gap-3 italic opacity-50 px-2 text-[10px]">
                                     Unlinked Node <UserPlus className="w-4 h-4" />
                                   </span>
                                 )}
                               </button>
                             </div>
                           ) : (
                             <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">Inapplicable</span>
                           )}
                        </td>
                        <td className="px-12 py-10 text-right">
                           <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                              <button 
                                onClick={() => promoteUser(user.uid, user.role)}
                                className="bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-400 p-4 rounded-xl transition-all shadow-sm active:scale-95"
                                title="Elevate Privilege"
                              >
                                <ArrowUpRight className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => deleteUser(user.uid)}
                                className="bg-slate-50 hover:bg-red-600 hover:text-white text-slate-400 p-4 rounded-xl transition-all shadow-sm active:scale-95"
                                title="Revoke Access"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.section>
          )}

          {activeTab === 'quizzes' && (
             <motion.section 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
             >
                {quizzes.map(quiz => (
                  <div key={quiz.id} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-xl group hover:border-indigo-400/30 transition-all relative overflow-hidden">
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-8">
                           <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-indigo-600">
                              <BookOpen className="w-8 h-8" />
                           </div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">ID: {quiz.id}</span>
                        </div>
                        <h3 className="text-3xl font-black mb-4 tracking-tighter leading-none group-hover:text-indigo-600 transition-colors uppercase italic">{quiz.title}</h3>
                        <p className="text-slate-500 text-lg mb-10 line-clamp-2 italic font-medium">"{quiz.description}"</p>
                        <div className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-center">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600">
                                 {users.find(u => u.uid === quiz.teacherId)?.name.charAt(0) || 'A'}
                              </div>
                              <span className="text-sm font-bold text-slate-600 capitalize">{users.find(u => u.uid === quiz.teacherId)?.name || 'Central Command'}</span>
                           </div>
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{quiz.questions.length} Modules</span>
                        </div>
                     </div>
                  </div>
                ))}
             </motion.section>
          )}

          {activeTab === 'security' && (
             <motion.section 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-10"
             >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                   <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl relative overflow-hidden group">
                      <div className="relative z-10">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Anomalies Detected</p>
                         <h4 className="text-6xl font-black text-slate-900 tracking-tighter mb-2">{totalInfractions}</h4>
                         <p className="text-sm text-slate-400 font-bold italic">Total focus-breach infractions logged.</p>
                      </div>
                   </div>
                   <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl relative overflow-hidden group">
                      <div className="relative z-10">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">High Risk Profiles</p>
                         <h4 className="text-6xl font-black text-amber-600 tracking-tighter mb-2">{criticalEntities}</h4>
                         <p className="text-sm text-slate-400 font-bold italic">Entities with {'>'}3 integrity violations.</p>
                      </div>
                   </div>
                   <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl relative overflow-hidden group">
                      <div className="relative z-10">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">System Integrity</p>
                         <h4 className="text-6xl font-black text-emerald-600 tracking-tighter mb-2">99.8%</h4>
                         <p className="text-sm text-slate-400 font-bold italic">Global compliance level verified.</p>
                      </div>
                   </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-xl">
                   <div className="p-10 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                      <ShieldAlert className="w-8 h-8 text-indigo-600" />
                      <div>
                         <h3 className="text-2xl font-black tracking-tight text-slate-900">Infraction Audit Log</h3>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time focus violation tracking</p>
                      </div>
                   </div>
                   <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                           <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                              <th className="px-12 py-6">Entity</th>
                              <th className="px-12 py-6">Infraction Type</th>
                              <th className="px-12 py-6">Timestamp</th>
                              <th className="px-12 py-6">Context</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {infractions.length === 0 ? (
                               <tr>
                                  <td colSpan={4} className="px-12 py-20 text-center text-slate-300 font-black italic opacity-30 text-2xl uppercase tracking-widest">Zero infractions registered.</td>
                               </tr>
                           ) : (
                               infractions.map((inf, i) => (
                                  <tr key={i} className="hover:bg-red-50/50 transition-all group">
                                     <td className="px-12 py-8">
                                        <div className="flex items-center gap-4">
                                           <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400">
                                              {inf.studentName.charAt(0)}
                                           </div>
                                           <span className="font-black text-slate-900">{inf.studentName}</span>
                                        </div>
                                     </td>
                                     <td className="px-12 py-8">
                                        <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                           {inf.type.replace('-', ' ')}
                                        </span>
                                     </td>
                                     <td className="px-12 py-8 font-mono text-xs text-slate-500">{new Date(inf.timestamp).toLocaleString()}</td>
                                     <td className="px-12 py-8 font-mono text-[10px] text-slate-400">ID: {inf.quizId}</td>
                                  </tr>
                               ))
                           )}
                        </tbody>
                      </table>
                   </div>
                </div>
             </motion.section>
          )}
        </AnimatePresence>

        {/* User Creation Modal */}
        <AnimatePresence>
          {isCreatingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-indigo-950/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white border border-slate-200 p-12 rounded-[3.5rem] w-full max-w-lg shadow-4xl"
              >
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-black mb-2 tracking-tight text-slate-900">Provision {isCreatingUser === 'teacher' ? 'Educator' : 'Student'}</h2>
                    <p className="text-slate-400 font-medium italic">Granting access to the knowledge hub.</p>
                  </div>
                  <button onClick={() => setIsCreatingUser(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-7 h-7 text-slate-300" />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Legal Name</label>
                    <input 
                      required
                      type="text"
                      value={newUserForm.name}
                      onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Access Email</label>
                    <input 
                      required
                      type="email"
                      value={newUserForm.email}
                      onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold"
                      placeholder="entity@domain.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Access Key</label>
                    <input 
                      required
                      type="password"
                      value={newUserForm.password}
                      onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold"
                      placeholder="••••••••"
                    />
                  </div>

                  {createError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-4 rounded-xl">
                      {createError}
                    </div>
                  )}

                  <button 
                    disabled={isSubmittingUser}
                    className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-sm disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-indigo-100"
                  >
                    {isSubmittingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Execute Provisioning'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Assignment Overlay */}
        <AnimatePresence>
          {assigningStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-indigo-950/40 backdrop-blur-sm">
               <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white border border-slate-200 p-10 rounded-[3rem] w-full max-w-lg shadow-4xl"
               >
                  <div className="flex justify-between items-start mb-10">
                     <div>
                        <h2 className="text-3xl font-black mb-2 tracking-tight text-slate-900">Assign Educator</h2>
                        <p className="text-slate-400 font-medium">Link <span className="text-indigo-600 font-bold">{assigningStudent.name}</span> to a supervising teacher.</p>
                     </div>
                     <button onClick={() => setAssigningStudent(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-300" />
                     </button>
                  </div>

                   <div className="space-y-3 mb-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     <button 
                        onClick={() => assignToTeacher(assigningStudent.uid, null)}
                        className={cn(
                          "w-full p-6 bg-slate-50 border rounded-2xl text-left transition-all flex items-center justify-between group",
                          (!assigningStudent.teacherIds || assigningStudent.teacherIds.length === 0) ? "border-indigo-500 bg-indigo-50 shadow-lg" : "border-slate-100 hover:border-slate-200"
                        )}
                      >
                         <span className="font-bold text-slate-400">Flush All Assignments</span>
                         {(!assigningStudent.teacherIds || assigningStudent.teacherIds.length === 0) && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                      </button>
                     {teachers.map(teacher => {
                       const isAssigned = assigningStudent.teacherIds?.includes(teacher.uid);
                       return (
                         <button 
                          key={teacher.uid}
                          onClick={() => assignToTeacher(assigningStudent.uid, teacher.uid)}
                          className={cn(
                            "w-full p-6 bg-slate-50 rounded-2xl text-left transition-all flex items-center justify-between group border",
                            isAssigned ? "border-indigo-500 bg-indigo-50 shadow-lg" : "border-slate-100 hover:border-slate-200"
                          )}
                         >
                            <div>
                              <p className="font-black text-slate-900">{teacher.name}</p>
                              <p className="text-xs text-slate-400">{teacher.email}</p>
                            </div>
                            {isAssigned && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                         </button>
                       );
                     })}
                  </div>

                  <button 
                    onClick={() => setAssigningStudent(null)}
                    className="w-full bg-slate-100 text-slate-900 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-sm"
                  >
                    Close Protocol
                  </button>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all relative group",
        active ? "bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100" : "text-slate-400 hover:bg-slate-50 hover:text-indigo-600 font-bold"
      )}
    >
      {icon}
      <span className="text-sm tracking-tight">{label}</span>
      {active && <motion.span layoutId="activeInd" className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full" />}
    </button>
  );
}

function StatCard({ label, value, accent = 'blue' }: { label: string, value: number, accent?: 'blue' | 'indigo' }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col min-w-[220px] shadow-lg relative overflow-hidden group">
      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest relative z-10 mb-1">{label}</span>
      <span className="text-4xl font-black relative z-10 text-slate-900">{value}</span>
      <div className={cn(
        "absolute right-[-10%] bottom-[-20%] w-24 h-24 rounded-full blur-2xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity",
        accent === 'blue' ? "bg-blue-600" : "bg-indigo-600"
      )} />
    </div>
  );
}
