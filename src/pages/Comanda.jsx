import { useParams } from "react-router-dom"
import { useRequest } from "../hooks/useRequest"
import { getComanda, updateDeliveryFee } from "../services/comandas"
import { formatPhone, formatPrice, formatUnit, formatName } from "../utils/formatters"
import { calculateComandaTotals } from "../utils/calculations"
import { HandleResponse } from "../components/HandleResponse"
import { Link } from "react-router-dom"
import { useState } from "react"
import toast from "react-hot-toast"

export default function PageComanda() {
    const statusMap = {
        open: { label: "Aberta", class: "bg-success text-white" },
        weighing: { label: "Pesando", class: "bg-warning text-white" },
        confirming: { label: "Confirmando", class: "bg-warning text-white" },
        closed: { label: "Fechada", class: "bg-secondary text-white" }
    }

    const { key } = useParams()
    const comandaResp = useRequest(getComanda, [key])

    async function handleUpdateDeliveryFee(key, value) {
        await updateDeliveryFee(key, value)

        comandaResp.refetch()
    }

    return (
        <div className="d-flex flex-column h-100">
            <HandleResponse response={comandaResp}>
                {(data) => (
                    <>
                        <div className="page-content">
                            <div className="page-title-section">
                                <div>
                                    <h4>Comanda <span className="fw-normal text-muted">#{data.id}</span></h4>
                                    <p className="subtitle">Cliente: {formatName(data.contact.name)}</p>
                                    <p className="subtitle">Telefone: {formatPhone(data.contact.number_normalized)}</p>
                                    <p className="subtitle">
                                        Endereço da Entrega: {data.client_endereco}
                                        <Link to={`/comandas/${data.key}/delivery-fee`} className="btn btn-link p-0">
                                            <i className="bi bi-pencil text-muted"></i>
                                        </Link>
                                    </p>
                                </div>
                                <span className={`status-badge ${statusMap[data.status].class}`}>
                                    {statusMap[data.status].label}
                                </span>
                            </div>

                            <h5 className="fw-bold mb-3">Seus Pedidos</h5>
                            <Items items={data.items} />
                        </div>

                        <div className="app-footer">
                            <div className="d-flex flex-column flex-grow-1 me-4">
                                {(() => {
                                    const { subtotal, taxaEntrega, total } = calculateComandaTotals(data.items, data.delivery_fee);
                                    return (
                                        <>
                                            <div className="footer-detail-row">
                                                <span className="footer-detail-label">Subtotal</span>
                                                <span className="footer-detail-value">{formatPrice(subtotal)}</span>
                                            </div>
                                            <div className="footer-detail-row">
                                                <span className="footer-detail-label">Taxa de Entrega</span>
                                                <Editable initialValue={data.delivery_fee ?? ""} onSave={(value) => handleUpdateDeliveryFee(data.key, value)}>
                                                    {data.delivery_fee === null ? (
                                                        <span className="footer-detail-value not-defined">não definido</span>
                                                    ) : (
                                                        <span className="footer-detail-value">{taxaEntrega > 0 ? formatPrice(taxaEntrega) : "Grátis"}</span>
                                                    )}
                                                </Editable>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                                                <span className="footer-total-label">Total da Comanda</span>
                                                <span className="footer-total-value">
                                                    {formatPrice(total)}
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="d-flex flex-row gap-2 mt-3 mt-md-0">
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

function Editable({ onSave, children, initialValue = "" }) {
    const [status, setStatus] = useState("idle")
    const [value, setValue] = useState(initialValue)

    async function save() {
        try {
            setStatus("saving")
            await onSave(value)
            toast.success("Valor atualizado com sucesso!")
            setStatus("idle")
        } catch (error) {
            toast.error(error.message)
            setStatus("editing")
        }
    }

    function cancel() {
        setValue(initialValue)
        setStatus("idle")
    }

    function edit() {
        setStatus("editing")
    }

    if (status === "saving") {
        return (
            <span className="footer-detail-value not-defined d-flex align-items-center gap-2">
                <input type="text" className="form-control form-control-sm editable-input" onChange={(e) => setValue(e.target.value)} value={value} disabled />
                <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </span>
        )
    }

    if (status === "idle") {
        return (
            <span className="footer-detail-value not-defined d-flex align-items-center gap-2">
                {children}
                <button className="btn btn-link p-0" onClick={edit}>
                    <i className="bi bi-pencil text-muted"></i>
                </button>
            </span>
        )
    }

    if (status === "editing") {
        return (
            <span className="footer-detail-value not-defined d-flex align-items-center gap-2">
                <input type="text" className="form-control form-control-sm editable-input" onChange={(e) => setValue(e.target.value)} value={value} />
                <button className="btn btn-link p-0" onClick={save}>
                    <i className="bi bi-save text-success"></i>
                </button>
                <button className="btn btn-link p-0" onClick={cancel}>
                    <i className="bi bi-x text-danger"></i>
                </button>
            </span>
        )
    }

    console.error("Unknown status", status)
    return null
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
                <span className="item-name">{formatName(nome)}</span>
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
