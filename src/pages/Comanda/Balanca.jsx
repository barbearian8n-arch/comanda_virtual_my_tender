import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useRequest } from "../../hooks/useRequest"
import { getComanda, saveWeights } from "../../services/comandas"
import { formatPhone } from "../../utils/formatters"
import { HandleResponse } from "../../components/HandleResponse"
import { Items } from "../../components/BalancaItem"

export default function PageBalanca() {
    const { key } = useParams()
    const comandaResp = useRequest(getComanda, [key])
    const [weightItems, setWeightItems] = useState([])
    const [changedItems, setChangedItems] = useState({})

    useEffect(() => {
        if (comandaResp.data != null) {
            setWeightItems(comandaResp.data.items.filter(item => item.to_be_weighed || (item.menu_info && item.menu_info.unit === "kg") || item.base_unit === "kg").map(item => ({ ...item })))
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
                    const weighableItems = data.items.filter(item => item.to_be_weighed || (item.menu_info && item.menu_info.unit === "kg") || item.base_unit === "kg")

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