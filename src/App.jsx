import { Routes, Route } from 'react-router-dom'
import PageComanda from './pages/Comanda'
import PageBalanca from './pages/Comanda/Balanca'
import PageHome from './pages/Home'
import PageBalancaGeral from './pages/BalancaGeral'
import PageProdutos from './pages/Produtos'
import PageProdutoView from './pages/ProdutoView'
import PageProdutoNovo from './pages/ProdutoNovo'
import PageCardapio from './pages/Cardapio'
import PageClienteEntrada from './pages/ClienteEntrada'
import { useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useMemo, useState } from 'react'
import PageDeliveryFee from './pages/Comanda/DeliveryFee'
import PageLogin from './pages/Login'
import PageRegister from './pages/Register'

function App() {
  const navigate = useNavigate()
  const pageStack = useMemo(() => {
    if (window.location.pathname !== "/") {
      return ["/", window.location.pathname]
    }

    return ["/"]
  }, [])

  const [isFirstPage, setIsFirstPage] = useState(pageStack.length === 1)
  const [loggedUser, setLoggedUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  function handleLogout() {
    localStorage.removeItem('user')
    window.location.href = "/login"
  }

  useEffect(() => {
    if (window.location.pathname !== pageStack[pageStack.length - 1]) {
      pageStack.push(window.location.pathname)
    }

    setIsFirstPage(pageStack.length === 1)
  }, [window.location.pathname])

  function historyBack() {
    if (isFirstPage) {
      return
    }

    pageStack.pop()
    navigate(pageStack.at(-1))
  }

  return (
    <div className="app-container">
      <header className="app-header d-flex justify-content-between align-items-center px-3">
        <div className="d-flex align-items-center">
          <button onClick={historyBack} className={`text-decoration-none back-btn ${isFirstPage ? 'invisible' : ''} me-2`}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <h1 className="mb-0 fs-4">MyTender</h1>
        </div>
        
        {loggedUser ? (
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small d-none d-md-inline" title={loggedUser.email}>
              {loggedUser.email}
            </span>
            <button onClick={handleLogout} className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2" title="Sair">
              <i className="bi bi-box-arrow-right"></i>
              <span className="d-none d-sm-inline">Sair</span>
            </button>
          </div>
        ) : (
          <div style={{ width: '40px' }}></div>
        )}
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<PageHome />} />
          <Route path="/balanca" element={<PageBalancaGeral />} />
          <Route path="/cardapio" element={<PageCardapio />} />
          <Route path="/produtos" element={<PageProdutos />} />
          <Route path="/produtos/novo" element={<PageProdutoNovo />} />
          <Route path="/produtos/:id" element={<PageProdutoView />} />
          <Route path="/login" element={<PageLogin />} />
          <Route path="/register" element={<PageRegister />} />
          <Route path="/comandas/:key" element={<PageComanda />} />
          <Route path="/comandas/:key/balanca" element={<PageBalanca />} />
          <Route path="/comandas/:key/delivery-fee" element={<PageDeliveryFee />} />
          <Route path="/cliente/:key" element={<PageClienteEntrada />} />
        </Routes>
      </main>

      <Toaster />
    </div>
  )
}

export default App
