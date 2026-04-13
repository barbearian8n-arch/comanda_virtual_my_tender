import { Routes, Route } from 'react-router-dom'
import PageComanda from './pages/Comanda'
import PageBalanca from './pages/Comanda/Balanca'
import PageHome from './pages/Home'
import PageBalancaGeral from './pages/BalancaGeral'
import PageProdutos from './pages/Produtos'
import PageProdutoView from './pages/ProdutoView'
import PageProdutoNovo from './pages/ProdutoNovo'
import PageCardapio from './pages/Cardapio'
import { useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useMemo, useState } from 'react'
import PageDeliveryFee from './pages/Comanda/DeliveryFee'

function App() {
  const navigate = useNavigate()
  const pageStack = useMemo(() => {
    if (window.location.pathname !== "/") {
      return ["/", window.location.pathname]
    }

    return ["/"]
  }, [])

  const [isFirstPage, setIsFirstPage] = useState(pageStack.length === 1)

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
      <header className="app-header">
        <button onClick={historyBack} className={`text-decoration-none back-btn ${isFirstPage ? 'invisible' : ''}`}>
          <i className="bi bi-chevron-left"></i>
        </button>
        <h1>MyTender</h1>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<PageHome />} />
          <Route path="/balanca" element={<PageBalancaGeral />} />
          <Route path="/cardapio" element={<PageCardapio />} />
          <Route path="/produtos" element={<PageProdutos />} />
          <Route path="/produtos/novo" element={<PageProdutoNovo />} />
          <Route path="/produtos/:id" element={<PageProdutoView />} />
          <Route path="/comandas/:key" element={<PageComanda />} />
          <Route path="/comandas/:key/balanca" element={<PageBalanca />} />
          <Route path="/comandas/:key/delivery-fee" element={<PageDeliveryFee />} />
        </Routes>
      </main>

      <Toaster />
    </div>
  )
}

export default App
