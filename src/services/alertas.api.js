import { createApiClient } from "./http"

export class AlertasAPI {
    constructor() {
        this.axios = createApiClient()
    }

    /** Config + sons na mesma ida: a tela precisa dos dois para montar os seletores. */
    async get() {
        const response = await this.axios.get(`/enterprise/alertas`)
        return response.data
    }

    async salvar({ alertas, notificacoes }) {
        const response = await this.axios.post(`/enterprise/alertas`, { alertas, notificacoes })
        return response.data
    }

    /**
     * O arquivo sobe cru, como application/octet-stream, e o tipo real vai num
     * cabeçalho à parte: mandado como Content-Type, o corpo seria interpretado
     * em vez de chegar como Buffer no servidor.
     */
    async enviarSom(arquivo, { rotulo, duracaoMs }) {
        const query = new URLSearchParams({ rotulo })
        if (Number.isFinite(duracaoMs)) query.set("duracao_ms", String(Math.round(duracaoMs)))

        const response = await this.axios.post(`/enterprise/alerta-som?${query}`, arquivo, {
            headers: {
                "Content-Type": "application/octet-stream",
                "X-Som-Content-Type": arquivo.type
            }
        })
        return response.data
    }

    async renomearSom(id, rotulo) {
        const query = new URLSearchParams({ id, rotulo })
        const response = await this.axios.post(`/enterprise/alerta-som?${query}`, {})
        return response.data
    }

    async removerSom(id) {
        const response = await this.axios.delete(`/enterprise/alerta-som?id=${encodeURIComponent(id)}`)
        return response.data
    }
}
