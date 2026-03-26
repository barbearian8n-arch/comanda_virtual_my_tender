import { useParams } from "react-router-dom"
import { useRequest } from "../hooks/useRequest"
import { getComanda } from "../services/comandas"

export default function PageComanda() {
    const { key } = useParams()
    // Mock expects "comanda/5511999999999" but params only has "5511999999999"
    const comandaKey = `comanda/${key}`
    const comandaResp = useRequest(getComanda, [comandaKey])

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
                            <div className="d-flex flex-column">
                                <span className="footer-total-label">Total Gasto</span>
                                <span className="footer-total-value">
                                    {formatPrice(data.items.reduce((acc, item) => acc + item.total_price, 0))}
                                </span>
                            </div>
                            <button className="btn btn-dark rounded-pill px-4 fw-bold">
                                Fechar Conta
                            </button>
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

function formatPhone(phone) {
    let reversed = reverseString(phone)
    reversed = reversed.replace(/(\d{4})(\d{4})(\d{2})(\d*)/, "$1,$2,$3,$4")

    const [countryCode, ddd, ...rest] = reversed.split(",").reverse().map(reverseString)
    return `+${countryCode} (${ddd}) ${rest.join("-")}`
}

function reverseString(str) {
    return str.split("").reverse().join("")
}

function formatUnit(item) {
    switch (item.unit) {
        case "u":
            return "un"
        case "kg":
            return "kg"
        case "g":
            return "g"
        case "l":
            return "l"
        default:
            return item.unit
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(price)
}

function HandleResponse({ response, children }) {
    const { data, loading, error } = response

    if (loading) return <Loading />
    if (error) return <Error error={error} />
    if (!data) return null

    return children(data)
}

function Loading() {
    return (
        <div className="loading-wrapper flex-grow-1">
            <div className="spinner-border text-danger mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="fw-medium">Buscando comanda...</p>
        </div>
    )
}

function Error({ error }) {
    return (
        <div className="p-4 text-center">
            <i className="bi bi-exclamation-circle text-danger fs-1 mb-3 d-block"></i>
            <h5 className="fw-bold">Ops, algo deu errado</h5>
            <p className="text-muted">{error.message}</p>
        </div>
    )
}
