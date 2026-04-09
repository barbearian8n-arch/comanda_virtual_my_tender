import { useMemo, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useRequest } from "../hooks/useRequest"
import { getProdutos, getCategorias } from "../services/produtos"
import { HandleResponse } from "../components/HandleResponse"
import { formatPrice } from "../utils/formatters"

export default function PageCardapio() {
    const [searchParams, setSearchParams] = useSearchParams()
    const urlCategoria = searchParams.get("categoria")
    
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
        let filtered = response.data.filter(p => p.is_disponivel !== false) // Somente produtos ativos
        
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
                                                <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden" style={{ transition: 'transform 0.2s' }}>
                                                    <div className="card-body d-flex flex-column">
                                                        <h5 className="card-title fw-bold mb-1">{produto.nome}</h5>
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
        </div>
    )
}
