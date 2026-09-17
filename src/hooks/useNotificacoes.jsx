import { useEffect, useRef } from "react"
import toast from "react-hot-toast"
import AuthEventSource from "../utils/authEventSource"
import { getToken } from "../services/http"
import {
    CAMINHOS, chaveDoEvento, descreverEvento, interpretarEvento, montarUrlDoEvento
} from "../services/notificacoes"
import { tocarTimbre, iniciarSirene } from "../services/alertaSonoro"

/**
 * Recebe os avisos em tempo real e transforma cada um num alerta na tela e num
 * som.
 *
 * Uma conexão por evento LIGADO (no máximo três): o servidor expõe um fluxo por
 * evento, então é isso que dá para fazer. Evento desligado na configuração não
 * abre conexão nenhuma — não adianta receber para descartar.
 *
 * A empresa vem do ambiente e o token da sessão: o servidor confere um contra o
 * outro e recusa token de outra empresa.
 */

/**
 * Quantas chaves lembrar para não repetir o mesmo aviso. Uma queda de conexão
 * faz o servidor reenviar o que já tinha mandado, e alerta duplicado no balcão é
 * ruído que ensina a ignorar o alerta.
 */
const MEMORIA_DE_CHAVES = 50

/**
 * Depois de tantas falhas seguidas, avisa uma vez que os avisos não estão
 * chegando. Silêncio aqui é pior que em qualquer outro erro de rede: a tela
 * continua bonita e o balcão acha que está sendo avisado quando não está.
 */
const FALHAS_ATE_AVISAR = 3

export function useNotificacoes({ config, alertas, ativo }) {
    const vistosRef = useRef([])
    const pararSireneRef = useRef(null)

    // guardados em ref para não reabrir as conexões a cada ajuste de volume:
    // reconectar por causa disso perderia eventos no intervalo
    const alertasRef = useRef(alertas)
    useEffect(() => {
        alertasRef.current = alertas
    }, [alertas])

    const base = import.meta.env.VITE_NOTIFICATION_SERVER
    const empresa = import.meta.env.VITE_ENTERPRISE_ID ?? 1

    // só os ids ligados entram na chave: mudar volume não deve reconectar, mas
    // ligar um evento deve abrir o fluxo dele
    const ligados = Object.entries(config ?? {})
        .filter(([, c]) => c?.ligado)
        .map(([id]) => id)
        .sort()
        .join(",")

    useEffect(() => {
        if (!ativo || !base || !ligados) return

        const token = getToken()
        if (!token) return

        const conexoes = []
        let falhas = 0
        let avisou = false

        for (const evento of ligados.split(",")) {
            const url = montarUrlDoEvento(base, empresa, CAMINHOS[evento])

            conexoes.push(new AuthEventSource(url, {
                token,
                onOpen: () => {
                    falhas = 0
                    avisou = false
                },
                onError: () => {
                    falhas++
                    if (falhas >= FALHAS_ATE_AVISAR && !avisou) {
                        avisou = true
                        toast.error("Os avisos em tempo real pararam de chegar. Recarregue a página.", { duration: 8000 })
                    }
                },
                onMessage: (data) => {
                    const dados = interpretarEvento(data)
                    const chave = chaveDoEvento(evento, dados)

                    if (vistosRef.current.includes(chave)) return

                    vistosRef.current = [chave, ...vistosRef.current].slice(0, MEMORIA_DE_CHAVES)

                    const cfg = config[evento]
                    const som = alertasRef.current
                    const { titulo, corpo } = descreverEvento(evento, dados)

                    if (som.somLigado) {
                        const timbre = som.timbres[cfg.severidade] ?? som.timbres.info
                        tocarTimbre(timbre, { volume: som.volume / 100 })

                        const pedeSirene =
                            som.sirene === "sempre" ? cfg.confirmar
                                : som.sirene === "urgente" ? cfg.severidade === "urgente"
                                    : false

                        if (pedeSirene && !pararSireneRef.current) {
                            pararSireneRef.current = iniciarSirene(som.timbreSirene, { volume: som.volume / 100 })
                        }
                    }

                    toast(
                        (t) => (
                            <span onClick={() => { calar(); toast.dismiss(t.id) }} style={{ cursor: "pointer" }}>
                                <strong>{titulo}</strong>
                                <br />
                                <span className="small">{corpo}</span>
                            </span>
                        ),
                        {
                            duration: cfg.confirmar ? Infinity : som.duracaoMs,
                            icon: cfg.severidade === "urgente" ? "🔴" : "🔔"
                        }
                    )
                }
            }))
        }

        return () => {
            for (const c of conexoes) c.close()
            calar()
        }
    }, [ativo, base, empresa, ligados, config])

    // a sirene não pode sobreviver à saída da tela
    useEffect(() => () => calar(), [])

    function calar() {
        pararSireneRef.current?.()
        pararSireneRef.current = null
    }
}
