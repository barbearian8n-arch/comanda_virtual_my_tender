import { useState } from "react"
import { Link } from "react-router-dom"
import { HandleResponse } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import { getProdutos } from "../services/produtos"
import { formatPrice } from "../utils/formatters"

export default function PageProdutos() {
    const [page, setPage] = useState(0)
    const limit = 10
    const response = useRequest(getProdutos, [page, limit], [page])

    return (
        <div className="d-flex flex-column h-100">
            <div className="page-content">
                <div className="d-flex justify-content-between align-items-center page-title-section">
                    <div>
                        <h4>Cardápio</h4>
                        <p className="subtitle">Lista de produtos</p>
                    </div>
                </div>
                <HandleResponse response={response}>
                    {(produtos) => (
                        <>
                            <div className="comandas-grid">
                                {produtos.map(produto => (
                                    <Link
                                        key={produto.id}
                                        to={`/produtos/${produto.id}`}
                                        className="comanda-card"
                                    >
                                        <div className="card-title">{produto.nome}</div>
                                        <p className="card-meta mt-1">{produto.descricao || 'Sem descrição'}</p>
                                        <div className="card-footer-row mt-2">
                                            <span className="fw-bold text-success">
                                                {formatPrice(produto.preco)}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-4">
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                >
                                    <i className="bi bi-chevron-left"></i> Anterior
                                </button>
                                <span className="fw-bold">Página {page + 1}</span>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={produtos.length < limit}
                                >
                                    Próxima <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        </>
                    )}
                </HandleResponse>
            </div>
        </div>
    )
}
