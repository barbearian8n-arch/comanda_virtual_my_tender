import { useMemo, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useRequest } from "../hooks/useRequest"
import { getProdutos, getCategorias } from "../services/produtos"
import { HandleResponse } from "../components/HandleResponse"
import { formatPrice } from "../utils/formatters"
import ModalAdicionarItem from "../components/ModalAdicionarItem"
import DrawerCarrinho from "../components/DrawerCarrinho"

function getCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
    return match ? decodeURIComponent(match[1]) : null
}

export default function PageCardapio() {
    const [searchParams, setSearchParams] = useSearchParams()
    const urlCategoria = searchParams.get("categoria")
    const [produtoSelecionado, setProdutoSelecionado] = useState(null)
    const [carrinhoOpen, setCarrinhoOpen] = useState(false)
    const [carrinhoCount, setCarrinhoCount] = useState(0)

    const comandaKey = getCookie("comanda_key")
    const modoCliente = !!comandaKey

    const categoriasResponse = useRequest(getCategorias, [], [])

    useEffect(() => {
        if (categoriasResponse.data && urlCategoria === null) {
            if (categoriasResponse.data.length > 0) {
                setSearchParams({ categoria: categoriasResponse.data[0] }, { replace: true })
            } else {
                setSearchParams({ categoria: "todos" }, { replace: true })
            }
        }
    }, [categoriasResponse.data, urlCategoria, setSearchParams])

    const selectedCategoria = urlCategoria === "todos" ? "" : (urlCategoria || "")
    const requestDependency = urlCategoria === null ? "waiting" : urlCategoria;

    const response = useRequest(async () => {
        if (urlCategoria === null) return Promise.resolve([])
        
        const filters = {}
        if (selectedCategoria) {
            filters.categoria = selectedCategoria
        }
        
        return getProdutos(0, -1, filters)
    }, [requestDependency], [requestDependency])

    const produtosAgrupados = useMemo(() => {
        if (!response.data) return {}
        let filtered = response.data.filter(p => p.is_disponivel !== false)
        
        const agrupados = {}
        for (const p of filtered) {
            const cat = p.categoria || "Outros"
            if (!agrupados[cat]) agrupados[cat] = []
            agrupados[cat].push(p)
        }
        
        return agrupados
    }, [response.data])

    const isTodosActive = urlCategoria === "todos"

    return (
        <div className="d-flex flex-column h-100 pb-4">
            <div className="page-content bg-white shadow-sm p-4 text-center rounded-bottom mb-3 mx-3 mt-3 rounded-4">
                <h3 className="mb-1 fw-bold text-danger">Nosso Cardápio</h3>
                <p className="text-muted small mb-0">Confira nossas opções e faça seu pedido!</p>
            </div>

            <HandleResponse response={categoriasResponse}>
                {(categorias) => (
                    <div className="px-3 pb-3 overflow-auto d-flex" style={{ whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
                        <button
                            className={`btn rounded-pill me-2 px-4 shadow-sm fw-semibold border-0 ${isTodosActive ? 'btn-danger text-white' : 'bg-white text-dark'}`}
                            onClick={() => setSearchParams({ categoria: "todos" })}
                            style={{ transition: '0.2s', minWidth: 'fit-content' }}
                        >
                            Todos
                        </button>
                        {categorias.map(cat => (
                            <button
                                key={cat}
                                className={`btn rounded-pill me-2 px-4 shadow-sm fw-semibold border-0 ${selectedCategoria === cat ? 'btn-danger text-white' : 'bg-white text-dark'}`}
                                onClick={() => setSearchParams({ categoria: cat })}
                                style={{ transition: '0.2s', minWidth: 'fit-content' }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
            </HandleResponse>

            <div className="flex-grow-1 px-3">
                <HandleResponse response={response}>
                    {() => (
                        <div>
                            {Object.entries(produtosAgrupados).map(([categoria, produtos]) => (
                                <div key={categoria} className="mb-4">
                                    <h5 className="fw-bold mb-3 text-secondary ps-1 mt-1 border-bottom pb-2">{categoria}</h5>
                                    <div className="row g-3">
                                        {produtos.map(produto => (
                                            <div key={produto.id} className="col-12 col-md-6 col-lg-4">
                                                <div
                                                    className={`card h-100 border-0 shadow-sm rounded-4 overflow-hidden ${modoCliente ? 'card-hover' : ''}`}
                                                    style={{ transition: 'transform 0.2s', cursor: modoCliente ? 'pointer' : 'default' }}
                                                    onClick={() => modoCliente && setProdutoSelecionado(produto)}
                                                >
                                                    <div className="card-body d-flex flex-column">
                                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                                            <h5 className="card-title fw-bold mb-0 flex-grow-1">{produto.nome}</h5>
                                                            {modoCliente && (
                                                                <span className="ms-2 text-danger fs-5">
                                                                    <i className="bi bi-plus-circle-fill" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        {produto.descricao && (
                                                            <p className="card-text text-muted small flex-grow-1 mb-2">
                                                                {produto.descricao}
                                                            </p>
                                                        )}
                                                        <div className="d-flex justify-content-between align-items-end mt-auto pt-2 border-top">
                                                            <div>
                                                                <span className="fw-bold fs-5 text-success">
                                                                    {formatPrice(produto.preco)}
                                                                </span>
                                                                {produto.unidade && (
                                                                    <span className="text-muted ms-1 small">/ {produto.unidade}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(produtosAgrupados).length === 0 && (
                                <div className="col-12 text-center py-5 text-muted bg-white rounded-4 shadow-sm mt-3">
                                    <i className="bi bi-box-seam fs-1 d-block mb-3"></i>
                                    <p>Nenhum produto encontrado nesta categoria.</p>
                                </div>
                            )}
                        </div>
                    )}
                </HandleResponse>
            </div>

            {/* FAB – Carrinho (somente em modo cliente) */}
            {modoCliente && (
                <button
                    className="btn btn-danger rounded-circle shadow-lg position-fixed d-flex align-items-center justify-content-center"
                    style={{
                        bottom: 24, right: 24,
                        width: 60, height: 60,
                        fontSize: 24, zIndex: 1000,
                        boxShadow: "0 4px 20px rgba(220,38,38,0.4)"
                    }}
                    onClick={() => setCarrinhoOpen(true)}
                    title="Ver carrinho"
                >
                    <i className="bi bi-cart3" />
                    {carrinhoCount > 0 && (
                        <span
                            className="position-absolute top-0 end-0 badge rounded-pill bg-dark"
                            style={{ fontSize: "0.65rem" }}
                        >
                            {carrinhoCount}
                        </span>
                    )}
                </button>
            )}

            {/* Modal de pedido */}
            {modoCliente && produtoSelecionado && (
                <ModalAdicionarItem
                    produto={produtoSelecionado}
                    onClose={() => setProdutoSelecionado(null)}
                    onAdded={() => setCarrinhoCount(c => c + 1)}
                />
            )}

            {/* Drawer de carrinho */}
            {modoCliente && (
                <DrawerCarrinho
                    open={carrinhoOpen}
                    onClose={() => setCarrinhoOpen(false)}
                    onItemRemoved={() => setCarrinhoCount(c => Math.max(0, c - 1))}
                />
            )}

            <style>{`
                .card-hover:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(220,38,38,0.15) !important;
                }
            `}</style>
        </div>
    )
}
