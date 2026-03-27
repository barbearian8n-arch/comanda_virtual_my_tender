import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useRequest } from "../../hooks/useRequest"
import { getComanda, saveWeights } from "../../services/comandas"
import { formatPrice, formatPhone } from "../../utils/formatters"
import { HandleResponse } from "../../components/HandleResponse"

export default function PageBalanca() {
    const { key } = useParams()
    const comandaResp = useRequest(getComanda, [key])
    const [weightItems, setWeightItems] = useState([])
    const [changedItems, setChangedItems] = useState({})

    useEffect(() => {
        if (comandaResp.data != null) {
            setWeightItems(comandaResp.data.items.filter(item => item.base_unit === "kg").map(item => ({ ...item, price: item.total_price })))
        }
    }, [comandaResp.data])

    const handleItemChange = (id, item) => {
        setWeightItems(prev => prev.map(i => i.id === id ? { ...i, ...item } : i))
        setChangedItems(prev => ({ ...prev, [id]: true }))
    }

    const handleSaveWeightedItems = async () => {
        try {
            if (!isAllItemsChanged() && !notifyNotAllItemsChanged()) {
                return
            }

            await saveWeights(key, weightItems)
            comandaResp.refetch()
        } catch (error) {
            console.error("Erro ao salvar pesagens:", error)
        }
    }

    const isAllItemsChanged = () => {
        return Object.keys(changedItems).length === weightItems.length
    }

    const notifyNotAllItemsChanged = () => {
        return confirm("Nem todos os itens foram pesados. Deseja continuar?")
    }

    return (
        <div className="d-flex flex-column h-100">
            <HandleResponse response={comandaResp}>
                {(data) => {
                    const weighableItems = data.items.filter(item => item.base_unit === "kg")

                    return (
                        <div className="page-content">
                            <div className="page-title-section">
                                <div>
                                    <h4>Balança</h4>
                                    <p className="subtitle">Comanda #{data.id}</p>
                                    <p className="subtitle">Cliente: {data.contact.name}</p>
                                    <p className="subtitle">Telefone: {formatPhone(data.contact.number_normalized)}</p>
                                </div>
                                <span className="status-badge bg-warning text-dark">Pesagem</span>
                            </div>

                            <h5 className="fw-bold mb-3">Produtos para Pesagem</h5>
                            <Items items={weighableItems} onWeightItemsChange={handleItemChange} />
                            <button className="btn btn-dark w-100" onClick={handleSaveWeightedItems}>Salvar Pesagens</button>
                        </div>
                    )
                }}
            </HandleResponse>
        </div>
    )
}

function Items({ items, onWeightItemsChange }) {
    if (!items || items.length === 0) {
        return <p className="text-center text-muted mt-4">Nenhum produto para pesar.</p>
    }

    return (
        <div className="balanca-grid mb-4">
            {items.map((item) => (
                <EditableItem key={item.id} item={item} onWeightItemsChange={onWeightItemsChange} />
            ))}
        </div>
    )
}

function EditableItem({ item: initialItem, onWeightItemsChange }) {
    const [item, setItem] = useState(initialItem)
    const [changed, setChanged] = useState(false)

    useEffect(() => {
        if (changed) {
            onWeightItemsChange(item.id, item)
        }
    }, [item.quantity, item.unit, item.total_price])

    function handleChange(key, e) {
        let value = e.target.value;
        const newItem = { ...item }

        if (key === "quantity" || key === "total_price") {
            value = parseFloat(value);
        }

        newItem[key] = value;

        if (key === "quantity" || item.unit === "kg") {
            newItem.total_price = newItem.quantity * newItem.base_price;
        }

        if (key === "quantity" || item.unit === "g") {
            newItem.total_price = newItem.quantity * newItem.base_price / 1000;
        }

        setItem(newItem)
        setChanged(true)
    }

    function defineBorderColor() {
        if (changed) {
            return "#293ad6ff"
        }

        if (item.needs_be_weighed) {
            return "#6c757d"
        }

        return "#10b981"
    }

    return (
        <div className="item-card d-flex flex-column" style={{ borderLeft: `4px solid ${defineBorderColor()}` }}>
            <div className="d-flex justify-content-between align-items-start mb-3">
                <span className="item-name fs-5">{item.name.split(" - ")[0]}</span>
                <div className="d-flex flex-column align-items-end gap-2">
                    <span className="badge bg-secondary">Preço ref: {formatPrice(item.base_price)} por {item.base_unit}</span>
                    {
                        changed ? (
                            <span className="badge bg-success">Alterado</span>
                        ) : item.needs_be_weighed ? (
                            <span className="badge bg-dark">Precisa ser pesado</span>
                        ) : (
                            <span className="badge bg-success">Já pesado</span>
                        )}
                </div>
            </div>

            <div className="row g-2 mb-3">
                <div className="col-5">
                    <label className="form-label small text-muted mb-1">Peso/Quant</label>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        value={item.quantity}
                        onChange={e => handleChange("quantity", e)}
                        step="0.01"
                    />
                </div>
                <div className="col-3">
                    <label className="form-label small text-muted mb-1">Unid</label>
                    <select
                        className="form-select form-select-sm"
                        value={item.unit}
                        onChange={e => handleChange("unit", e)}
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
                            value={item.total_price}
                            onChange={e => handleChange("total_price", e)}
                            step="0.01"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}