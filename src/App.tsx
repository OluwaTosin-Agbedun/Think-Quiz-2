import React, { useState, useEffect } from 'react';
import { Role, Quiz, User as AppUser, QuizResult } from './types';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminPortal from './components/AdminPortal';
import QuizCreator from './components/QuizCreator';
import StudentQuizView from './components/StudentQuizView';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const [view, setView] = useState<'dashboard' | 'creator' | 'quiz'>('dashboard');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as AppUser);
        } else {
          const role: Role = firebaseUser.email === 'it.support@mekaria.edu.ng' ? 'admin' : 'student';
          const newUser: AppUser = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || name || 'New User',
            email: firebaseUser.email || '',
            role: role,
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      setIsAuthenticating(false);
    });

    return () => unsubscribe();
  }, [name]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAuthenticating(true);
    try {
      if (authView === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name) {
          setError('Full identification required.');
          setIsAuthenticating(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'CRITICAL: Email/Password registration is not enabled in Firebase. Please enable it in the Firebase Console (Authentication > Sign-in method).';
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'Invalid credentials. Please verify your email and security key.';
      }
      setError(msg);
      setIsAuthenticating(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (isAuthenticating) return;
    setError('');
    setIsAuthenticating(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request') {
        console.warn('Authentication popup already active.');
        return;
      }
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Authentication was interrupted.');
      } else {
        setError(err.message);
      }
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('dashboard');
    setActiveQuiz(null);
    setEditingQuiz(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 gap-6 font-sans">
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
        <div className="text-center">
           <p className="text-indigo-600 font-extrabold uppercase tracking-[0.3em] text-[10px] mb-2">Protocol Synchronization</p>
           <p className="text-slate-400 font-medium italic text-sm">Establishing secure handshake with registry...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[150px] rounded-full" />
        
        <div className="max-w-md w-full relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-600/20 text-indigo-600 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-8">
              <Shield className="w-4 h-4" /> Think Quiz v1
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-none">
              Think <br/> Quiz
            </h1>
            <p className="text-slate-500 font-medium text-lg">Provide credentials to initialize session.</p>
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[3.5rem] shadow-2xl shadow-indigo-100 relative">
            <form onSubmit={handleEmailAuth} className="space-y-6">
              {authView === 'register' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Entity Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold transition-all"
                    placeholder="Enter full legal name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Communication Link</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold transition-all"
                    placeholder="entity@domain.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Security Key</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-4 rounded-xl">
                  {error}
                </div>
              )}

              <button 
                disabled={isAuthenticating}
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Authorization...
                  </span>
                ) : (
                  authView === 'login' ? 'Authenticate' : 'Initialize Account'
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <button 
                onClick={handleGoogleAuth}
                disabled={isAuthenticating}
                className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                ) : (
                  <>
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 rounded-full" />
                    Google OAuth
                  </>
                )}
              </button>
            </div>

            <p className="mt-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
              {authView === 'login' ? (
                <>New entity? <button onClick={() => setAuthView('register')} className="text-indigo-600 hover:underline">Register</button></>
              ) : (
                <>Existing entity? <button onClick={() => setAuthView('login')} className="text-indigo-600 hover:underline">Login</button></>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (user.role === 'admin') {
    return <AdminPortal onLogout={handleLogout} />;
  }

  if (user.role === 'teacher') {
    if (view === 'creator') {
      return (
        <QuizCreator 
          user={user}
          editingQuiz={editingQuiz}
          onCancel={() => {
            setView('dashboard');
            setEditingQuiz(null);
          }}
          onSave={() => {
            setView('dashboard');
            setEditingQuiz(null);
          }}
        />
      );
    }

    return (
      <TeacherDashboard 
        user={user}
        onLogout={handleLogout}
        onStartQuizEditor={(quiz) => {
          setEditingQuiz(quiz || null);
          setView('creator');
        }}
      />
    );
  }

  if (user.role === 'student') {
    if (view === 'quiz' && activeQuiz) {
      return (
        <StudentQuizView 
          quiz={activeQuiz}
          user={user}
          onExit={() => {
            setView('dashboard');
            setActiveQuiz(null);
          }}
          onComplete={() => {
            setView('dashboard');
            setActiveQuiz(null);
          }}
        />
      );
    }

    return (
      <StudentDashboard 
        user={user}
        onLogout={handleLogout}
        onStartQuiz={async (quizId) => {
          try {
            const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
            if (quizDoc.exists()) {
              setActiveQuiz(quizDoc.data() as Quiz);
              setView('quiz');
            }
          } catch (err) {
            console.error('Failed to fetch quiz details:', err);
          }
        }}
      />
    );
  }

  return null;
}
