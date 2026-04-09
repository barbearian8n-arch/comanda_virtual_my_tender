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
                <div className="d-flex justify-content-between align-items-center page-title-section">
                    <div>
                        <h4>Comandas Abertas</h4>
                        <p className="subtitle">Lista de comandas abertas</p>
                    </div>
                    <div className="d-flex gap-2 flex-wrap justify-content-end">
                        <Link to="/cardapio" className="btn btn-danger fw-bold">
                            <i className="bi bi-journal-text me-2"></i> Cardápio
                        </Link>
                        <Link to="/produtos" className="btn btn-primary fw-bold">
                            <i className="bi bi-box me-2"></i> Produtos
                        </Link>
                        <Link to="/balanca" className="btn btn-warning fw-bold text-dark">
                            <i className="bi bi-speedometer2 me-2"></i> Balança
                        </Link>
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

    const isWeighing = comanda.items?.some(i => i.to_be_weighed || (i.menu_info && i.menu_info.unit === "kg") || i.base_unit === "kg") || comanda.is_weighing;

    return (
        <>
            <div className="card-title">Comanda do(a) {comanda.contact.name}</div>
            <p className="card-meta"><i className="bi bi-whatsapp me-1"></i> {formatPhone(comanda.contact.number_normalized)}</p>
            <div className="card-footer-row mt-2">
                <span className={`${statusColor[comanda.status]} fw-semibold small`}>{statusText[comanda.status]}</span>
                {isWeighing && <span className="badge bg-warning text-dark">Balança</span>}
            </div>
        </>
    )
}