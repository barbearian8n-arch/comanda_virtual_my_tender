import { Link } from "react-router-dom"
import { HandleResponse } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import { getComandasWithKgItems } from "../services/comandas"
import { formatPhone } from "../utils/formatters"

export default function PageBalancaGeral() {
    const response = useRequest(getComandasWithKgItems)

    return (
        <div className="d-flex flex-column h-100">
            <div className="page-content">
                <div className="page-title-section">
                    <div>
                        <h4>Balança Geral</h4>
                        <p className="subtitle">Comandas com itens pendentes de pesagem</p>
                    </div>
                </div>
                <HandleResponse response={response}>
                    {(comandas) => {
                        if (comandas.length === 0) {
                            return <p className="text-center text-muted mt-5">Nenhuma comanda pendente de pesagem.</p>
                        }

                        return (
                            <div className="comandas-grid">
                                {comandas.map(comanda => (
                                    <Link
                                        key={comanda.key}
                                        to={`/comandas/${comanda.key}/balanca`}
                                        className="comanda-card"
                                    >
                                        <CardComanda comanda={comanda} />
                                    </Link>
                                ))}
                            </div>
                        )
                    }}
                </HandleResponse>
            </div>
        </div>
    )
}

function CardComanda({ comanda }) {
    const statusColor = {
        open: "text-success",
        closed: "text-danger"
    }

    const statusText = {
        open: "Aberta",
        closed: "Fechada"
    }

    // Calcula quantidade de itens pra pesar baseando na estrutura de APICommandItem
    // que tem to_be_weighed
    const pendingItemsCount = comanda.items 
        ? comanda.items.filter(i => i.to_be_weighed || (i.menu_info && i.menu_info.unit === "kg") || i.base_unit === "kg").length
        : 0;

    return (
        <>
            <div className="card-title">Comanda do(a) {comanda.contact.name}</div>
            <p className="card-meta"><i className="bi bi-whatsapp me-1"></i> {formatPhone(comanda.contact.number_normalized)}</p>
            <div className="card-footer-row mt-2">
                <span className={`${statusColor[comanda.status]} fw-semibold small`}>{statusText[comanda.status]}</span>
                <span className="badge bg-warning text-dark">{pendingItemsCount} item(s) p/ pesar</span>
            </div>
        </>
    )
}
