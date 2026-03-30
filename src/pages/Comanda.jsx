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
                        <div className="page-content">
                            <div className="page-title-section">
                                <div>
                                    <h4>Comanda <span className="fw-normal text-muted">#{data.id}</span></h4>
                                    <p className="subtitle">Cliente: {data.contact.name}</p>
                                    <p className="subtitle">Telefone: {formatPhone(data.contact.number_normalized)}</p>
                                    <p className="subtitle">Endereço da Entrega: {console.log(data) || data.client_endereco}</p>
                                </div>
                                <span className={`status-badge ${data.status}`}>
                                    {data.status === 'open' ? 'Aberta' : data.status}
                                </span>
                            </div>

                            <h5 className="fw-bold mb-3">Seus Pedidos</h5>
                            <Items items={data.items} />
                        </div>

                        <div className="app-footer">
                            <div className="d-flex flex-column">
                                <span className="footer-total-label">Total da Comanda</span>
                                <span className="footer-total-value">
                                    {formatPrice(data.items.reduce((acc, item) => acc + (item.real?.total_price || item.requested?.estimated_price || item.total_price || 0), 0))}
                                </span>
                            </div>
                            <div className="d-flex flex-row gap-2 mt-3 mt-md-0">
                                <button className="btn btn-dark rounded-pill px-4 fw-bold">
                                    Fechar Conta
                                </button>
                                <Link to={`/comandas/${data.key}/balanca`} className="btn btn-dark rounded-pill px-4 fw-bold">
                                    Balança
                                </Link>
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
        <div className="items-grid mb-4">
            {items.map((item) => (
                <Item key={item.id} item={item} />
            ))}
        </div>
    )
}

function Item({ item }) {
    const nome = item.menu_info?.name || item.name;
    const finalPrice = item.real?.total_price || item.requested?.estimated_price || item.total_price || 0;
    const qty = item.real?.quantity || item.requested?.quantity || item.quantity;
    const unit = item.real?.unit || item.requested?.unit || item.unit;
    const unitPrice = item.menu_info?.price_per_unit || item.unit_price || 0;

    return (
        <div className="item-card">
            <div className="d-flex justify-content-between align-items-start mb-1">
                <span className="item-name">{nome}</span>
                <span className="item-price">{formatPrice(finalPrice)}</span>
            </div>
            <div className="d-flex justify-content-between align-items-center">
                <span className="item-meta">
                    {qty} {formatUnit({unit})} &times; {formatPrice(unitPrice)}
                </span>
            </div>
        </div>
    )
}
