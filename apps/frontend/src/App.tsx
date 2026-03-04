import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, FastForward, Terminal, AlertCircle } from 'lucide-react';
import { createApiClient, type SessionStepResponse } from './lib/api-client';
import {
  INTERACTION_MESSAGES,
  localizeBilingualMessage,
  localizeMessage
} from '../../../src/interaction/messages';

// --- Types & Contracts ---
type Language = 'en' | 'zh';
type ReasonCode = 'RULE_CONFLICT' | 'MISSING_PREREQ' | 'OUT_OF_SCOPE_ACTION' | 'SAFETY_BLOCKED';
type SystemErrorCode = 'JUDGE_SCHEMA_INVALID' | 'JUDGE_LOW_CONFIDENCE' | 'JUDGE_CALL_FAILED' | 'NARRATE_SCHEMA_INVALID' | 'NARRATE_CALL_FAILED';

interface TurnState extends Record<string, unknown> {
  approved_interaction_history: any[];
  conversation_context: any[];
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

type DebugReplRender = Extract<SessionStepResponse, { kind: 'system_ack' | 'onboarding_ack' | 'turn_result' }>;

const apiClient = createApiClient();

function toTurnState(state: Record<string, unknown>): TurnState {
  const approved = Array.isArray(state.approved_interaction_history)
    ? state.approved_interaction_history
    : [];
  const conversation = Array.isArray(state.conversation_context)
    ? state.conversation_context
    : [];

  return {
    ...state,
    approved_interaction_history: approved,
    conversation_context: conversation
  };
}

function readOnboarding(state: Record<string, unknown>) {
  const raw = state.onboarding;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }

  const data = raw as Record<string, unknown>;
  const completed = data.completed === true;
  const step = data.step === 'world_background' ? 'world_background' : 'role_profile';
  return { completed, step } as const;
}

function isOnboardingComplete(state: Record<string, unknown>) {
  return readOnboarding(state)?.completed === true;
}

function getOnboardingPromptByLang(state: Record<string, unknown>, lang: Language): string {
  const onboarding = readOnboarding(state);
  if (onboarding?.step === 'world_background') {
    return localizeMessage(INTERACTION_MESSAGES.onboarding_prompt_world_background, lang);
  }
  return localizeMessage(INTERACTION_MESSAGES.onboarding_prompt_role, lang);
}

function getAckTextByLang(input: {
  kind: 'system_ack' | 'onboarding_ack';
  text: string;
  lang: Language;
}): string {
  return localizeBilingualMessage(input.text, input.lang) ?? input.text;
}

// --- Dictionary ---
const DICT = {
  en: {
    explore: 'Explore World',
    developer: 'Developer Mode',
    welcome_explore: 'Welcome to Magic Brush.',
    welcome_dev: 'Welcome to Magic Brush Runtime.',
    judging: 'Judging...',
    system_error: 'System Error',
    action_rejected: 'Action Rejected',
    debug_json: 'Debug JSON',
    title_dev: 'Magic Brush Runtime',
    subtitle_dev: 'Rule-based Interactive Narrative Engine',
  },
  zh: {
    explore: '探索世界',
    developer: '开发者模式',
    welcome_explore: '欢迎来到 Magic Brush。',
    welcome_dev: '欢迎来到 Magic Brush Runtime。',
    judging: '判定中...',
    system_error: '系统异常',
    action_rejected: '行动被拒',
    debug_json: '调试 JSON',
    title_dev: 'Magic Brush Runtime',
    subtitle_dev: '规则判定驱动的互动叙事引擎',
  }
};

// --- Config ---
const TYPEWRITER_CONFIG = {
  speed: 50, // ms per char
  pausePunctuation: 400, // ms pause at punctuation
  blinkRate: 530
};

function isTypewriterEnabled() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function buildTypewriterConfig(overrides?: Partial<typeof TYPEWRITER_CONFIG>) {
  return {
    ...TYPEWRITER_CONFIG,
    ...overrides,
    enabled: isTypewriterEnabled()
  };
}

// --- Hooks ---
function useTypewriter(text: string, config: ReturnType<typeof buildTypewriterConfig>) {
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
  const typewriterConfig = useMemo(() => buildTypewriterConfig(), []);
  const { displayedText, isTyping, isPaused, pause, resume, replay, skip } = useTypewriter(turn.narration_text || '', typewriterConfig);
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
  const introTypewriterConfig = useMemo(() => buildTypewriterConfig({ speed: 100 }), []);
  const { displayedText, isTyping } = useTypewriter('Magic Brush', introTypewriterConfig);
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
  const [currentReplRender, setCurrentReplRender] = useState<DebugReplRender | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debugEnabled = mode === 'developer';

  const inputRef = useRef<HTMLInputElement>(null);

  const handleTypingComplete = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    document.title = 'Magic Brush';
  }, []);

  const handleStart = (selectedMode: 'explore' | 'developer') => {
    setMode(selectedMode);
    setAppState('playing');
    const initialState = toTurnState({});
    setCurrentTurn({
      narration_text: selectedMode === 'explore' ? DICT[lang].welcome_explore : DICT[lang].welcome_dev,
      reference: getOnboardingPromptByLang(initialState, lang),
      state: initialState
    });
    setCurrentReplRender(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const input = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.sessionStep({
        raw_input_text: input,
        state_snapshot: currentTurn?.state ?? {},
        debug: debugEnabled
      });

      if (currentTurn) {
        setHistory(prev => [...prev, { ...currentTurn, user_input: input }]);
      }

      if (response.kind === 'exit') {
        setAppState('intro');
        setHistory([]);
        setCurrentTurn(null);
        setCurrentReplRender(null);
        setInputValue('');
        setIsLoading(false);
        return;
      }

      if (response.kind === 'noop') {
        setIsLoading(false);
        return;
      }

      const nextState = toTurnState(response.next_state);
      if (response.kind === 'turn_result') {
        setCurrentTurn({
          narration_text: response.output.narration_text,
          reference: response.output.reference,
          state: nextState,
          reason_code: response.output.reason_code as ReasonCode | undefined,
          system_error_code: response.output.system_error_code as SystemErrorCode | undefined,
          debug: response.output.debug
        });
        setCurrentReplRender(response);
      } else {
        const message = getAckTextByLang({
          kind: response.kind,
          text: response.text,
          lang
        });
        const nextPrompt = isOnboardingComplete(nextState) ? '' : getOnboardingPromptByLang(nextState, lang);
        setCurrentTurn({
          narration_text: message,
          reference: nextPrompt,
          state: nextState
        });
        setCurrentReplRender(response);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCurrentTurn({
        narration_text: '',
        reference: lang === 'en' ? `Request failed: ${message}` : `请求失败：${message}`,
        state:
          currentTurn?.state ?? toTurnState({}),
        system_error_code: 'JUDGE_CALL_FAILED'
      });
      setCurrentReplRender(null);
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
          <div className="p-6 flex-1">
            <h2 className="font-semibold tracking-widest uppercase text-[10px] text-ink-light mb-4 flex items-center gap-2">
              <Terminal size={12} />
              {DICT[lang].debug_json}
            </h2>
            <pre className="bg-white/40 p-4 rounded-sm text-xs overflow-x-auto border border-border/50 text-ink-light leading-relaxed">
              {currentReplRender ? JSON.stringify(currentReplRender, null, 2) : ''}
            </pre>
          </div>
        </aside>
      )}
    </div>
  );
}
