/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Eye, 
  ArrowUpCircle, 
  Music as MusicIcon, 
  Circle, 
  Bird, 
  Cloud, 
  Ship, 
  Waves,
  Sun,
  LayoutGrid
} from 'lucide-react';

// --- Types ---
type GameType = 'people' | 'peekaboo' | 'sorting' | 'soundboard' | 'bubbles';

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
}

// --- Audio Utility ---
class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicOsc: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playTone(freq: number, type: OscillatorType = 'sine', duration = 0.5) {
    if (!this.ctx) this.init();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
    
    gain.gain.setValueAtTime(0.5, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.start();
    osc.stop(this.ctx!.currentTime + duration);
  }

  startMusic() {
    if (!this.ctx) this.init();
    if (this.musicOsc) return;

    this.musicGain = this.ctx!.createGain();
    this.musicGain.gain.setValueAtTime(0.05, this.ctx!.currentTime); // Very quiet
    this.musicGain.connect(this.ctx!.destination);

    const playLoop = () => {
      const now = this.ctx!.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C major pentatonic
      const note = notes[Math.floor(Math.random() * notes.length)];
      
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note / 2, now); // Low mellow notes
      
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.05, now + 2);
      g.gain.linearRampToValueAtTime(0, now + 4);
      
      osc.connect(g);
      g.connect(this.musicGain!);
      
      osc.start(now);
      osc.stop(now + 4);
      
      setTimeout(playLoop, 3000);
    };

    playLoop();
  }

  speak(text: string, pitch = 1) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = pitch;
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  vibrate() {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
}

const audio = new AudioEngine();

// --- Components ---

const PeopleGame = () => {
  const people = [
    { name: 'Grandpa', label: 'Older Man', voice: 'Hello dear', color: 'bg-blue-500', pitch: 0.8, icon: '👴' },
    { name: 'Grandma', label: 'Older Woman', voice: 'Hello dear', color: 'bg-pink-500', pitch: 1.2, icon: '👵' },
    { name: 'Boy', label: 'Little Boy', voice: 'Hello dear', color: 'bg-green-500', pitch: 1.5, icon: '👦' },
    { name: 'Girl', label: 'Little Girl', voice: 'Hello dear', color: 'bg-red-500', pitch: 2.0, icon: '👧' },
  ];

  return (
    <div className="grid grid-cols-2 gap-8 p-8 h-full">
      {people.map((person) => (
        <motion.button
          key={person.name}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            audio.speak(person.voice, person.pitch);
            audio.vibrate();
          }}
          className={`${person.color} rounded-3xl flex flex-col items-center justify-center text-8xl shadow-2xl active:shadow-inner`}
        >
          <span>{person.icon}</span>
        </motion.button>
      ))}
    </div>
  );
};

const PeekABooGame = () => {
  const [screenIdx, setScreenIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const levels = [
    { bg: 'bg-emerald-200', bushColor: 'bg-emerald-600', animal: '🐘', sound: 200 },
    { bg: 'bg-amber-200', bushColor: 'bg-orange-600', animal: '🦁', sound: 300 },
    { bg: 'bg-sky-200', bushColor: 'bg-sky-600', animal: '🐬', sound: 400 },
    { bg: 'bg-rose-200', bushColor: 'bg-red-600', animal: '🐵', sound: 500 },
    { bg: 'bg-purple-200', bushColor: 'bg-purple-600', animal: '🐯', sound: 600 },
  ];

  const current = levels[screenIdx];

  const handleTap = () => {
    if (!revealed) {
      setRevealed(true);
      audio.playTone(current.sound, 'sine', 0.2);
      audio.vibrate();
      setTimeout(() => {
        setRevealed(false);
        setScreenIdx((prev) => (prev + 1) % levels.length);
      }, 2000);
    }
  };

  return (
    <div className={`w-full h-full ${current.bg} relative overflow-hidden flex items-center justify-center`} onClick={handleTap}>
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="bush"
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ rotate: { repeat: Infinity, duration: 2 } }}
            className={`w-64 h-64 ${current.bushColor} rounded-full absolute z-10 shadow-lg`}
          />
        ) : (
          <motion.div
            key="animal"
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 2.5, y: 0 }}
            className="text-8xl select-none"
          >
            {current.animal}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SortingGame = () => {
  const [items, setItems] = useState([
    { id: 1, type: 'sky', icon: <Bird size={64} />, color: 'text-white' },
    { id: 2, type: 'water', icon: <Ship size={64} />, color: 'text-amber-200' },
    { id: 3, type: 'sky', icon: <Cloud size={64} />, color: 'text-sky-100' },
    { id: 4, type: 'water', icon: <Waves size={64} />, color: 'text-blue-200' },
  ]);

  const handleDragEnd = (id: number, info: any, targetType: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Very broad collision detection for toddler fingers
    const y = info.point.y;
    const height = window.innerHeight;
    const isInSky = y < height / 2;
    const isInWater = y >= height / 2;

    if ((item.type === 'sky' && isInSky) || (item.type === 'water' && isInWater)) {
      audio.playTone(880, 'sine', 0.1);
      audio.vibrate();
      // Remove or reset item
      setItems(prev => prev.filter(i => i.id !== id).concat({ ...item, id: Date.now() }));
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 bg-sky-400 flex items-center justify-center relative">
        <Sun className="absolute top-8 left-8 text-yellow-300 animate-pulse" size={80} />
        <span className="text-sky-100 text-4xl font-bold uppercase opacity-30">Sky</span>
      </div>
      <div className="flex-1 bg-blue-600 flex items-center justify-center">
        <Waves className="absolute bottom-8 right-8 text-blue-400 opacity-50" size={100} />
        <span className="text-white text-4xl font-bold uppercase opacity-30">Water</span>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-lg flex justify-around pointer-events-auto h-48">
          {items.slice(0, 4).map((item, idx) => (
            <motion.div
              key={item.id}
              drag
              dragSnapToOrigin
              onDragEnd={(_, info) => handleDragEnd(item.id, info, item.type)}
              className={`p-8 bg-white/20 backdrop-blur-md rounded-3xl cursor-grab active:cursor-grabbing h-fit`}
              style={{ x: (idx - 1.5) * 40 }}
            >
              <div className={item.color}>{item.icon}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SoundboardGame = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const instruments = [
    { name: 'Drum', freq: 100, color: 'bg-red-500', icon: '🥁' },
    { name: 'Bell', freq: 1200, color: 'bg-yellow-400', icon: '🔔' },
    { name: 'Piano', freq: 440, color: 'bg-blue-500', icon: '🎹' },
    { name: 'Trumpet', freq: 600, color: 'bg-green-500', icon: '🎺' },
  ];

  const addRipple = (e: React.MouseEvent | React.TouchEvent, color: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const newRipple = {
      id: Date.now(),
      x: clientX,
      y: clientY,
      color
    };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 1000);
  };

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative">
      <div className="grid grid-cols-2 h-full gap-4 p-4">
        {instruments.map((inst) => (
          <motion.div
            key={inst.name}
            className={`${inst.color} rounded-[4rem] flex items-center justify-center text-9xl shadow-2xl relative overflow-hidden`}
            onPointerDown={(e) => {
              audio.playTone(inst.freq, 'sine', 0.5);
              audio.vibrate();
              addRipple(e as any, 'white');
            }}
          >
            {inst.icon}
          </motion.div>
        ))}
      </div>

      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          initial={{ scale: 0.1, opacity: 0.8 }}
          animate={{ scale: 4, opacity: 0 }}
          style={{
            position: 'fixed',
            left: ripple.x - 50,
            top: ripple.y - 50,
            width: 100,
            height: 100,
            borderRadius: '50%',
            backgroundColor: ripple.color,
            pointerEvents: 'none',
            zIndex: 100
          }}
        />
      ))}
    </div>
  );
};

const BubblesGame = () => {
  const [bubbles, setBubbles] = useState<{ id: number, x: number, y: number, size: number, color: string }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (bubbles.length < 15) {
        setBubbles(prev => [...prev, {
          id: Date.now(),
          x: Math.random() * 80 + 10,
          y: 110,
          size: Math.random() * 100 + 100,
          color: `hsla(${Math.random() * 360}, 70%, 70%, 0.5)`
        }]);
      }
    }, 600);
    return () => clearInterval(interval);
  }, [bubbles.length]);

  const pop = (id: number) => {
    audio.playTone(1000 + Math.random() * 500, 'sine', 0.05);
    audio.vibrate();
    setBubbles(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="w-full h-full bg-indigo-950 overflow-hidden relative">
      <AnimatePresence>
        {bubbles.map((bubble) => (
          <motion.div
            key={bubble.id}
            initial={{ y: '110vh' }}
            animate={{ y: '-20vh', rotate: [0, 10, -10, 0] }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ y: { duration: 6, ease: 'linear' }, rotate: { repeat: Infinity, duration: 2 } }}
            onClick={() => pop(bubble.id)}
            onPointerDown={() => pop(bubble.id)}
            style={{
              position: 'absolute',
              left: `${bubble.x}%`,
              width: bubble.size,
              height: bubble.size,
              background: bubble.color,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.4)',
              backdropFilter: 'blur(4px)',
              cursor: 'pointer'
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [currentGame, setCurrentGame] = useState<GameType>('people');
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (hasStarted) {
      audio.startMusic();
    }
  }, [hasStarted]);

  if (!hasStarted) {
    return (
      <div 
        className="w-full h-screen bg-indigo-600 flex flex-col items-center justify-center p-12 text-white text-center cursor-pointer"
        onClick={() => setHasStarted(true)}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-8xl mb-8"
        >
          👋
        </motion.div>
        <h1 className="text-7xl font-black mb-4">ARUOSA</h1>
        <p className="text-3xl opacity-80">Tap to start playing!</p>
      </div>
    );
  }

  const renderGame = () => {
    switch (currentGame) {
      case 'people': return <PeopleGame />;
      case 'peekaboo': return <PeekABooGame />;
      case 'sorting': return <SortingGame />;
      case 'soundboard': return <SoundboardGame />;
      case 'bubbles': return <BubblesGame />;
    }
  };

  const navItems = [
    { type: 'people' as GameType, icon: <Users size={40} />, color: 'bg-blue-500' },
    { type: 'peekaboo' as GameType, icon: <Eye size={40} />, color: 'bg-green-500' },
    { type: 'sorting' as GameType, icon: <LayoutGrid size={40} />, color: 'bg-orange-500' },
    { type: 'soundboard' as GameType, icon: <MusicIcon size={40} />, color: 'bg-purple-500' },
    { type: 'bubbles' as GameType, icon: <Circle size={40} />, color: 'bg-pink-500' },
  ];

  return (
    <div className="w-full h-screen bg-black overflow-hidden flex flex-col font-sans select-none touch-none">
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentGame}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full h-full"
          >
            {renderGame()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Zero Menu Navigation - Part of the Play experience */}
      <footer className="h-32 bg-slate-100 flex items-stretch border-t-8 border-slate-200">
        {navItems.map((item) => (
          <button
            key={item.type}
            onClick={() => {
              setCurrentGame(item.type);
              audio.playTone(200 + navItems.findIndex(i => i.type === item.type) * 100);
              audio.vibrate();
            }}
            className={`flex-1 flex items-center justify-center border-r-4 border-slate-200 last:border-r-0 transition-transform active:scale-95 ${
              currentGame === item.type ? item.color + ' text-white' : 'text-slate-400 bg-white'
            }`}
          >
            {item.icon}
          </button>
        ))}
      </footer>
    </div>
  );
}
