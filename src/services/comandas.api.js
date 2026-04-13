import axios from "axios"

export class ComandasAPI {
    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL
        this.axios = axios.create({
            baseURL: this.baseUrl,
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    async getComandas() {
        const response = await this.axios.get(`/comandas`)
        if (response.status !== 200) {
            throw new Error("Erro ao buscar comandas")
        }

        return response.data
    }

    async getComandasWithKgItems() {
        const comandas = await this.getComandas()
        return comandas.filter(comanda => 
            (comanda.items || []).some(item => item.to_be_weighed || (item.menu_info && item.menu_info.unit === "kg"))
        )
    }

    async getComanda(key) {
        const response = await this.axios.get(`/comandas?key=${key}`)

        if (response.status !== 200) {
            throw new Error("Erro ao buscar comanda")
        }

        return response.data
    }

    async updateItem(key, itemId, data) {
        const response = await this.axios.put(`/comandas/${key}/items/${itemId}`, data)
        if (response.status !== 200) {
            throw new Error("Erro ao atualizar item")
        }
        return response.data
    }

    async updateDeliveryFee(key, value) {
        const response = await this.axios.post(`/comandas/delivery-fee`, { key, value })
        if (response.status !== 200) {
            throw new Error("Erro ao atualizar taxa de entrega")
        }
        return response.data
    }

    async saveWeights(key, items) {
        const response = await this.axios.post(`/comandas/weights`, { key, items })
        if (response.status !== 200) {
            throw new Error("Erro ao salvar pesagens")
        }
        return response.data
    }

    async addItemToComanda(menuId, unit, quantity, estimatedPrice) {
        const response = await this.axios.post(`/comanda-cliente/items`, {
            menu_id: menuId,
            req_unit: unit,
            req_quantity: quantity,
            req_estimated_price: estimatedPrice
        }, { withCredentials: true })
        if (response.status !== 200) {
            throw new Error("Erro ao adicionar item")
        }
        return response.data
    }

    async removeItemFromComanda(itemId) {
        const response = await this.axios.delete(`/comanda-cliente/items?item_id=${itemId}`, {
            withCredentials: true
        })
        if (response.status !== 200) {
            throw new Error("Erro ao remover item")
        }
        return response.data
    }
}