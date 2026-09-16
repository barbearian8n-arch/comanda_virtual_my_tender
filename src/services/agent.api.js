import axios from "axios"

export class AgentAPI {
    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL
        this.axios = axios.create({
            baseURL: this.baseUrl,
            headers: {
                "Content-Type": "application/json"
            }
        })
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

    /**
     * O arquivo sobe cru, como application/octet-stream, e o tipo real vai num
     * cabeçalho à parte: mandado como Content-Type, o corpo seria interpretado
     * em vez de chegar como Buffer no servidor.
     */
    async uploadAudio(sender, telefone, arquivo) {
        const response = await this.axios.post(
            `/ai/audio?sender=${encodeURIComponent(sender)}&telefone=${encodeURIComponent(telefone)}`,
            arquivo,
            {
                headers: {
                    "Content-Type": "application/octet-stream",
                    "X-Audio-Content-Type": arquivo.type
                }
            }
        )

        if (response.status !== 200) {
            throw new Error("Erro ao enviar o áudio")
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
