import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Memory from './pages/Memory'
import MemoryDetail from './pages/MemoryDetail'
import Recall from './pages/Recall'
import Expired from './pages/Expired'
import Insight from './pages/Insight'
import Create from './pages/Create'
import CreateEditor from './pages/CreateEditor'
import Me from './pages/Me'
import Preferences from './pages/Preferences'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Home />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/recall" element={<Recall />} />
        <Route path="/create" element={<Create />} />
        <Route path="/me" element={<Me />} />
      </Route>
      <Route path="/memory/:id" element={<MemoryDetail />} />
      <Route path="/create/:type" element={<CreateEditor />} />
      <Route path="/expired" element={<Expired />} />
      <Route path="/insight" element={<Insight />} />
      <Route path="/prefs" element={<Preferences />} />
    </Routes>
  )
}
