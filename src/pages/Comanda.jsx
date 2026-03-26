import { useParams } from "react-router-dom"
import { useRequest } from "../hooks/useRequest"
import { getComanda } from "../services/comandas"
import { formatPhone, formatPrice, formatUnit } from "../utils/formatters"
import { HandleResponse } from "../components/HandleResponse"
import { Link } from "react-router-dom"

export default function PageComanda() {
    const { key } = useParams()
    const comandaResp = useRequest(getComanda, [key])

    return (
        <div className="d-flex flex-column h-100">
            <HandleResponse response={comandaResp}>
                {(data) => (
                    <>
                        <div className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <h4 className="fw-bold mb-0">Comanda <span className="fw-normal text-muted">#{data.id}</span></h4>
                                    <p className="text-muted mb-0 small">Cliente: {data.contact.name}</p>
                                    <p className="text-muted mb-0 small">Telefone: {formatPhone(data.contact.number_normalized)}</p>
                                </div>
                                <span className={`status-badge ${data.status}`}>
                                    {data.status === 'open' ? 'Aberta' : data.status}
                                </span>
                            </div>

                            <h5 className="fw-bold mb-3">Seus Pedidos</h5>
                            <Items items={data.items} />
                        </div>

                        <div className="app-footer">
                            <div className="d-flex flex-column gap-3">
                                <div className="d-flex flex-column justify-content-between">
                                    <span className="footer-total-label">Total da Comanda</span>
                                    <span className="footer-total-value">
                                        {formatPrice(data.items.reduce((acc, item) => acc + item.total_price, 0))}
                                    </span>
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    <span className="footer-total-label">Ações</span>
                                    <div className="d-flex flex-row gap-2">
                                        <button className="btn btn-dark rounded-pill px-4 fw-bold">
                                            Fechar Conta
                                        </button>
                                        <Link to={`/comandas/${data.key}/balanca`} className="btn btn-dark rounded-pill px-4 fw-bold">
                                            Balanca
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </HandleResponse>
        </div>
    )
}

function Items({ items }) {
    if (!items || items.length === 0) {
        return <p className="text-center text-muted">Nenhum item adicionado.</p>
    }

    return (
        <div className="d-flex flex-column gap-2 mb-4">
            {items.map((item) => (
                <Item key={item.id} item={item} />
            ))}
        </div>
    )
}

function Item({ item }) {
    return (
        <div className="item-card">
            <div className="d-flex justify-content-between align-items-start mb-1">
                <span className="item-name">{item.name}</span>
                <span className="item-price">{formatPrice(item.total_price)}</span>
            </div>
            <div className="d-flex justify-content-between align-items-center">
                <span className="item-meta">
                    {item.quantity} {formatUnit(item)} &times; {formatPrice(item.unit_price)}
                </span>
            </div>
        </div>
    )
}
