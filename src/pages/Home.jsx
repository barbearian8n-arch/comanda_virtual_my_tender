// página home com a lista de comandas abertas

import { Link } from "react-router-dom"
import { HandleResponse } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import { getComandas } from "../services/comandas"
import { formatPhone } from "../utils/formatters"

export default function PageHome() {
    const response = useRequest(getComandas)

    return (
        <div className="d-flex flex-column h-100">
            <div className="page-content">
                <div className="page-title-section">
                    <div>
                        <h4>Comandas Abertas</h4>
                        <p className="subtitle">Lista de comandas abertas</p>
                    </div>
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
    const statusColor = {
        open: "text-success",
        closed: "text-danger"
    }

    const statusText = {
        open: "Aberta",
        closed: "Fechada"
    }

    return (
        <>
            <div className="card-title">Comanda do(a) {comanda.contact.name}</div>
            <p className="card-meta"><i className="bi bi-whatsapp me-1"></i> {formatPhone(comanda.contact.number_normalized)}</p>
            <div className="card-footer-row">
                <span className={`${statusColor[comanda.status]} fw-semibold small`}>{statusText[comanda.status]}</span>
                {comanda.is_weighing && <span className="badge bg-warning text-dark">Balança</span>}
            </div>
        </>
    )
}