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
  total_cost_of_ownership: {
    total_monthly_estimate: string;
    total_yearly_estimate: string;
    monthly_est_math_reasoning: string;
    monthly_breakdown: {
      category: string;
      cost: string;
      reasoning: string;
    }[];
    one_time_setup_cost: string;
    setup_cost_math_reasoning: string;
    setup_breakdown: {
      item: string;
      cost: string;
      reasoning: string;
    }[];
    three_year_roi: string;
    roi_math_reasoning: string;
    roi_breakdown: {
      metric: string;
      value: string;
      reasoning: string;
    }[];
    cost_optimization_strategy: string;
    optimization_judgment: string;
  };
  solution_set: {
    category: string;
    solutions: {
      name: string;
      estimated_monthly_cost: string;
      pricing_reasoning: string;
      cost_breakdown: {
        item: string;
        cost: string;
        reasoning: string;
      }[];
      detailed_explanation: string;
    }[];
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
    current_workflow_description: string;
    current_workflow_steps: string[];
    potential_bottlenecks: string[];
    desired_workflow_description: string;
    desired_workflow_steps: string[];
    data_integrations: string;
    value_metrics: string;
    constraints_risks: string;
    acceptance_criteria: string[];
    priority_timeline: string;
  }[];
  executive_summary: string;
  technical_architecture_diagram: string;
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
  const [inputMode, setInputMode] = useState<'paste' | 'live' | 'upload'>('paste');
  const [livePerson1, setLivePerson1] = useState('');
  const [livePerson2, setLivePerson2] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<1 | 2>(1);
  const [isRecording, setIsRecording] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('architect_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('architect_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    let recognition: any = null;
    
    if (isRecording) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript) {
            if (activeSpeaker === 1) {
              setLivePerson1(prev => prev + (prev ? ' ' : '') + finalTranscript.trim());
            } else {
              setLivePerson2(prev => prev + (prev ? ' ' : '') + finalTranscript.trim());
            }
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          if (event.error !== 'no-speech') {
            setIsRecording(false);
          }
        };
        
        recognition.onend = () => {
          if (isRecording) {
            try {
              recognition.start();
            } catch (e) {
              // Ignore if already started
            }
          }
        };
        
        recognition.start();
      } else {
        alert('Speech recognition is not supported in this browser.');
        setIsRecording(false);
      }
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isRecording, activeSpeaker]);

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

  const handleTranscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTranscriptLoading(true);
    setError(null);
    setTranscript('');

    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const extractedText = result.value;
        
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('No text could be extracted from this Word document.');
        }
        
        setTranscript(extractedText);
      } else {
        // For transcripts, we might also want to support text files or even images/PDFs if they are scans of transcripts
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const extractedText = await performOCR(base64, file.type);
            
            if (!extractedText || extractedText.trim().length === 0) {
              throw new Error('No text could be extracted from this document.');
            }
            
            setTranscript(extractedText);
          } catch (err: any) {
            console.error(err);
            setError(`Transcript Extraction Failed: ${err.message || 'Unknown error'}`);
          } finally {
            setIsTranscriptLoading(false);
          }
        };
        reader.onerror = () => {
          setError('Failed to read file.');
          setIsTranscriptLoading(false);
        };
        reader.readAsDataURL(file);
        return; // Exit early as reader.onload handles the rest
      }
    } catch (err: any) {
      console.error(err);
      setError(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
    } finally {
      setIsTranscriptLoading(false);
    }
  };

  const handleAnalyze = async () => {
    const finalTranscript = (inputMode === 'paste' || inputMode === 'upload')
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
                        onClick={() => setInputMode('upload')}
                        className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'upload' ? "bg-white shadow-sm text-black" : "text-black/40")}
                      >
                        Upload
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
                  ) : inputMode === 'upload' ? (
                    <div className="space-y-4">
                      <div className={cn(
                        "relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center gap-4",
                        transcript ? "border-emerald-200 bg-emerald-50/30" : "border-black/5 bg-white hover:border-black/10"
                      )}>
                        {isTranscriptLoading ? (
                          <Loader2 className="w-8 h-8 animate-spin text-black/20" />
                        ) : transcript ? (
                          <div className="flex flex-col items-center gap-3">
                            <FileCheck className="w-8 h-8 text-emerald-600" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Transcript Loaded</p>
                              <p className="text-[9px] text-emerald-600/60 font-medium">Ready for analysis</p>
                            </div>
                            <button 
                              onClick={() => setTranscript('')}
                              className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                            >
                              Clear and Re-upload
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center">
                              <FileText className="w-6 h-6 text-black/20" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest">Upload Transcript</p>
                              <p className="text-[9px] text-black/40 font-medium">Support for .docx, .pdf, and images</p>
                            </div>
                            <label className="cursor-pointer bg-black text-white px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all shadow-lg shadow-black/10">
                              Select File
                              <input type="file" className="hidden" accept=".docx,application/pdf,image/*" onChange={handleTranscriptUpload} />
                            </label>
                          </>
                        )}
                      </div>
                      {transcript && (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black/40 ml-1">Extracted Content Preview</label>
                          <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            className="w-full h-[150px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={cn(
                        "space-y-2 p-2 rounded-2xl transition-all border border-transparent",
                        activeSpeaker === 1 && isRecording && "bg-red-50/50 border-red-100 shadow-sm"
                      )}>
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black/40">Person 1 (Customer)</label>
                          {isRecording && activeSpeaker === 1 && (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">Listening</span>
                            </div>
                          )}
                        </div>
                        <textarea
                          value={livePerson1}
                          onChange={(e) => setLivePerson1(e.target.value)}
                          onFocus={() => setActiveSpeaker(1)}
                          placeholder="Customer speaking..."
                          className="w-full h-[140px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                        />
                      </div>
                      <div className={cn(
                        "space-y-2 p-2 rounded-2xl transition-all border border-transparent",
                        activeSpeaker === 2 && isRecording && "bg-red-50/50 border-red-100 shadow-sm"
                      )}>
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black/40">Person 2 (Architect)</label>
                          {isRecording && activeSpeaker === 2 && (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">Listening</span>
                            </div>
                          )}
                        </div>
                        <textarea
                          value={livePerson2}
                          onChange={(e) => setLivePerson2(e.target.value)}
                          onFocus={() => setActiveSpeaker(2)}
                          placeholder="Architect speaking..."
                          className="w-full h-[140px] bg-white border border-black/10 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm"
                        />
                      </div>
                      <button 
                        onClick={() => setIsRecording(!isRecording)}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                          isRecording ? "bg-red-600 border-red-700 text-white shadow-lg shadow-red-500/20" : "bg-black/5 border-transparent text-black/40 hover:bg-black/10"
                        )}
                      >
                        {isRecording ? <Square className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                        {isRecording ? "Stop Listening" : "Start Real-time Transcription"}
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
                    {/* Left Column: Use Case, Client References (col-span-5) */}
                    <div className="col-span-12 lg:col-span-5 space-y-8">
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
                                  <p className="text-black/70 leading-relaxed mb-2">{uc.current_workflow_description}</p>
                                  <div className="space-y-2 pl-2 border-l border-black/5">
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-black/20">Process Steps</p>
                                      <ul className="list-decimal list-inside space-y-0.5 text-black/60">
                                        {uc.current_workflow_steps.map((step, j) => <li key={j}>{step}</li>)}
                                      </ul>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-red-600/30">Potential Bottlenecks</p>
                                      <ul className="list-disc list-inside space-y-0.5 text-red-600/60">
                                        {uc.potential_bottlenecks.map((bn, j) => <li key={j}>{bn}</li>)}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold uppercase tracking-widest text-black/30">Desired Workflow</p>
                                  <p className="text-black/70 leading-relaxed mb-2">{uc.desired_workflow_description}</p>
                                  <div className="space-y-1 pl-2 border-l border-black/5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/30">Modernized Steps</p>
                                    <ul className="list-decimal list-inside space-y-0.5 text-emerald-600/60">
                                      {uc.desired_workflow_steps.map((step, j) => <li key={j}>{step}</li>)}
                                    </ul>
                                  </div>
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

                      {/* Technical Architecture Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-black/40">
                            <Network className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Technical Architecture</span>
                          </div>
                          <button 
                            onClick={() => {
                              if (result?.technical_architecture_diagram) {
                                navigator.clipboard.writeText(result.technical_architecture_diagram);
                              }
                            }}
                            className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            Copy Diagram
                          </button>
                        </div>
                        <div className="p-6 bg-black rounded-2xl overflow-x-auto custom-scrollbar relative group">
                          <pre className="text-[9px] font-mono text-emerald-400 leading-[1.1] whitespace-pre">
                            {result?.technical_architecture_diagram}
                          </pre>
                        </div>
                      </section>
                    </div>

                    {/* Right Column: Solution Set & Pricing, TCO (col-span-7) */}
                    <div className="col-span-12 lg:col-span-7 space-y-8">
                      {/* Solution Set & Pricing Section */}
                      <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <Layers className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Solution Set & Detailed Pricing</span>
                        </div>
                        <div className="space-y-8">
                          {result?.solution_set.map((set, i) => (
                            <div key={i} className="space-y-4">
                              <h5 className="text-xs font-black uppercase tracking-widest text-red-600 border-b border-red-100 pb-2">{set.category}</h5>
                              <div className="grid grid-cols-1 gap-6">
                                {set.solutions.map((sol, j) => (
                                  <div key={j} className="p-6 bg-black/[0.02] border border-black/5 rounded-2xl space-y-4">
                                    <div className="flex justify-between items-start">
                                      <div className="space-y-1">
                                        <h6 className="text-sm font-black uppercase tracking-tight">{sol.name}</h6>
                                        <p className="text-[11px] text-black/60 leading-relaxed">{sol.detailed_explanation}</p>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-xs font-mono font-bold text-emerald-600 block">{sol.estimated_monthly_cost}</span>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-black/20">Monthly</span>
                                      </div>
                                    </div>
                                    <div className="pt-4 border-t border-black/5 space-y-4">
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Pricing Overview</p>
                                        <p className="text-[11px] text-black/70 italic leading-relaxed">{sol.pricing_reasoning}</p>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Cost Breakdown</p>
                                        <div className="space-y-2">
                                          {sol.cost_breakdown.map((item, k) => (
                                            <div key={k} className="p-3 bg-white border border-black/5 rounded-xl space-y-1">
                                              <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-black/80">{item.item}</span>
                                                <span className="text-[10px] font-mono font-bold text-emerald-600">{item.cost}</span>
                                              </div>
                                              <p className="text-[9px] text-black/40 leading-relaxed">{item.reasoning}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Total Cost of Ownership Section */}
                      <section className="bg-red-50 border border-red-100 rounded-3xl p-8 space-y-8">
                        <div className="flex items-center gap-2 text-red-600/60">
                          <Activity className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">TCO Analysis & Financial Reasoning</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Monthly & Yearly Estimate */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Monthly Est.</p>
                                <p className="text-2xl font-black text-red-600">{result?.total_cost_of_ownership.total_monthly_estimate}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Yearly Est.</p>
                                <p className="text-2xl font-black text-red-600">{result?.total_cost_of_ownership.total_yearly_estimate}</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="p-4 bg-white/50 rounded-xl border border-red-100">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40 mb-2">Math & Reasoning</p>
                                <p className="text-[11px] text-red-900/70 leading-relaxed">{result?.total_cost_of_ownership.monthly_est_math_reasoning}</p>
                              </div>
                              <div className="space-y-2">
                                {result?.total_cost_of_ownership.monthly_breakdown.map((item, k) => (
                                  <div key={k} className="p-3 bg-white/30 border border-red-100/50 rounded-lg flex justify-between items-start gap-4">
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] font-bold text-red-900/80">{item.category}</p>
                                      <p className="text-[9px] text-red-900/40 leading-tight">{item.reasoning}</p>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-red-600 shrink-0">{item.cost}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Setup Cost */}
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Setup Cost</p>
                              <p className="text-2xl font-black text-red-600">{result?.total_cost_of_ownership.one_time_setup_cost}</p>
                            </div>
                            <div className="space-y-3">
                              <div className="p-4 bg-white/50 rounded-xl border border-red-100">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40 mb-2">Math & Reasoning</p>
                                <p className="text-[11px] text-red-900/70 leading-relaxed">{result?.total_cost_of_ownership.setup_cost_math_reasoning}</p>
                              </div>
                              <div className="space-y-2">
                                {result?.total_cost_of_ownership.setup_breakdown.map((item, k) => (
                                  <div key={k} className="p-3 bg-white/30 border border-red-100/50 rounded-lg flex justify-between items-start gap-4">
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] font-bold text-red-900/80">{item.item}</p>
                                      <p className="text-[9px] text-red-900/40 leading-tight">{item.reasoning}</p>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-red-600 shrink-0">{item.cost}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 pt-8 border-t border-red-100">
                          {/* ROI */}
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">3-Year ROI Projection</p>
                              <p className="text-xl font-black text-red-900">{result?.total_cost_of_ownership.three_year_roi}</p>
                            </div>
                            <div className="space-y-3">
                              <div className="p-4 bg-white/50 rounded-xl border border-red-100">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-red-900/40 mb-2">ROI Reasoning</p>
                                <p className="text-[11px] text-red-900/70 leading-relaxed">{result?.total_cost_of_ownership.roi_math_reasoning}</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {result?.total_cost_of_ownership.roi_breakdown.map((item, k) => (
                                  <div key={k} className="p-3 bg-white/30 border border-red-100/50 rounded-lg space-y-1">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[10px] font-bold text-red-900/80">{item.metric}</p>
                                      <span className="text-[10px] font-mono font-bold text-red-600">{item.value}</span>
                                    </div>
                                    <p className="text-[9px] text-red-900/40 leading-tight">{item.reasoning}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Optimization & Judgment */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Optimization Strategy</p>
                              <p className="text-[11px] text-red-900/70 leading-relaxed">{result?.total_cost_of_ownership.cost_optimization_strategy}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/40">Expert Judgment</p>
                              <div className="p-4 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20">
                                <p className="text-[11px] font-medium leading-relaxed italic">"{result?.total_cost_of_ownership.optimization_judgment}"</p>
                              </div>
                            </div>
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
                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-tight">
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
