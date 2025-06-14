import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AudioManager } from './AudioManager';
import type {
  ButtonPattern,
  GameState,
  Note,
  NoteType,
  Pattern,
} from '../types/game';

const NOTE_SPEED = 500; // pixels per second
const JUDGMENT_WINDOW = 100; // milliseconds
const LANE_COUNT = 4;
const LANE_WIDTH = 100;
const GAME_HEIGHT = 600;
const BUTTON_SIZE = 80;
const BUTTON_MARGIN = 10;
const PATTERN_INTERVAL = 2000; // Time between pattern starts in milliseconds

const TRACK_COLORS = {
  up: '#FF0000',
  down: '#00FF00',
  left: '#0000FF',
  right: '#FFFF00',
};

const TRACK_KEYS = {
  up: { arrows: '↑', wasd: 'W' },
  down: { arrows: '↓', wasd: 'S' },
  left: { arrows: '←', wasd: 'A' },
  right: { arrows: '→', wasd: 'D' },
};

// Define some basic patterns
const PATTERNS: Pattern[] = [
  {
    buttons: [
      { type: 'up', timeOffset: 0 },
      { type: 'down', timeOffset: 500 },
      { type: 'left', timeOffset: 1000 },
      { type: 'right', timeOffset: 1500 },
    ],
    duration: 2000,
  },
  {
    buttons: [
      { type: 'up', timeOffset: 0 },
      { type: 'up', timeOffset: 250 },
      { type: 'down', timeOffset: 500 },
      { type: 'down', timeOffset: 750 },
    ],
    duration: 2000,
  },
  {
    buttons: [
      { type: 'left', timeOffset: 0 },
      { type: 'right', timeOffset: 250 },
      { type: 'left', timeOffset: 500 },
      { type: 'right', timeOffset: 750 },
    ],
    duration: 2000,
  },
  {
    buttons: [
      { type: 'up', timeOffset: 0 },
      { type: 'right', timeOffset: 250 },
      { type: 'down', timeOffset: 500 },
      { type: 'left', timeOffset: 750 },
      { type: 'up', timeOffset: 1000 },
      { type: 'right', timeOffset: 1250 },
      { type: 'down', timeOffset: 1500 },
      { type: 'left', timeOffset: 1750 },
    ],
    duration: 2000,
  },
];

const generateNote = (
  pattern: ButtonPattern,
  patternIndex: number,
  startTime: number
): Note => ({
  id: uuidv4(),
  type: pattern.type,
  time: startTime + pattern.timeOffset,
  hit: false,
  missed: false,
  patternIndex,
});

// Audio feedback sounds
const AUDIO_FILES = {
  perfect: '/sounds/perfect.mp3',
  good: '/sounds/good.mp3',
  miss: '/sounds/miss.mp3',
  combo: '/sounds/combo.mp3',
};

const DIFFICULTY_LEVELS = {
  easy: {
    noteSpeed: 400,
    judgmentWindow: 150,
    patternInterval: 2500,
  },
  medium: {
    noteSpeed: 500,
    judgmentWindow: 100,
    patternInterval: 2000,
  },
  hard: {
    noteSpeed: 600,
    judgmentWindow: 75,
    patternInterval: 1500,
  },
};

export const RhythmGame = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    notes: [],
    isPlaying: false,
    currentTime: 0,
    currentPatternIndex: 0,
    patternStartTime: 0,
    isHeadphonesConnected: false,
    difficulty: 'medium',
    musicPlaying: false,
  });

  const gameLoopRef = useRef<number>();
  const lastPatternTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const gainNodeRef = useRef<GainNode | null>(null);

  const [activeButtons, setActiveButtons] = useState<Record<NoteType, boolean>>(
    {
      up: false,
      down: false,
      left: false,
      right: false,
    }
  );

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const handleAudioStateChange = (hasHeadphones: boolean) => {
    console.log('Audio state changed:', hasHeadphones);
    setGameState((prev) => ({
      ...prev,
      isHeadphonesConnected: hasHeadphones,
    }));

    // Force mute all audio elements when no headphones
    if (!hasHeadphones) {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.muted = true;
        console.log('Muting background music');
      }
      if (musicRef.current) {
        musicRef.current.muted = true;
        console.log('Muting music');
      }
      Object.values(audioRefs.current).forEach((audio) => {
        audio.muted = true;
      });
    } else {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.muted = false;
        console.log('Unmuting background music');
      }
      if (musicRef.current) {
        musicRef.current.muted = false;
        console.log('Unmuting music');
      }
      Object.values(audioRefs.current).forEach((audio) => {
        audio.muted = false;
      });
    }

    // Handle audio context for note sounds
    if (hasHeadphones && !audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    } else if (!hasHeadphones && audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Initialize audio elements
  useEffect(() => {
    // Create audio elements for feedback sounds
    Object.entries(AUDIO_FILES).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.muted = !gameState.isHeadphonesConnected;
      audioRefs.current[key] = audio;
    });

    // Create music audio element
    musicRef.current = new Audio('/12 Pop It In (2) 1.mp3');
    musicRef.current.loop = true;
    musicRef.current.muted = !gameState.isHeadphonesConnected;

    return () => {
      // Cleanup audio elements
      Object.values(audioRefs.current).forEach((audio) => audio.pause());
      if (musicRef.current) {
        musicRef.current.pause();
      }
    };
  }, []);

  const playFeedbackSound = (type: 'perfect' | 'good' | 'miss' | 'combo') => {
    const audio = audioRefs.current[type];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(console.error);
    }
  };

  const startGame = () => {
    setGameState((prev) => ({
      ...prev,
      isPlaying: true,
      notes: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      currentTime: 0,
      currentPatternIndex: 0,
      patternStartTime: 0,
      musicPlaying: true,
    }));
    lastPatternTimeRef.current = 0;
    lastFrameTimeRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    // Initialize audio context for note sounds
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    // Initialize and start background music
    if (!backgroundMusicRef.current) {
      backgroundMusicRef.current = new Audio('/12 Pop It In (2) 1.mp3');
      backgroundMusicRef.current.loop = true;
      backgroundMusicRef.current.muted = !gameState.isHeadphonesConnected;
      console.log('Initial muted state:', !gameState.isHeadphonesConnected);
      backgroundMusicRef.current.play().catch(console.error);
    }

    // Start music
    if (musicRef.current) {
      musicRef.current.currentTime = 0;
      musicRef.current.muted = !gameState.isHeadphonesConnected;
      musicRef.current.play().catch(console.error);
    }
  };

  const stopGame = () => {
    setGameState((prev) => ({
      ...prev,
      isPlaying: false,
      musicPlaying: false,
    }));
    if (musicRef.current) {
      musicRef.current.pause();
    }
  };

  const gameLoop = (timestamp: number) => {
    if (!gameState.isPlaying) return;

    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;

    // Generate new patterns
    if (timestamp - lastPatternTimeRef.current >= PATTERN_INTERVAL) {
      const currentPattern = PATTERNS[gameState.currentPatternIndex];
      const newNotes = currentPattern.buttons.map((pattern) =>
        generateNote(pattern, gameState.currentPatternIndex, timestamp)
      );

      setGameState((prev) => ({
        ...prev,
        notes: [...prev.notes, ...newNotes],
        currentPatternIndex: (prev.currentPatternIndex + 1) % PATTERNS.length,
        patternStartTime: timestamp,
      }));
      lastPatternTimeRef.current = timestamp;
    }

    // Update note positions and check for misses
    setGameState((prev) => {
      const currentTime = timestamp;
      const notes = prev.notes
        .map((note) => {
          if (note.hit || note.missed) return note;

          const timeDiff = currentTime - note.time;
          if (timeDiff > JUDGMENT_WINDOW) {
            return { ...note, missed: true };
          }
          return note;
        })
        .filter((note) => !note.missed || currentTime - note.time < 1000);

      return {
        ...prev,
        currentTime,
        notes,
      };
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const playNoteSound = (noteType: NoteType) => {
    // Only play sound if headphones are connected
    if (!gameState.isHeadphonesConnected || !audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    // Set different frequencies for different note types
    const frequencies = {
      up: 440, // A4
      down: 494, // B4
      left: 523, // C5
      right: 587, // D5
    };

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      frequencies[noteType],
      audioContextRef.current.currentTime
    );

    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + 0.1
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (!gameState.isPlaying) return;

    const keyMap: Record<string, NoteType> = {
      // Arrow keys
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      // WASD keys
      w: 'up',
      W: 'up',
      s: 'down',
      S: 'down',
      a: 'left',
      A: 'left',
      d: 'right',
      D: 'right',
    };

    const noteType = keyMap[event.key];
    if (!noteType) return;

    // Set button as active
    setActiveButtons((prev) => ({ ...prev, [noteType]: true }));
    setTimeout(() => {
      setActiveButtons((prev) => ({ ...prev, [noteType]: false }));
    }, 100);

    const currentTime = performance.now();
    const hitNote = gameState.notes.find(
      (note) =>
        !note.hit &&
        !note.missed &&
        note.type === noteType &&
        Math.abs(currentTime - note.time) <= JUDGMENT_WINDOW
    );

    if (hitNote) {
      const timeDiff = Math.abs(currentTime - hitNote.time);
      const isPerfect = timeDiff < JUDGMENT_WINDOW / 2;
      const score = isPerfect ? 100 : 50;

      // Play feedback sound
      playFeedbackSound(isPerfect ? 'perfect' : 'good');

      // Play sound when note is hit
      playNoteSound(noteType);

      setGameState((prev) => {
        const newCombo = prev.combo + 1;
        // Play combo sound for every 10 combo
        if (newCombo % 10 === 0) {
          playFeedbackSound('combo');
        }
        return {
          ...prev,
          score: prev.score + score,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          notes: prev.notes.map((note) =>
            note.id === hitNote.id ? { ...note, hit: true } : note
          ),
        };
      });
    } else {
      // Play miss sound for missed notes
      playFeedbackSound('miss');
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying]);

  // Ensure audio state is properly initialized
  useEffect(() => {
    // Update all audio elements when headphone state changes
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.muted = !gameState.isHeadphonesConnected;
      console.log(
        'Effect: Setting muted to:',
        !gameState.isHeadphonesConnected
      );
    }
    if (musicRef.current) {
      musicRef.current.muted = !gameState.isHeadphonesConnected;
    }
    Object.values(audioRefs.current).forEach((audio) => {
      audio.muted = !gameState.isHeadphonesConnected;
    });
  }, [gameState.isHeadphonesConnected]);

  // Clean up audio resources when component unmounts
  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      gainNodeRef.current = null;
    };
  }, []);

  const getNotePosition = (note: Note) => {
    const timeDiff = gameState.currentTime - note.time;
    const position = (timeDiff / 1000) * NOTE_SPEED;
    return position;
  };

  return (
    <div
      className='game-container'
      style={{
        width: LANE_COUNT * LANE_WIDTH,
        height: GAME_HEIGHT,
        position: 'relative',
        margin: '0 auto',
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
      }}
    >
      <AudioManager onAudioStateChange={handleAudioStateChange} />

      {/* Headphone status indicator */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          color: gameState.isHeadphonesConnected ? '#4CAF50' : '#f44336',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 2,
        }}
      >
        <span style={{ fontSize: '24px' }}>🎧</span>
        {gameState.isHeadphonesConnected
          ? 'Headphones Connected'
          : 'No Headphones'}
      </div>

      {/* Lanes with visual guides */}
      {Array.from({ length: LANE_COUNT }).map((_, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: index * LANE_WIDTH,
            width: LANE_WIDTH,
            height: '100%',
            borderLeft: '1px solid #333',
            borderRight: '1px solid #333',
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
            backgroundSize: '100% 200px',
            backgroundRepeat: 'repeat-y',
            animation: 'scrollLane 1s linear infinite',
          }}
        />
      ))}

      {/* Notes */}
      {gameState.notes.map((note) => {
        const laneIndex = ['up', 'down', 'left', 'right'].indexOf(note.type);
        const timeDiff = gameState.currentTime - note.time;
        const position = (timeDiff * NOTE_SPEED) / 1000;

        return (
          <div
            key={note.id}
            style={{
              position: 'absolute',
              left: laneIndex * LANE_WIDTH + LANE_WIDTH / 2 - 25,
              top: position,
              width: 50,
              height: 50,
              backgroundColor: note.hit
                ? '#4CAF50'
                : note.missed
                ? '#f44336'
                : TRACK_COLORS[note.type],
              borderRadius: '50%',
              transform: 'translateY(-50%)',
              transition: 'background-color 0.1s',
              boxShadow: note.hit
                ? '0 0 20px #4CAF50'
                : note.missed
                ? '0 0 20px #f44336'
                : `0 0 10px ${TRACK_COLORS[note.type]}`,
            }}
          />
        );
      })}

      {/* Track buttons */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: BUTTON_SIZE + BUTTON_MARGIN * 2,
          display: 'flex',
          justifyContent: 'center',
          gap: BUTTON_MARGIN,
          padding: BUTTON_MARGIN,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        {(['up', 'down', 'left', 'right'] as NoteType[]).map((type) => (
          <div
            key={type}
            style={{
              width: BUTTON_SIZE,
              height: BUTTON_SIZE,
              backgroundColor: activeButtons[type]
                ? TRACK_COLORS[type]
                : '#333',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#fff',
              fontWeight: 'bold',
              transition: 'all 0.1s ease',
              boxShadow: activeButtons[type]
                ? `0 0 20px ${TRACK_COLORS[type]}`
                : 'none',
              transform: activeButtons[type] ? 'scale(0.95)' : 'scale(1)',
              cursor: 'default',
              userSelect: 'none',
              gap: '2px',
            }}
          >
            <div style={{ fontSize: '28px' }}>{TRACK_KEYS[type].arrows}</div>
            <div
              style={{
                fontSize: '16px',
                opacity: 0.7,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {TRACK_KEYS[type].wasd}
            </div>
          </div>
        ))}
      </div>

      {/* Hit line */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: '#fff',
        }}
      />

      {/* Score display */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: '#fff',
          fontSize: '24px',
        }}
      >
        Score: {gameState.score}
        <br />
        Combo: {gameState.combo}
      </div>

      {/* Start button */}
      {!gameState.isPlaying && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '30px',
            borderRadius: '10px',
            zIndex: 1,
          }}
        >
          <button
            onClick={startGame}
            style={{
              padding: '20px 40px',
              fontSize: '24px',
              backgroundColor: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginBottom: '20px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            Start Game
          </button>
          <div style={{ color: '#fff', fontSize: '16px' }}>
            <p>Use Arrow Keys or WASD to play!</p>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes scrollLane {
            from { background-position: 0 0; }
            to { background-position: 0 200px; }
          }
        `}
      </style>
    </div>
  );
};
