import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import TeamBuilder from './pages/TeamBuilder';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import BattleArena from './pages/BattleArena';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-pink-500 selection:text-white">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/battle/:battleId" element={<BattleArena />} />
          
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/teambuilder" element={<TeamBuilder />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App;