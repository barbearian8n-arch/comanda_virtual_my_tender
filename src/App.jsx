import { Routes, Route, Link } from 'react-router-dom'
import PageComanda from './pages/Comanda'
import PageBalanca from './pages/Comanda/Balanca'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="#" className="text-decoration-none back-btn">
          <i className="bi bi-chevron-left"></i>
        </Link>
        <h1>Comanda Virtual</h1>
        <div style={{ width: '24px' }}></div> {/* Spacer for centering */}
      </header>
      
      <main className="app-main">
        <Routes>
          <Route path="/comandas/:key" element={<PageComanda />} />
          <Route path="/comanda/:key/balanca" element={<PageBalanca />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
