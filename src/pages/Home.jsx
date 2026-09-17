// página home com a lista de comandas abertas

import { Link } from "react-router-dom"
import { HandleResponse } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import { getComandas } from "../services/comandas"
import { formatPhone, formatPrice, formatDateTime } from "../utils/formatters"
import { calculateComandaTotals } from "../utils/calculations"
import { descreverStatus, precisaPesar } from "../utils/comandaStatus"

export default function PageHome() {
    const response = useRequest(getComandas)

    return (
        <div className="d-flex flex-column h-100">
            <div className="page-content">
                {/* Cardápio, Produtos e Mensagens foram para a navegação do
                    cabeçalho: são atalhos globais, não ações desta tela — e de lá
                    ficam alcançáveis de qualquer página. */}
                <div className="page-title-section">
                    <h4>Comandas Abertas</h4>
                    <p className="subtitle">Lista de comandas abertas</p>
                </div>
                <HandleResponse response={response}>
                    {(comandas) => (
                        <div className="comandas-grid">
                            {comandas.map(comanda => (
                                <Link
                                    key={comanda.key}
                                    to={`/comandas/${comanda.key}`}
                                    className="comanda-card"
                                >
                                    <CardComanda comanda={comanda} />
                                </Link>
                            ))}
                        </div>
                    )}
                </HandleResponse>
            </div>
        </div>
    )
}

function CardComanda({ comanda }) {
    const status = descreverStatus(comanda.status)

    // mesma regra do rodapé da comanda: usa o valor real quando já pesado,
    // senão cai no estimado dos itens, sempre somando a taxa de entrega. Vindo
    // da mesma função, os dois números não têm como divergir.
    const { total } = calculateComandaTotals(comanda.items, comanda)

    const clienteId = comanda.contact?.lead_id

    return (
        <>
            <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="card-title mb-0">
                    Comanda do(a) {comanda.contact.name}{" "}
                    <span className="text-muted">#{comanda.id}</span>
                </div>

                {/* Abre a entrada do cliente em outra aba: é o jeito de conferir o
                    que ele vê sem sair da lista. `preventDefault` porque o card
                    inteiro é um link — sem isso, os dois navegariam de uma vez. */}
                {clienteId != null && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0 px-2 flex-shrink-0"
                        title="Abrir o cardápio como este cliente vê"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.open(`/cliente/${clienteId}`, "_blank", "noopener,noreferrer")
                        }}
                    >
                        <i className="bi bi-cart3"></i>
                    </button>
                )}
            </div>

            <p className="card-meta">
                <i className="bi bi-whatsapp me-1"></i> {formatPhone(comanda.contact.number_normalized)}
            </p>

            {comanda.created_at && (
                <p className="card-meta">
                    <i className="bi bi-calendar3 me-1"></i> {formatDateTime(comanda.created_at)}
                </p>
            )}

            {/* o agendamento é o que decide a operação do dia — na lista ele
                precisa aparecer sem ter de abrir a comanda */}
            {comanda.delivery_date && comanda.delivery_date !== "agora" && (
                <p className="card-meta text-warning-emphasis">
                    <i className="bi bi-clock me-1"></i> Agendada para {formatDateTime(comanda.delivery_date)}
                </p>
            )}

            <div className="card-footer-row mt-2">
                <span className={`badge ${status.classe}`}>{status.label}</span>
                <span className="fw-bold text-success">{formatPrice(total)}</span>
                {precisaPesar(comanda) && <span className="badge bg-warning text-dark">Balança</span>}
            </div>
        </>
    )
}
