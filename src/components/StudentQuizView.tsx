import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Quiz, Question, QuizResult, Violation, User } from '../types';
import { useCheatingMonitor } from '../hooks/useCheatingMonitor';
import { cn, formatTime, calculateGrade, generateId } from '../lib/utils';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, ChevronRight, XCircle, Lock, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface StudentQuizViewProps {
  quiz: Quiz;
  user: User;
  onComplete: () => void;
  onExit: () => void;
}

export default function StudentQuizView({ quiz, user, onComplete, onExit }: StudentQuizViewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | number[] | string | null)[]>(new Array(quiz.questions.length).fill(null));
  const [selectedAnswer, setSelectedAnswer] = useState<number | number[] | string | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimitPerQuestion);
  const startTimeRef = useRef(Date.now());

  // Sync selected answer when question changes
  useEffect(() => {
    setSelectedAnswer(answers[currentQuestionIndex]);
    setTimeLeft(quiz.timeLimitPerQuestion);
  }, [currentQuestionIndex, quiz.questions.length]);

  const handleViolation = useCallback((v: Violation) => {
    setViolations(prev => [...prev, v]);
  }, []);

  const { isFullscreen, enterFullscreen } = useCheatingMonitor({
    active: isQuizStarted && !isComplete,
    onViolation: handleViolation
  });

  // Check if quiz is locked or out of schedule
  const now = Date.now();
  const isOutOfSchedule = (quiz.startTime && now < quiz.startTime) || (quiz.endTime && now > quiz.endTime);

  if ((quiz.isLocked || isOutOfSchedule) && !isQuizStarted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 text-center font-sans">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
           <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-amber-200 shadow-xl relative">
              <Lock className="w-12 h-12 text-amber-600" />
              <div className="absolute inset-0 bg-amber-600/5 blur-xl animate-pulse -z-10" />
           </div>
           <h2 className="text-4xl font-black mb-6 tracking-tighter leading-tight uppercase italic">Access Protocol Revoked</h2>
           <p className="text-slate-500 text-lg mb-12 leading-relaxed italic opacity-80 px-4 font-medium">
             "The administration has restricted access to <span className="text-indigo-600 font-bold NOT-italic">{quiz.title}</span>. Session window has closed or manual override is active."
           </p>
           <button 
            onClick={onExit} 
            className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
           >
             Exit Environment
           </button>
        </motion.div>
      </div>
    );
  }

  // Quiz Timer Logic
  useEffect(() => {
    if (!isQuizStarted || isComplete) return;

    if (timeLeft <= 0) {
      if (currentQuestionIndex < quiz.questions.length - 1) {
        handleNext();
      } else {
        finishQuiz();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isQuizStarted, isComplete, timeLeft]);

  const saveCurrentAnswer = (answer: any) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    saveCurrentAnswer(selectedAnswer);
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const handlePrevious = () => {
    saveCurrentAnswer(selectedAnswer);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const finishQuiz = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // Save the final answer first
    const finalAnswers = [...answers];
    finalAnswers[currentQuestionIndex] = selectedAnswer;

    // Calculate score
    let finalScore = 0;
    quiz.questions.forEach((q, idx) => {
      const studentAnswer = finalAnswers[idx];
      let isCorrect = false;

      if (q.type === 'single') {
        isCorrect = studentAnswer === q.correctAnswer;
      } else if (q.type === 'multiple') {
        const selected = (studentAnswer as number[]) || [];
        const correct = (q.correctAnswer as number[]) || [];
        isCorrect = selected.length === correct.length && selected.every(val => correct.includes(val));
      } else if (q.type === 'text') {
        const selected = (studentAnswer as string || '').toLowerCase().trim();
        const correct = (q.correctAnswer as string || '').toLowerCase().trim();
        isCorrect = selected.includes(correct) || correct.includes(selected);
      }

      if (isCorrect) finalScore += 1;
    });

    const resultId = generateId();
    const result: QuizResult = {
      id: resultId,
      quizId: quiz.id,
      studentId: user.uid,
      studentName: user.name,
      teacherId: quiz.teacherId,
      score: finalScore,
      grade: calculateGrade(finalScore, quiz.questions.length, quiz.gradeScale),
      totalQuestions: quiz.questions.length,
      violations,
      questions: quiz.questions,
      answers: finalAnswers,
      timeTaken: Math.floor((Date.now() - startTimeRef.current) / 1000),
      completedAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'results', resultId), result);
      
      if (finalScore / quiz.questions.length >= 0.7) {
        confetti({ 
          particleCount: 200, 
          spread: 80, 
          origin: { y: 0.6 },
          colors: ['#2563eb', '#10b981', '#f59e0b']
        });
      }
      
      setIsComplete(true);
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `results/${resultId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isQuizStarted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-slate-900 font-sans overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-white p-16 rounded-[4rem] border border-slate-200 shadow-2xl relative"
        >
          <div className="absolute top-0 right-10 w-40 h-40 bg-indigo-600/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-3xl shadow-indigo-100">
             <ShieldAlert className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-5xl font-black mb-6 tracking-tighter leading-none uppercase italic">Security Environment</h2>
          <p className="text-slate-500 text-xl mb-12 leading-relaxed font-medium italic">
            "This module requires <span className="text-indigo-600 font-bold">Mandatory Full-Screen Logic</span>. 
            Infractions such as tab-switching or focus-loss will be logged in the permanent record."
          </p>
          
          <div className="space-y-6 max-w-sm mx-auto">
             <button
               onClick={() => {
                 enterFullscreen();
                 setIsQuizStarted(true);
                 startTimeRef.current = Date.now();
               }}
               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-2xl transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
             >
               <CheckCircle2 className="w-6 h-6" /> Authenticate & Start
             </button>
             <button onClick={onExit} className="w-full text-slate-400 hover:text-slate-600 transition-colors text-xs font-black uppercase tracking-widest">
               Abort Protocol
             </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-slate-900 font-sans text-center">
         <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
            <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-emerald-100 shadow-xl shadow-emerald-600/5">
               <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase italic">Transmission Successful</h2>
            <p className="text-slate-500 text-lg mb-4 italic font-medium">
              "Your assessment data has been encrypted and committed to the registry."
            </p>
            <div className="animate-pulse flex items-center justify-center gap-2 text-emerald-600 text-sm font-black uppercase tracking-widest">
               Synchronizing with Server...
            </div>
         </motion.div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const timeProgress = (timeLeft / quiz.timeLimitPerQuestion) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none overflow-hidden">
      {/* Quiz Header */}
      <header className="bg-white border-b border-slate-200 px-10 py-5 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-10">
          <div className="hidden lg:flex items-center gap-4">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">Q</div>
             <div>
                <h1 className="font-black text-slate-900 tracking-tight leading-none mb-1 text-sm">{quiz.title}</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none">Security Environment v4.1</p>
             </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden lg:block" />
          
          <button 
            onClick={() => setShowNavigator(!showNavigator)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest",
              showNavigator ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
            )}
          >
            <BookOpen className="w-4 h-4" /> Questions Grid
          </button>
        </div>

        <div className="flex items-center gap-6 sm:gap-16">
          <div className="hidden md:flex flex-col space-y-1">
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Challenge</p>
             <p className="text-lg font-black text-slate-900 leading-none">{currentQuestionIndex + 1} <span className="text-slate-300 font-medium">/ {quiz.questions.length}</span></p>
          </div>

          {/* Violations Counter */}
          <div className={cn(
            "flex items-center gap-3 px-5 py-2 rounded-2xl border transition-all shadow-sm",
            violations.length > 0 ? "bg-red-50 border-red-200 text-red-600 animate-shake" : "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
          )}>
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-black font-mono tracking-widest">{violations.length} INFRACTIONS</span>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Time Remaining</p>
                <p className={cn("text-2xl font-black font-mono leading-none tracking-tighter", timeLeft < 10 ? "text-red-500" : "text-blue-600")}>
                  {formatTime(timeLeft)}
                </p>
             </div>
             <div className={cn(
               "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
               timeLeft < 10 ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white"
             )}>
                <Clock className="w-6 h-6" />
             </div>
          </div>
        </div>
      </header>

      {/* Progress Bar (Time) */}
      <div className="h-2 w-full bg-slate-100 relative overflow-hidden">
        <motion.div 
          className={cn("absolute h-full left-0", timeLeft < 10 ? "bg-red-500" : "bg-blue-500")}
          initial={{ width: "100%" }}
          animate={{ width: `${timeProgress}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>

      <AnimatePresence>
        {showNavigator && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="max-w-5xl mx-auto p-10">
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                {quiz.questions.map((_, i) => {
                  const hasAnswer = answers[i] !== null && answers[i] !== undefined && (typeof answers[i] !== 'string' || (answers[i] as string).trim() !== '') && (!Array.isArray(answers[i]) || (answers[i] as any[]).length > 0);
                  const isCurrent = currentQuestionIndex === i;
                  
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        saveCurrentAnswer(selectedAnswer);
                        setCurrentQuestionIndex(i);
                        setShowNavigator(false);
                      }}
                      className={cn(
                        "h-12 rounded-xl font-black transition-all border-2 flex items-center justify-center text-xs",
                        isCurrent ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" :
                        hasAnswer ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                        "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex overflow-hidden p-8 sm:p-20">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -40, filter: "blur(10px)" }}
            className="w-full max-w-5xl mx-auto flex flex-col justify-center gap-12"
          >
            <div className="space-y-8">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                  <BookOpen className="w-3 h-3" /> Question {currentQuestionIndex + 1}
               </div>
               <h2 className="text-4xl sm:text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter max-w-4xl">
                 {currentQuestion.text}
               </h2>
            </div>

            {currentQuestion.type === 'text' ? (
              <div className="w-full max-w-3xl">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Written Response</label>
                <textarea
                  rows={4}
                  value={selectedAnswer as string || ''}
                  onChange={e => setSelectedAnswer(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full bg-white p-8 rounded-[2rem] border-3 border-slate-100 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold text-xl text-slate-900 transition-all shadow-sm placeholder:opacity-30 italic"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-20">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = currentQuestion.type === 'single' 
                    ? selectedAnswer === index 
                    : (selectedAnswer as number[] || []).includes(index);

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (currentQuestion.type === 'single') {
                          setSelectedAnswer(index);
                        } else {
                          const current = (selectedAnswer as number[] || []);
                          const updated = current.includes(index)
                            ? current.filter(i => i !== index)
                            : [...current, index].sort();
                          setSelectedAnswer(updated);
                        }
                      }}
                      className={cn(
                        "group relative p-8 text-left border-3 rounded-[2.5rem] transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.98] shadow-sm",
                        isSelected 
                          ? "border-blue-600 bg-blue-50 shadow-2xl shadow-blue-600/10 ring-4 ring-blue-600/5" 
                          : "border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50"
                      )}
                    >
                      <span className="flex items-start gap-6">
                        <span className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 transition-all border-2",
                          isSelected 
                            ? "bg-blue-600 text-white border-blue-500 rotate-12" 
                            : "bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 border-slate-100"
                        )}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className={cn(
                          "text-xl font-bold pt-2.5",
                          isSelected ? "text-blue-900" : "text-slate-600"
                        )}>
                          {option}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-200 p-10 mt-auto">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-8">
          <div className="flex items-center gap-10 flex-1">
            <div className="hidden md:flex items-center gap-6 flex-1">
              <div className="w-full max-w-[240px] h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                 <motion.div 
                  className="h-full bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "circOut" }}
                 />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{Math.round(progress)}% Complete</span>
            </div>
            
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || isSubmitting}
              className="bg-slate-50 hover:bg-slate-100 disabled:opacity-20 text-slate-400 font-black px-8 py-5 rounded-[1.5rem] flex items-center gap-4 transition-all uppercase tracking-widest text-sm border-2 border-slate-100"
            >
              Previous
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-20 text-white px-12 py-5 rounded-[1.5rem] font-black flex items-center gap-4 transition-all shadow-xl shadow-indigo-100 active:scale-95 group text-lg uppercase tracking-widest shrink-0"
          >
            {isSubmitting ? 'Transmitting...' : (currentQuestionIndex === quiz.questions.length - 1 ? 'Commit Session' : 'Next Question')}
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </footer>

      {/* Security Overlays */}
      {!isFullscreen && isQuizStarted && !isComplete && (
        <div className="fixed inset-0 z-[9999] bg-red-600/95 backdrop-blur-3xl flex items-center justify-center p-8 text-white text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl">
            <ShieldAlert className="w-32 h-32 mx-auto mb-10 text-white animate-pulse" />
            <h2 className="text-6xl font-black mb-6 tracking-tighter uppercase">Protocol Violation</h2>
            <p className="text-2xl font-bold mb-12 leading-relaxed opacity-90 max-w-lg mx-auto">
              Mandatory focus-integrity lost. All interactions have been suspended until re-authentication.
            </p>
            <button
              onClick={enterFullscreen}
              className="bg-white text-red-600 px-12 py-6 rounded-3xl font-black text-xl hover:bg-slate-100 transition-all shadow-4xl uppercase tracking-widest active:scale-95"
            >
              Re-establish Session
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
