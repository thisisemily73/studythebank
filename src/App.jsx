import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Diagnostic from './pages/Diagnostic';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';



export default function App() {
  const [view, setView] = useState('home');
  const [isDesmosOpen, setIsDesmosOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <Navbar setView={setView} activeView={view} />

      {/* Dynamic View Renderer */}
      <main className="flex-1 p-6">
        {view === 'home' && <Home setView={setView} />}
        {view === 'diagnostic' && <Diagnostic setView={setView} setIsDesmosOpen={setIsDesmosOpen} />}
        {view === 'practice' && <Practice setIsDesmosOpen={setIsDesmosOpen} />}
        {view === 'analytics' && <Analytics />}
        {view === 'settings' && <Settings />}
      </main>

      {/* Global Desmos Calculator Modal */}
      {isDesmosOpen && (
        <DesmosModal onClose={() => setIsDesmosOpen(false)} />
      )}
    </div>
  );
}