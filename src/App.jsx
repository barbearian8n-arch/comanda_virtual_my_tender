import { Routes, Route, Link, useLocation } from 'react-router-dom'
import PageComanda from './pages/Comanda'
import PageBalanca from './pages/Comanda/Balanca'
import PageHome from './pages/Home'
import PageProdutos from './pages/Produtos'
import PageProdutoView from './pages/ProdutoView'
import PageProdutoNovo from './pages/ProdutoNovo'
import PageCardapio from './pages/Cardapio'
import PageClienteEntrada from './pages/ClienteEntrada'
import PageMensagens from './pages/Mensagens'
import { useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useMemo, useState } from 'react'
import PageDeliveryFee from './pages/Comanda/DeliveryFee'
import PageLogin from './pages/Login'
import PageRegister from './pages/Register'

// O topo fica só com o que o balcão usa o tempo todo. Cadastro e outras
// telas administrativas moram no menu Gestão — ver LINKS_GESTAO.
const LINKS_TOPO = [
  { to: "/", label: "Comandas", icone: "bi-receipt", exato: true },
  { to: "/cardapio", label: "Cardápio", icone: "bi-journal-text" }
]

function NavTopo({ caminhoAtual }) {
  return (
    <nav className="nav-topo">
      {LINKS_TOPO.map(({ to, label, icone, exato }) => {
        // "/" casaria com tudo em startsWith, então a home compara exato
        const ativo = exato ? caminhoAtual === to : caminhoAtual.startsWith(to)

        return (
          <Link
            key={to}
            to={to}
            title={label}
            className={`nav-topo-item ${ativo ? "is-ativo" : ""}`}
          >
            <i className={`bi ${icone}`}></i>
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

const LINKS_GESTAO = [
  { to: "/produtos", label: "Produtos", icone: "bi-box" },
  { to: "/mensagens", label: "Mensagens", icone: "bi-whatsapp" }
]

// dropdown próprio: o projeto não carrega o JS do Bootstrap
function MenuGestao({ caminhoAtual }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="position-relative">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
        onClick={() => setAberto(v => !v)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      >
        <i className="bi bi-sliders"></i>
        <span className="d-none d-sm-inline">Gestão</span>
      </button>

      {aberto && (
        <div className="menu-gestao">
          {LINKS_GESTAO.map(({ to, label, icone }) => (
            <Link
              key={to}
              to={to}
              className={`menu-gestao-item ${caminhoAtual.startsWith(to) ? "is-ativo" : ""}`}
              onClick={() => setAberto(false)}
            >
              <i className={`bi ${icone}`}></i>{label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
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

        <NavTopo caminhoAtual={location.pathname} />

        <div className="d-flex align-items-center gap-3">
          {/* Sem login em uso por enquanto — o menu de Gestão fica visível
              para todo mundo. Quando o login voltar a valer, isto pode
              voltar a ser condicionado a loggedUser. */}
          <MenuGestao caminhoAtual={location.pathname} />

          {loggedUser && (
            <>
              <span className="text-muted small d-none d-md-inline" title={loggedUser.email}>
                {loggedUser.email}
              </span>
              <button onClick={handleLogout} className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2" title="Sair">
                <i className="bi bi-box-arrow-right"></i>
                <span className="d-none d-sm-inline">Sair</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<PageHome />} />
          <Route path="/cardapio" element={<PageCardapio />} />
          <Route path="/produtos" element={<PageProdutos />} />
          <Route path="/produtos/novo" element={<PageProdutoNovo />} />
          <Route path="/produtos/:id" element={<PageProdutoView />} />
          <Route path="/mensagens" element={<PageMensagens />} />
          <Route path="/login" element={<PageLogin />} />
          <Route path="/register" element={<PageRegister />} />
          <Route path="/comandas/:key" element={<PageComanda />} />
          <Route path="/comandas/:key/balanca" element={<PageBalanca />} />
          <Route path="/comandas/:key/delivery-fee" element={<PageDeliveryFee />} />
          <Route path="/cliente/:client_id" element={<PageClienteEntrada />} />
        </Routes>
      </main>

      <Toaster />
    </div>
  )
}

export default App
