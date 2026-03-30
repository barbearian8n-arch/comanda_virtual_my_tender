import { Routes, Route, Link } from 'react-router-dom'
import PageComanda from './pages/Comanda'
import PageBalanca from './pages/Comanda/Balanca'
import PageHome from './pages/Home'
import PageBalancaGeral from './pages/BalancaGeral'
import { useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

function App() {
  const navigate = useNavigate()
  const isFirstPage = window.location.pathname === "/" || window.location.pathname === "/balanca"

  function historyBack() {
    if (isFirstPage) {
      return
    }
    navigate(-1)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button onClick={historyBack} className={`text-decoration-none back-btn ${isFirstPage ? 'invisible' : ''}`}>
          <i className="bi bi-chevron-left"></i>
        </button>
        <h1>Comanda Virtual</h1>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<PageHome />} />
          <Route path="/balanca" element={<PageBalancaGeral />} />
          <Route path="/comandas/:key" element={<PageComanda />} />
          <Route path="/comandas/:key/balanca" element={<PageBalanca />} />
        </Routes>
      </main>

      <Toaster />
    </div>
  )
}

export default App
