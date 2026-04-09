import { useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { HandleResponse } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import { getProdutos, getCategorias } from "../services/produtos"
import { formatPrice } from "../utils/formatters"

export default function PageProdutos() {
    const [searchParams, setSearchParams] = useSearchParams()
    const page = searchParams.get("page") || 0
    const nome = searchParams.get("nome") || ""
    const categoria = searchParams.get("categoria") || ""
    const is_disponivel = searchParams.get("is_disponivel") || ""
    const limit = 10
    
    const response = useRequest(getProdutos, [page, limit, { nome, categoria, is_disponivel }], [page, nome, categoria, is_disponivel])
    const categoriasResponse = useRequest(getCategorias, [], [])

    function handlePageChange(newPage) {
        setSearchParams(prev => {
            prev.set("page", newPage)
            return prev
        })
    }

    function handleFilterSubmit(e) {
        e.preventDefault()
        const formData = new FormData(e.target)
        const novoNome = formData.get("nome")
        const novaCategoria = formData.get("categoria")
        const novoDisponivel = formData.get("is_disponivel")

        setSearchParams(prev => {
            if (novoNome) {
                prev.set("nome", novoNome)
            } else {
                prev.delete("nome")
            }

            if (novaCategoria) {
                prev.set("categoria", novaCategoria)
            } else {
                prev.delete("categoria")
            }

            if (novoDisponivel !== "") {
                prev.set("is_disponivel", novoDisponivel)
            } else {
                prev.delete("is_disponivel")
            }

            prev.set("page", 0)
            return prev
        })
    }

    return (
        <div className="d-flex flex-column h-100">
            <div className="page-content">
                <div className="d-flex justify-content-between align-items-center page-title-section mb-3">
                    <div>
                        <h4>Cardápio</h4>
                        <p className="subtitle mb-0">Lista de produtos</p>
                    </div>
                </div>

                <div className="mb-4">
                    <form onSubmit={handleFilterSubmit} className="d-flex gap-2">
                        <select
                            name="categoria"
                            className="form-select"
                            style={{ maxWidth: '200px' }}
                            defaultValue={categoria}
                        >
                            <option value="">Todas Categorias</option>
                            {categoriasResponse.data && categoriasResponse.data.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <select
                            name="is_disponivel"
                            className="form-select"
                            style={{ maxWidth: '150px' }}
                            defaultValue={is_disponivel}
                        >
                            <option value="">Status: Todos</option>
                            <option value="true">Ativos</option>
                            <option value="false">Inativos</option>
                        </select>
                        <input
                            type="text"
                            name="nome"
                            className="form-control"
                            placeholder="Buscar por nome..."
                            defaultValue={nome}
                        />
                        <button type="submit" className="btn btn-primary">
                            <i className="bi bi-search"></i>
                        </button>
                    </form>
                </div>

                <HandleResponse response={response}>
                    {(produtos) => (
                        <>
                            <div className="comandas-grid">
                                {produtos.map(produto => (
                                    <Link
                                        key={produto.id}
                                        to={`/produtos/${produto.id}`}
                                        className="comanda-card text-decoration-none"
                                        style={{ opacity: produto.is_disponivel === false ? 0.65 : 1 }}
                                    >
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="card-title mb-0">{produto.nome}</div>
                                            {produto.is_disponivel ? (
                                                <span className="badge bg-success ms-2">Ativo</span>
                                            ) : (
                                                <span className="badge bg-danger ms-2">Indisponível</span>
                                            )}
                                        </div>
                                        <div className="card-meta mt-2">
                                            {produto.categoria && (
                                                <span className="badge bg-secondary me-2">{produto.categoria}</span>
                                            )}
                                        </div>
                                        <div className="card-footer-row mt-2">
                                            <span className="fw-bold text-success">
                                                {formatPrice(produto.preco)}
                                            </span>
                                            <span className="card-meta">unid: {produto.unidade}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-4">
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => handlePageChange(Number(page) - 1)}
                                    disabled={page === 0}
                                >
                                    <i className="bi bi-chevron-left"></i> Anterior
                                </button>
                                <span className="fw-bold">Página {Number(page) + 1}</span>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => handlePageChange(Number(page) + 1)}
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
