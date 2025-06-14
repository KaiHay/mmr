import { RhythmGame } from './components/RhythmGame';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      padding: '20px',
    }}>
      <h1 style={{ color: '#fff', marginBottom: '20px' }}>Rhythm Game</h1>
      <RhythmGame />
      <div style={{ color: '#fff', marginTop: '20px', textAlign: 'center' }}>
        <p>Use arrow keys to hit the notes!</p>
        <p>Perfect hit: 100 points</p>
        <p>Good hit: 50 points</p>
      </div>
    </div>
  );
}

export default App;
