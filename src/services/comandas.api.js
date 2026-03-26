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

    async getComanda(key) {
        const response = await this.axios.get(`/comandas/${key}`)
        if (!response.ok) {
            throw new Error("Erro ao buscar comanda")
        }
        return await response.json()
    }

    async updateItem(key, itemId, data) {
        const response = await this.axios.put(`/comandas/${key}/items/${itemId}`, data)
        if (!response.ok) {
            throw new Error("Erro ao atualizar item")
        }
        return await response.json()
    }
}