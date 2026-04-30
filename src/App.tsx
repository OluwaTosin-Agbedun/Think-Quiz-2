import React, { useState, useEffect } from 'react';
import { Role, Quiz, User } from './types';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminPortal from './components/AdminPortal';
import QuizCreator from './components/QuizCreator';
import StudentQuizView from './components/StudentQuizView';
import { Shield, BookOpen, GraduationCap, ChevronRight, UserCircle2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [view, setView] = useState<'dashboard' | 'creator' | 'quiz'>('dashboard');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [studentName, setStudentName] = useState('');

  // Auto-set role if stored
  useEffect(() => {
    const savedRole = localStorage.getItem('current_role') as Role;
    if (savedRole) setRole(savedRole);
    
    const savedName = localStorage.getItem('student_name');
    if (savedName) setStudentName(savedName);
  }, []);

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    localStorage.setItem('current_role', selectedRole);
  };

  const handleLogout = () => {
    setRole(null);
    setStudentName('');
    localStorage.removeItem('current_role');
    localStorage.removeItem('student_name');
    setView('dashboard');
    setActiveQuiz(null);
  };

  // Auth/Landing Page
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10"
        >
          <div className="md:col-span-3 text-center mb-12">
             <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8 shadow-xl shadow-indigo-500/10">
                <Shield className="w-4 h-4" /> Integrity Framework v4.0
             </div>
             <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-6 leading-[0.9]">
               Next-Generation <br/> Academic Integrity
             </h1>
             <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
               A multi-tiered platform for administrators, educators, and researchers.
             </p>
          </div>

          <RoleCard 
            icon={<Shield className="w-10 h-10" />}
            title="Admin Portal"
            description="System-wide management of users, global analytics, and security policy enforcement."
            cta="System Access"
            onClick={() => handleRoleSelect('admin')}
            variant="dark"
          />

          <RoleCard 
            icon={<GraduationCap className="w-10 h-10" />}
            title="Educator Console"
            description="Architect robust assessments with AI assist and monitor real-time integrity logs."
            cta="Educator Access"
            onClick={() => handleRoleSelect('teacher')}
            variant="blue"
          />

          <RoleCard 
            icon={<BookOpen className="w-10 h-10" />}
            title="Student Hub"
            description="Engage in evaluations. Focus-driven interfaces designed for maximum performance."
            cta="Student Access"
            onClick={() => handleRoleSelect('student')}
            variant="light"
          />
        </motion.div>
      </div>
    );
  }

  // Admin View
  if (role === 'admin') {
    return <AdminPortal onLogout={handleLogout} />;
  }

  // Teacher Views
  if (role === 'teacher') {
    if (view === 'creator') {
      return (
        <QuizCreator 
          onCancel={() => setView('dashboard')}
          onSave={(quiz) => {
            const existing = JSON.parse(localStorage.getItem('quizzes') || '[]');
            localStorage.setItem('quizzes', JSON.stringify([...existing, quiz]));
            setView('dashboard');
          }}
        />
      );
    }

    return (
      <TeacherDashboard 
        onLogout={handleLogout}
        on创造Quiz={() => setView('creator')}
      />
    );
  }

  // Student Views
  if (role === 'student') {
    if (view === 'quiz' && activeQuiz) {
      return (
        <StudentQuizView 
          quiz={activeQuiz}
          studentName={studentName || 'Anonymous Student'}
          onExit={() => {
            setView('dashboard');
            setActiveQuiz(null);
          }}
          onComplete={(result) => {
            const existing = JSON.parse(localStorage.getItem('quiz_results') || '[]');
            localStorage.setItem('quiz_results', JSON.stringify([...existing, result]));
            setView('dashboard');
            setActiveQuiz(null);
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <AnimatePresence>
          {!studentName && (
             <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] max-w-lg w-full border border-slate-100"
                >
                   <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                      <UserCircle2 className="w-8 h-8 text-blue-600" />
                   </div>
                   <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Identify Session</h2>
                   <p className="text-slate-500 mb-8 font-medium">Authentication required. Please enter your registered legal name for this assessment session.</p>
                   
                   <div className="relative mb-6">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Legal Full Name"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (val) {
                              setStudentName(val);
                              localStorage.setItem('student_name', val);
                            }
                          }
                        }}
                        className="w-full bg-slate-50 px-12 py-4 rounded-2xl border border-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 transition-all"
                      />
                   </div>
                   
                   <button 
                    onClick={() => {
                      const input = document.querySelector('input') as HTMLInputElement;
                      if (input.value) {
                         setStudentName(input.value);
                         localStorage.setItem('student_name', input.value);
                      }
                    }}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 text-lg uppercase tracking-widest"
                   >
                     Initiate Session
                   </button>
                </motion.div>
             </div>
          )}
        </AnimatePresence>
        <StudentDashboard 
          onLogout={handleLogout}
          onStartQuiz={(quizId) => {
            const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
            const quiz = quizzes.find((q: Quiz) => q.id === quizId);
            if (quiz) {
              setActiveQuiz(quiz);
              setView('quiz');
            }
          }}
        />
      </div>
    );
  }

  return null;
}

function RoleCard({ icon, title, description, cta, onClick, variant }: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  cta: string, 
  onClick: () => void,
  variant: 'blue' | 'light' | 'dark'
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-10 rounded-[3rem] text-left transition-all duration-500 transform hover:scale-[1.03] active:scale-[0.98] group flex flex-col justify-between h-[420px] relative overflow-hidden",
        variant === 'blue' ? "bg-blue-600 text-white shadow-2xl shadow-blue-500/20" : 
        variant === 'dark' ? "bg-slate-900 text-white shadow-2xl border border-slate-800" :
        "bg-white text-slate-900 border border-slate-100 shadow-xl"
      )}
    >
      <div className="relative z-10">
        <div className={cn(
          "w-20 h-20 rounded-3xl flex items-center justify-center mb-10 transition-transform group-hover:rotate-6",
          variant === 'blue' ? "bg-white/10 border border-white/20" : 
          variant === 'dark' ? "bg-indigo-600 shadow-lg shadow-indigo-500/40" :
          "bg-slate-100"
        )}>
          {icon}
        </div>
        <h2 className="text-4xl font-black mb-6 leading-[0.9] tracking-tighter">{title}</h2>
        <p className={cn(
          "text-lg leading-relaxed font-medium",
          variant === 'blue' ? "text-blue-100" : 
          variant === 'dark' ? "text-slate-400" :
          "text-slate-500"
        )}>
          {description}
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-3 font-black uppercase tracking-[0.2em] text-xs mt-10 p-1">
        <span className={cn(
          "px-4 py-2 rounded-full border transition-all",
          variant === 'blue' ? "bg-white/10 border-white/20 group-hover:bg-white group-hover:text-blue-600" : 
          variant === 'dark' ? "bg-white/5 border-white/10 group-hover:bg-white group-hover:text-slate-900" :
          "bg-slate-900 text-white"
        )}>
          {cta}
        </span>
      </div>

      {/* Decorative items */}
      <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-white/5 rounded-full blur-3xl" />
    </button>
  );
}
