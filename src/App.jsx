import { Routes, Route, Link } from 'react-router-dom'
import PageComanda from './pages/Comanda'
import PageBalanca from './pages/Comanda/Balanca'
import PageHome from './pages/Home'

function App() {
  function historyBack() {
    window.history.back()
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button onClick={historyBack} className="text-decoration-none back-btn">
          <i className="bi bi-chevron-left"></i>
        </button>
        <h1>Comanda Virtual</h1>
        <div style={{ width: '24px' }}></div> {/* Spacer for centering */}
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<PageHome />} />
          <Route path="/comandas/:key" element={<PageComanda />} />
          <Route path="/comandas/:key/balanca" element={<PageBalanca />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
