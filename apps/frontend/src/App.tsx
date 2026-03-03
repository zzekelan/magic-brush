import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, FastForward, Terminal, BookOpen, AlertCircle, Info } from 'lucide-react';
import { createApiClient } from './lib/api-client';

// --- Types & Contracts ---
type Language = 'en' | 'zh';
type ReasonCode = 'RULE_CONFLICT' | 'MISSING_PREREQ' | 'OUT_OF_SCOPE_ACTION' | 'SAFETY_BLOCKED';
type SystemErrorCode = 'JUDGE_SCHEMA_INVALID' | 'JUDGE_LOW_CONFIDENCE' | 'JUDGE_CALL_FAILED' | 'NARRATE_SCHEMA_INVALID' | 'NARRATE_CALL_FAILED';

interface TurnState {
  approved_interaction_history: any[];
  conversation_context: any[];
  world_state?: any;
}

interface TurnResponse {
  narration_text: string;
  reference: string;
  state: TurnState;
  reason_code?: ReasonCode;
  system_error_code?: SystemErrorCode;
  debug?: any;
  user_input?: string;
}

const apiClient = createApiClient();

function toTurnState(state: Record<string, unknown>): TurnState {
  const approved = Array.isArray(state.approved_interaction_history)
    ? state.approved_interaction_history
    : [];
  const conversation = Array.isArray(state.conversation_context)
    ? state.conversation_context
    : [];
  const world = state.world_state;

  return {
    approved_interaction_history: approved,
    conversation_context: conversation,
    world_state: world
  };
}

// --- Dictionary ---
const DICT = {
  en: {
    explore: 'Explore World',
    developer: 'Developer Mode',
    welcome_explore: 'Welcome to Magic Brush.',
    welcome_dev: 'Welcome to Magic Brush Runtime.',
    prompt_role: 'Please enter your character setting (e.g., a wandering swordsman)',
    judging: 'Judging...',
    system_error: 'System Error',
    action_rejected: 'Action Rejected',
    state_memory: 'State Memory',
    world_state: 'World State',
    conversation_context: 'Conversation Context',
    approved_history: 'Approved History',
    debug_info: 'Debug Info',
    contract_fields: 'Contract Fields',
    no_records: 'No records',
    records_count: (c: number) => `${c} valid interactions recorded`,
    title_dev: 'Magic Brush Runtime',
    subtitle_dev: 'Rule-based Interactive Narrative Engine',
  },
  zh: {
    explore: '探索世界',
    developer: '开发者模式',
    welcome_explore: '欢迎来到 Magic Brush。',
    welcome_dev: '欢迎来到 Magic Brush Runtime。',
    prompt_role: '请输入你的角色设定（例如：一名流浪的剑客）',
    judging: '判定中...',
    system_error: '系统异常',
    action_rejected: '行动被拒',
    state_memory: '状态记忆',
    world_state: '世界状态',
    conversation_context: '对话上下文',
    approved_history: '有效互动历史',
    debug_info: '调试信息',
    contract_fields: '契约字段',
    no_records: '暂无记录',
    records_count: (c: number) => `已记录 ${c} 条有效互动`,
    title_dev: 'Magic Brush Runtime',
    subtitle_dev: '规则判定驱动的互动叙事引擎',
  }
};

// --- Config ---
const CONFIG = {
  typewriter: {
    speed: 50, // ms per char
    pausePunctuation: 400, // ms pause at punctuation
    blinkRate: 530,
    enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },
  debugMode: false
};

// --- Hooks ---
function useTypewriter(text: string, config: typeof CONFIG.typewriter) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }
    if (!config.enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }
    setDisplayedText('');
    indexRef.current = 0;
    setIsTyping(true);
    setIsPaused(false);
  }, [text, config.enabled]);

  const typeNext = useCallback(() => {
    if (isPaused || !isTyping) return;

    if (indexRef.current < text.length) {
      const char = text.charAt(indexRef.current);
      setDisplayedText((prev) => prev + char);
      indexRef.current += 1;

      let delay = config.speed;
      if (/[。！？，、\n.!,?]/.test(char)) {
        delay += config.pausePunctuation;
      }

      timerRef.current = setTimeout(typeNext, delay);
    } else {
      setIsTyping(false);
    }
  }, [text, isPaused, isTyping, config]);

  useEffect(() => {
    if (isTyping && !isPaused) {
      timerRef.current = setTimeout(typeNext, config.speed);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTyping, isPaused, typeNext, config.speed]);

  useEffect(() => {
    start();
  }, [start]);

  const pause = () => setIsPaused(true);
  const resume = () => setIsPaused(false);
  const replay = () => start();
  const skip = () => {
    setDisplayedText(text);
    setIsTyping(false);
    setIsPaused(false);
    indexRef.current = text.length;
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return { displayedText, isTyping, isPaused, pause, resume, replay, skip };
}

// --- Components ---
function CurrentTurnDisplay({ turn, isLoading, lang, onTypingComplete }: { turn: TurnResponse, isLoading: boolean, lang: Language, onTypingComplete?: () => void }) {
  const { displayedText, isTyping, isPaused, pause, resume, replay, skip } = useTypewriter(turn.narration_text || '', CONFIG.typewriter);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const behavior = displayedText.length <= 1 ? 'smooth' : 'auto';
      containerRef.current.scrollIntoView({ behavior, block: 'center' });
    }
  }, [displayedText]);

  useEffect(() => {
    if (turn.system_error_code) {
      if (onTypingComplete) {
        const timer = setTimeout(() => onTypingComplete(), 500);
        return () => clearTimeout(timer);
      }
    } else {
      if (!isTyping && onTypingComplete) {
        const timer = setTimeout(() => onTypingComplete(), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isTyping, turn.system_error_code, onTypingComplete]);

  if (turn.system_error_code) {
    return (
      <div ref={containerRef} className="animate-fade-in py-2 my-8 text-center w-full">
        <div className="text-error font-sans text-sm flex items-center justify-center gap-2 mb-1">
          <AlertCircle size={16} />
          {DICT[lang].system_error}: {turn.system_error_code}
        </div>
        <div className="text-ink-light text-sm font-sans">{turn.reference}</div>
      </div>
    );
  }

  if (turn.reason_code) {
    return (
      <div ref={containerRef} className="animate-fade-in py-2 my-8 text-center w-full">
        <div className="text-error/80 font-sans text-sm flex items-center justify-center gap-2 mb-3">
          <AlertCircle size={16} />
          {DICT[lang].action_rejected}: {turn.reason_code}
        </div>
        <p className="text-xl leading-loose tracking-wide mb-4 text-ink">
          {displayedText}
          {isTyping && <span className="cursor-blink opacity-40 font-sans font-light ml-1">|</span>}
        </p>
        {!isTyping && <div className="text-ink-light text-sm font-sans transition-opacity duration-700 opacity-100">{turn.reference}</div>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="animate-fade-in my-8 text-center w-full">
      <div className="relative group inline-block w-full">
        <p className="text-2xl md:text-3xl leading-[1.8] tracking-wide min-h-[3em] text-ink">
          {displayedText}
          {isTyping && <span className="cursor-blink opacity-40 font-sans font-light ml-1">|</span>}
        </p>
        
        {/* Controls */}
        {turn.narration_text && (
          <div className={`absolute right-0 md:-right-12 top-2 flex flex-col gap-2 transition-opacity duration-300 ${isTyping ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
            {isTyping ? (
              <>
                {isPaused ? (
                  <button onClick={resume} className="p-1.5 text-ink-light hover:text-ink bg-paper border border-border rounded shadow-sm"><Play size={14} /></button>
                ) : (
                  <button onClick={pause} className="p-1.5 text-ink-light hover:text-ink bg-paper border border-border rounded shadow-sm"><Pause size={14} /></button>
                )}
                <button onClick={skip} className="p-1.5 text-ink-light hover:text-ink bg-paper border border-border rounded shadow-sm"><FastForward size={14} /></button>
              </>
            ) : (
              <button onClick={replay} className="p-1.5 text-ink-light hover:text-ink bg-paper border border-border rounded shadow-sm opacity-0 group-hover:opacity-100"><RotateCcw size={14} /></button>
            )}
          </div>
        )}
      </div>

      {/* Reference */}
      <div className={`mt-12 text-sm font-sans text-ink-light transition-all duration-1000 transform ${!isTyping && !isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {turn.reference}
      </div>
    </div>
  );
}

function IntroScreen({ onComplete, lang, setLang }: { onComplete: (mode: 'explore' | 'developer') => void, lang: Language, setLang: (l: Language) => void }) {
  const { displayedText, isTyping } = useTypewriter('Magic Brush', { ...CONFIG.typewriter, speed: 100 });
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (!isTyping && displayedText === 'Magic Brush') {
      const timer = setTimeout(() => setShowOptions(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isTyping, displayedText]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-paper text-ink selection:bg-ink selection:text-paper animate-fade-in relative">
      {/* Language Toggle */}
      <div className="absolute top-8 right-8 md:right-12 flex gap-4 text-xs font-sans text-ink-light tracking-widest z-10">
        <button onClick={() => setLang('en')} className={`transition-colors ${lang === 'en' ? 'text-ink font-medium' : 'hover:text-ink'}`}>EN</button>
        <button onClick={() => setLang('zh')} className={`transition-colors ${lang === 'zh' ? 'text-ink font-medium' : 'hover:text-ink'}`}>中文</button>
      </div>

      <div className={`transition-all duration-1000 flex flex-col items-center ${showOptions ? '-translate-y-8' : ''}`}>
        <h1 className="text-4xl md:text-5xl font-serif tracking-widest mb-12 h-12">
          {displayedText}
          {isTyping && <span className="cursor-blink opacity-40 font-sans font-light ml-1">|</span>}
        </h1>
        
        <div className={`flex flex-col md:flex-row gap-6 transition-all duration-1000 ${showOptions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <button 
            onClick={() => onComplete('explore')}
            className="px-8 py-3 border border-ink/20 hover:border-ink hover:bg-ink hover:text-paper transition-all duration-300 font-serif tracking-widest text-sm"
          >
            {DICT[lang].explore}
          </button>
          <button 
            onClick={() => onComplete('developer')}
            className="px-8 py-3 border border-ink/20 hover:border-ink hover:bg-ink hover:text-paper transition-all duration-300 font-serif tracking-widest text-sm"
          >
            {DICT[lang].developer}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [appState, setAppState] = useState<'intro' | 'playing'>('intro');
  const [mode, setMode] = useState<'explore' | 'developer'>('explore');
  const [history, setHistory] = useState<TurnResponse[]>([]);
  const [currentTurn, setCurrentTurn] = useState<TurnResponse | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(CONFIG.debugMode);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTypingComplete = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleStart = (selectedMode: 'explore' | 'developer') => {
    setMode(selectedMode);
    setAppState('playing');
    setCurrentTurn({
      narration_text: selectedMode === 'explore' ? DICT[lang].welcome_explore : DICT[lang].welcome_dev,
      reference: DICT[lang].prompt_role,
      state: { approved_interaction_history: [], conversation_context: [] }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const input = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.turn({
        raw_input_text: input,
        state_snapshot: currentTurn?.state ?? {},
        debug: debugMode
      });

      if (currentTurn) {
        setHistory(prev => [...prev, { ...currentTurn, user_input: input }]);
      }

      setCurrentTurn({
        narration_text: response.narration_text,
        reference: response.reference,
        state: toTurnState(response.state),
        reason_code: response.reason_code as ReasonCode | undefined,
        system_error_code: response.system_error_code as SystemErrorCode | undefined,
        debug: response.debug
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCurrentTurn({
        narration_text: '',
        reference: lang === 'en' ? `Request failed: ${message}` : `请求失败：${message}`,
        state:
          currentTurn?.state ?? { approved_interaction_history: [], conversation_context: [] },
        system_error_code: 'JUDGE_CALL_FAILED'
      });
    }

    setIsLoading(false);
  };

  if (appState === 'intro') {
    return <IntroScreen onComplete={handleStart} lang={lang} setLang={setLang} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row selection:bg-ink selection:text-paper animate-fade-in">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full h-screen overflow-hidden relative">
        {/* Hero - Absolute positioned so it doesn't affect centering */}
        {mode === 'developer' && (
          <div className="absolute top-12 left-0 w-full flex justify-center pointer-events-none z-10">
            <div className="w-full max-w-5xl px-6 md:px-12">
              <header className="animate-fade-in">
                <h1 className="text-xl font-serif font-semibold tracking-widest mb-3 text-ink">{DICT[lang].title_dev}</h1>
                <p className="text-xs font-sans text-ink-light tracking-[0.2em] uppercase">{DICT[lang].subtitle_dev}</p>
              </header>
            </div>
          </div>
        )}

        {/* Narrative Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth w-full" id="narrative-container">
          <div className={`mx-auto w-full px-6 md:px-12 ${mode === 'explore' ? 'max-w-4xl' : 'max-w-5xl'}`}>
            {/* pt and pb ensure the content can always be scrolled to the center */}
            <div className="pt-[40vh] pb-[50vh] flex flex-col items-center w-full">
            {/* History */}
            <div className="space-y-16 mb-16 w-full max-w-2xl mx-auto">
              {history.map((turn, idx) => (
                <div key={idx} className="opacity-30 transition-opacity duration-500 hover:opacity-80 text-center w-full">
                  {turn.system_error_code ? (
                    <div className="text-error text-sm font-sans flex items-center justify-center gap-2">
                      <AlertCircle size={14} />
                      {DICT[lang].system_error}: {turn.system_error_code}
                    </div>
                  ) : turn.reason_code ? (
                    <div className="text-error/80 text-sm font-sans flex items-center justify-center gap-2">
                      <AlertCircle size={14} />
                      {DICT[lang].action_rejected}: {turn.reason_code}
                      <span className="ml-2 text-ink-light">{turn.narration_text}</span>
                    </div>
                  ) : (
                    <p className="text-lg leading-loose tracking-wide">{turn.narration_text}</p>
                  )}
                  
                  {turn.user_input && (
                    <div className="mt-10 mb-2 flex items-center justify-center gap-4 w-full opacity-80">
                      <div className="h-[1px] w-12 bg-ink-faint/40"></div>
                      <span className="text-sm font-sans tracking-widest text-ink-light italic">
                        {turn.user_input}
                      </span>
                      <div className="h-[1px] w-12 bg-ink-faint/40"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Current Turn */}
            <div className="w-full max-w-2xl mx-auto">
              {currentTurn && (
                <CurrentTurnDisplay turn={currentTurn} isLoading={isLoading} lang={lang} onTypingComplete={handleTypingComplete} />
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-paper via-paper to-transparent pt-24 pb-12 px-6 md:px-12 shrink-0 pointer-events-none">
          <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto pointer-events-auto">
            <div className="flex items-center pb-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="w-full bg-transparent outline-none font-serif text-xl disabled:opacity-50 text-center"
                autoFocus
                autoComplete="off"
              />
            </div>
            {isLoading && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-sans text-ink-light animate-pulse tracking-widest">
                {DICT[lang].judging}
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Sidebar */}
      {mode === 'developer' && (
        <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-paper/30 h-screen overflow-y-auto flex flex-col font-sans text-sm shrink-0 relative z-10">
          {/* State Panel */}
          <div className="p-6 flex-1">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-semibold tracking-widest uppercase text-[10px] text-ink-light flex items-center gap-2">
                <BookOpen size={12} />
                {DICT[lang].state_memory}
              </h2>
              <button 
                onClick={() => setDebugMode(!debugMode)}
                className={`p-1.5 rounded transition-colors ${debugMode ? 'bg-ink text-paper' : 'text-ink-light hover:bg-border'}`}
                title="Toggle Debug Mode"
              >
                <Terminal size={12} />
              </button>
            </div>

            {currentTurn?.state && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-[10px] text-ink-faint mb-3 uppercase tracking-widest">{DICT[lang].world_state}</h3>
                  <pre className="bg-white/40 p-4 rounded-sm text-xs overflow-x-auto border border-border/50 text-ink-light leading-relaxed">
                    {JSON.stringify(currentTurn.state.world_state, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-[10px] text-ink-faint mb-3 uppercase tracking-widest">{DICT[lang].conversation_context} ({currentTurn.state.conversation_context.length}/2)</h3>
                  <div className="space-y-2">
                    {currentTurn.state.conversation_context.map((ctx, i) => (
                      <div key={i} className="bg-white/40 p-3 rounded-sm text-xs border border-border/50 truncate text-ink-light">
                        <span className="text-ink-faint mr-2">[{ctx.reason_code || 'OK'}]</span>
                        {ctx.input}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] text-ink-faint mb-3 uppercase tracking-widest">{DICT[lang].approved_history} ({currentTurn.state.approved_interaction_history.length}/50)</h3>
                  <div className="text-xs text-ink-light bg-white/40 p-3 rounded-sm border border-border/50">
                    {currentTurn.state.approved_interaction_history.length === 0 ? DICT[lang].no_records : DICT[lang].records_count(currentTurn.state.approved_interaction_history.length)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Debug Drawer */}
          {debugMode && currentTurn?.debug && (
            <div className="p-6 border-t border-border bg-white/40 animate-fade-in">
              <h2 className="font-semibold tracking-widest uppercase text-[10px] text-ink-light mb-4 flex items-center gap-2">
                <Terminal size={12} />
                {DICT[lang].debug_info}
              </h2>
              <pre className="text-[10px] overflow-x-auto text-ink-light leading-relaxed">
                {JSON.stringify(currentTurn.debug, null, 2)}
              </pre>
            </div>
          )}

          {/* Contract Card */}
          <div className="p-6 border-t border-border bg-ink text-paper">
            <h2 className="font-semibold tracking-widest uppercase text-[10px] mb-4 flex items-center gap-2 opacity-80">
              <Info size={12} />
              {DICT[lang].contract_fields}
            </h2>
            <ul className="text-xs space-y-3 opacity-70 leading-relaxed">
              <li><span className="font-mono text-white/90">narration_text</span><br/>主叙事文本</li>
              <li><span className="font-mono text-white/90">reference</span><br/>下一步引导</li>
              <li><span className="font-mono text-white/90">state</span><br/>状态对象</li>
              <li><span className="font-mono text-white/90">reason_code</span><br/>拒绝原因</li>
              <li><span className="font-mono text-white/90">system_error_code</span><br/>系统错误</li>
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
