/**
 * SSE com `Authorization: Bearer`.
 *
 * O `EventSource` nativo não deixa mandar cabeçalho, e o servidor de notificação
 * exige o token. Então o fluxo é lido por `fetch` + `ReadableStream`, e este
 * objeto reimplementa só o que se usa dele: `onmessage`, `onerror`, `close`.
 *
 * Reconecta sozinho com espera crescente. Quedas acontecem (proxy, wi-fi do
 * balcão, servidor reiniciando) e um alerta que para de chegar em silêncio é
 * pior que um erro na tela: a página continua bonita e ninguém desconfia.
 */
const ESPERA_INICIAL_MS = 1000
const ESPERA_MAXIMA_MS = 30000

export default class AuthEventSource {
    constructor(url, { token, onMessage, onError, onOpen } = {}) {
        this.url = url
        this.token = token
        this.onMessage = onMessage
        this.onError = onError
        this.onOpen = onOpen

        this.fechado = false
        this.espera = ESPERA_INICIAL_MS
        this.controller = null
        this.timer = null

        this.conectar()
    }

    async conectar() {
        if (this.fechado) return

        this.controller = new AbortController()

        try {
            const resposta = await fetch(this.url, {
                headers: {
                    Accept: "text/event-stream",
                    ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
                },
                signal: this.controller.signal
            })

            if (!resposta.ok) {
                throw new Error(`HTTP ${resposta.status}`)
            }

            // conectou: zera a espera para a próxima queda ser rápida de recuperar
            this.espera = ESPERA_INICIAL_MS
            this.onOpen?.()

            await this.lerFluxo(resposta.body)

            // o fluxo terminou sem erro — servidor encerrou; tenta de novo
            this.agendarReconexao()
        } catch (erro) {
            if (this.fechado || erro.name === "AbortError") return

            this.onError?.(erro)
            this.agendarReconexao()
        }
    }

    /**
     * Um evento SSE termina em linha em branco; os campos vêm como `campo: valor`.
     * Só `data:` interessa aqui — o servidor manda um evento por fluxo, então não
     * há `event:` para desambiguar.
     */
    async lerFluxo(body) {
        const leitor = body.getReader()
        const decodificador = new TextDecoder()
        let buffer = ""

        while (!this.fechado) {
            const { value, done } = await leitor.read()
            if (done) break

            buffer += decodificador.decode(value, { stream: true })

            let corte
            while ((corte = buffer.indexOf("\n\n")) !== -1) {
                const bruto = buffer.slice(0, corte)
                buffer = buffer.slice(corte + 2)

                const dados = bruto
                    .split("\n")
                    .filter((linha) => linha.startsWith("data:"))
                    .map((linha) => linha.slice(5).trim())
                    .join("\n")

                // heartbeat vem como comentário (`: ping`) e não tem `data:`
                if (dados) this.onMessage?.(dados)
            }
        }
    }

    agendarReconexao() {
        if (this.fechado) return

        this.timer = setTimeout(() => this.conectar(), this.espera)
        this.espera = Math.min(this.espera * 2, ESPERA_MAXIMA_MS)
    }

    close() {
        this.fechado = true
        if (this.timer) clearTimeout(this.timer)
        this.controller?.abort()
    }
}
