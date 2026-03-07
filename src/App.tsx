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
import { analyzeTranscript, performOCR, validateDocumentMatch, diarizeSpeaker } from './services/geminiService';
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


interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string | null;
  role?: 'User' | 'Client';
  selected?: boolean;
}

interface TranscriptGroup {
  id: number;
  speaker: string | null;
  text: string;
  role?: 'User' | 'Client';
  selected?: boolean;
  segmentIds: number[];
}

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
  sales_intelligence: {
    sentiment_score: string;
    sentiment_summary: string;
    buying_signals: {
      signal: string;
      confidence: string;
      evidence: string;
    }[];
    medpicc: {
      metrics: string;
      economic_buyer: string;
      decision_criteria: string;
      decision_process: string;
      identify_pain: string;
      champion: string;
      competition: string;
    };
  };
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

const DB_NAME = 'SpikedAI_Cache';
const DB_VERSION = 3;
const TRANSCRIPTS_STORE = 'transcripts';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRANSCRIPTS_STORE)) {
        db.createObjectStore(TRANSCRIPTS_STORE, { keyPath: 'meetingId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

const loadFromIndexedDB = async (storeName: string, key?: string): Promise<any> => {
  try {
    const db = await initDB();
    if (!db.objectStoreNames.contains(storeName)) return key ? null : [];
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    if (key) {
      const request = store.get(key);
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
    } else {
      const request = store.getAll();
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
      });
    }
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return key ? null : [];
  }
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
  const [documentName, setDocumentName] = useState('');
  const [inputMode, setInputMode] = useState<'paste' | 'live' | 'upload' | 'spiked' | 'bot'>('paste');
  const [isSpikedLoading, setIsSpikedLoading] = useState(false);
  const [spikedConnectionStatus, setSpikedConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [spikedTranscript, setSpikedTranscript] = useState<TranscriptSegment[]>([]);
  const [recallBotId, setRecallBotId] = useState<string | null>(null);
  const [recallMeetingUrl, setRecallMeetingUrl] = useState('');
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [speakerRoles, setSpeakerRoles] = useState<Record<string, 'User' | 'Client'>>({});
  const [selectedSegments, setSelectedSegments] = useState<Set<number>>(new Set());
  const [livePerson1, setLivePerson1] = useState('');
  const [livePerson2, setLivePerson2] = useState('');
  const [person1VoiceSample, setPerson1VoiceSample] = useState<string | null>(null);
  const [person2VoiceSample, setPerson2VoiceSample] = useState<string | null>(null);
  const [isAutoDiarizationEnabled, setIsAutoDiarizationEnabled] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<1 | 2>(1);
  const [isRecording, setIsRecording] = useState(false);

  // Refs for speech recognition to avoid effect restarts
  const activeSpeakerRef = React.useRef(activeSpeaker);
  const isAutoDiarizationEnabledRef = React.useRef(isAutoDiarizationEnabled);
  const livePerson1Ref = React.useRef(livePerson1);
  const livePerson2Ref = React.useRef(livePerson2);
  const isRecordingRef = React.useRef(isRecording);

  useEffect(() => { activeSpeakerRef.current = activeSpeaker; }, [activeSpeaker]);
  useEffect(() => { isAutoDiarizationEnabledRef.current = isAutoDiarizationEnabled; }, [isAutoDiarizationEnabled]);
  useEffect(() => { livePerson1Ref.current = livePerson1; }, [livePerson1]);
  useEffect(() => { livePerson2Ref.current = livePerson2; }, [livePerson2]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const fetchRecallTranscript = async (botId: string) => {
    try {
      const response = await fetch(`/api/recall/bot/${botId}/transcript`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const segments: TranscriptSegment[] = data.map((item: any, i: number) => ({
          id: i,
          start: item.start_time,
          end: item.end_time,
          speaker: item.speaker || 'Unknown',
          text: item.text
        }));
        setSpikedTranscript(segments);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Fetch Error:", error);
      return false;
    }
  };

  const loadSpikedTranscript = async () => {
    if (recallMeetingUrl) {
      // Validate URL
      const meetingUrlRegex = /^(https?:\/\/)?([\w.-]+\.)?([\w.-]+)\.[\w.-]+(\/.*)?$/;
      if (!meetingUrlRegex.test(recallMeetingUrl)) {
        setSpikedConnectionStatus('error');
        alert("Please enter a valid meeting URL (Zoom, Google Meet, Microsoft Teams, etc.)");
        return;
      }

      // Real Recall.ai Integration
      setIsSpikedLoading(true);
      setSpikedConnectionStatus('connecting');
      try {
        const response = await fetch("/api/recall/bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            meeting_url: recallMeetingUrl,
            bot_name: "Spiked AI Cloud",
            bot_logo_url: "https://picsum.photos/seed/spiked/200/200" // Placeholder for Spiked AI logo
          }),
        });
        const data = await response.json();
        if (response.ok && data.id) {
          setRecallBotId(data.id);
          setSpikedConnectionStatus('connected');
          // Initial fetch
          await fetchRecallTranscript(data.id);
        } else {
          console.error("Recall Join Error:", data);
          setSpikedConnectionStatus('error');
          
          let errorMessage = "Bot failed to join the meeting.";
          if (data.error) {
            errorMessage = data.error;
          } else if (data.detail) {
            errorMessage = data.detail;
          } else if (data.code === 'authentication_failed') {
            errorMessage = "Authentication Failed: Your Recall.ai API key was rejected. Please verify it in the Secrets panel.";
          } else if (Array.isArray(data.meeting_url)) {
            errorMessage = `Invalid Meeting URL: ${data.meeting_url[0]}`;
          }
          
          alert(`Bot Join Failed: ${errorMessage}`);
        }
      } catch (error) {
        console.error("Recall Bot Error:", error);
        setSpikedConnectionStatus('error');
        alert("An unexpected error occurred while joining the bot.");
      } finally {
        setIsSpikedLoading(false);
      }
      return;
    }

    // Fallback to local discovery logic if no URL provided
    setIsSpikedLoading(true);
    setSpikedConnectionStatus('connecting');
    try {
      // Strategy 1: Check multiple session storage keys used by SpikedAI
      const storageKeys = [
        'spikedai_current_transcript',
        'spikedai_main_transcript',
        'spikedai_live_transcript',
        'spikedai_transcript',
        'spikedai_transcript_segments',
        'current_meeting_transcript',
        'transcript_data',
        'meeting_segments'
      ];

      for (const key of storageKeys) {
        const raw = window.sessionStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSpikedTranscript(parsed);
              setIsSpikedLoading(false);
              setSpikedConnectionStatus('connected');
              return;
            }
          } catch (e) {}
        }
      }

      // Strategy 2: Check IndexedDB for any stored transcripts
      const allEntries = await loadFromIndexedDB(TRANSCRIPTS_STORE);
      if (allEntries && allEntries.length > 0) {
        const validEntries = allEntries.filter((e: any) => e.data && Array.isArray(e.data) && e.data.length > 0);
        if (validEntries.length > 0) {
          // Use the entry with the most segments
          const bestEntry = validEntries.reduce((prev: any, current: any) => 
            (current.data.length > prev.data.length) ? current : prev
          );
          setSpikedTranscript(bestEntry.data);
          setIsSpikedLoading(false);
          setSpikedConnectionStatus('connected');
          return;
        }
      }

      // Strategy 3: Fallback to sample only if absolutely nothing else is found
      const sampleSegments: TranscriptSegment[] = SAMPLE_TRANSCRIPT.split('\n').map((line, i) => {
        const [speaker, ...text] = line.split(': ');
        return { id: i, start: i * 10, end: (i + 1) * 10, speaker: speaker || 'Unknown', text: text.join(': ') || line };
      });
      setSpikedTranscript(sampleSegments);
      setSpikedConnectionStatus('error');
      
    } catch (e) {
      console.error("Load error", e);
      setSpikedConnectionStatus('error');
    } finally {
      setIsSpikedLoading(false);
    }
  };

  // Recall.ai Polling Logic
  useEffect(() => {
    if (!recallBotId || inputMode !== 'spiked') return;

    const interval = setInterval(() => {
      fetchRecallTranscript(recallBotId);
    }, 5000);
    return () => clearInterval(interval);
  }, [recallBotId, inputMode]);

  const groupTranscriptBySpeaker = (segments: TranscriptSegment[]) => {
    if (!segments || segments.length === 0) return [];
    const groups: TranscriptGroup[] = [];
    let currentGroup: TranscriptGroup | null = null;
    
    segments.forEach((segment, index) => {
      const speaker = segment.speaker || 'Unknown';
      const role = speakerRoles[speaker] || 'User';
      const selected = selectedSegments.has(segment.id);

      if (currentGroup && currentGroup.speaker === segment.speaker) {
        currentGroup.text += ' ' + segment.text;
        currentGroup.segmentIds.push(segment.id);
      } else {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { 
          speaker: segment.speaker, 
          text: segment.text, 
          id: segment.id || index,
          role,
          selected,
          segmentIds: [segment.id]
        };
      }
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
  };

  const toggleSegmentSelection = (segmentIds: number[]) => {
    const newSelected = new Set(selectedSegments);
    const allSelected = segmentIds.every(id => newSelected.has(id));
    
    segmentIds.forEach(id => {
      if (allSelected) newSelected.delete(id);
      else newSelected.add(id);
    });
    
    setSelectedSegments(newSelected);
  };

  const updateSpeakerRole = (speaker: string, role: 'User' | 'Client') => {
    setSpeakerRoles(prev => ({ ...prev, [speaker]: role }));
  };

  // Spiked Sync Logic
  useEffect(() => {
    if (inputMode !== 'spiked') return;

    const syncFromStorage = () => {
      try {
        const raw = window.sessionStorage.getItem('spikedai_current_transcript');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setSpikedTranscript(parsed);
          }
        }
      } catch (e) {
        console.error("Sync error", e);
      }
    };

    // Initial sync
    syncFromStorage();

    // Listen for storage changes (cross-tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'spikedai_current_transcript') syncFromStorage();
    });

    // BroadcastChannel for instant sync if available
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('spikedai_transcript_updates');
      bc.onmessage = (event) => {
        if (event.data.type === 'new_segment' || event.data.type === 'full_sync') {
          syncFromStorage();
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      if (bc) bc.close();
    };
  }, [inputMode]);

  useEffect(() => {
    localStorage.setItem('architect_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    let recognition: any = null;
    let shouldRestart = true;
    
    if (isRecording) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = async (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript) {
            let targetSpeaker = activeSpeakerRef.current;
            
            if (isAutoDiarizationEnabledRef.current) {
              // Smart Diarization: Guess speaker based on content
              targetSpeaker = await diarizeSpeaker(finalTranscript, livePerson1Ref.current, livePerson2Ref.current);
              setActiveSpeaker(targetSpeaker);
            }

            if (targetSpeaker === 1) {
              setLivePerson1(prev => prev + (prev ? ' ' : '') + finalTranscript.trim());
            } else {
              setLivePerson2(prev => prev + (prev ? ' ' : '') + finalTranscript.trim());
            }
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          // 'aborted' often happens when we stop it manually or it's interrupted
          if (event.error === 'aborted') return;
          
          if (event.error !== 'no-speech') {
            setIsRecording(false);
          }
        };
        
        recognition.onend = () => {
          if (isRecordingRef.current && shouldRestart) {
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
      shouldRestart = false;
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [isRecording]);

  const loadSample = () => {
    if (inputMode === 'paste') {
      setTranscript(SAMPLE_TRANSCRIPT);
    } else {
      setLivePerson1("[Concerned Tone] We're seeing 15-minute downtime windows every Tuesday during deployments. It's costing us about $50k per hour.");
      setLivePerson2("[Professional Tone] Understood. AWS can help modernize this with a serverless architecture to eliminate that downtime.");
    }
  };
  const loadSampleDoc = () => setDocumentText(SAMPLE_DOCUMENT);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrError(null);
    setDocumentText('');
    setDocumentName(file.name);

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
    let finalTranscript = '';
    
    if (inputMode === 'paste' || inputMode === 'upload') {
      finalTranscript = transcript;
    } else if (inputMode === 'live') {
      finalTranscript = `Customer: ${livePerson1}\nArchitect: ${livePerson2}`;
    } else if (inputMode === 'spiked' || inputMode === 'bot') {
      const selected = spikedTranscript.filter(s => selectedSegments.size === 0 || selectedSegments.has(s.id));
      finalTranscript = selected.map(s => {
        const role = speakerRoles[s.speaker || 'Unknown'] || 'Client';
        return `[${role}] ${s.speaker || 'Unknown'}: ${s.text}`;
      }).join('\n');
    }

    if (!finalTranscript.trim()) return;
    
    setIsAnalyzing(true);
    setCurrentStep(2);
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
      
      {/* Step Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-8 flex gap-4">
        <button 
          onClick={() => setCurrentStep(1)}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2",
            currentStep === 1 
              ? "bg-black border-black text-white shadow-xl shadow-black/10 scale-[1.02]" 
              : "bg-white border-black/5 text-black/30 hover:border-black/10 hover:text-black"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
            currentStep === 1 ? "bg-white text-black" : "bg-black/5 text-black/40"
          )}>1</div>
          Input & Context
        </button>
        <button 
          onClick={() => setCurrentStep(2)}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2",
            currentStep === 2 
              ? "bg-black border-black text-white shadow-xl shadow-black/10 scale-[1.02]" 
              : "bg-white border-black/5 text-black/30 hover:border-black/10 hover:text-black"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
            currentStep === 2 ? "bg-white text-black" : "bg-black/5 text-black/40"
          )}>2</div>
          Analysis & History
        </button>
      </div>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {currentStep === 1 ? (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Context (OCR) Section */}
              <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-black/40">
                    <Upload className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Context (OCR)</span>
                  </div>
                  <button onClick={loadSampleDoc} className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black">Sample Doc</button>
                </div>
                <div className={cn(
                  "relative border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center gap-4 min-h-[200px]",
                  documentText ? "border-emerald-200 bg-emerald-50/30" : "border-black/5 bg-white hover:border-black/10"
                )}>
                  {isOcrLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-black/20" />
                  ) : documentText ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-emerald-600" />
                        <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-widest truncate max-w-[250px]">{documentName}</span>
                        <button onClick={() => { setDocumentText(''); setDocumentName(''); }}><X className="w-4 h-4 text-emerald-600" /></button>
                      </div>
                      <div className="w-full p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-800/40 mb-2">OCR Result Preview</p>
                        <p className="text-[11px] text-emerald-900/60 line-clamp-6 text-left leading-relaxed">{documentText}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6 text-black/20" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Upload Context Document</p>
                        <p className="text-[9px] text-black/40 font-medium">Support for Images, PDF, and Word</p>
                      </div>
                      <label className="cursor-pointer bg-black text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all shadow-lg shadow-black/10">
                        Select File
                        <input type="file" className="hidden" accept="image/*,application/pdf,.docx" onChange={handleFileUpload} />
                      </label>
                    </>
                  )}
                </div>
              </section>

              {/* Transcript Section */}
              <section className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
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
                    <button 
                      onClick={() => setInputMode('bot')}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'bot' ? "bg-white shadow-sm text-black" : "text-black/40")}
                    >
                      Join Bot
                    </button>
                    <button 
                      onClick={() => setInputMode('spiked')}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all", inputMode === 'spiked' ? "bg-white shadow-sm text-black" : "text-black/40")}
                    >
                      Connect with Spiked
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsBotModalOpen(true)}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center gap-2"
                    >
                      <Target className="w-3 h-3" />
                      Join Bot to Meeting
                    </button>
                    <button onClick={loadSample} className="text-[9px] font-bold uppercase tracking-widest text-black/40 hover:text-black">Sample</button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-black/40 mt-2">
                  <FileText className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Transcript Section</span>
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
                ) : inputMode === 'live' ? (
                  <div className="space-y-4">
                    {/* Voice Profiles Section */}
                    <div className="bg-black/5 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-black/40">
                          <Users className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Voice Profiles</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className="flex flex-col items-end mr-1">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-black/40 group-hover:text-black transition-colors">Auto-Detect</span>
                            <span className="text-[6px] font-bold uppercase tracking-widest text-emerald-500/60">Voice Tone AI</span>
                          </div>
                          <div 
                            onClick={() => setIsAutoDiarizationEnabled(!isAutoDiarizationEnabled)}
                            className={cn(
                              "w-8 h-4.5 rounded-full transition-all relative",
                              isAutoDiarizationEnabled ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-black/10"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm",
                              isAutoDiarizationEnabled ? "left-4" : "left-0.5"
                            )} />
                          </div>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-black/30">Person 1</p>
                          <label className={cn(
                            "flex flex-col items-center justify-center p-2 border border-dashed rounded-xl cursor-pointer transition-all",
                            person1VoiceSample ? "border-emerald-200 bg-emerald-50/30" : "border-black/10 hover:bg-black/5"
                          )}>
                            <Volume2 className={cn("w-3 h-3 mb-1", person1VoiceSample ? "text-emerald-500" : "text-black/20")} />
                            <span className="text-[7px] font-bold uppercase tracking-widest text-black/40">
                              {person1VoiceSample ? "Sample Loaded" : "Upload Voice"}
                            </span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="audio/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => setPerson1VoiceSample(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-black/30">Person 2</p>
                          <label className={cn(
                            "flex flex-col items-center justify-center p-2 border border-dashed rounded-xl cursor-pointer transition-all",
                            person2VoiceSample ? "border-emerald-200 bg-emerald-50/30" : "border-black/10 hover:bg-black/5"
                          )}>
                            <Volume2 className={cn("w-3 h-3 mb-1", person2VoiceSample ? "text-emerald-500" : "text-black/20")} />
                            <span className="text-[7px] font-bold uppercase tracking-widest text-black/40">
                              {person2VoiceSample ? "Sample Loaded" : "Upload Voice"}
                            </span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="audio/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => setPerson2VoiceSample(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "space-y-2 p-2 rounded-2xl transition-all border border-transparent",
                      activeSpeaker === 1 && isRecording && "bg-red-50/50 border-red-100 shadow-sm"
                    )}>
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-black/40">Person 1 (Customer)</label>
                        {isRecording && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-full border border-red-100">
                            <div className="flex gap-0.5">
                              <div className="w-0.5 h-2 bg-red-400 animate-[bounce_1s_infinite_0ms]" />
                              <div className="w-0.5 h-3 bg-red-500 animate-[bounce_1s_infinite_200ms]" />
                              <div className="w-0.5 h-2 bg-red-400 animate-[bounce_1s_infinite_400ms]" />
                            </div>
                            <span className="text-[7px] font-black text-red-600 uppercase tracking-widest">Analyzing Tone</span>
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
                ) : inputMode === 'bot' ? (
                  <div className="space-y-4">
                    <div className={cn(
                      "relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center gap-6",
                      recallBotId ? "border-emerald-200 bg-emerald-50/30" : "border-black/5 bg-white hover:border-black/10"
                    )}>
                      {isSpikedLoading ? (
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-10 h-10 animate-spin text-red-600" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 animate-pulse">Bot is Joining Meeting...</p>
                        </div>
                      ) : recallBotId ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Activity className="w-8 h-8 text-emerald-600" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Bot Active in Meeting</p>
                            <p className="text-[9px] text-emerald-600/60 font-bold uppercase tracking-widest">Capturing Live Intelligence</p>
                          </div>
                          <button 
                            onClick={() => {
                              setRecallBotId(null);
                              setSpikedConnectionStatus('idle');
                              setSpikedTranscript([]);
                            }}
                            className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline underline-offset-8"
                          >
                            Stop Bot and Clear
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10 rotate-3">
                            <Target className="w-8 h-8 text-white" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-[12px] font-black uppercase tracking-[0.1em]">Join Bot to Meeting</h3>
                            <p className="text-[10px] text-black/40 font-medium max-w-[200px] mx-auto leading-relaxed">
                              Deploy Spiked AI Cloud to your meeting for real-time transcription and analysis.
                            </p>
                          </div>
                          <div className="space-y-4 w-full max-w-sm mx-auto">
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-black/40 block text-left ml-1">Meeting URL (Google Meet, Zoom, Teams)</label>
                              <input 
                                type="text"
                                value={recallMeetingUrl}
                                onChange={(e) => setRecallMeetingUrl(e.target.value)}
                                placeholder="https://meet.google.com/abc-defg-hij"
                                className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-black/5 transition-all shadow-sm"
                              />
                            </div>
                            
                            <div className="flex flex-col items-center gap-4">
                              <button 
                                onClick={loadSpikedTranscript}
                                disabled={!recallMeetingUrl || spikedConnectionStatus === 'connecting'}
                                className="w-full bg-black text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black/90 transition-all shadow-xl shadow-black/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Join Bot to Meeting
                              </button>
                              {spikedConnectionStatus !== 'idle' && (
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    spikedConnectionStatus === 'connecting' && "bg-amber-400 animate-pulse",
                                    spikedConnectionStatus === 'connected' && "bg-emerald-500",
                                    spikedConnectionStatus === 'error' && "bg-red-500"
                                  )} />
                                  <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-widest",
                                    spikedConnectionStatus === 'connecting' && "text-amber-600",
                                    spikedConnectionStatus === 'connected' && "text-emerald-600",
                                    spikedConnectionStatus === 'error' && "text-red-600"
                                  )}>
                                    {spikedConnectionStatus === 'connecting' && "Connecting..."}
                                    {spikedConnectionStatus === 'connected' && "Spiked AI Cloud bot has joined the meeting."}
                                    {spikedConnectionStatus === 'error' && "Bot failed to join the meeting."}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {spikedTranscript.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black/40">Synchronized Transcript</label>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                            <Activity className="w-2 h-2" /> Live Link Active
                          </span>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {groupTranscriptBySpeaker(spikedTranscript).map((group) => (
                            <div key={group.id} className="flex items-start gap-3 p-4 bg-white border border-black/5 rounded-2xl shadow-sm group relative">
                              <div className="flex items-center gap-3 shrink-0">
                                <input 
                                  type="checkbox"
                                  checked={group.selected}
                                  onChange={() => toggleSegmentSelection(group.segmentIds)}
                                  className="w-3.5 h-3.5 rounded border-black/10 text-red-600 focus:ring-red-500/20 transition-all cursor-pointer"
                                />
                                <div className="w-8 h-8 bg-black/5 rounded-full flex items-center justify-center">
                                  <span className="text-[10px] font-black">{group.speaker?.charAt(0) || '?'}</span>
                                </div>
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-black uppercase tracking-tight text-black/40">{group.speaker || 'Unknown'}</p>
                                  <select 
                                    value={group.role}
                                    onChange={(e) => updateSpeakerRole(group.speaker || 'Unknown', e.target.value as 'User' | 'Client')}
                                    className="text-[8px] font-bold uppercase tracking-widest bg-black/5 border-none rounded-md px-2 py-1 focus:ring-0 cursor-pointer hover:bg-black/10 transition-all"
                                  >
                                    <option value="User">User</option>
                                    <option value="Client">Client</option>
                                  </select>
                                </div>
                                <p className="text-[11px] text-black/70 leading-relaxed">{group.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={cn(
                      "relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center gap-6",
                      spikedTranscript.length > 0 ? "border-emerald-200 bg-emerald-50/30" : "border-black/5 bg-white hover:border-black/10"
                    )}>
                      {isSpikedLoading ? (
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-10 h-10 animate-spin text-red-600" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 animate-pulse">Establishing Secure Connection...</p>
                        </div>
                      ) : spikedTranscript.length > 0 ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                            <FileCheck className="w-8 h-8 text-emerald-600" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Spiked Intelligence Connected</p>
                            <p className="text-[9px] text-emerald-600/60 font-bold uppercase tracking-widest">{spikedTranscript.length} Segments Synchronized</p>
                          </div>
                          <button 
                            onClick={() => {
                              setSpikedTranscript([]);
                              setRecallBotId(null);
                              setSpikedConnectionStatus('idle');
                            }}
                            className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline underline-offset-8"
                          >
                            Disconnect and Clear
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/20 rotate-3">
                            <span className="text-white font-black text-3xl">!</span>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-[12px] font-black uppercase tracking-[0.1em]">Connect with Spiked</h3>
                            <p className="text-[10px] text-black/40 font-medium max-w-[200px] mx-auto leading-relaxed">
                              Securely bridge your meeting intelligence and transfer transcripts for cognitive analysis.
                            </p>
                          </div>
                          <div className="p-6 bg-black/5 rounded-2xl border border-black/5">
                            <p className="text-[10px] text-black/60 font-medium leading-relaxed">
                              Use the <span className="font-black text-red-600">"Join Bot to Meeting"</span> button above to deploy a new bot, or connect to an existing session.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    {spikedTranscript.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-black/40">Synchronized Transcript</label>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                            <Activity className="w-2 h-2" /> Live Link Active
                          </span>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {groupTranscriptBySpeaker(spikedTranscript).map((group) => (
                            <div key={group.id} className="flex items-start gap-3 p-4 bg-white border border-black/5 rounded-2xl shadow-sm group relative">
                              <div className="flex items-center gap-3 shrink-0">
                                <input 
                                  type="checkbox"
                                  checked={group.selected}
                                  onChange={() => toggleSegmentSelection(group.segmentIds)}
                                  className="w-3.5 h-3.5 rounded border-black/10 text-red-600 focus:ring-red-500/20 transition-all cursor-pointer"
                                />
                                <div className="w-8 h-8 bg-black/5 rounded-full flex items-center justify-center">
                                  <span className="text-[10px] font-black">{group.speaker?.charAt(0) || '?'}</span>
                                </div>
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-black uppercase tracking-tight text-black/40">{group.speaker || 'Unknown'}</p>
                                  <select 
                                    value={group.role}
                                    onChange={(e) => updateSpeakerRole(group.speaker || 'Unknown', e.target.value as 'User' | 'Client')}
                                    className="text-[8px] font-bold uppercase tracking-widest bg-black/5 border-none rounded-md px-2 py-1 focus:ring-0 cursor-pointer hover:bg-black/10 transition-all"
                                  >
                                    <option value="User">User</option>
                                    <option value="Client">Client</option>
                                  </select>
                                </div>
                                <p className="text-[11px] text-black/70 leading-relaxed">{group.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className="max-w-xl mx-auto pt-8">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || isOcrLoading || (inputMode === 'paste' ? !transcript.trim() : inputMode === 'spiked' ? spikedTranscript.length === 0 : (!livePerson1.trim() && !livePerson2.trim()))}
                className={cn(
                  "w-full flex items-center justify-center gap-3 px-8 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-2xl",
                  isAnalyzing ? "bg-black/10 text-black/40 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-red-600/20"
                )}
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isAnalyzing ? "Analyzing..." : "Generate Strategy"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Step 2 Left: History (col-span-3) */}
            <div className="col-span-12 lg:col-span-3 space-y-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-black/40">
                  <History className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">History</span>
                </div>
              </div>

              <div className="bg-white border border-black/5 rounded-3xl p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar shadow-sm">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <History className="w-8 h-8 text-black/5" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black/20">No history yet</p>
                  </div>
                ) : (
                  history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setResult(item.result);
                        setTranscript(item.transcript);
                      }}
                      className={cn(
                        "w-full text-left p-4 hover:bg-black/5 rounded-2xl transition-all border group",
                        result?.recommendation === item.result.recommendation ? "bg-black/5 border-black/10" : "border-transparent"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-mono text-black/40">{new Date(item.timestamp).toLocaleDateString()}</span>
                        <Trash2 
                          className="w-3 h-3 text-black/0 group-hover:text-red-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistory(prev => prev.filter(h => h.id !== item.id));
                          }}
                        />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-tight line-clamp-1">{item.result.recommendation}</p>
                      <p className="text-[9px] text-black/40 line-clamp-2 mt-1 font-medium">{item.transcript}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Step 2 Right: Result Section (col-span-9) */}
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
                    {/* Left Column: Sales Intelligence, Use Case, Client References (col-span-5) */}
                    <div className="col-span-12 lg:col-span-5 space-y-8">
                      {/* Sales Intelligence Section */}
                      <section className="bg-black text-white rounded-3xl p-8 shadow-xl space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-white/40">
                            <BrainCircuit className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Sales Intelligence (Spiked Engine)</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full">
                            <span className="text-[10px] font-black uppercase tracking-widest">Sentiment: {result?.sales_intelligence.sentiment_score}%</span>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-2">Sentiment Summary</p>
                            <p className="text-[11px] text-white/70 leading-relaxed italic">"{result?.sales_intelligence.sentiment_summary}"</p>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Buying Signals Detected</p>
                            <div className="space-y-2">
                              {result?.sales_intelligence.buying_signals.map((signal, i) => (
                                <div key={i} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-red-400">{signal.signal}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">{signal.confidence} Confidence</span>
                                  </div>
                                  <p className="text-[10px] text-white/60 leading-relaxed">"{signal.evidence}"</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">MEDPICC Analysis</p>
                            <div className="grid grid-cols-1 gap-2">
                              {Object.entries(result?.sales_intelligence.medpicc || {}).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                                  <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-black uppercase">{key.charAt(0)}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">{key.replace('_', ' ')}</p>
                                    <p className="text-[10px] text-white/80 leading-tight">{value}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>

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
      )}
        {/* Bot Join Modal */}
        {isBotModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border border-black/5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-xl shadow-black/10">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Join Bot to Meeting</h3>
                    <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">Spiked AI Cloud Deployment</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBotModalOpen(false)}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <Square className="w-4 h-4 text-black/20" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-black/40 block ml-1">Meeting URL (Zoom, Meet, Teams)</label>
                  <input 
                    type="text"
                    value={recallMeetingUrl}
                    onChange={(e) => setRecallMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    className="w-full bg-black/5 border border-transparent rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                    autoFocus
                  />
                </div>

                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3">
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-xs">!</span>
                  </div>
                  <p className="text-[10px] text-red-700/70 font-medium leading-relaxed">
                    Spiked AI Cloud will join as a participant to capture real-time intelligence. Ensure the host admits the bot.
                  </p>
                </div>

                <button 
                  onClick={() => {
                    setInputMode('bot');
                    setIsBotModalOpen(false);
                    loadSpikedTranscript();
                  }}
                  disabled={!recallMeetingUrl.trim()}
                  className="w-full bg-black text-white py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black/90 transition-all shadow-xl shadow-black/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Deploy Spiked Bot
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
      {/* Diagram Modal removed */}
    </div>
  );
}
