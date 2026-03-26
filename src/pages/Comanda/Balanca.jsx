import { useState } from "react"
import { useParams } from "react-router-dom"
import { useRequest } from "../../hooks/useRequest"
import { getComanda, updateItem } from "../../services/comandas"
import { formatPrice, formatPhone } from "../../utils/formatters"
import { HandleResponse } from "../../components/HandleResponse"

export default function PageBalanca() {
    const { key } = useParams()
    const comandaKey = `comanda/${key}`
    const comandaResp = useRequest(getComanda, [comandaKey])

    return (
        <div className="d-flex flex-column h-100">
            <HandleResponse response={comandaResp}>
                {(data) => {
                    const weighableItems = data.items.filter(item => item.base_unit === "kg")

                    return (
                        <div className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <h4 className="fw-bold mb-0">Balança</h4>
                                    <p className="text-muted mb-0 small">Comanda #{data.id}</p>
                                    <p className="text-muted mb-0 small">Cliente: {data.contact.name}</p>
                                    <p className="text-muted mb-0 small">Telefone: {formatPhone(data.contact.number_normalized)}</p>
                                </div>
                                <span className="status-badge bg-warning text-dark">Pesagem</span>
                            </div>

                            <h5 className="fw-bold mb-3">Produtos para Pesagem</h5>
                            <Items items={weighableItems} comandaKey={comandaKey} refetch={comandaResp.refetch} />
                        </div>
                    )
                }}
            </HandleResponse>
        </div>
    )
}

function Items({ items, comandaKey, refetch }) {
    if (!items || items.length === 0) {
        return <p className="text-center text-muted mt-4">Nenhum produto para pesar.</p>
    }

    return (
        <div className="d-flex flex-column gap-3 mb-4">
            {items.map((item) => (
                <EditableItem key={item.id} item={item} comandaKey={comandaKey} onSaved={refetch} />
            ))}
        </div>
    )
}

function EditableItem({ item, comandaKey, onSaved }) {
    const [peso, setPeso] = useState(item.quantity)
    const [unit, setUnit] = useState(item.unit)
    const [price, setPrice] = useState(item.total_price)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        setSuccess(false)
        try {
            await updateItem(comandaKey, item.id, {
                quantity: parseFloat(peso),
                unit: unit,
                total_price: parseFloat(price)
            })
            setSuccess(true)
            setTimeout(() => setSuccess(false), 2000)
            if (onSaved) onSaved()
        } catch (error) {
            console.error("Erro ao salvar", error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="item-card d-flex flex-column" style={{ borderLeft: success ? '4px solid #10b981' : 'none' }}>
            <div className="d-flex justify-content-between align-items-start mb-3">
                <span className="item-name fs-5">{item.name}</span>
                <span className="badge bg-secondary">Preço ref: {formatPrice(item.unit_price)} por {item.base_unit}</span>
            </div>

            <div className="row g-2 mb-3">
                <div className="col-5">
                    <label className="form-label small text-muted mb-1">Peso/Quant</label>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        value={peso}
                        onChange={e => setPeso(e.target.value)}
                        step="0.01"
                    />
                </div>
                <div className="col-3">
                    <label className="form-label small text-muted mb-1">Unid</label>
                    <select
                        className="form-select form-select-sm"
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                    >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="u">u</option>
                        <option value="l">l</option>
                    </select>
                </div>
                <div className="col-4">
                    <label className="form-label small text-muted mb-1">Preço Final</label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">R$</span>
                        <input
                            type="number"
                            className="form-control"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            step="0.01"
                        />
                    </div>
                </div>
            </div>

            <button
                className={`btn btn-sm ${success ? 'btn-success' : 'btn-dark'} w-100 fw-bold rounded-pill`}
                onClick={handleSave}
                disabled={saving}
            >
                {saving ? 'Salvando...' : success ? 'Salvo!' : 'Salvar Pesagem'}
            </button>
        </div>
    )
}
