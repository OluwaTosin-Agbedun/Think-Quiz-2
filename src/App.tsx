import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Role, Quiz, User as AppUser } from './types';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminPortal from './components/AdminPortal';
import QuizCreator from './components/QuizCreator';
import StudentQuizView from './components/StudentQuizView';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Title Manager Component
function TitleManager() {
  const location = useLocation();
  
  useEffect(() => {
    const path = location.pathname;
    let title = 'Think Quiz | Unified Assessment Registry';
    
    if (path.includes('admin')) title = 'Admin Control | Think Quiz';
    if (path.includes('teacher')) title = 'Faculty Dashboard | Think Quiz';
    if (path.includes('student')) title = 'Candidate Portal | Think Quiz';
    if (path.includes('creator')) title = 'Curriculum Architect | Think Quiz';
    if (path.includes('quiz')) title = 'Live Assessment | Think Quiz';
    if (path === '/login' || path === '/') title = 'Authentication | Think Quiz';
    
    document.title = title;
  }, [location]);

  return null;
}

function MainApp() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const navigate = useNavigate();

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
        msg = 'CRITICAL: Email/Password registration is not enabled in Firebase.';
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
      setError(err.message);
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
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
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-none">Think <br/> Quiz</h1>
            <p className="text-slate-500 font-medium text-lg">Provide credentials to initialize session.</p>
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[3.5rem] shadow-2xl shadow-indigo-100 relative">
            <form onSubmit={handleEmailAuth} className="space-y-6">
              {authView === 'register' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Entity Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold transition-all" placeholder="Enter full legal name" />
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Communication Link</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold transition-all" placeholder="entity@domain.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Security Key</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold transition-all" placeholder="••••••••" />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-4 rounded-xl">{error}</div>}
              <button disabled={isAuthenticating} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
                {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (authView === 'login' ? 'Authenticate' : 'Initialize Account')}
              </button>
            </form>
            <div className="mt-8 pt-8 border-t border-slate-100">
              <button onClick={handleGoogleAuth} disabled={isAuthenticating} className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest disabled:opacity-50">
                {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : <><img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 rounded-full" /> Google OAuth</>}
              </button>
            </div>
            <p className="mt-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
              {authView === 'login' ? <>New entity? <button onClick={() => setAuthView('register')} className="text-indigo-600 hover:underline">Register</button></> : <>Existing entity? <button onClick={() => setAuthView('login')} className="text-indigo-600 hover:underline">Login</button></>}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${user.role}`} replace />} />
      <Route path="/admin/*" element={user.role === 'admin' ? <AdminPortal onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/teacher/*" element={user.role === 'teacher' ? <TeacherRoutes user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/student/*" element={user.role === 'student' ? <StudentRoutes user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function TeacherRoutes({ user, onLogout }: { user: AppUser, onLogout: () => void }) {
  const navigate = useNavigate();
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  return (
    <Routes>
      <Route path="/" element={<TeacherDashboard user={user} onLogout={onLogout} onStartQuizEditor={(quiz) => { setEditingQuiz(quiz || null); navigate('creator'); }} />} />
      <Route path="students" element={<TeacherDashboard user={user} onLogout={onLogout} activeTabInitial="students" onStartQuizEditor={(quiz) => { setEditingQuiz(quiz || null); navigate('creator'); }} />} />
      <Route path="quiz/:quizId" element={<TeacherDashboard user={user} onLogout={onLogout} activeTabInitial="details" onStartQuizEditor={(quiz) => { setEditingQuiz(quiz || null); navigate('/teacher/creator'); }} />} />
      <Route path="creator" element={<QuizCreator user={user} editingQuiz={editingQuiz} onCancel={() => { setEditingQuiz(null); navigate('/teacher'); }} onSave={() => { setEditingQuiz(null); navigate('/teacher'); }} />} />
    </Routes>
  );
}

function StudentRoutes({ user, onLogout }: { user: AppUser, onLogout: () => void }) {
  const navigate = useNavigate();
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  return (
    <Routes>
      <Route index element={<StudentDashboard user={user} onLogout={onLogout} onStartQuiz={async (quizId) => {
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        if (quizDoc.exists()) {
          setActiveQuiz(quizDoc.data() as Quiz);
          navigate(`quiz/${quizId}`);
        }
      }} />} />
      <Route path="quiz/:quizId" element={activeQuiz ? <StudentQuizView quiz={activeQuiz} user={user} onExit={() => { setActiveQuiz(null); navigate('/student'); }} onComplete={() => { setActiveQuiz(null); navigate('/student'); }} /> : <Navigate to="/student" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TitleManager />
      <MainApp />
    </BrowserRouter>
  );
}
