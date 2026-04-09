import { useParams } from "react-router-dom"
import { useRequest } from "../hooks/useRequest"
import { HandleResponse } from "../components/HandleResponse"
import { getProduto } from "../services/produtos"
import { formatPrice } from "../utils/formatters"

export default function PageProdutoView() {
    const { id } = useParams()
    const response = useRequest(async () => getProduto(id), [id])

    return (
        <div className="d-flex flex-column h-100">
            <div className="page-content">
                <HandleResponse response={response}>
                    {(produto) => (
                        <>
                            <div className="d-flex justify-content-between align-items-center page-title-section">
                                <div>
                                    <h4>{produto.nome}</h4>
                                    <p className="subtitle">Detalhes do produto</p>
                                </div>
                            </div>
                            <div className="custom-card card-comanda-container">
                                <div>
                                    <div className="mb-3 d-flex gap-2">
                                        {produto.categoria && (
                                            <span className="badge bg-secondary">{produto.categoria}</span>
                                        )}
                                        {produto.is_disponivel ? (
                                            <span className="badge bg-success">Ativo</span>
                                        ) : (
                                            <span className="badge bg-danger">Indisponível</span>
                                        )}
                                    </div>
                                    <p className="card-meta mb-2">
                                        <strong>Unidade: </strong> {produto.unidade || 'N/A'}
                                    </p>
                                    {produto.descricao && (
                                        <p className="card-meta mb-2">
                                            <strong>Descrição: </strong><br/>
                                            {produto.descricao}
                                        </p>
                                    )}
                                    <p className="card-meta mt-3">
                                        <strong>Preço: </strong><br/>
                                        <span className="fs-5 text-success fw-bold">
                                            {formatPrice(produto.preco)}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </HandleResponse>
            </div>
        </div>
    )
}
