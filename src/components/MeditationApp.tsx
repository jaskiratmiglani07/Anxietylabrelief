import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, VolumeX, Play, Pause, RotateCcw, 
  Sparkles, BookOpen, Heart, Share2, Compass, 
  X, ChevronRight, Check, Trash2, Info 
} from 'lucide-react';
import { ParticlesBackground } from './ParticlesBackground';
import { BreathingIndicator } from './BreathingIndicator';
import { generateReflection, type Reflection } from '../utils/reflectionGenerator';
import { audioSynth } from '../utils/audioSynth';

type Theme = 'cosmos' | 'aurora' | 'ocean' | 'forest' | 'minimal-dark';
type Soundscape = 'rain' | 'ocean' | 'forest' | 'space' | 'piano';
type ScreenState = 'landing' | 'meditating' | 'summary';

interface SavedSession {
  id: string;
  date: string;
  worry: string;
  reflection: string[];
}

export const MeditationApp: React.FC = () => {
  // App States
  const [screen, setScreen] = useState<ScreenState>('landing');
  const [theme, setTheme] = useState<Theme>('cosmos');
  const [soundscape, setSoundscape] = useState<Soundscape>('space');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Meditation States
  const [worryInput, setWorryInput] = useState('');
  const [activeWorry, setActiveWorry] = useState('');
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Reflecting...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Single Unified clock for perfect sync
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const SECONDS_PER_SENTENCE = 12; // Each sentence is aligned with one 12s breath cycle
  
  // Journal/History States
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isSavedThisSession, setIsSavedThisSession] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Ref for meditation interval
  const meditationIntervalRef = useRef<any>(null);

  // Apply Theme Attribute to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load Saved Sessions from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('mindfulness_journal');
    if (saved) {
      try {
        setSavedSessions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved sessions', e);
      }
    }
  }, []);

  // Sync Synthesizer Volume
  useEffect(() => {
    audioSynth.setVolume(isAudioMuted ? 0 : audioVolume);
  }, [audioVolume, isAudioMuted]);

  // Rotate loading messages smoothly
  useEffect(() => {
    if (!isLoading) return;
    const messages = [
      'Reflecting...',
      'Gathering perspective...',
      'Looking beyond the worry...',
      'Finding a wider view...',
      'Setting down the burden...',
      'Preparing the sanctuary...'
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const selectSoundscape = (sound: Soundscape) => {
    setSoundscape(sound);
    if (isAudioPlaying || screen === 'meditating') {
      audioSynth.start(sound);
      setIsAudioPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    setIsAudioMuted(!isAudioMuted);
  };

  // Start Meditation Session: Fetch from Groq API (fallback to local generator)
  const handleBegin = async () => {
    if (!worryInput.trim()) return;

    setIsLoading(true);
    setLoadingMessage('Reflecting...');
    setErrorMessage(null);
    setActiveWorry(worryInput);

    try {
      console.log('[MeditationApp] Fetching reflection from API for thought:', worryInput);
      const response = await fetch('/api/reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thought: worryInput }),
      });

      if (!response.ok) {
        throw new Error(`Server returned code ${response.status}`);
      }

      const data = await response.json();
      console.log('[MeditationApp] API Response received:', data);

      if (!data.quotes || !Array.isArray(data.quotes)) {
        throw new Error('Response is missing quotes array');
      }

      setReflection({ sentences: data.quotes });
      setSecondsElapsed(0);
      setIsSavedThisSession(false);
      
      // Start Audio automatically if not muted
      audioSynth.start(soundscape);
      setIsAudioPlaying(true);
      setIsAudioMuted(false);
      
      setScreen('meditating');
      setIsPaused(false);
    } catch (err: any) {
      console.error('[MeditationApp] Failed to fetch reflection:', err);
      // Fallback gracefully to offline template generator to NEVER crash
      console.log('[MeditationApp] Graceful frontend fallback to local reflection generator.');
      const localReflection = generateReflection(worryInput);
      setReflection(localReflection);
      setSecondsElapsed(0);
      setIsSavedThisSession(false);
      
      // Start audio
      audioSynth.start(soundscape);
      setIsAudioPlaying(true);
      setIsAudioMuted(false);
      
      setScreen('meditating');
      setIsPaused(false);
      
      // Show graceful notification toast
      setErrorMessage('Using offline path due to connection issue.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Meditation Cycle Runner (Clock ticks every 1 second)
  useEffect(() => {
    if (screen !== 'meditating' || isPaused || !reflection) return;

    const totalDuration = reflection.sentences.length * SECONDS_PER_SENTENCE; // 96 seconds for 8 sentences

    meditationIntervalRef.current = setInterval(() => {
      setSecondsElapsed((prev) => {
        const nextSeconds = prev + 1;
        
        // Modulate audio frequencies based on meditation stage
        audioSynth.updateStage(nextSeconds / totalDuration);

        if (nextSeconds >= totalDuration) {
          clearInterval(meditationIntervalRef.current);
          setTimeout(() => {
            setScreen('summary');
          }, 1000);
          return totalDuration;
        }

        return nextSeconds;
      });
    }, 1000);

    return () => {
      if (meditationIntervalRef.current) {
        clearInterval(meditationIntervalRef.current);
      }
    };
  }, [screen, isPaused, reflection]);

  // Derived states from unified clock
  const totalDuration = reflection ? reflection.sentences.length * SECONDS_PER_SENTENCE : 96;
  const progress = (secondsElapsed / totalDuration) * 100;
  
  const currentSentenceIndex = Math.min(
    reflection ? reflection.sentences.length - 1 : 0,
    Math.floor(secondsElapsed / SECONDS_PER_SENTENCE)
  );

  // Box Breathing cycle: 4s inhale, 2s hold-in, 4s exhale, 2s hold-out (12s total)
  const breathCycleSeconds = secondsElapsed % 12;
  let breathState: 'inhale' | 'hold-in' | 'exhale' | 'hold-out' = 'inhale';
  let secondsRemaining = 4;

  if (breathCycleSeconds < 4) {
    breathState = 'inhale';
    secondsRemaining = 4 - breathCycleSeconds;
  } else if (breathCycleSeconds < 6) {
    breathState = 'hold-in';
    secondsRemaining = 6 - breathCycleSeconds;
  } else if (breathCycleSeconds < 10) {
    breathState = 'exhale';
    secondsRemaining = 10 - breathCycleSeconds;
  } else {
    breathState = 'hold-out';
    secondsRemaining = 12 - breathCycleSeconds;
  }

  // Pause / Resume Session
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Skip to next sentence, advancing clock to start of next breath cycle
  const handleSkip = () => {
    if (!reflection) return;
    const totalSentences = reflection.sentences.length;
    const nextIndex = currentSentenceIndex + 1;
    
    if (nextIndex >= totalSentences) {
      setScreen('summary');
    } else {
      setSecondsElapsed(nextIndex * SECONDS_PER_SENTENCE);
    }
  };

  // Save Session to Journal
  const saveSession = () => {
    if (!reflection || isSavedThisSession) return;
    
    const newSession: SavedSession = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      worry: activeWorry,
      reflection: reflection.sentences
    };

    const updated = [newSession, ...savedSessions];
    setSavedSessions(updated);
    localStorage.setItem('mindfulness_journal', JSON.stringify(updated));
    setIsSavedThisSession(true);
  };

  // Delete a Saved Session
  const deleteSession = (id: string) => {
    const updated = savedSessions.filter(s => s.id !== id);
    setSavedSessions(updated);
    localStorage.setItem('mindfulness_journal', JSON.stringify(updated));
  };

  // Share/Copy Reflection to Clipboard
  const shareReflection = () => {
    if (!reflection) return;
    const shareText = `\"${activeWorry}\"\n\nReflection:\n${reflection.sentences.map(s => `• ${s}`).join('\n')}\n\nProcessed at Anxiety Relief Lab`;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Exit back to landing
  const resetToLanding = () => {
    setScreen('landing');
    setWorryInput('');
    setActiveWorry('');
    setReflection(null);
    setSecondsElapsed(0);
    audioSynth.stop();
    setIsAudioPlaying(false);
    setIsLoading(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-8 select-none">
      
      {/* Background Particles Canvas */}
      <ParticlesBackground theme={theme} speedMultiplier={screen === 'meditating' && !isPaused ? 0.5 : 1} />

      {/* Subtle Vignette overlay for immersive cinematic feel */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_40%,rgba(0,0,0,0.45)] pointer-events-none z-0" />

      {/* Graceful Toast Error Messages */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-neutral-900/90 border border-rose-950/30 text-rose-300 text-[10px] font-mono uppercase tracking-widest px-4 py-2.5 rounded-full z-50 backdrop-blur-md"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BAR */}
      <header className="w-full flex items-center justify-between z-10">
        <button 
          onClick={resetToLanding}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <Compass className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors duration-500 group-hover:rotate-45" />
          <span className="font-serif tracking-widest text-xs uppercase font-light text-neutral-400 group-hover:text-white transition-colors duration-500">
            anxiety relief lab
          </span>
        </button>

        {/* Top Right Controls: Theme and Journal */}
        <div className="flex items-center gap-3">
          {screen === 'landing' && !isLoading && (
            <>
              <button 
                onClick={() => setIsJournalOpen(true)}
                className="p-2 rounded-full bg-neutral-900/40 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80 text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer"
                title="Mindfulness Journal"
                aria-label="View mindfulness journal"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsInfoOpen(true)}
                className="p-2 rounded-full bg-neutral-900/40 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80 text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer"
                title="About anxiety relief lab"
                aria-label="View about information"
              >
                <Info className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Sound Control HUD (Visible in all screens) */}
          <div className="flex items-center bg-neutral-900/40 border border-neutral-800 rounded-full px-3 py-1.5 gap-2 backdrop-blur-md">
            <button 
              onClick={handleMuteToggle}
              className="text-neutral-400 hover:text-white transition-colors duration-300 cursor-pointer"
              aria-label={isAudioMuted ? "Unmute ambient sound" : "Mute ambient sound"}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            
            {/* Visualizer bars if audio is active */}
            {isAudioPlaying && !isAudioMuted && (
              <div className="flex items-end h-2.5 gap-0.5 w-6 px-0.5">
                <span className="w-0.5 bg-neutral-300 visualizer-bar" style={{ animationDelay: '0.1s' }} />
                <span className="w-0.5 bg-neutral-300 visualizer-bar" style={{ animationDelay: '0.4s' }} />
                <span className="w-0.5 bg-neutral-300 visualizer-bar" style={{ animationDelay: '0.2s' }} />
                <span className="w-0.5 bg-neutral-300 visualizer-bar" style={{ animationDelay: '0.6s' }} />
              </div>
            )}

            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audioVolume}
              onChange={(e) => {
                setAudioVolume(parseFloat(e.target.value));
                if (isAudioMuted) setIsAudioMuted(false);
              }}
              className="w-12 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-300 hover:accent-white transition-colors"
              aria-label="Adjust ambient volume"
            />
          </div>
        </div>
      </header>

      {/* CORE SCREENS ROUTER */}
      <main className="flex-1 flex flex-col items-center justify-center w-full z-10">
        <AnimatePresence mode="wait">
          
          {/* LOADING STATE VIEW */}
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center text-center space-y-8"
            >
              {/* Pulsing custom aura */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.35, 1],
                    opacity: [0.15, 0.5, 0.15],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{ backgroundColor: 'var(--glow-color)' }}
                  className="absolute inset-0 rounded-full filter blur-[20px]"
                />
                <Compass className="w-8 h-8 text-neutral-400 animate-[spin_10s_linear_infinite]" />
              </div>
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMessage}
                  initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
                  animate={{ opacity: 0.85, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
                  transition={{ duration: 0.6 }}
                  className="text-xl font-serif italic text-neutral-300 tracking-wide min-h-[32px]"
                >
                  {loadingMessage}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}

          {/* LANDING SCREEN */}
          {screen === 'landing' && !isLoading && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="max-w-xl w-full flex flex-col items-center text-center px-4"
            >
              <h1 className="text-3xl sm:text-5xl font-serif font-extralight tracking-tight leading-tight text-white mb-6">
                What is weighing on <br />
                <span className="italic font-light text-neutral-300">your mind</span> right now?
              </h1>

              <div className="w-full relative mt-8 mb-12">
                <textarea
                  value={worryInput}
                  onChange={(e) => setWorryInput(e.target.value)}
                  placeholder="Enter your worry, stressor, or fear..."
                  rows={2}
                  maxLength={150}
                  className="w-full text-center text-lg sm:text-xl font-serif font-light bg-transparent text-white placeholder-neutral-600 focus:placeholder-neutral-700 outline-none resize-none border-b border-neutral-800 focus:border-neutral-600 pb-3 transition-colors duration-500 max-h-32"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && worryInput.trim().length > 3) {
                      e.preventDefault();
                      handleBegin();
                    }
                  }}
                  aria-label="Describe what is weighing on your mind"
                />
                
                {/* Character Count */}
                <div className="absolute right-0 bottom-[-24px] text-[10px] font-mono text-neutral-600">
                  {worryInput.length}/150
                </div>
              </div>

              {/* Begin Button */}
              <button
                disabled={worryInput.trim().length < 3}
                onClick={handleBegin}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-full border text-sm uppercase tracking-widest font-light transition-all duration-700 cursor-pointer ${
                  worryInput.trim().length >= 3
                    ? 'border-white bg-white text-black shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-95'
                    : 'border-neutral-800 text-neutral-600 bg-transparent cursor-not-allowed'
                }`}
              >
                <span>Begin Experience</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ACTIVE MEDITATION SCREEN */}
          {screen === 'meditating' && reflection && !isLoading && (
            <motion.div 
              key="meditating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="w-full h-full max-w-3xl flex flex-col justify-between items-center py-6 px-4"
            >
              {/* Progress HUD */}
              <div className="w-full max-w-md flex items-center justify-between gap-4 opacity-50 hover:opacity-100 transition-opacity duration-500">
                <span className="text-[10px] font-mono text-neutral-500">
                  stage {currentSentenceIndex + 1} of {reflection.sentences.length}
                </span>
                
                {/* Thin progress bar */}
                <div className="flex-1 h-[2px] bg-neutral-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'linear' }}
                    className="h-full bg-neutral-400"
                  />
                </div>

                <span className="text-[10px] font-mono text-neutral-500">
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Dedicated vertical spacing to separate Worry and Breathing Guide */}
              <div className="flex-1 w-full flex flex-col justify-around items-center my-4">
                
                {/* 1. The Worry Text (Positioned in the upper region) */}
                <div className="w-full min-h-[120px] flex items-center justify-center">
                  <motion.div 
                    animate={{
                      scale: Math.max(0.08, 1 - (progress / 100) * 0.92),
                      opacity: Math.max(0.03, 0.95 - (progress / 100) * 0.88),
                      y: progress > 80 ? -(progress - 80) * 2.8 : 0,
                      filter: progress > 80 ? `blur(${(progress - 80) * 0.38}px)` : 'blur(0px)'
                    }}
                    transition={{
                      duration: 1.2,
                      ease: [0.25, 1, 0.5, 1] // Super smooth custom ease
                    }}
                    className="text-center max-w-xl px-6 pointer-events-none select-none"
                  >
                    <p className="text-2xl sm:text-3xl font-serif text-neutral-200 font-light italic leading-relaxed">
                      "{activeWorry}"
                    </p>
                  </motion.div>
                </div>

                {/* 2. Breathing Guide (Dedicated middle-lower space, no visual overlap) */}
                <div className="flex items-center justify-center opacity-85 h-56">
                  <BreathingIndicator breathState={breathState} secondsRemaining={secondsRemaining} />
                </div>

              </div>

              {/* Dynamic AI Reflection Subtitles (Bottom area, static placement) */}
              <div className="w-full max-w-xl text-center min-h-[95px] flex items-center justify-center px-4 mb-4">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentSentenceIndex}
                    initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -12, filter: 'blur(3px)' }}
                    transition={{ duration: 1.8, ease: [0.33, 1, 0.68, 1] }} // Soft, slow ink-fade
                    className="text-lg sm:text-xl font-serif font-light text-white leading-relaxed tracking-wide"
                  >
                    {reflection.sentences[currentSentenceIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-6 mt-2 z-20">
                <button 
                  onClick={togglePause}
                  className="p-3 rounded-full bg-neutral-950/60 border border-neutral-900 hover:border-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer"
                  aria-label={isPaused ? "Resume experience" : "Pause experience"}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>

                <button 
                  onClick={handleSkip}
                  className="px-5 py-2 rounded-full bg-neutral-950/60 border border-neutral-900 hover:border-neutral-700 text-neutral-400 hover:text-white text-xs uppercase tracking-wider font-light transition-all cursor-pointer"
                  aria-label="Skip to next stage"
                >
                  skip ahead
                </button>

                <button 
                  onClick={resetToLanding}
                  className="p-3 rounded-full bg-neutral-950/60 border border-neutral-900 hover:border-neutral-700 text-neutral-400 hover:text-rose-400 transition-all cursor-pointer"
                  title="Abandon Session"
                  aria-label="Abandon session"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SESSION COMPLETE / SUMMARY SCREEN */}
          {screen === 'summary' && reflection && !isLoading && (
            <motion.div 
              key="summary"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="max-w-2xl w-full flex flex-col items-center px-4"
            >
              <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center mb-8 bg-neutral-950/40">
                <Sparkles className="w-5 h-5 text-neutral-300" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-light text-white mb-2 text-center">
                The thought has dissolved
              </h2>
              <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-10 text-center">
                You have gained distance
              </p>

              {/* Reflection Card */}
              <div className="w-full bg-neutral-950/40 border border-neutral-900 rounded-2xl p-6 sm:p-8 backdrop-blur-md mb-8">
                <div className="flex items-center gap-2 mb-4 opacity-50">
                  <Compass className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                    your reflection
                  </span>
                </div>

                <div className="max-w-xl mx-auto flex flex-col gap-4 text-center">
                  <p className="text-sm font-serif italic text-neutral-500 mb-2">
                    "{activeWorry}"
                  </p>
                  
                  {/* Full Reflection Output */}
                  <div className="flex flex-col gap-3 font-serif text-neutral-200 text-base sm:text-lg leading-relaxed font-light">
                    {reflection.sentences.slice(-2).map((s, idx) => (
                      <p key={idx}>{s}</p>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-neutral-900/60">
                  <button
                    onClick={saveSession}
                    disabled={isSavedThisSession}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-light tracking-wide border transition-all cursor-pointer ${
                      isSavedThisSession
                        ? 'border-green-950/50 bg-green-950/20 text-green-400 cursor-default'
                        : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 bg-transparent'
                    }`}
                  >
                    {isSavedThisSession ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved to Journal</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-3.5 h-3.5" />
                        <span>Save to Journal</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={shareReflection}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-light tracking-wide border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 bg-transparent transition-all cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copy Reflection</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* End of session CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={resetToLanding}
                  className="flex items-center gap-3 px-8 py-3.5 rounded-full border border-white bg-white text-black text-xs uppercase tracking-widest font-medium hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Release another thought</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER CONTROLS & SELECTION MENUS */}
      <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 z-10">
        
        {/* Theme select HUD */}
        <div className="flex items-center gap-2 bg-neutral-900/40 border border-neutral-800 rounded-full px-3 py-1.5 backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 mr-1 pl-1">
            space:
          </span>
          {(['cosmos', 'aurora', 'ocean', 'forest', 'minimal-dark'] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                theme === t 
                  ? 'border-white scale-110 shadow-md' 
                  : 'border-neutral-800 hover:border-neutral-600 hover:scale-105'
              }`}
              style={{
                backgroundColor: 
                  t === 'cosmos' ? '#0f172a' :
                  t === 'aurora' ? '#064e3b' :
                  t === 'ocean' ? '#0c4a6e' :
                  t === 'forest' ? '#14532d' : '#171717'
              }}
              title={`Switch to ${t} theme`}
              aria-label={`Switch to ${t} theme`}
            />
          ))}
        </div>

        {/* Ambient audio selection HUD */}
        <div className="flex items-center gap-1.5 bg-neutral-900/40 border border-neutral-800 rounded-full px-3 py-1.5 backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 mr-1 pl-1">
            sound:
          </span>
          {(['rain', 'ocean', 'forest', 'space', 'piano'] as Soundscape[]).map((sound) => (
            <button
              key={sound}
              onClick={() => selectSoundscape(sound)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-light transition-all cursor-pointer ${
                soundscape === sound
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {sound}
            </button>
          ))}
        </div>
      </footer>

      {/* MINDFULNESS JOURNAL MODAL */}
      <AnimatePresence>
        {isJournalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJournalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-neutral-950 border border-neutral-900 rounded-2xl p-6 relative z-10 flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6 border-b border-neutral-900 pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-neutral-400" />
                  <h3 className="font-serif text-lg text-white">Your Released Thoughts</h3>
                </div>
                <button 
                  onClick={() => setIsJournalOpen(false)}
                  className="p-1 rounded-full hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close journal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Journal list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {savedSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm font-serif italic text-neutral-500">Your journal is empty.</p>
                    <p className="text-xs text-neutral-600 mt-2">Reflections you save at the end of sessions will appear here.</p>
                  </div>
                ) : (
                  savedSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="p-4 bg-neutral-900/30 border border-neutral-900/80 rounded-xl hover:border-neutral-800 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-neutral-500">{session.date}</span>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="text-neutral-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all p-1 cursor-pointer"
                          title="Delete reflection"
                          aria-label="Delete reflection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <p className="text-sm font-serif italic text-neutral-300 mb-3">
                        "{session.worry}"
                      </p>

                      <div className="pl-3 border-l border-neutral-800 space-y-2 text-xs font-serif text-neutral-400 leading-relaxed">
                        {session.reflection.slice(-2).map((s, idx) => (
                          <p key={idx}>{s}</p>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INFO ABOUT MODAL */}
      <AnimatePresence>
        {isInfoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInfoOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-neutral-950 border border-neutral-900 rounded-2xl p-6 relative z-10 flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="flex justify-between items-center mb-5 border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-neutral-400" />
                  <h3 className="font-serif text-lg text-white">About the sanctuary</h3>
                </div>
                <button 
                  onClick={() => setIsInfoOpen(false)}
                  className="p-1 rounded-full hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close information"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm font-serif text-neutral-300 leading-relaxed font-light">
                <p>
                  <strong>Anxiety Relief Lab</strong> is a private digital sanctuary built to provide psychological distance from overwhelming worries, stress, and regrets.
                </p>
                <p>
                  It does not seek to solve your concerns, nor does it give superficial advice. Instead, it invites you to place your thought at the center of a slow, breathing-centered meditation, where you can watch it visually shrink while an AI reflects upon it through a lens of validation, scale, and gentle release.
                </p>
                <p>
                  <strong>Synthesized Soundscapes:</strong> Every sound effect you hear is procedurally synthesized inside your browser using the Web Audio API—rendering rain, wind, birds, space drones, and ambient piano without downloading any audio tracks.
                </p>
                <p>
                  <strong>AI Reflections:</strong> Your thoughts are processed dynamically using the Groq Llama-3.3 API to create 8 custom, poetic reflection quotes. If offline, the client falls back to an built-in library of 11 emotional tracks.
                </p>
                <p>
                  <strong>Privacy First:</strong> Your thoughts, worries, and saved reflections remain strictly inside your browser. No analytical tracking or server-side logging occurs.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
