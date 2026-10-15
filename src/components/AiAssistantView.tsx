import React, { useState, useRef } from 'react';
import { 
  Bot, 
  Send, 
  FileText, 
  ListOrdered, 
  HelpCircle, 
  Calendar, 
  Languages, 
  BookOpen, 
  MessageSquare, 
  Sparkles, 
  User, 
  Copy, 
  Check, 
  FileCheck
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  tags?: string[];
}

export const AiAssistantView: React.FC = () => {
  const [activeAiTool, setActiveAiTool] = useState<string>('chat');
  const [uploadedDocName, setUploadedDocName] = useState<string>('Project_Proposal_DeepLogic.pdf');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: "Hello! I am Paperly AI by DeepLogic. I've analyzed your document: **Project Proposal (DeepLogic)**. You can ask me anything about the timeline, deliverables, budget, or request summaries and translations.",
      timestamp: '12:00 PM',
    },
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aiTools = [
    { id: 'chat', label: 'Chat with PDF', icon: MessageSquare },
    { id: 'summarize', label: 'Summarize', icon: FileText },
    { id: 'questions', label: 'Ask Questions', icon: HelpCircle },
    { id: 'extract', label: 'Extract Information', icon: Calendar },
    { id: 'translate', label: 'Translate', icon: Languages },
    { id: 'explain', label: 'Explain', icon: Sparkles },
    { id: 'notes', label: 'Generate Notes', icon: BookOpen },
  ];

  const quickActions = [
    {
      id: 'summarize',
      label: 'Summarize the document',
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-900/60 hover:border-blue-400',
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
      prompt: 'Please provide a comprehensive executive summary of this project proposal.',
      response: `### Executive Summary: Project Proposal (DeepLogic)

• **Client:** Acme Corporation
• **Date:** March 20, 2024
• **Core Purpose:** Building smarter solutions for a brighter tomorrow by delivering scalable technological infrastructure and digital acceleration.

**Key Highlights:**
1. **Strategic Approach:** phased implementation focusing on innovation, reliability, and human-centric design.
2. **Key Deliverables:** System architecture, responsive portal, analytics dashboard, and automated workflows.
3. **Value Proposition:** Significant operational efficiency improvement and privacy-preserving data handling.`
    },
    {
      id: 'key-points',
      label: 'List key points',
      icon: ListOrdered,
      color: 'text-indigo-600 dark:text-indigo-400',
      borderColor: 'border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400',
      bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/20',
      prompt: 'List the key points and milestones from this document.',
      response: `### Key Points & Milestones:

- **Phase 1: Discovery & Architecture (Weeks 1-3)**
  Requirements alignment, UI/UX wireframes, technical blueprint.
- **Phase 2: Core Engineering & Prototyping (Weeks 4-8)**
  Client-side PDF toolkits, conversion pipelines, real-time reactive canvas.
- **Phase 3: Security & Verification (Weeks 9-10)**
  Privacy audit, penetration tests, zero-storage local sandbox validation.
- **Phase 4: Launch & Knowledge Transfer (Weeks 11-12)**
  Deployment, documentation, team training.`
    },
    {
      id: 'explain',
      label: 'Explain this section',
      icon: Sparkles,
      color: 'text-rose-600 dark:text-rose-400',
      borderColor: 'border-rose-200 dark:border-rose-900/60 hover:border-rose-400',
      bgColor: 'bg-rose-50/50 dark:bg-rose-950/20',
      prompt: 'Explain the commitment to innovation and security mentioned in the proposal.',
      response: `### Explanation:

DeepLogic emphasizes a **zero-trust, privacy-first paradigm** in Paperly. Unlike traditional cloud PDF tools that upload sensitive files to remote servers, all PDF transformations (text editing, OCR, signature injection, page merging) execute strictly inside the client's web browser sandbox. This guarantees compliance with GDPR, HIPAA, and internal corporate data protection mandates without compromising computational performance.`
    },
    {
      id: 'dates-numbers',
      label: 'Extract important dates and numbers',
      icon: Calendar,
      color: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-200 dark:border-amber-900/60 hover:border-amber-400',
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/20',
      prompt: 'Extract all important dates, deadlines, and numerical values.',
      response: `### Extracted Dates & Figures:

• **Document Date:** March 20, 2024
• **Target Implementation Window:** Q2 - Q3 2024
• **Number of Project Phases:** 4 major phases
• **Estimated Completion:** 12 calendar weeks
• **Data Privacy SLA:** 100% Client-side local processing`
    },
    {
      id: 'translate',
      label: 'Translate to Bangla',
      icon: Languages,
      color: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400',
      bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      prompt: 'Translate the main proposal overview into Bangla (বাংলা).',
      response: `### বাংলা অনুবাদ (Bangla Translation):

**প্রকল্প প্রস্তাবনা (ডিপলজিক)**
**একটি উজ্জ্বল আগামীর জন্য স্মার্ট সমাধান নির্মাণ**

এই প্রস্তাবনায় আসন্ন প্রকল্পের জন্য আমাদের কর্মপদ্ধতি, সময়সীমা এবং প্রধান ফলাফলগুলো তুলে ধরা হয়েছে। আমরা দৃঢ়ভাবে বিশ্বাস করি যে আমাদের প্রযুক্তিগত দক্ষতা এবং উদ্ভাবনী প্রতিশ্রুতি আপনার ব্যবসায় উল্লেখযোগ্য মূল্য যুক্ত করবে।

• **প্রস্তুত করা হয়েছে:** অ্যাকমি কর্পোরেশন (Acme Corporation)
• **তারিখ:** ২০ মার্চ, ২০২৪`
    },
    {
      id: 'notes',
      label: 'Create study notes',
      icon: BookOpen,
      color: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-900/60 hover:border-purple-400',
      bgColor: 'bg-purple-50/50 dark:bg-purple-950/20',
      prompt: 'Create structured study notes with review questions.',
      response: `### Structured Study & Review Notes:

**1. Primary Objectives:**
- Deliver end-to-end PDF processing with zero cloud data retention.
- Enhance productivity for enterprise document workflows.

**2. Key Takeaways:**
- Seamless offline-first browser architecture.
- Modular tool suite: Editor, Converter, Organizer, and Local AI Assistant.

**3. Review Questions:**
- *Q1: Why is browser-side processing superior for enterprise documents?*
- *Q2: What are the main deliverables scheduled for Acme Corporation in Phase 2?*`
    },
  ];

  const handleSend = (textToSend?: string, directResponse?: string) => {
    const text = textToSend || inputVal;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      let aiResponse = directResponse;
      if (!aiResponse) {
        aiResponse = `Based on your document **${uploadedDocName}**: \n\nI found that this relates to the project deliverables and timeline outlined on Page 1. The team is dedicated to delivering these milestones within the agreed-upon criteria with full local privacy guarantees.`;
      }

      const reply: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 700);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDocName(file.name);
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'ai',
          text: `Loaded **${file.name}** (${(file.size / 1024).toFixed(1)} KB). Document parsed locally in browser memory. What would you like to discover?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar Sub-nav */}
        <aside className="lg:col-span-3 space-y-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              AI Assistant
            </div>
            {aiTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeAiTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveAiTool(tool.id);
                    if (tool.id === 'summarize') handleSend('Summarize the document');
                    if (tool.id === 'notes') handleSend('Create study notes');
                    if (tool.id === 'translate') handleSend('Translate to Bangla');
                    if (tool.id === 'extract') handleSend('Extract dates and figures');
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* Document Status Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500">Active Document</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {uploadedDocName}
              </p>
            </div>
          </div>
        </aside>

        {/* Main AI Chat & Toolkit Area */}
        <main className="lg:col-span-9 flex flex-col space-y-5">
          
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Chat with your PDF
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Get summaries, key points, and answers from your document.
            </p>
          </div>

          {/* Dropzone for PDF */}
          <div className="border-2 border-dashed border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/15 rounded-2xl p-6 text-center transition-all hover:bg-blue-50/50">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".pdf" 
              className="hidden" 
              onChange={handleFileChange} 
            />
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-3 text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl shadow-sm text-xs transition-all mb-1.5"
              >
                Choose a PDF File
              </button>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                or drag and drop a PDF here
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Your file is processed locally in your browser. No file is uploaded or stored.
              </p>
            </div>
          </div>

          {/* Quick Action Prompt Cards (6 cards in matching pill grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleSend(action.prompt, action.response)}
                  className={`p-3 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-xs flex flex-col items-start justify-between min-h-[90px] ${action.bgColor} ${action.borderColor}`}
                >
                  <Icon className={`w-4 h-4 mb-2 ${action.color}`} />
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Chat History Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[420px] overflow-hidden">
            
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    }`}
                  >
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`relative group rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    
                    {/* Timestamp & Copy */}
                    <div className="flex items-center justify-between gap-3 mt-1.5 opacity-70 text-[10px]">
                      <span>{msg.timestamp}</span>
                      {msg.sender === 'ai' && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="hover:opacity-100 p-0.5"
                          title="Copy message"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                  <Bot className="w-4 h-4 text-blue-500 animate-spin" />
                  <span>Paperly AI is analyzing document...</span>
                </div>
              )}
            </div>

            {/* Bottom Input Bar */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
              >
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask a question about your PDF..."
                  className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-1"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isTyping}
                  className="p-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
};

export default AiAssistantView;
