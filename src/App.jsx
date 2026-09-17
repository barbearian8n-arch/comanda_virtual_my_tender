import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useMemo, useState } from 'react'
import PageComanda from './pages/Comanda'
import PageBalanca from './pages/Comanda/Balanca'
import PageHome from './pages/Home'
import PageProdutos from './pages/Produtos'
import PageProdutoView from './pages/ProdutoView'
import PageProdutoNovo from './pages/ProdutoNovo'
import PageCardapio from './pages/Cardapio'
import PageClienteEntrada from './pages/ClienteEntrada'
import PageMensagens from './pages/Mensagens'
import PageConfiguracoes from './pages/Configuracoes'
import PageWhatsApp from './pages/WhatsApp'
import PageUsuarios from './pages/Usuarios'
import PageAlertas from './pages/Alertas'
import PageDeliveryFee from './pages/Comanda/DeliveryFee'
import PageLogin from './pages/Login'
import RequireAuth from './components/RequireAuth'
import NavLateral from './components/NavLateral'
import AlertasProvider from './components/AlertasProvider'
import { LINKS_TOPO, LINKS_GESTAO, itemEstaAtivo } from './navegacao'
import { useAuth } from './context/useAuth'

function NavTopo({ caminhoAtual, pode }) {
  const disponiveis = LINKS_TOPO.filter(({ permissao }) => !permissao || pode(permissao))

  return (
    <nav className="nav-topo">
      {disponiveis.map((item) => {
        const { to, label, icone } = item
        const ativo = itemEstaAtivo(item, caminhoAtual)

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

// dropdown controlado por estado, e não pelo data-bs-toggle do Bootstrap:
// o menu precisa fechar ao navegar e marcar o item da rota atual
function MenuGestao({ caminhoAtual, pode }) {
  const [aberto, setAberto] = useState(false)

  const disponiveis = LINKS_GESTAO.filter(({ permissao }) => pode(permissao))

  // atendente não tem nenhuma delas: o botão some em vez de abrir um menu vazio
  if (disponiveis.length === 0) {
    return null
  }

  return (
    <div className="position-relative">
      <button
        type="button"
        className="btn btn-sm btn-outline-light menu-gestao-toggle d-flex align-items-center gap-2"
        onClick={() => setAberto(v => !v)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      >
        <i className="bi bi-sliders"></i>
        <span className="d-none d-sm-inline">Gestão</span>
      </button>

      {aberto && (
        <div className="menu-gestao">
          {disponiveis.map(({ to, label, icone }) => (
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
  const { usuario, sair, pode } = useAuth()

  const pageStack = useMemo(() => {
    if (window.location.pathname !== "/") {
      return ["/", window.location.pathname]
    }

    return ["/"]
  }, [])

  const [isFirstPage, setIsFirstPage] = useState(pageStack.length === 1)

  async function handleLogout() {
    await sair()
    navigate("/login", { replace: true })
  }

  useEffect(() => {
    if (window.location.pathname !== pageStack[pageStack.length - 1]) {
      pageStack.push(window.location.pathname)
    }

    setIsFirstPage(pageStack.length === 1)
  }, [location.pathname, pageStack])

  function historyBack() {
    if (isFirstPage) {
      return
    }

    pageStack.pop()
    navigate(pageStack.at(-1))
  }

  return (
    // `com-lateral` libera a largura total: sem login não há navegação, e a
    // coluna centrada de 960px continua sendo a melhor forma para a tela de entrada
    <div className={`app-container ${usuario ? "com-lateral" : ""}`}>
      <header className="app-header d-flex justify-content-between align-items-center px-3">
        <div className="d-flex align-items-center">
          <button onClick={historyBack} className={`text-decoration-none back-btn ${isFirstPage ? 'invisible' : ''} me-2`}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <h1 className="mb-0 fs-4">MyTender</h1>
        </div>

        {usuario && <NavTopo caminhoAtual={location.pathname} pode={pode} />}

        {usuario ? (
          <div className="d-flex align-items-center gap-3">
            <MenuGestao caminhoAtual={location.pathname} pode={pode} />

            <span className="app-header-usuario small d-none d-md-inline" title={`${usuario.email} · ${usuario.role}`}>
              {usuario.display_name || usuario.email}
            </span>

            <button onClick={handleLogout} className="btn btn-sm btn-outline-light d-flex align-items-center gap-2" title="Sair">
              <i className="bi bi-box-arrow-right"></i>
              <span className="d-none d-sm-inline">Sair</span>
            </button>
          </div>
        ) : (
          <div style={{ width: '40px' }}></div>
        )}
      </header>

      <AlertasProvider>
      <div className="app-body">
        {usuario && <NavLateral pode={pode} caminhoAtual={location.pathname} />}

        <main className="app-main">
        <Routes>
          {/* Abertas: é por aqui que o cliente final entra pelo link do WhatsApp.
              O cardápio e a comanda dele não têm conta nem senha — a credencial
              é o próprio link. */}
          <Route path="/login" element={<PageLogin />} />
          <Route path="/cardapio" element={<PageCardapio />} />
          <Route path="/cliente/:client_id" element={<PageClienteEntrada />} />

          {/* Balcão */}
          <Route path="/" element={<RequireAuth permissao="comanda.manage"><PageHome /></RequireAuth>} />
          <Route path="/comandas/:key" element={<RequireAuth permissao="comanda.manage"><PageComanda /></RequireAuth>} />
          <Route path="/comandas/:key/balanca" element={<RequireAuth permissao="comanda.manage"><PageBalanca /></RequireAuth>} />
          <Route path="/comandas/:key/delivery-fee" element={<RequireAuth permissao="comanda.manage"><PageDeliveryFee /></RequireAuth>} />

          {/* Administração */}
          <Route path="/produtos" element={<RequireAuth permissao="produto.manage"><PageProdutos /></RequireAuth>} />
          <Route path="/produtos/novo" element={<RequireAuth permissao="produto.manage"><PageProdutoNovo /></RequireAuth>} />
          <Route path="/produtos/:id" element={<RequireAuth permissao="produto.manage"><PageProdutoView /></RequireAuth>} />
          <Route path="/mensagens" element={<RequireAuth permissao="mensagem.view"><PageMensagens /></RequireAuth>} />
          <Route path="/whatsapp" element={<RequireAuth permissao="conexao.manage"><PageWhatsApp /></RequireAuth>} />
          <Route path="/configuracoes" element={<RequireAuth permissao="config.manage"><PageConfiguracoes /></RequireAuth>} />
          <Route path="/alertas" element={<RequireAuth permissao="config.manage"><PageAlertas /></RequireAuth>} />
          <Route path="/usuarios" element={<RequireAuth permissao="usuario.manage"><PageUsuarios /></RequireAuth>} />
          </Routes>
        </main>
      </div>
      </AlertasProvider>

      <Toaster />
    </div>
  )
}

export default App
