import axios from "axios"

export class ProdutosAPI {
    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL
        this.axios = axios.create({
            baseURL: this.baseUrl,
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    async getProdutos(page = 0, limit = 10, filters = {}) {
        let url = `/produtos?page=${page}&limit=${limit}`;
        if (filters.nome) {
            url += `&f_nome=${encodeURIComponent(filters.nome)}`;
        }
        if (filters.categoria) {
            url += `&f_categoria=${encodeURIComponent(filters.categoria)}`;
        }
        if (filters.is_disponivel !== undefined && filters.is_disponivel !== "") {
            url += `&f_disponivel=${encodeURIComponent(filters.is_disponivel)}`;
        }
        const response = await this.axios.get(url)
        if (response.status !== 200) {
            throw new Error("Erro ao buscar produtos")
        }
        return response.data
    }

    async getProduto(id) {
        const response = await this.axios.get(`/produtos?id=${id}`)
        if (response.status !== 200) {
            throw new Error("Erro ao buscar produto")
        }
        return response.data
    }

    async getCategorias() {
        const response = await this.axios.get(`/categorias`)
        if (response.status !== 200) {
            throw new Error("Erro ao buscar categorias")
        }
        return response.data
    }

    async updateProduto(id, data) {
        const response = await this.axios.put(`/produtos?id=${id}`, data)
        if (response.status !== 200) {
            throw new Error("Erro ao atualizar produto")
        }
        return response.data
    }

    async createProduto(data) {
        const response = await this.axios.post(`/produtos`, data)
        if (response.status !== 200) {
            throw new Error("Erro ao criar produto")
        }
        return response.data
    }

    async deleteProduto(id) {
        const response = await this.axios.delete(`/produtos?id=${id}`)
        if (response.status !== 200) {
            throw new Error("Erro ao deletar produto")
        }
        return response.data
    }
}
