import { useState, useEffect } from "react"
import { formatPrice } from "../utils/formatters"
import { addItemToComanda } from "../services/comandas"
import { getValidUnits } from "../utils/productUnits"
import toast from "react-hot-toast"

function calcularEstimativa(produto, unit, quantity) {
    if (!quantity || quantity <= 0) return 0
    const qty = Number(quantity)
    if (unit === "u") {
        return qty * (produto.preco_por_uni ?? produto.preco ?? 0)
    }
    if (unit === "kg") {
        return qty * (produto.preco ?? 0)
    }
    if (unit === "g") {
        return (qty / 1000) * (produto.preco ?? 0)
    }
    return 0
}

function UnitSelector({ unidadesDisponiveis, unit, setUnit, onUnitChange }) {
    if (unidadesDisponiveis.length <= 1) return null;

    return (
        <div className="mb-3">
            <label className="form-label fw-semibold small mb-1">Unidade de medida</label>
            <div className="d-flex gap-2">
                {unidadesDisponiveis.map(opt => (
                    <button
                        key={opt.value}
                        className={`btn flex-fill rounded-3 fw-semibold ${unit === opt.value ? "btn-danger text-white" : "btn-outline-secondary"}`}
                        onClick={() => { setUnit(opt.value); onUnitChange(); }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

function QuantityInput({ unit, displayQty, onDigitChange }) {
    const symbol = unit === "g" ? "g" : unit === "kg" ? "kg" : "un";
    return (
        <div className="mb-3">
            <label className="form-label fw-semibold small mb-1">Quantidade</label>
            <div className="input-group">
                <span className="input-group-text border-danger bg-danger text-white fw-bold">
                    {symbol}
                </span>
                <input
                    type="text"
                    inputMode="numeric"
                    className="form-control border-danger fs-5 text-center"
                    value={displayQty}
                    onChange={e => onDigitChange(e.target.value)}
                />
            </div>
        </div>
    )
}

function EstimateDisplay({ estimativa, unit }) {
    return (
        <div
            className="rounded-3 px-3 py-3 mb-4 text-center"
            style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" }}
        >
            <span className="text-muted small d-block mb-1">Valor estimado</span>
            <span className="fw-bold fs-4 text-dark">{formatPrice(estimativa)}</span>
            {unit === "g" || unit === "kg" ? (
                <span className="d-block text-muted small mt-1">* o valor final é calculado após a pesagem</span>
            ) : null}
        </div>
    )
}

export default function ModalAdicionarItem({ produto, onClose, onAdded }) {
    const unidadesDisponiveis = getValidUnits(produto)
    const [unit, setUnit] = useState(unidadesDisponiveis[0]?.value ?? "u")
    const [rawCents, setRawCents] = useState(0)
    const [isSaving, setIsSaving] = useState(false)

    // Ajusta a unidade se as regras mudarem dinamicamente (fallback)
    useEffect(() => {
        if (!unidadesDisponiveis.find(u => u.value === unit)) {
            setUnit(unidadesDisponiveis[0]?.value ?? "u")
        }
    }, [unidadesDisponiveis, unit])

    const isDecimal = unit === "kg"
    const decimals = isDecimal ? 3 : 0
    const quantity = rawCents / Math.pow(10, decimals)
    const displayQty = rawCents !== 0
        ? quantity.toFixed(decimals).replace(".", ",")
        : (isDecimal ? "0,000" : "0")

    const estimativa = calcularEstimativa(produto, unit, quantity)

    function handleDigit(valueStr) {
        let onlyDigits = valueStr.replace(/\D/g, "")
        setRawCents(parseInt(onlyDigits, 10) || 0)
    }

    async function handleAdd() {
        if (quantity <= 0) {
            toast.error("Informe uma quantidade válida")
            return
        }
        try {
            setIsSaving(true)
            await addItemToComanda(produto.id, unit, quantity, estimativa)
            toast.success(`${produto.nome} adicionado!`)
            onAdded?.()
            onClose()
        } catch (e) {
            toast.error("Erro ao adicionar item")
            console.error(e)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-end justify-content-center"
            style={{ zIndex: 1050, background: "rgba(0,0,0,0.45)" }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-top-4 p-4 w-100"
                style={{ maxWidth: 480, animation: "slideUp 0.25s ease" }}
                onClick={e => e.stopPropagation()}
            >
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 className="fw-bold mb-0">{produto.nome}</h5>
                        {produto.categoria && (
                            <span className="badge bg-secondary small">{produto.categoria}</span>
                        )}
                    </div>
                    <button className="btn-close" onClick={onClose} />
                </div>

                <div className="bg-light rounded-3 px-3 py-2 mb-3 d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Preço base</span>
                    <span className="fw-bold text-success">
                        {formatPrice(produto.preco)}
                        <span className="text-muted fw-normal small ms-1">/ {produto.unidade}</span>
                    </span>
                </div>

                <UnitSelector 
                    unidadesDisponiveis={unidadesDisponiveis} 
                    unit={unit} 
                    setUnit={setUnit} 
                    onUnitChange={() => setRawCents(0)} 
                />

                <QuantityInput 
                    unit={unit} 
                    displayQty={displayQty} 
                    onDigitChange={handleDigit} 
                />

                <EstimateDisplay 
                    estimativa={estimativa} 
                    unit={unit} 
                />

                <button
                    className="btn btn-danger w-100 py-3 fw-bold rounded-3 fs-6"
                    onClick={handleAdd}
                    disabled={isSaving || quantity <= 0}
                >
                    {isSaving
                        ? <span className="spinner-border spinner-border-sm me-2" />
                        : <i className="bi bi-cart-plus me-2" />
                    }
                    {isSaving ? "Adicionando..." : "Adicionar ao Carrinho"}
                </button>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            `}</style>
        </div>
    )
}
