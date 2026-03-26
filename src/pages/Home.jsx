// página home com a lista de comandas abertas

import { Link } from "react-router-dom"
import { HandleResponse } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import { getComandas } from "../services/comandas"
import { formatPhone } from "../utils/formatters"

export default function PageHome() {
    const response = useRequest(getComandas)

    console.log(response)

    return (
        <div className="d-flex flex-column h-100">
            <div className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h4 className="fw-bold mb-0">Comandas Abertas</h4>
                        <p className="text-muted mb-0 small">Lista de comandas abertas</p>
                    </div>
                </div>
                <div className="list-group">
                    <HandleResponse response={response}>
                        {(comandas) =>
                            <div className="list-group">
                                {comandas.map(comanda => (
                                    <Link key={comanda.key} to={`/comandas/${comanda.key}`} className="list-group-item list-group-item-action">
                                        <CardComanda comanda={comanda} />
                                    </Link>
                                ))}
                            </div>
                        }
                    </HandleResponse>
                </div>
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
        <div className="card">
            <div className="card-body">
                <h5 className="card-title">Comanda do(a) {comanda.contact.name}</h5>
                <p className="card-text small text-muted"><i className="bi bi-whatsapp me-1"></i> {formatPhone(comanda.contact.number_normalized)}</p>
                <p className={`card-text ${statusColor[comanda.status]}`}>{statusText[comanda.status]}</p>
                {comanda.is_weighing && <span className="badge bg-warning">Balanca</span>}
            </div>
        </div>
    )
}