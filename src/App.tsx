/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  FileText, 
  Send, 
  Shield, 
  Network, 
  Database, 
  Cpu, 
  BrainCircuit, 
  Lock, 
  Layers, 
  AlertTriangle, 
  Target, 
  Users, 
  Rocket,
  Mic,
  History,
  Play,
  Square,
  Volume2,
  Trash2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  X,
  BarChart2,
  Maximize2,
  Upload,
  Loader2,
  DollarSign,
  Activity
} from 'lucide-react';
import { analyzeTranscript, performOCR, validateDocumentMatch } from './services/geminiService';
import { cn } from './lib/utils';
import mammoth from 'mammoth';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';


interface AnalysisResult {
  client_snapshot: {
    organization_type: string;
    technical_maturity_level: string;
  };
  recommendation: string;
  top_recommendations: {
    solution_name: string;
    estimated_monthly_cost: string;
    cost_breakdown: string[];
    business_value: string;
  }[];
  total_cost_of_ownership: {
    total_monthly_estimate: string;
    one_time_setup_cost: string;
    three_year_roi: string;
    cost_optimization_strategy: string;
  };
  solution_set: {
    category: string;
    solutions: string[];
  }[];
  client_references: {
    industry: string;
    company_size: string;
    success_story: string;
  }[];
  matched_use_cases: {
    title: string;
    client_statement: string;
    who_where: string;
    current_workflow: string;
    desired_workflow: string;
    data_integrations: string;
    value_metrics: string;
    constraints_risks: string;
    acceptance_criteria: string[];
    priority_timeline: string;
  }[];
  executive_summary: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  transcript: string;
  result: AnalysisResult;
}

const LAYER_ICONS: Record<string, React.ReactNode> = {
  Foundation: <Layers className="w-5 h-5" />,
  Identity: <Lock className="w-5 h-5" />,
  Network: <Network className="w-5 h-5" />,
  Security: <Shield className="w-5 h-5" />,
  Storage: <Database className="w-5 h-5" />,
  Compute: <Cpu className="w-5 h-5" />,
  AI: <BrainCircuit className="w-5 h-5" />,
};

const SAMPLE_TRANSCRIPT = `Architect: Thanks for joining today. I understand your team is looking to modernize the core claims processing system. Can you walk me through the current state?
CTO: Right now, we're on-prem. It's a monolithic Java app running on aging hardware. We're seeing 15-minute downtime windows every Tuesday during deployments.
Architect: That's significant. What's the business impact?
VP Ops: It's costing us about $50k per hour in lost productivity for our adjusters. We need to get to a 99.99% availability target.
Architect: Understood. How are you handling identity and security today?
Security Lead: It's all LDAP. We want to move to a Zero Trust model but the board is worried about the cost of a full overhaul.
Architect: What about data?
Data Engineer: We have 40TB of claims data in a legacy SQL Server. It's slow. We want to run some ML models for fraud detection but the database can't handle the analytical load.
Architect: So, the goals are: high availability, Zero Trust security, and an AI-ready data platform. Any constraints?
CTO: We have a hard deadline of 6 months for the pilot because our data center lease is up. And we need to keep monthly OpEx under $20k for the initial phase.`;

const SAMPLE_DOCUMENT = `Project: Claims Modernization 2026
Organization: InsureTech Global
Technical Environment:
- Primary App: Java 8 Monolith (Spring 4)
- Database: Microsoft SQL Server 2014 (40TB)
- Identity: Local Active Directory / LDAP
- Infrastructure: Dell PowerEdge Servers (End of Life)
Compliance Requirements:
- SOC2 Type II
- GDPR
- Data Residency in US-East
Financial Constraints:
- Initial Pilot Budget: $120k CapEx, $20k/mo OpEx
- Target ROI: 24 months
- Current Downtime Cost: $50k/hr`;

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [inputMode, setInputMode] = useState<'paste' | 'live'>('paste');
  const [livePerson1, setLivePerson1] = useState('');
  const [livePerson2, setLivePerson2] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('architect_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('architect_history', JSON.stringify(history));
  }, [history]);

  const loadSample = () => {
    if (inputMode === 'paste') {
      setTranscript(SAMPLE_TRANSCRIPT);
    } else {
      setLivePerson1("We're seeing 15-minute downtime windows every Tuesday during deployments. It's costing us about $50k per hour.");
      setLivePerson2("Understood. AWS can help modernize this with a serverless architecture to eliminate that downtime.");
    }
  };
  const loadSampleDoc = () => setDocumentText(SAMPLE_DOCUMENT);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrError(null);
    setDocumentText('');

    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        // Handle Word Document (.docx)
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const extractedText = result.value;
        
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('No text could be extracted from this Word document.');
        }
        
        setDocumentText(extractedText);
        setIsOcrLoading(false);
      } else {
        // Handle Images and PDFs via Gemini OCR
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const extractedText = await performOCR(base64, file.type);
            
            if (!extractedText || extractedText.trim().length === 0) {
              throw new Error('No text could be extracted from this document.');
            }
            
            setDocumentText(extractedText);
          } catch (err: any) {
            console.error(err);
            setOcrError(
              `OCR Extraction Failed: ${err.message || 'Unknown error'}. \n\nPossible reasons:\n• Unsupported or corrupt file format\n• Image quality is too low, blurry, or low-contrast\n• Document is password protected\n• File size is too large for processing`
            );
          } finally {
            setIsOcrLoading(false);
          }
        };
        reader.onerror = () => {
          setOcrError('Failed to read file. Please check if the file is accessible.');
          setIsOcrLoading(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error(err);
      setOcrError(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
      setIsOcrLoading(false);
    }
  };

  const handleAnalyze = async () => {
    const finalTranscript = inputMode === 'paste' 
      ? transcript 
      : `Customer: ${livePerson1}\nArchitect: ${livePerson2}`;

    if (!finalTranscript.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setValidationError(null);
    setProgress(0);
    setLoadingMessage('Initializing cognitive engine...');

    const steps = [
      { to: 30, message: 'Ingesting transcript data...' },
      { to: 60, message: 'Analyzing requirements...' },
      { to: 90, message: 'Generating strategy...' },
    ];

    let currentProgress = 0;
    const runProgress = async () => {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setLoadingMessage(step.message);
        const target = step.to;
        const diff = target - currentProgress;
        const increments = 10;
        const stepTime = 50;
        
        for(let j = 1; j <= increments; j++) {
          currentProgress += diff / increments;
          setProgress(currentProgress);
          await new Promise(r => setTimeout(r, stepTime));
        }
      }
    };

    runProgress();

    try {
      if (documentText.trim()) {
        const validation = await validateDocumentMatch(documentText, finalTranscript);
        if (!validation.matches) {
          setValidationError(validation.reason || "Missing document context.");
          setIsAnalyzing(false);
          return;
        }
      }

      const data = await analyzeTranscript(finalTranscript, documentText);
      setProgress(100);
      setLoadingMessage('Analysis complete.');
      
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        transcript: finalTranscript,
        result: data
      };
      setHistory(prev => [newHistoryItem, ...prev]);

      setTimeout(() => {
        setResult(data);
        setIsAnalyzing(false);
      }, 300);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze transcript.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="border-b border-black/5 bg-white sticky top-0 z-50 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center shadow-lg shadow-red-500/20">
              <span className="text-white font-black text-xl">!</span>
            </div>
            <div>
              <h1 className="font-black tracking-tighter text-2xl leading-none">
                SPIKED<span className="text-red-600">AI</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40 mt-1">
                Cognitive Intelligence for Cloud Architect Recommendation Simulator
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/20 px-3 py-1 border border-black/5 rounded-full">Enterprise Edition v1.0</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* Extreme Left: Input Section (col-span-3) */}
          <div className="col-span-12 lg:col-span-3 space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-black/40">
                <History className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest">History</span>
              </div>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors"
              >
                {showHistory ? 'Close' : 'View All'}
              </button>
            </div>

            {showHistory ? (
              <div className="bg-white border border-black/5 rounded-2xl p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {history.length === 0 ? (
                  <p className="text-[10px] text-black/30 text-center py-8">No history yet</p>
                ) : (
                  history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setResult(item.result);
                        setTranscript(item.transcript);
                        setShowHistory(false);
                      }}
                      className="w-full text-left p-3 hover:bg-black/5 rounded-xl transition-all border border-transparent hover:border-black/5 group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-mono text-black/40">{new Date(item.timestamp).toLocaleDateString()}</span>
                        <Trash2 
                          className="w-3 h-3 text-black/0 group-hover:text-red-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistory(prev => prev.filter(h => h.id !== item.id));
                          }}
                        />
                      </div>
                      <p className="text-[10px] font-bold line-clamp-1">{item.result.recommendation}</p>
                      <p className="text-[9px] text-black/40 line-clamp-2 mt-1">{item.transcript}</p>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-black/40">
                      <Upload className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">Context (OCR)</span>
                    </div>
                    <button onClick={loadSampleDoc} className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black">Sample Doc</button>
                  </div>
                  <div className={cn(
                    "relative border-2 border-dashed rounded-2xl p-4 transition-all flex flex-col items-center justify-center text-center gap-3",
                    documentText ? "border-emerald-200 bg-emerald-50/30" : "border-black/5 bg-white hover:border-black/10"
                  )}>
                    {isOcrLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-black/20" />
                    ) : documentText ? (
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Loaded</span>
                        <button onClick={() => setDocumentText('')}><X className="w-3 h-3 text-emerald-600" /></button>
                      </div>
                    ) : (
                      <label className="cursor-pointer bg-black/5 text-black/40 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-black/10 transition-all">
                        Upload Context
                        <input type="file" className="hidden" accept="image/*,application/pdf,.docx" onChange={handleFileUpload} />
                      </label>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex bg-black/5 p-1 rounded-lg">
                      <button 
                        onClick={() => setInputMode('paste')}
                        className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'paste' ? "bg-white shadow-sm text-black" : "text-black/40")}
                      >
                        Paste
                      </button>
                      <button 
                        onClick={() => setInputMode('live')}
                        className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'live' ? "bg-white shadow-sm text-black" : "text-black/40")}
                      >
                        Live
                      </button>
                    </div>
                    <button onClick={loadSample} className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black">Sample</button>
                  </div>

                  {inputMode === 'paste' ? (
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Paste transcript here..."
                      className="w-full h-[300px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-black/40 ml-1">Person 1 (Customer)</label>
                        <textarea
                          value={livePerson1}
                          onChange={(e) => setLivePerson1(e.target.value)}
                          placeholder="Customer speaking..."
                          className="w-full h-[140px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-black/40 ml-1">Person 2 (Architect)</label>
                        <textarea
                          value={livePerson2}
                          onChange={(e) => setLivePerson2(e.target.value)}
                          placeholder="Architect speaking..."
                          className="w-full h-[140px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                        />
                      </div>
                      <button 
                        onClick={() => setIsRecording(!isRecording)}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                          isRecording ? "bg-red-50 border-red-200 text-red-600 animate-pulse" : "bg-black/5 border-transparent text-black/40 hover:bg-black/10"
                        )}
                      >
                        {isRecording ? <Square className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                        {isRecording ? "Hands-free Active" : "Start Conversation"}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || isOcrLoading || (inputMode === 'paste' ? !transcript.trim() : (!livePerson1.trim() && !livePerson2.trim()))}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg",
                      isAnalyzing ? "bg-black/10 text-black/40 cursor-not-allowed" : "bg-black text-white hover:bg-black/90 active:scale-95"
                    )}
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isAnalyzing ? "Analyzing..." : "Generate Strategy"}
                  </button>
                </section>
              </>
            )}
          </div>

          {/* Result Section */}
          <div className="col-span-12 lg:col-span-9">
            <AnimatePresence mode="wait">
              {!result && !isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center min-h-[600px] text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center">
                    <BrainCircuit className="w-10 h-10 text-black/20" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight uppercase italic">Ready for Analysis</h2>
                    <p className="text-sm text-black/40 max-w-xs mx-auto font-medium">
                      Provide a transcript or start a live conversation to generate your enterprise strategy.
                    </p>
                  </div>
                </motion.div>
              ) : isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center min-h-[600px] space-y-12"
                >
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-32 h-32">
                      <defs>
                        <clipPath id="cloud-clip">
                          <path d="M17.5 19c.5 0 1-.1 1.5-.4 1.5-.7 2.5-2.2 2.5-3.6 0-2-1.5-3.5-3.5-3.5-.2 0-.5 0-.7.1C16.5 8.6 14.5 7 12 7c-2.8 0-5.1 2.1-5.5 4.8-.2-.1-.5-.1-.7-.1-2.2 0-4 1.8-4 4s1.8 4 4 4h11.7z" />
                        </clipPath>
                      </defs>
                      <path d="M17.5 19c.5 0 1-.1 1.5-.4 1.5-.7 2.5-2.2 2.5-3.6 0-2-1.5-3.5-3.5-3.5-.2 0-.5 0-.7.1C16.5 8.6 14.5 7 12 7c-2.8 0-5.1 2.1-5.5 4.8-.2-.1-.5-.1-.7-.1-2.2 0-4 1.8-4 4s1.8 4 4 4h11.7z" className="fill-black/5 stroke-black/10" strokeWidth="0.5" />
                      <g clipPath="url(#cloud-clip)">
                        <motion.rect x="0" y={24 - (24 * progress / 100)} width="24" height="24" className="fill-red-600" transition={{ type: 'spring', bounce: 0, duration: 0.5 }} />
                      </g>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                      <span className="text-3xl font-black tracking-tighter text-black">{Math.round(progress)}%</span>
                      <Cloud className="w-4 h-4 text-black/20 animate-bounce mt-1" />
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-black tracking-tight uppercase italic">Synthesizing Intelligence</h3>
                    <p className="text-sm font-bold text-black/40 uppercase tracking-widest">{loadingMessage}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-12 gap-8">
                    {/* Left Column: Use Case, Solution Set, Client References (col-span-6) */}
                    <div className="col-span-12 lg:col-span-6 space-y-8">
                      {/* Use Case Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <Target className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Use Case Analysis</span>
                        </div>
                        
                        <div className="space-y-8">
                          {result?.matched_use_cases.map((uc, i) => (
                            <div key={i} className="space-y-6">
                              <div className="space-y-2">
                                <h4 className="text-lg font-black tracking-tight uppercase italic text-red-600">{uc.title}</h4>
                                <p className="text-xs font-serif italic text-black/60">"{uc.client_statement}"</p>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-4 text-[11px]">
                                <div className="space-y-1">
                                  <p className="font-bold uppercase tracking-widest text-black/30">Who / Where</p>
                                  <p className="font-medium">{uc.who_where}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold uppercase tracking-widest text-black/30">Current Workflow</p>
                                  <p className="text-black/70 leading-relaxed">{uc.current_workflow}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold uppercase tracking-widest text-black/30">Desired Workflow</p>
                                  <p className="text-black/70 leading-relaxed">{uc.desired_workflow}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="font-bold uppercase tracking-widest text-black/30">Data & Integrations</p>
                                    <p className="text-black/70">{uc.data_integrations}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="font-bold uppercase tracking-widest text-black/30">Value & Metrics</p>
                                    <p className="text-black/70">{uc.value_metrics}</p>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold uppercase tracking-widest text-black/30">Acceptance Criteria</p>
                                  <ul className="list-disc list-inside space-y-0.5 text-black/70">
                                    {uc.acceptance_criteria.map((ac, j) => <li key={j}>{ac}</li>)}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Solution Set Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <Layers className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Solution Set</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {result?.solution_set.map((set, i) => (
                            <div key={i} className="p-4 bg-black/5 rounded-2xl space-y-2">
                              <h5 className="text-[10px] font-bold uppercase tracking-widest text-red-600">{set.category}</h5>
                              <div className="flex flex-wrap gap-2">
                                {set.solutions.map((sol, j) => (
                                  <span key={j} className="px-2 py-1 bg-white border border-black/5 rounded text-[10px] font-medium">{sol}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Client References Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <Users className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Client References</span>
                        </div>
                        <div className="space-y-4">
                          {result?.client_references.map((ref, i) => (
                            <div key={i} className="p-4 border border-black/5 rounded-2xl space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">{ref.industry}</span>
                                <span className="text-[9px] font-medium px-2 py-0.5 bg-black/5 rounded-full">{ref.company_size}</span>
                              </div>
                              <p className="text-[11px] text-black/70 leading-relaxed italic">"{ref.success_story}"</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    {/* Right Column: Price, TCO (col-span-6) */}
                    <div className="col-span-12 lg:col-span-6 space-y-8">
                      {/* Price of each solution Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Solution Pricing</span>
                        </div>
                        <div className="space-y-4">
                          {result?.top_recommendations.map((rec, i) => (
                            <div key={i} className="p-4 bg-black/5 rounded-2xl space-y-3">
                              <div className="flex justify-between items-start">
                                <h5 className="font-bold text-xs uppercase tracking-tight">{rec.solution_name}</h5>
                                <span className="text-[10px] font-mono font-bold text-emerald-600">{rec.estimated_monthly_cost}</span>
                              </div>
                              <div className="space-y-1">
                                {rec.cost_breakdown.map((item, j) => (
                                  <div key={j} className="flex justify-between text-[9px] text-black/40">
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Total Cost of Ownership Section */}
                      <section className="bg-red-50 border border-red-100 rounded-3xl p-8 space-y-6">
                        <div className="flex items-center gap-2 text-red-600/60">
                          <Activity className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">TCO Analysis</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40">Monthly Est.</p>
                            <p className="text-lg font-black text-red-600">{result?.total_cost_of_ownership.total_monthly_estimate}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40">Setup Cost</p>
                            <p className="text-lg font-black text-red-600">{result?.total_cost_of_ownership.one_time_setup_cost}</p>
                          </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-red-100">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40">3-Year ROI</p>
                            <p className="text-xs font-bold text-red-900">{result?.total_cost_of_ownership.three_year_roi}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40">Optimization</p>
                            <p className="text-[10px] text-red-900/70 leading-relaxed">{result?.total_cost_of_ownership.cost_optimization_strategy}</p>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>

                  {/* Bottom: Core Recommendation (Full Width) */}
                  <section className="bg-black text-white rounded-3xl p-12 shadow-xl space-y-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-white/40">
                      <Rocket className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">Core Strategic Recommendation</span>
                    </div>
                    <h3 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">
                      {result?.recommendation}
                    </h3>
                    <div className="pt-8 border-t border-white/10 max-w-3xl mx-auto">
                      <p className="text-lg text-white/60 font-serif italic leading-relaxed">
                        {result?.executive_summary}
                      </p>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
      {/* Diagram Modal removed */}
    </div>
  );
}
