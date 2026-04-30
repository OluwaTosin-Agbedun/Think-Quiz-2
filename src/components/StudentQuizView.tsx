import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Quiz, Question, QuizResult, Violation } from '../types';
import { useCheatingMonitor } from '../hooks/useCheatingMonitor';
import { cn, formatTime, calculateGrade } from '../lib/utils';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, ChevronRight, XCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface StudentQuizViewProps {
  quiz: Quiz;
  studentName: string;
  onComplete: (result: QuizResult) => void;
  onExit: () => void;
}

export default function StudentQuizView({ quiz, studentName, onComplete, onExit }: StudentQuizViewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimitPerQuestion);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(Date.now());

  const handleViolation = useCallback((v: Violation) => {
    setViolations(prev => [...prev, v]);
  }, []);

  const { isFullscreen, enterFullscreen } = useCheatingMonitor({
    active: isQuizStarted && !isComplete,
    onViolation: handleViolation
  });

  // Check if quiz is locked
  if (quiz.isLocked && !isQuizStarted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md">
           <div className="w-20 h-20 bg-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-amber-500/30 shadow-xl shadow-amber-500/10">
              <Lock className="w-10 h-10 text-amber-500" />
           </div>
           <h2 className="text-4xl font-black mb-4 tracking-tight">Access Restricted</h2>
           <p className="text-slate-400 text-lg mb-10 leading-relaxed italic">
             "Professor {quiz.teacherId === 'u1' ? 'Sarah Wilson' : 'Administrator'} has locked this assessment. No further submissions are being accepted at this time."
           </p>
           <button onClick={onExit} className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
             Return to Portal
           </button>
        </motion.div>
      </div>
    )
  }

  // Quiz Timer
  useEffect(() => {
    if (!isQuizStarted || isComplete) return;

    if (timeLeft <= 0) {
      handleNext();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isQuizStarted, isComplete, timeLeft]);

  const handleNext = () => {
    const currentQuestion = quiz.questions[currentQuestionIndex];
    let newScore = score;
    if (selectedAnswer === currentQuestion.correctAnswer) {
      newScore += 1;
      setScore(newScore);
    }

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setTimeLeft(quiz.timeLimitPerQuestion);
    } else {
      finishQuiz(newScore);
    }
  };

  const finishQuiz = (finalScore: number) => {
    setIsComplete(true);
    const result: QuizResult = {
      id: Math.random().toString(36).substr(2, 9),
      quizId: quiz.id,
      studentId: 's-current',
      studentName,
      score: finalScore,
      grade: calculateGrade(finalScore, quiz.questions.length, quiz.gradeScale),
      totalQuestions: quiz.questions.length,
      violations,
      timeTaken: Math.floor((Date.now() - startTimeRef.current) / 1000),
      completedAt: Date.now()
    };
    
    if (finalScore / quiz.questions.length >= 0.7) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }

    onComplete(result);
  };

  if (!isQuizStarted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-white/10 shadow-2xl text-center"
        >
          <ShieldAlert className="w-16 h-16 text-blue-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Security Requirement</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            This quiz requires <span className="text-white font-semibold">mandatory Full-Screen Mode</span> for integrity. 
            Any attempt to exit full-screen or switch tabs will be logged as a violation.
          </p>
          <div className="space-y-4">
             <button
              onClick={() => {
                enterFullscreen();
                setIsQuizStarted(true);
                startTimeRef.current = Date.now();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" /> START SECURE SESSION
            </button>
            <button onClick={onExit} className="w-full text-slate-500 hover:text-slate-300 transition-colors text-sm font-medium">
              Go Back
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const timeProgress = (timeLeft / quiz.timeLimitPerQuestion) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      {/* Quiz Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="hidden sm:block">
             <h1 className="font-bold text-slate-900 truncate max-w-[200px]">{quiz.title}</h1>
             <p className="text-xs text-slate-400 font-mono">SECURE MODE ACTIVE</p>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div className="space-y-1">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Question</p>
             <p className="text-sm font-black text-slate-900 leading-none">{currentQuestionIndex + 1} of {quiz.questions.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-12">
          {/* Violations Counter */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full border transition-colors",
            violations.length > 0 ? "bg-red-50 border-red-200 text-red-600" : "bg-slate-50 border-slate-100 text-slate-400"
          )}>
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-bold font-mono">{violations.length} INFRACTIONS</span>
          </div>

          <div className="flex items-center gap-3">
             <Clock className={cn("w-6 h-6", timeLeft < 10 ? "text-red-500 animate-pulse" : "text-blue-600")} />
             <span className={cn("text-2xl font-black font-mono w-16", timeLeft < 10 ? "text-red-500" : "text-slate-900")}>
               {formatTime(timeLeft)}
             </span>
          </div>
        </div>
      </header>

      {/* Progress Bar (Time) */}
      <div className="h-1.5 w-full bg-slate-100 relative">
        <motion.div 
          className={cn("absolute h-full left-0", timeLeft < 10 ? "bg-red-500" : "bg-blue-600")}
          initial={{ width: "100%" }}
          animate={{ width: `${timeProgress}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>

      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl mx-auto p-6 flex flex-col justify-center"
          >
            <div className="mb-12">
               <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-4">
                 {currentQuestion.text}
               </h2>
               <div className="w-24 h-1.5 bg-blue-600 rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAnswer(index)}
                  className={cn(
                    "relative p-6 text-left border-2 rounded-2xl transition-all duration-200 group transform active:scale-[0.98]",
                    selectedAnswer === index 
                      ? "border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-600/10" 
                      : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
                      selectedAnswer === index ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-100"
                    )}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className={cn(
                      "text-lg font-medium",
                      selectedAnswer === index ? "text-blue-900" : "text-slate-700"
                    )}>
                      {option}
                    </span>
                  </div>
                  {selectedAnswer === index && (
                    <div className="absolute top-4 right-4">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-200 p-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-48 h-3 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{Math.round(progress)}% Progress</span>
          </div>

          <button
            onClick={handleNext}
            disabled={selectedAnswer === null}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-20 text-white px-10 py-4 rounded-xl font-bold flex items-center gap-2 transition-all"
          >
            {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Security Overlays */}
      {!isFullscreen && isQuizStarted && !isComplete && (
        <div className="fixed inset-0 z-[9999] bg-red-600/90 backdrop-blur-md flex items-center justify-center p-6 text-white text-center">
          <div className="max-w-md">
            <ShieldAlert className="w-20 h-20 mx-auto mb-6 animate-bounce" />
            <h2 className="text-3xl font-bold mb-4 uppercase tracking-tighter">Security Alert</h2>
            <p className="text-xl font-medium mb-8">
              Full-screen mode was exited. An infraction has been recorded.
            </p>
            <button
              onClick={enterFullscreen}
              className="bg-white text-red-600 px-8 py-4 rounded-xl font-black text-lg hover:bg-slate-100 transition-colors uppercase tracking-widest"
            >
              Re-enter Secure Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
