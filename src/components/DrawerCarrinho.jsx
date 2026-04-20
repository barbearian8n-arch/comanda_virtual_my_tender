import { useState, useEffect, useCallback } from "react"
import { getComanda, removeItemFromComanda, closeComanda } from "../services/comandas"
import { formatPrice } from "../utils/formatters"
import toast from "react-hot-toast"

function getCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
    return match ? decodeURIComponent(match[1]) : null
}

function calcSubtotal(items) {
    return (items || []).reduce((acc, item) => {
        return acc + (item.real?.total_price || item.requested?.estimated_price || 0)
    }, 0)
}

export default function DrawerCarrinho({ open, onClose, onItemRemoved }) {
    const [comanda, setComanda] = useState(null)
    const [loading, setLoading] = useState(false)
    const [removingId, setRemovingId] = useState(null)
    const [deliveryMethod, setDeliveryMethod] = useState("entrega") // entrega | retirada
    const [address, setAddress] = useState("")

    const key = getCookie("comanda_key")

    const fetchComanda = useCallback(async () => {
        if (!key) return
        setLoading(true)
        try {
            const data = await getComanda(key)
            setComanda(data)
            if (data.delivery_address && !address) {
                if (data.delivery_address === "Retirada no local") {
                    setDeliveryMethod("retirada")
                    setAddress("")
                } else {
                    setDeliveryMethod("entrega")
                    setAddress(data.delivery_address)
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [key])

    useEffect(() => {
        if (open) fetchComanda()
    }, [open, fetchComanda])

    async function handleRemove(itemId) {
        try {
            setRemovingId(itemId)
            await removeItemFromComanda(itemId)
            toast.success("Item removido")
            onItemRemoved?.()
            fetchComanda()
        } catch (e) {
            toast.error("Erro ao remover item")
            console.error(e)
        } finally {
            setRemovingId(null)
        }
    }

    async function handleCloseComanda() {
        if (deliveryMethod === "entrega" && !address.trim()) {
            toast.error("Por favor, informe o endereço de entrega")
            return
        }

        try {
            setLoading(true)
            const finalAddress = deliveryMethod === "retirada" ? "Retirada no local" : address
            await updateComandaValues(key, undefined, undefined, finalAddress)
            await closeComanda(key)
            toast.success("Comanda fechada com sucesso!")
            onClose?.()
            fetchComanda()
        } catch (e) {
            toast.error("Erro ao fechar comanda")
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const items = comanda?.items ?? []
    const subtotal = calcSubtotal(items)

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100"
                    style={{ zIndex: 1040, background: "rgba(0,0,0,0.4)" }}
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className="position-fixed bottom-0 start-0 w-100 bg-white rounded-top-4 d-flex flex-column"
                style={{
                    zIndex: 1045,
                    maxHeight: "80vh",
                    transform: open ? "translateY(0)" : "translateY(100%)",
                    transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
                    boxShadow: "0 -4px 32px rgba(0,0,0,0.18)"
                }}
            >
                {/* Handle */}
                <div className="d-flex justify-content-center pt-3 pb-1">
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d1d5db" }} />
                </div>

                {/* Header */}
                <div className="d-flex justify-content-between align-items-center px-4 pb-3 pt-1 border-bottom">
                    <div>
                        <h5 className="fw-bold mb-0">
                            <i className="bi bi-cart3 me-2 text-danger" />
                            Meu Carrinho
                        </h5>
                        <span className="text-muted small">{items.length} {items.length === 1 ? "item" : "itens"}</span>
                    </div>
                    <button className="btn-close" onClick={onClose} />
                </div>

                {/* Conteúdo */}
                <div className="flex-grow-1 overflow-auto px-4 py-3">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-danger" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="bi bi-cart-x fs-1 d-block mb-3" />
                            <p>Seu carrinho está vazio.<br />Adicione itens do cardápio.</p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {items.map(item => (
                                <div key={item.id} className="d-flex align-items-center gap-3 p-3 bg-light rounded-3">
                                    <div className="flex-grow-1">
                                        <div className="fw-semibold">{item.menu_info?.name ?? item.name}</div>
                                        <div className="text-muted small">
                                            {item.requested?.quantity} {item.requested?.unit}
                                            {item.menu_info?.unit === "kg" && (
                                                <span className="ms-2 badge bg-warning text-dark">pesagem</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-end me-2">
                                        <div className="fw-bold text-success small">
                                            {formatPrice(item.real?.total_price || item.requested?.estimated_price || 0)}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: "0.7rem" }}>estimado</div>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-outline-danger rounded-3"
                                        onClick={() => handleRemove(item.id)}
                                        disabled={removingId === item.id}
                                    >
                                        {removingId === item.id
                                            ? <span className="spinner-border spinner-border-sm" />
                                            : <i className="bi bi-trash" />
                                        }
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                

                    {/* Rodapé com total e ações */}
                    <div className="px-4 py-3 border-top bg-white">
                        {items.length > 0 && (
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="text-muted fw-semibold">Total estimado</span>
                                    <span className="fw-bold fs-5 text-success">{formatPrice(subtotal)}</span>
                                </div>
                                
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Como deseja receber seu pedido?</label>
                                    <div className="d-flex gap-3">
                                        <div className="form-check">
                                            <input 
                                                className="form-check-input" 
                                                type="radio" 
                                                name="deliveryMethod" 
                                                id="methodEntrega" 
                                                checked={deliveryMethod === 'entrega'}
                                                onChange={() => setDeliveryMethod('entrega')}
                                            />
                                            <label className="form-check-label small" htmlFor="methodEntrega">
                                                Entrega
                                            </label>
                                        </div>
                                        <div className="form-check">
                                            <input 
                                                className="form-check-input" 
                                                type="radio" 
                                                name="deliveryMethod" 
                                                id="methodRetirada" 
                                                checked={deliveryMethod === 'retirada'}
                                                onChange={() => setDeliveryMethod('retirada')}
                                            />
                                            <label className="form-check-label small" htmlFor="methodRetirada">
                                                Busca no local
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {deliveryMethod === 'entrega' && (
                                    <div className="mb-4">
                                        <label htmlFor="address" className="form-label small fw-bold text-muted">Endereço da entrega</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white border-end-0">
                                                <i className="bi bi-geo-alt text-danger"></i>
                                            </span>
                                            <input 
                                                type="text" 
                                                id="address"
                                                className="form-control border-start-0 ps-0" 
                                                placeholder="Rua, número, bairro..." 
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <p className="text-muted small mb-3">
                                    * itens em kg serão calculados após a pesagem
                                </p>
                                
                                <button 
                                    className="btn btn-success w-100 py-3 fw-bold rounded-3" 
                                    onClick={handleCloseComanda}
                                >
                                    <i className="bi bi-check-circle me-2" />
                                    Fechar Pedido
                                </button>
                            </div>
                        )}

                        <button 
                            className="btn btn-outline-secondary w-100 py-2 fw-semibold rounded-3" 
                            onClick={() => {
                                document.cookie = "comanda_key=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
                                window.location.href = "/cardapio"
                            }}
                        >
                            <i className="bi bi-box-arrow-right me-2" />
                            Sair da Comanda 
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
