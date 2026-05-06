import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, ArrowLeft, FileText, Upload, Brain, Settings, Calendar, Eye, EyeOff, Clock, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Quiz, Question, GradeScale, User, QuestionType } from '../types';
import { generateId, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface QuizCreatorProps {
  user: User;
  onSave: () => void;
  onCancel: () => void;
  editingQuiz?: Quiz | null;
}

export default function QuizCreator({ user, onSave, onCancel, editingQuiz }: QuizCreatorProps) {
  const [title, setTitle] = useState(editingQuiz?.title || '');
  const [description, setDescription] = useState(editingQuiz?.description || '');
  const [timeLimit, setTimeLimit] = useState(editingQuiz?.timeLimitPerQuestion || 30);
  const [isParsing, setIsParsing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [gradeScale, setGradeScale] = useState<GradeScale>(editingQuiz?.gradeScale || { pass: 50, excellent: 80 });
  const [scoreReveal, setScoreReveal] = useState<'immediate' | 'manual'>(editingQuiz?.scoreReveal || 'immediate');
  const [startTime, setStartTime] = useState<string>(editingQuiz?.startTime ? new Date(editingQuiz.startTime).toISOString().slice(0, 16) : '');
  const [endTime, setEndTime] = useState<string>(editingQuiz?.endTime ? new Date(editingQuiz.endTime).toISOString().slice(0, 16) : '');
  const [questions, setQuestions] = useState<Question[]>(editingQuiz?.questions || [
    { id: generateId(), type: 'single', text: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { id: generateId(), type: 'single', text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, question: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...question };
    setQuestions(updated);
  };

  const simulatePDFParsing = () => {
    setIsParsing(true);
    setTimeout(() => {
      const mockAISuggestions: Question[] = [
        { id: generateId(), type: 'single', text: 'What is the primary objective of academic integrity protocols?', options: ['Punishment', 'Verification', 'Mentorship', 'Automation'], correctAnswer: 1 },
        { id: generateId(), type: 'multiple', text: 'Which of the following are tracked during a session?', options: ['Tab Switching', 'Mouse Clicks', 'Window Focus', 'Webcam Feed'], correctAnswer: [0, 2] },
        { id: generateId(), type: 'text', text: 'Define "Denial of Wallet" in your own words.', options: [], correctAnswer: 'cost-attack' }
      ];
      setQuestions(prev => [...prev.filter(q => q.text !== ''), ...mockAISuggestions]);
      setIsParsing(false);
    }, 2000);
  };

  const handleImport = () => {
    try {
      const sections = importText.split('---').map(s => s.trim()).filter(s => s);
      const parsedQuestions: Question[] = sections.map(section => {
        const lines = section.split('\n');
        let text = '';
        let type: QuestionType = 'single';
        const options: string[] = [];
        let correctAnswer: any = 0;

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('Q:')) text = trimmed.replace('Q:', '').trim();
          if (trimmed.startsWith('T:')) type = trimmed.replace('T:', '').trim() as QuestionType;
          if (trimmed.startsWith('A:')) options[0] = trimmed.replace('A:', '').trim();
          if (trimmed.startsWith('B:')) options[1] = trimmed.replace('B:', '').trim();
          if (trimmed.startsWith('C:')) options[2] = trimmed.replace('C:', '').trim();
          if (trimmed.startsWith('D:')) options[3] = trimmed.replace('D:', '').trim();
          if (trimmed.startsWith('K:')) {
            const val = trimmed.replace('K:', '').trim();
            if (type === 'multiple') {
              correctAnswer = val.split(',').map(v => parseInt(v.trim()));
            } else if (type === 'single') {
              correctAnswer = parseInt(val);
            } else {
              correctAnswer = val;
            }
          }
        }

        return {
          id: generateId(),
          type,
          text,
          options: type === 'text' ? [] : options,
          correctAnswer
        };
      });

      if (parsedQuestions.length === 0) throw new Error('No valid questions identified in block.');
      
      setQuestions([...questions.filter(q => q.text !== ''), ...parsedQuestions]);
      setShowImportModal(false);
      setImportText('');
    } catch (err: any) {
      alert('Import Failed: ' + err.message);
    }
  };

  const handleSave = async () => {
    if (!title || questions.some(q => {
      if (!q.text) return true;
      if (q.type !== 'text' && q.options.some(o => !o)) return true;
      if (q.type === 'single' && typeof q.correctAnswer !== 'number') return true;
      if (q.type === 'multiple' && (!Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0)) return true;
      if (q.type === 'text' && !q.correctAnswer) return true;
      return false;
    })) {
      alert('Incomplete Data: Please ensure all questions and fields are populated.');
      return;
    }

    const quizId = editingQuiz?.id || generateId();
    const quizData: Quiz = {
      id: quizId,
      teacherId: user.uid,
      title,
      description,
      questions,
      timeLimitPerQuestion: timeLimit,
      gradeScale,
      scoreReveal,
      startTime: startTime ? new Date(startTime).getTime() : undefined,
      endTime: endTime ? new Date(endTime).getTime() : undefined,
      isLocked: editingQuiz?.isLocked ?? false,
      createdAt: editingQuiz?.createdAt || Date.now()
    };

    try {
      await setDoc(doc(db, 'quizzes', quizId), quizData);
      onSave();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `quizzes/${quizId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-10 font-sans">
      <AnimatePresence>
        {showImportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-12 pb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Protocol Importer</h3>
                  <p className="text-slate-400 font-bold italic">Paste your structured assessment block below.</p>
                </div>
                <button onClick={() => setShowImportModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-slate-300" />
                </button>
              </div>

              <div className="px-12 py-6 bg-slate-50 border-y border-slate-100 flex items-center gap-4">
                 <div className="p-3 bg-indigo-100/50 rounded-xl">
                   <Download className="w-5 h-5 text-indigo-600" />
                 </div>
                 <div className="text-[10px]">
                   <p className="font-black text-indigo-600 uppercase tracking-widest mb-1">Acceptable Format (ThinkQuiz Protocol)</p>
                   <code className="text-slate-500 font-mono">Q: Text \n T: single|multiple|text \n A: Opt1 \n B: Opt2 \n K: 0 \n ---</code>
                 </div>
              </div>

              <div className="p-12 flex-1">
                <textarea 
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder="Q: What is 2+2?&#10;T: single&#10;A: 3&#10;B: 4&#10;K: 1&#10;---"
                  className="w-full h-64 bg-slate-50 p-8 rounded-3xl border border-slate-100 focus:bg-white outline-none font-mono text-sm transition-all resize-none"
                />
              </div>

              <div className="p-12 pt-0 flex gap-4">
                <button 
                  onClick={handleImport}
                  className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20"
                >
                  Confirm Integration
                </button>
                <button 
                  onClick={() => setImportText(`Q: What is the primary objective of academic integrity?
T: single
A: Punishment
B: Quality Assurance
C: Automation
D: Revenue
K: 1
---
Q: Which tools are forbidden during a secure session? (Select all)
T: multiple
A: Calculator (Physical)
B: Brain
C: Search Engines
D: Peer Consultation
K: 0, 2, 3
---`)}
                  className="px-8 bg-amber-50 text-amber-600 border border-amber-100 font-black rounded-2xl hover:bg-amber-100 transition-all uppercase tracking-widest text-sm"
                >
                  Load Sample
                </button>
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="px-10 bg-slate-50 text-slate-400 font-black rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest text-sm"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-6">
             <button onClick={onCancel} className="p-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-500 hover:bg-slate-50 transition-all shadow-sm group">
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
             </button>
             <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">Curriculum Architect</h1>
                <p className="text-slate-400 font-bold text-lg italic">{editingQuiz ? 'Refining existing assessment structure' : 'Drafting new academic integrity evaluation'}</p>
             </div>
          </div>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black shadow-2xl shadow-blue-500/20 transition-all flex items-center gap-3 text-lg leading-none"
          >
            <Save className="w-5 h-5" /> {editingQuiz ? 'Update' : 'Deploy'} Assessment
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-10">
            {/* AI Assistant Section */}
            <section className="bg-indigo-600 p-12 rounded-[3.5rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
               <div className="relative z-10 flex items-start gap-8">
                  <div className="w-20 h-20 bg-white/10 rounded-[2.5rem] flex items-center justify-center shrink-0 border border-white/20">
                     <Brain className="text-white w-10 h-10" />
                  </div>
                  <div className="flex-1">
                     <h2 className="text-2xl font-black mb-3 tracking-tight">AI Content Synthesis</h2>
                     <p className="text-indigo-100 mb-8 leading-relaxed text-lg max-w-xl">
                       Supply a source document for integrity protocols. Our neural model will extrapolate questions aligned with institutional standards.
                     </p>
                     
                      <div className="flex gap-4">
                        <button 
                          onClick={simulatePDFParsing}
                          disabled={isParsing}
                          className="bg-white text-indigo-600 px-8 py-4 rounded-2xl transition-all flex items-center gap-4 font-black uppercase text-xs tracking-widest disabled:opacity-50 shadow-lg"
                        >
                          {isParsing ? (
                            <span className="animate-spin w-5 h-5 border-4 border-indigo-400 border-t-transparent rounded-full" />
                          ) : (
                            <Brain className="w-5 h-5" />
                          )}
                          {isParsing ? 'Processing Knowledge Graph...' : 'Synthesize from PDF'}
                        </button>
                        <button 
                          onClick={() => setShowImportModal(true)}
                          className="bg-indigo-500 text-white px-8 py-4 rounded-2xl transition-all flex items-center gap-4 font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-400"
                        >
                          <Upload className="w-5 h-5" />
                          Protocol Import
                        </button>
                      </div>
                  </div>
               </div>
               <div className="absolute right-[-5%] top-[-10%] opacity-5 group-hover:opacity-10 transition-opacity">
                  <FileText className="w-80 h-80 rotate-12" />
               </div>
            </section>

            {/* Questions Registry */}
            <div className="space-y-8">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-4 tracking-tight px-4">
                <Settings className="w-7 h-7 text-slate-400 animate-spin-slow" /> Question Inventory
              </h2>
              <AnimatePresence>
                {questions.map((q, qIndex) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={q.id} 
                    className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-xl relative group hover:border-blue-400/50 transition-all"
                  >
                    <div className="absolute -left-5 top-12 bg-indigo-600 text-white w-12 h-12 rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-2xl z-10 border border-white/20">
                      {qIndex + 1}
                    </div>
                    <button 
                      onClick={() => removeQuestion(qIndex)}
                      className="absolute right-10 top-10 p-3 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                    
                    <div className="space-y-10">
                      <div className="flex flex-wrap gap-4 px-2">
                        {(['single', 'multiple', 'text'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => {
                              const newCorrect = type === 'single' ? 0 : type === 'multiple' ? [] : '';
                              const newOptions = type === 'text' ? [] : (questions[qIndex].options.length > 0 ? questions[qIndex].options : ['', '', '', '']);
                              updateQuestion(qIndex, { type, correctAnswer: newCorrect, options: newOptions });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              q.type === type ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-white"
                            )}
                          >
                            {type.replace('-', ' ')}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Prompt Formulation</label>
                        <textarea 
                          rows={2}
                          value={q.text} 
                          onChange={e => updateQuestion(qIndex, { text: e.target.value })}
                          placeholder="Formulate your challenge prompt..."
                          className="w-full bg-slate-50 px-8 py-6 rounded-3xl border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-black text-slate-900 transition-all text-xl placeholder:opacity-30 placeholder:italic resize-none ring-offset-2"
                        />
                      </div>

                      {q.type === 'text' ? (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Expected Lexeme (Key Phrase)</label>
                          <input 
                            type="text"
                            value={q.correctAnswer as string}
                            onChange={e => updateQuestion(qIndex, { correctAnswer: e.target.value })}
                            placeholder="Enter the expected keyword or phrase..."
                            className="w-full bg-slate-50 px-8 py-5 rounded-2xl border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 transition-all text-lg"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                          {q.options.map((option, oIndex) => (
                            <div key={oIndex} className="relative group/opt">
                              <input 
                                type="text" 
                                value={option}
                                onChange={e => {
                                  const newOptions = [...q.options];
                                  newOptions[oIndex] = e.target.value;
                                  updateQuestion(qIndex, { options: newOptions });
                                }}
                                placeholder={`Option Variant ${String.fromCharCode(65+oIndex)}`}
                                className={cn(
                                  "w-full px-8 py-5 rounded-2xl border-2 transition-all outline-none font-bold pl-16 text-lg",
                                  (q.type === 'single' ? q.correctAnswer === oIndex : (q.correctAnswer as number[]).includes(oIndex))
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-lg shadow-emerald-900/10" 
                                    : "bg-white border-slate-100 focus:border-blue-400 placeholder:opacity-40"
                                )}
                              />
                              <button 
                                onClick={() => {
                                  if (q.type === 'single') {
                                    updateQuestion(qIndex, { correctAnswer: oIndex });
                                  } else {
                                    const current = q.correctAnswer as number[];
                                    const updated = current.includes(oIndex) 
                                      ? current.filter(i => i !== oIndex) 
                                      : [...current, oIndex].sort();
                                    updateQuestion(qIndex, { correctAnswer: updated });
                                  }
                                }}
                                className={cn(
                                  "absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-all border shadow-sm",
                                  (q.type === 'single' ? q.correctAnswer === oIndex : (q.correctAnswer as number[]).includes(oIndex))
                                    ? "bg-emerald-500 text-white border-emerald-400 scale-110" 
                                    : "bg-slate-50 text-slate-400 hover:bg-emerald-100 border-slate-100"
                                )}
                              >
                                {String.fromCharCode(65 + oIndex)}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button
                onClick={addQuestion}
                className="w-full py-10 border-4 border-dashed border-slate-200 rounded-[3.5rem] text-slate-300 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-4 font-black text-xl uppercase tracking-[0.2em] group"
              >
                <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" /> New Assessment Item
              </button>
            </div>
          </div>

          {/* Infrastructure Controls Area */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl sticky top-12">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-10 pb-4 border-b border-slate-100 flex items-center gap-2">
                 <Settings className="w-4 h-4" /> Global Configuration
               </h3>
               
               <div className="space-y-10">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Assessment Label</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Advanced Ethics Vol. 1"
                      className="w-full bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 font-black focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-lg"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Temporal Limit</label>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                       <div className="flex justify-between items-end mb-4">
                          <span className="text-3xl font-black text-slate-900 leading-none">{timeLimit}<span className="text-sm text-slate-400 font-bold ml-1">SEC</span></span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Per Challenge</span>
                       </div>
                       <input 
                        type="range" min="5" max="180" step="5"
                        value={timeLimit} 
                        onChange={e => setTimeLimit(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                       />
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Assessment Availability</label>
                    <div className="space-y-4">
                       <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="datetime-local"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            className="w-full bg-slate-50 pl-12 pr-6 py-4 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:bg-white"
                          />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 px-2">Start Protocol</p>
                       </div>
                       <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="datetime-local"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            className="w-full bg-slate-50 pl-12 pr-6 py-4 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:bg-white"
                          />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 px-2">End Protocol</p>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Score Revelation</label>
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                        onClick={() => setScoreReveal('immediate')}
                        className={cn(
                          "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex flex-col items-center gap-2",
                          scoreReveal === 'immediate' ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20" : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-white"
                        )}
                       >
                          <Eye className="w-5 h-5" /> Immediate
                       </button>
                       <button 
                        onClick={() => setScoreReveal('manual')}
                        className={cn(
                          "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex flex-col items-center gap-2",
                          scoreReveal === 'manual' ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100" : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-white"
                        )}
                       >
                          <EyeOff className="w-5 h-5" /> Post-Audit
                       </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 px-2">Grading Infrastructure (%)</label>
                    <div className="grid grid-cols-1 gap-4">
                       <div className="flex justify-between items-center bg-emerald-50 p-6 rounded-[1.5rem] border border-emerald-100/50">
                          <div>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Excellent Tier</p>
                            <span className="text-xs font-bold text-emerald-800 italic">Advanced Proficiency</span>
                          </div>
                          <input 
                            type="number" value={gradeScale.excellent}
                            onChange={e => setGradeScale({...gradeScale, excellent: Number(e.target.value)})}
                            className="w-16 bg-white px-3 py-2 rounded-xl text-right font-black outline-none border border-emerald-200"
                          />
                       </div>
                       <div className="flex justify-between items-center bg-blue-50 p-6 rounded-[1.5rem] border border-blue-100/50">
                          <div>
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Compliance Tier</p>
                            <span className="text-xs font-bold text-blue-800 italic">Basic Passing Logic</span>
                          </div>
                          <input 
                            type="number" value={gradeScale.pass}
                            onChange={e => setGradeScale({...gradeScale, pass: Number(e.target.value)})}
                            className="w-16 bg-white px-3 py-2 rounded-xl text-right font-black outline-none border border-blue-200"
                          />
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
