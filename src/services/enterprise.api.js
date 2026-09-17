import { createApiClient } from "./http"

export class EnterpriseAPI {
    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL
        this.axios = createApiClient()
    }

    async getSchedules() {
        const response = await this.axios.get(`/enterprise/schedules`)

        if (response.status !== 200) {
            throw new Error("Erro ao buscar os horários")
        }

        return response.data
    }

    async saveSchedules(schedules) {
        const response = await this.axios.post(`/enterprise/schedules`, schedules)

        if (response.status !== 200) {
            throw new Error("Erro ao salvar os horários")
        }

        return response.data
    }

    // ---- Conexões de WhatsApp ----

    async listInstances() {
        const response = await this.axios.get(`/enterprise/instances`)

        if (response.status !== 200) {
            throw new Error("Erro ao buscar as conexões")
        }

        return response.data
    }

    async getInstanceState(id) {
        const response = await this.axios.get(`/enterprise/instances?id=${encodeURIComponent(id)}`)

        if (response.status !== 200) {
            throw new Error("Erro ao consultar a conexão")
        }

        return response.data
    }

    /** `acao` no corpo, e nunca o nome da instância — quem resolve o nome é o servidor. */
    async instanceAction(acao, dados = {}) {
        const response = await this.axios.post(`/enterprise/instances`, { acao, ...dados })

        if (response.status !== 200) {
            throw new Error("Erro ao executar a ação na conexão")
        }

        return response.data
    }

    async removeInstance(id) {
        const response = await this.axios.delete(`/enterprise/instances?id=${encodeURIComponent(id)}`)

        if (response.status !== 200) {
            throw new Error("Erro ao remover a conexão")
        }

        return response.data
    }
}
