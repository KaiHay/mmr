export type NoteType = 'up' | 'down' | 'left' | 'right';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Note {
  id: string;
  type: NoteType;
  time: number; // Time in milliseconds when the note should be hit
  hit: boolean;
  missed: boolean;
  patternIndex: number; // Index in the pattern sequence
}

export interface ButtonPattern {
  type: NoteType;
  timeOffset: number; // Time offset from pattern start in milliseconds
}

export interface Pattern {
  buttons: ButtonPattern[];
  duration: number; // Total duration of the pattern in milliseconds
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  notes: Note[];
  isPlaying: boolean;
  currentTime: number;
  currentPatternIndex: number;
  patternStartTime: number;
  isHeadphonesConnected: boolean; // New field for headphone connection state
  difficulty: Difficulty;
  musicPlaying: boolean;
}

export interface GameStats {
  perfect: number;
  good: number;
  miss: number;
  maxCombo: number;
  score: number;
}
