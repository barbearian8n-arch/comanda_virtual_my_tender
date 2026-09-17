import { createApiClient } from "./http"

export class AgentAPI {
    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL
        this.axios = createApiClient()
    }

    async listSenders() {
        const response = await this.axios.get(`/ai/senders`)

        if (response.status !== 200) {
            throw new Error("Erro ao buscar os números de origem")
        }

        return response.data
    }

    async listConversations(sender) {
        const response = await this.axios.get(`/ai/conversations?sender=${encodeURIComponent(sender)}`)

        if (response.status !== 200) {
            throw new Error("Erro ao buscar as conversas")
        }

        return response.data
    }

    async sendMessage(sender, telefone, texto) {
        const response = await this.axios.post(`/ai/send`, { sender, telefone, texto })

        if (response.status !== 200) {
            throw new Error("Erro ao enviar a mensagem")
        }

        return response.data
    }

    async listMessages(sender, telefone) {
        const response = await this.axios.get(
            `/ai/messages?sender=${encodeURIComponent(sender)}&telefone=${encodeURIComponent(telefone)}`
        )

        if (response.status !== 200) {
            throw new Error("Erro ao buscar as mensagens")
        }

        return response.data
    }
}
