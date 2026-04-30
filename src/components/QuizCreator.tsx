import React, { useState } from 'react';
import { X, Plus, Trash2, Save, ArrowLeft, FileText, Upload, Brain, Settings } from 'lucide-react';
import { Quiz, Question, GradeScale } from '../types';
import { generateId } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface QuizCreatorProps {
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
}

export default function QuizCreator({ onSave, onCancel }: QuizCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [isParsing, setIsParsing] = useState(false);
  const [gradeScale, setGradeScale] = useState<GradeScale>({ pass: 50, excellent: 80 });
  const [questions, setQuestions] = useState<Question[]>([
    { id: generateId(), text: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { id: generateId(), text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
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
    // Simulate AI extraction logic
    setTimeout(() => {
      const mockAISuggestions: Question[] = [
        { id: generateId(), text: 'What is the capital of Academic Integrity?', options: ['Honesty', 'Deception', 'Gaming', 'Ethics'], correctAnswer: 0 },
        { id: generateId(), text: 'Which tool prevents tab switching?', options: ['AI Studio', 'EduQuiz API', 'GPS', 'Thermal'], correctAnswer: 1 },
        { id: generateId(), text: 'What time limit is recommended for ethics?', options: ['5s', '10s', '30s', '60s'], correctAnswer: 2 }
      ];
      setQuestions(prev => [...prev, ...mockAISuggestions].filter(q => q.text !== ''));
      setIsParsing(false);
    }, 2000);
  };

  const handleSave = () => {
    if (!title || questions.some(q => !q.text || q.options.some(o => !o))) {
      alert('Please fill in all fields.');
      return;
    }

    const quiz: Quiz = {
      id: generateId(),
      teacherId: 'u1',
      title,
      description,
      questions,
      timeLimitPerQuestion: timeLimit,
      gradeScale,
      isLocked: false,
      createdAt: Date.now()
    };
    onSave(quiz);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
             <button onClick={onCancel} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
                <ArrowLeft className="w-5 h-5" />
             </button>
             <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Assessment Architect</h1>
                <p className="text-slate-500 font-medium">Drafting integrity-first evaluations</p>
             </div>
          </div>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Save className="w-5 h-5" /> Finalize & Deploy
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* PDF Upload Feature */}
            <section className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                     <Brain className="text-blue-400 w-6 h-6" />
                     <h2 className="text-xl font-bold">AI Quiz Assistant</h2>
                  </div>
                  <p className="text-slate-400 mb-6 leading-relaxed">
                    Upload a syllabus or study material in PDF format. We'll use machine learning to extract 10 high-quality questions automatically.
                  </p>
                  
                  <div className="flex gap-4">
                     <button 
                      onClick={simulatePDFParsing}
                      disabled={isParsing}
                      className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 font-bold disabled:opacity-50"
                     >
                       {isParsing ? (
                         <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                       ) : (
                         <Upload className="w-5 h-5 text-blue-400" />
                       )}
                       {isParsing ? 'Parsing Document...' : 'Upload PDF & Generate'}
                     </button>
                  </div>
               </div>
               <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                  <FileText className="w-32 h-32" />
               </div>
            </section>

            {/* Questions List */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" /> Assessment Items
              </h2>
              {questions.map((q, qIndex) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={q.id} 
                  className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative group hover:border-blue-200 transition-colors"
                >
                  <div className="absolute -left-3 top-8 bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">
                    {qIndex + 1}
                  </div>
                  <button 
                    onClick={() => removeQuestion(qIndex)}
                    className="absolute right-6 top-6 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  <div className="space-y-6 pt-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Question Text</label>
                      <input 
                        type="text" 
                        value={q.text} 
                        onChange={e => updateQuestion(qIndex, { text: e.target.value })}
                        placeholder="Type your question here..."
                        className="w-full bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            placeholder={`Option ${String.fromCharCode(65+oIndex)}`}
                            className={cn(
                              "w-full px-6 py-4 rounded-xl border-2 transition-all outline-none font-semibold pl-14",
                              q.correctAnswer === oIndex ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-white border-slate-100 focus:border-blue-400"
                            )}
                          />
                          <button 
                            onClick={() => updateQuestion(qIndex, { correctAnswer: oIndex })}
                            className={cn(
                              "absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all",
                              q.correctAnswer === oIndex ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 hover:bg-emerald-100"
                            )}
                          >
                            {String.fromCharCode(65 + oIndex)}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
              <button
                onClick={addQuestion}
                className="w-full py-6 border-4 border-dashed border-slate-200 rounded-[2rem] text-slate-300 hover:border-blue-200 hover:text-blue-500 transition-all flex items-center justify-center gap-3 font-black text-lg uppercase tracking-widest"
              >
                <Plus className="w-6 h-6" /> Add New Item
              </button>
            </div>
          </div>

          {/* Configuration Panel */}
          <aside className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm sticky top-10">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 pb-2 border-b border-slate-100">Config</h3>
               
               <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Assessment Title</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 font-bold focus:bg-white transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Time Limit (Sec/Item)</label>
                    <div className="flex items-center gap-4">
                       <input 
                        type="range" min="5" max="120" step="5"
                        value={timeLimit} 
                        onChange={e => setTimeLimit(Number(e.target.value))}
                        className="flex-1 accent-blue-600"
                       />
                       <span className="font-mono font-black text-lg">{timeLimit}s</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Grading Boundaries (%)</label>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl">
                          <span className="text-xs font-bold text-blue-700">Excellent</span>
                          <input 
                            type="number" value={gradeScale.excellent}
                            onChange={e => setGradeScale({...gradeScale, excellent: Number(e.target.value)})}
                            className="w-12 bg-transparent text-right font-black outline-none"
                          />
                       </div>
                       <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-500">Pass</span>
                          <input 
                            type="number" value={gradeScale.pass}
                            onChange={e => setGradeScale({...gradeScale, pass: Number(e.target.value)})}
                            className="w-12 bg-transparent text-right font-black outline-none"
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
