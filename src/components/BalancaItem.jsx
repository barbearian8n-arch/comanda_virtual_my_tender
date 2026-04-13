import { useState, useEffect } from "react"
import { formatPrice, formatUnit } from "../utils/formatters"
import { calculateRealTotalPrice } from "../utils/calculations"

export function Items({ items, onWeightItemsChange }) {
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

export function EditableItem({ item: initialItem, onWeightItemsChange }) {
    const [item, setItem] = useState(() => {
        return {
            ...initialItem,
            real: {
                ...initialItem.real,
                quantity: 0,
                unit: "g",
                total_price: 0
            }
        }
    })
    const [changed, setChanged] = useState(false)

    useEffect(() => {
        if (item.real.unit === null) {
            changeItem("unit", item.requested.unit)
        }
    }, [initialItem])

    useEffect(() => {
        if (changed) {
            onWeightItemsChange(item.id, item)
        }
    }, [item.real?.quantity, item.real?.unit, item.real?.total_price, item.quantity, item.total_price])

    function handleMaskedChange(key, valueString, decimals) {
        let onlyDigits = valueString.replace(/\D/g, '');
        let numericValue = (parseInt(onlyDigits, 10) || 0) / Math.pow(10, decimals);
        handleChange(key, { target: { value: numericValue } });
    }

    function handleChange(key, e) {
        let value = e.target.value;

        changeItem(key, value)
    }

    function changeItem(key, value) {
        const newItem = { ...item, real: { ...(item.real || {}) } }
        newItem.real[key] = value;
        // retrocompatibility for old mocked types just in case
        newItem[key] = value;

        // Recalcular preço total se quantity ou unit mudar
        if (key === "quantity" || key === "unit") {
            newItem.real.total_price = calculateRealTotalPrice(newItem);
        }

        // retrocompatibility value sync
        newItem.total_price = newItem.real.total_price;
        newItem.quantity = newItem.real.quantity;
        newItem.unit = newItem.real.unit;

        newItem.to_be_weighed = false;

        setItem(newItem)
        setChanged(true)
    }

    function defineBorderColor() {
        if (changed) {
            return "#293ad6ff"
        }

        if (item.to_be_weighed || item.needs_be_weighed) {
            return "#6c757d"
        }

        return "#10b981"
    }

    const nome = item.menu_info.name;
    const basePrice = item.menu_info.price_per_unit;
    const baseUnit = item.menu_info.unit;

    const reqQty = item.requested.quantity;
    const reqUnit = item.requested.unit;
    const reqPrice = item.requested.estimated_price;
    const realQty = item.real.quantity;
    const realUnit = item.real.unit;
    const realTotal = item.real.total_price;

    const isIntegerUnit = realUnit === 'g' || realUnit === 'u';
    const qtyDecimals = isIntegerUnit ? 0 : 3;
    const displayQty = realQty !== '' ? Number(realQty).toFixed(qtyDecimals).replace('.', ',') : (isIntegerUnit ? '0' : '0,000');
    const displayTotal = realTotal !== '' ? Number(realTotal).toFixed(2).replace('.', ',') : '0,00';

    return (
        <div className="item-card d-flex flex-column" style={{ borderLeft: `4px solid ${defineBorderColor()}` }}>
            <div className="d-flex justify-content-between align-items-start mb-3">
                <span className="item-name fs-5">{nome.split(" - ")[0]}</span>
                <div className="d-flex flex-column align-items-end gap-2">
                    <span className="badge bg-secondary">Preço ref: {formatPrice(basePrice)} por {baseUnit}</span>
                    {
                        changed ? (
                            <span className="badge bg-success">Alterado</span>
                        ) : (item.to_be_weighed || item.needs_be_weighed) ? (
                            <span className="badge bg-dark">Precisa ser pesado</span>
                        ) : (
                            <span className="badge bg-success">Já pesado</span>
                        )}
                </div>
            </div>

            <div className="row mb-2">
                <div className="col-12 px-2 py-1 bg-light rounded text-muted mb-2 d-flex justify-content-between align-items-center">
                    <div>
                        <small className="fw-semibold d-block">Solicitado pelo cliente:</small>
                        <span className="fs-6 fw-bold text-dark">{reqQty} {formatUnit(reqUnit)}</span>
                    </div>
                    <div className="text-end">
                        <small className="fw-semibold d-block">Valor esperado:</small>
                        <span className="fs-6 fw-bold text-dark">{formatPrice(reqPrice)}</span>
                    </div>
                </div>
            </div>

            <div className="row g-2 mb-1">
                <div className="col-4">
                    <label className="form-label small fw-bold mb-1">Peso/Quant</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        className="form-control form-control-sm border-primary"
                        value={displayQty}
                        onChange={e => handleMaskedChange("quantity", e.target.value, qtyDecimals)}
                    />
                </div>
                <div className="col-4">
                    <label className="form-label small fw-bold mb-1">Unid Medida</label>
                    <select
                        className="form-select form-select-sm border-primary"
                        value={realUnit}
                        onChange={e => handleChange("unit", e)}
                    >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="u">unidade</option>
                    </select>
                </div>
                <div className="col-4">
                    <label className="form-label small fw-bold mb-1">Preço Final</label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text border-primary bg-primary text-white">R$</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            className="form-control border-primary"
                            value={displayTotal}
                            onChange={e => handleMaskedChange("total_price", e.target.value, 2)}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}