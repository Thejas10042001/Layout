/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  ChevronRight,
  Loader2,
  CheckCircle2,
  Quote,
  DollarSign,
  Activity,
  Upload,
  FileUp,
  FileCheck,
  X
} from 'lucide-react';
import mermaid from 'mermaid';
import { analyzeTranscript, performOCR, validateDocumentMatch } from './services/geminiService';
import { cn } from './lib/utils';

mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
});

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const renderChart = async () => {
      if (ref.current && chart) {
        try {
          ref.current.removeAttribute('data-processed');
          await mermaid.run({
            nodes: [ref.current],
          });
        } catch (err) {
          console.error('Mermaid render error:', err);
        }
      }
    };
    renderChart();
  }, [chart]);

  return (
    <div className="mermaid bg-white p-4 rounded-xl overflow-x-auto min-h-[200px] flex items-center justify-center" ref={ref}>
      {chart}
    </div>
  );
};

interface AnalysisResult {
  client_snapshot: {
    organization_type: string;
    technical_maturity_level: string;
    top_priorities: string[];
    constraints: string[];
    risk_factors: string[];
    detected_pains: string[];
    detected_goals: string[];
  };
  core_drivers: string[];
  top_recommendations: {
    solution_name: string;
    architecture_layer: string;
    business_value: string;
    technical_reason: string;
    transcript_reference: string;
    confidence_score: number;
    pricing_model: string;
    estimated_monthly_cost: string;
    cost_breakdown: string[];
    why_it_fits: string;
    complementary_solutions: string[];
  }[];
  matched_use_cases: {
    scenario_name: string;
    format: string;
    situation: string;
    problem_or_task: string;
    action: string;
    result: string;
    industry_relevance: string;
  }[];
  diagrams: {
    use_case_diagram: string;
    tech_architecture_diagram: string;
  };
  recommended_pilot: {
    name: string;
    why_this_pilot: string;
    high_level_architecture: string[];
    measurable_success_metrics: string[];
  };
  implementation_phases: {
    phase_name: string;
    focus: string;
    expected_outcome: string;
  }[];
  next_steps: {
    demo_direction: string;
    follow_up_focus: string;
    validation_questions: string[];
  };
  executive_summary: string;
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

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadSample = () => setTranscript(SAMPLE_TRANSCRIPT);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrError(null);
    setDocumentText('');

    try {
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
    } catch (err) {
      console.error(err);
      setOcrError('An unexpected error occurred during file selection.');
      setIsOcrLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setValidationError(null);

    try {
      // Validation Logic
      if (documentText.trim()) {
        const validation = await validateDocumentMatch(documentText, transcript);
        if (!validation.matches) {
          setValidationError(validation.reason || "Missing document context. Please provide a document that matches the transcript's company/project.");
          setIsAnalyzing(false);
          return;
        }
      }

      const data = await analyzeTranscript(transcript, documentText);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze transcript. Please check your API key and try again.');
    } finally {
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

      <main className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-start">
          
          {/* Left Sidebar: Input Section */}
          <div className="lg:col-span-1 space-y-8 lg:sticky lg:top-24">
            {/* Document Upload Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-black/40">
                <Upload className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest">Document Context (OCR)</span>
              </div>
              
              <div className={cn(
                "relative border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center gap-4",
                documentText ? "border-emerald-200 bg-emerald-50/30" : "border-black/5 bg-white hover:border-black/10"
              )}>
                {isOcrLoading ? (
                  <div className="space-y-3">
                    <Loader2 className="w-6 h-6 animate-spin text-black/20 mx-auto" />
                    <p className="text-[10px] font-medium text-black/40 uppercase tracking-widest">Extracting...</p>
                  </div>
                ) : documentText ? (
                  <>
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <button 
                      onClick={() => setDocumentText('')}
                      className="absolute top-3 right-3 p-1 hover:bg-emerald-100 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-emerald-600" />
                    </button>
                    <div className="w-full p-3 bg-white/50 rounded-xl border border-emerald-100 max-h-24 overflow-y-auto text-left">
                      <p className="text-[9px] font-mono text-emerald-800/70 whitespace-pre-wrap">{documentText}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center">
                      <FileUp className="w-5 h-5 text-black/20" />
                    </div>
                    <label className="cursor-pointer bg-black text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-black/80 transition-all">
                      Upload
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                    </label>
                  </>
                )}
              </div>
              {ocrError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2 items-start">
                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] font-medium text-red-900 whitespace-pre-wrap leading-tight">
                    {ocrError}
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-black/40">
                  <FileText className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Input Transcript</span>
                </div>
                <button 
                  onClick={loadSample}
                  className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors"
                >
                  Sample
                </button>
              </div>
              <div className="relative group">
                <textarea
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Paste transcript here..."
                  className={cn(
                    "w-full h-[350px] bg-white border rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none shadow-sm group-hover:border-black/20",
                    validationError ? "border-red-500 ring-2 ring-red-500/10" : "border-black/10"
                  )}
                />
              </div>
              {validationError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 items-start animate-in fade-in slide-in-from-top-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-red-900 uppercase tracking-widest leading-none">Validation Failed</p>
                    <p className="text-[11px] text-red-700 leading-tight">
                      {validationError}
                    </p>
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-2">
                      Show missing document, please put same company document
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !transcript.trim() || isOcrLoading}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg",
                  isAnalyzing || !transcript.trim() || isOcrLoading
                    ? "bg-black/10 text-black/40 cursor-not-allowed" 
                    : "bg-black text-white hover:bg-black/90 active:scale-95"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generate Strategy
                  </>
                )}
              </button>
              {error && (
                <p className="text-red-500 text-[10px] font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </p>
              )}
            </section>
          </div>

          {/* Right Section: Output Section */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {!result && !isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-[80vh] flex flex-col items-center justify-center text-center space-y-6 border-2 border-dashed border-black/5 rounded-3xl bg-white/50"
                >
                  <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center">
                    <Target className="w-10 h-10 text-black/20" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <h3 className="font-black text-2xl tracking-tight">Ready for Analysis</h3>
                    <p className="text-sm text-black/50 leading-relaxed">
                      Upload a document or paste a discovery call transcript to generate your 4-part executive strategy.
                    </p>
                  </div>
                </motion.div>
              ) : isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse bg-black/5 rounded-3xl h-[400px]" />
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8 pb-20"
                >
                  {/* The 4-Part Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Part 1: Executive Strategy & Summary */}
                    <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6 flex flex-col">
                      <div className="flex items-center gap-2 text-black/40">
                        <Target className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">01. Executive Strategy</span>
                      </div>
                      <div className="flex-1 flex items-center">
                        <p className="text-2xl font-serif italic text-black/80 leading-relaxed">
                          "{result?.executive_summary}"
                        </p>
                      </div>
                      <div className="pt-6 border-t border-black/5 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-black/30">Organization</p>
                          <p className="text-xs font-bold">{result?.client_snapshot.organization_type}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-black/30">Maturity</p>
                          <p className="text-xs font-bold">{result?.client_snapshot.technical_maturity_level}</p>
                        </div>
                      </div>
                    </section>

                    {/* Part 2: Immediate Actions & Validation */}
                    <section className="bg-black text-white rounded-3xl p-8 shadow-xl space-y-8">
                      <div className="flex items-center gap-2 text-white/40">
                        <Rocket className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">02. Immediate Actions</span>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-2">Demo Direction</p>
                            <p className="text-sm text-white/90 leading-relaxed font-medium">{result?.next_steps.demo_direction}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-2">Validation Checklist</p>
                            <div className="space-y-2">
                              {result?.next_steps.validation_questions.slice(0, 3).map((q, i) => (
                                <div key={i} className="flex gap-3 text-xs">
                                  <div className="w-4 h-4 rounded border border-white/20 flex items-center justify-center shrink-0">
                                    <span className="text-[8px] font-bold">?</span>
                                  </div>
                                  <span className="text-white/60 italic">{q}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Part 3: Technical Architecture & Visualization */}
                    <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                      <div className="flex items-center gap-2 text-black/40">
                        <Network className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">03. Architectural Blueprint</span>
                      </div>
                      <div className="bg-black/5 rounded-2xl p-4 overflow-hidden">
                        <Mermaid chart={result?.diagrams.tech_architecture_diagram || ''} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result?.core_drivers.map((driver, i) => (
                          <span key={i} className="px-2 py-1 bg-black/5 rounded text-[9px] font-bold uppercase tracking-wider">{driver}</span>
                        ))}
                      </div>
                    </section>

                    {/* Part 4: Recommendations & Financials */}
                    <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6 overflow-hidden flex flex-col">
                      <div className="flex items-center gap-2 text-black/40">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">04. Solution & Financials</span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {result?.top_recommendations.slice(0, 2).map((rec, i) => (
                          <div key={i} className="p-4 bg-black/5 rounded-2xl space-y-3">
                            <div className="flex justify-between items-start">
                              <h5 className="font-bold text-sm">{rec.solution_name}</h5>
                              <span className="text-[10px] font-mono font-bold text-emerald-600">{rec.estimated_monthly_cost}</span>
                            </div>
                            <p className="text-[10px] text-black/60 line-clamp-2">{rec.business_value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-black/5">
                        <div className="flex items-center justify-between text-black/40">
                          <span className="text-[10px] font-bold uppercase tracking-widest">Pilot Project</span>
                          <span className="text-[10px] font-bold">{result?.recommended_pilot.name}</span>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Detailed Breakdown (Below the 4-part grid) */}
                  <div className="pt-12 border-t border-black/5 space-y-12">
                    {/* Full Recommendations */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 text-black/40">
                        <Layers className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Detailed Recommendations</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {result?.top_recommendations.map((rec, i) => (
                          <div key={i} className="bg-white border border-black/5 rounded-2xl p-6 flex gap-6 items-start">
                            <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center shrink-0">
                              {LAYER_ICONS[rec.architecture_layer] || <ChevronRight className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-2">
                                <h4 className="text-[9px] font-bold uppercase tracking-widest text-black/30 mb-1">{rec.architecture_layer}</h4>
                                <h5 className="font-bold text-base mb-2">{rec.solution_name}</h5>
                                <p className="text-xs text-black/60 leading-relaxed">{rec.why_it_fits}</p>
                              </div>
                              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700">Monthly Est.</span>
                                  <span className="text-xs font-bold text-emerald-700">{rec.estimated_monthly_cost}</span>
                                </div>
                                <ul className="space-y-1">
                                  {rec.cost_breakdown.slice(0, 3).map((item, idx) => (
                                    <li key={idx} className="text-[9px] text-emerald-800/60 flex items-center gap-1.5">
                                      <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Use Case & Roadmap */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <section className="space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <FileText className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Key Use Cases</span>
                        </div>
                        <div className="space-y-4">
                          {result?.matched_use_cases.slice(0, 3).map((uc, i) => (
                            <div key={i} className="bg-white border border-black/5 rounded-2xl p-6 space-y-4">
                              <div className="flex justify-between items-center">
                                <h5 className="font-bold text-sm">{uc.scenario_name}</h5>
                                <span className="text-[8px] font-bold px-2 py-0.5 bg-black text-white rounded-full">{uc.format}</span>
                              </div>
                              <p className="text-[11px] text-black/60 leading-relaxed"><span className="font-bold text-black/80">Result:</span> {uc.result}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="space-y-6">
                        <div className="flex items-center gap-2 text-black/40">
                          <Target className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Implementation Roadmap</span>
                        </div>
                        <div className="space-y-4">
                          {result?.implementation_phases.map((phase, i) => (
                            <div key={i} className="bg-white border border-black/5 rounded-2xl p-6 flex gap-4 items-center">
                              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                {i + 1}
                              </div>
                              <div>
                                <h5 className="font-bold text-xs">{phase.phase_name}</h5>
                                <p className="text-[10px] text-black/50">{phase.focus}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
