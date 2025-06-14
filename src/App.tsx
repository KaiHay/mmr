import { RhythmGame } from './components/RhythmGame';

function App() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '2vh',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#fff',
        textAlign: 'center',
        zIndex: 10,
      }}>
        <h1 style={{ 
          margin: 0,
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
        }}>Rhythm Game</h1>
      </div>
      
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <RhythmGame />
      </div>

      <div style={{
        position: 'absolute',
        bottom: '2vh',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#fff',
        textAlign: 'center',
        zIndex: 10,
        fontSize: 'clamp(0.8rem, 2vw, 1rem)',
      }}>
        <p style={{ margin: '0.5vh 0' }}>Use arrow keys to hit the notes!</p>
        <p style={{ margin: '0.5vh 0' }}>Perfect hit: 100 points</p>
        <p style={{ margin: '0.5vh 0' }}>Good hit: 50 points</p>
      </div>
    </div>
  );
}

export default App;
