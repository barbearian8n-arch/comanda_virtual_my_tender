import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useRequest } from "../../hooks/useRequest"
import { getComanda, saveWeights } from "../../services/comandas"
import { formatPhone } from "../../utils/formatters"
import { HandleResponse } from "../../components/HandleResponse"
import { Items } from "../../components/BalancaItem"

export default function PageDeliveryFee() {
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
                                    <h4>Taxa de Entrega</h4>
                                    <p className="subtitle">Comanda #{data.id}</p>
                                    <p className="subtitle">Cliente: {data.contact.name}</p>
                                    <p className="subtitle">Endereço: {data.client_endereco}</p>
                                    <label htmlFor="delivery-fee">Taxa de Entrega</label>
                                    <input type="text" className="form-control" id="delivery-fee" value={data.delivery_fee} onChange={(e) => handleItemChange(data.key, { delivery_fee: e.target.value })} />
                                </div>
                                <span className="status-badge bg-warning text-dark">{data.status}</span>
                            </div>

                            {/* confirm button */}
                            <button className="btn btn-dark rounded-pill px-4 fw-bold" onClick={handleSaveWeightedItems}>Confirmar</button>
                        </div>
                    )
                }}
            </HandleResponse>
        </div>
    )
}