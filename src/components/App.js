import { useState } from 'react';
import './App.css';
import MapHost from './MapHost.js';
import TestingGrounds from './TestingGrounds.js';

function App() {
  const [viewingMap, setViewingMap] = useState(true);

  const mapStyle = viewingMap ? 'initial' : 'none';
  const testStyle = viewingMap ? 'none' : 'initial';

  return (
    <div>
      <div style={{display: mapStyle}} >
        <MapHost onSwitchScene={() => setViewingMap(false)} />
      </div>
      <div style={{display: testStyle}}>
        <TestingGrounds onSwitchScene={() => setViewingMap(true)} />
      </div>
    </div>
  )
}

export default App;
