import { useParams } from "react-router-dom"
import { useRequest } from "../hooks/useRequest"
import { getComanda, updateDeliveryFee, updateComandaValues, finishComanda } from "../services/comandas"
import { formatPhone, formatPrice, formatUnit, formatName } from "../utils/formatters"
import { calculateComandaTotals } from "../utils/calculations"
import { HandleResponse } from "../components/HandleResponse"
import { useState } from "react"
import toast from "react-hot-toast"

export default function PageComanda() {
    const statusMap = {
        open: { label: "Aberta", class: "bg-success text-white" },
        weighing: { label: "Pesando", class: "bg-warning text-white" },
        closing: { label: "Fechando", class: "bg-warning text-white" },
        confirming: { label: "Confirmando", class: "bg-warning text-white" },
        closed: { label: "Fechada", class: "bg-secondary text-white" }
    }

    const { key } = useParams()
    const comandaResp = useRequest(getComanda, [key])

    const [isEditingValues, setIsEditingValues] = useState(false)
    const [editDeliveryFee, setEditDeliveryFee] = useState("")
    const [editTotalReal, setEditTotalReal] = useState("")
    const [isSavingValues, setIsSavingValues] = useState(false)
    const [isFinalizing, setIsFinalizing] = useState(false)

    async function handleUpdateDeliveryFee(key, value) {
        await updateDeliveryFee(key, value)

        comandaResp.refetch()
    }

    async function handleFinishComanda(data) {
        setIsFinalizing(true)
        toast.loading("Finalizando comanda...")

        try {
            await finishComanda(data.key)
            toast.dismiss()
            toast.success("Comanda finalizada com sucesso!")
        } catch (error) {
            toast.dismiss()
            toast.error(error.message)
        } finally {
            comandaResp.refetch()
            setIsFinalizing(false)
        }
    }

    function handleEditClick(data) {
        setIsEditingValues(true)
        setEditDeliveryFee(data.delivery_fee !== null ? data.delivery_fee : "")
        setEditTotalReal(data.total_real_price !== null ? data.total_real_price : "")
    }

    function handleCancelEdit() {
        setIsEditingValues(false)
    }

    async function handleSaveValues(data) {
        try {
            setIsSavingValues(true)
            await updateComandaValues(data.key, editTotalReal, editDeliveryFee)
            toast.success("Valores atualizados com sucesso!")
            setIsEditingValues(false)
            comandaResp.refetch()
        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsSavingValues(false)
        }
    }

    function formatDateTime(date) {
        if (!date) return "Não informado"
        if (date === "agora") return "Imediata"

        const dateObj = new Date(date)
        if (isNaN(dateObj.getTime())) return date
        return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + " às " + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="d-flex flex-column h-100">
            <HandleResponse response={comandaResp}>
                {(data) => (
                    <>
                        <div className="page-content">
                            <div className="page-title-section">
                                <div>
                                    <h4>
                                        Comanda
                                        <span className="fw-normal text-muted">#{data.id}</span>
                                        {data.delivery_date && data.delivery_date !== "agora" && (
                                            <span className="ms-3 badge bg-primary">Agendado</span>
                                        )}
                                    </h4>
                                    <p className="subtitle">Cliente: {formatName(data.contact.name)}</p>
                                    <p className="subtitle">Telefone: {formatPhone(data.contact.number_normalized)}</p>
                                    <p className="subtitle">Endereço da Entrega: {data.delivery_address || "Não informado"}</p>
                                    <p className="subtitle">Forma de Pagamento: {data.payment_method || "Não informado"}</p>
                                    {data.delivery_date && data.delivery_date !== "agora" && (
                                        <p className="subtitle">Data/Hora da Entrega: {formatDateTime(data.delivery_date)}</p>
                                    )}
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
                                    const { subtotal, subtotal_real, taxaEntrega, total } = calculateComandaTotals(data.items, data);
                                    return (
                                        <>
                                            <div className="footer-detail-row">
                                                <span className="footer-detail-label">Subtotal Estimado</span>
                                                <span className="footer-detail-value text-muted">{formatPrice(subtotal)}</span>
                                            </div>
                                            <div className="footer-detail-row align-items-center">
                                                <span className="footer-detail-label">Subtotal Real</span>
                                                {isEditingValues ? (
                                                    <input 
                                                        type="number" 
                                                        className="form-control form-control-sm w-50" 
                                                        value={editTotalReal} 
                                                        onChange={(e) => setEditTotalReal(e.target.value)} 
                                                    />
                                                ) : (
                                                    <span className="footer-detail-value d-flex flex-row align-items-center gap-1">
                                                        {formatPrice(subtotal_real ?? 0)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="footer-detail-row align-items-center">
                                                <span className="footer-detail-label">Taxa de Entrega</span>
                                                {isEditingValues ? (
                                                    <input 
                                                        type="number" 
                                                        className="form-control form-control-sm w-50" 
                                                        value={editDeliveryFee} 
                                                        onChange={(e) => setEditDeliveryFee(e.target.value)} 
                                                    />
                                                ) : (
                                                    data.delivery_fee === null ? (
                                                        <span className="footer-detail-value not-defined">não definido</span>
                                                    ) : (
                                                        <span className="footer-detail-value">{taxaEntrega > 0 ? formatPrice(taxaEntrega) : "Grátis"}</span>
                                                    )
                                                )}
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
                                {!isEditingValues ? (
                                    <div className="d-flex flex-column gap-2">
                                        <button onClick={() => handleEditClick(data)} disabled={isFinalizing} className="btn btn-dark rounded-pill px-4 fw-bold">
                                            <i className="bi bi-pencil me-2"></i> Editar
                                        </button>
                                        <button onClick={() => handleFinishComanda(data)} disabled={isFinalizing || data.status !== "closing" || data.total_real_price === 0} className="btn btn-dark rounded-pill px-4 fw-bold">
                                            <i className="bi bi-check me-2"></i> Finalizar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2 w-100">
                                        <button onClick={() => handleSaveValues(data)} disabled={isSavingValues} className="btn btn-success rounded-pill px-4 fw-bold">
                                            {isSavingValues ? "Salvando..." : "Salvar"}
                                        </button>
                                        <button onClick={handleCancelEdit} disabled={isSavingValues} className="btn btn-outline-danger rounded-pill px-4 fw-bold">
                                            Cancelar
                                        </button>
                                    </div>
                                )}
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
