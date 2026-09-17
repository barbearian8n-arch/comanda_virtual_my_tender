import { useEffect, useState } from "react"
import { useAuth } from "../context/useAuth"
import { useNotificacoes } from "../hooks/useNotificacoes"
import { getAlertas } from "../services/alertas"
import { registrarSonsEnviados, liberarNoPrimeiroGesto } from "../services/alertaSonoro"

/**
 * Liga os avisos em tempo real ao som, para o painel inteiro.
 *
 * Fica acima das rotas de propósito: o balcão deixa a tela de comandas aberta o
 * dia todo, mas quem está em Produtos ou Mensagens precisa ser avisado do mesmo
 * jeito. Pendurado numa página só, o alerta calaria justamente quando alguém
 * saísse dela para resolver outra coisa.
 */
export default function AlertasProvider({ children }) {
    const { usuario, pode } = useAuth()
    const [dados, setDados] = useState(null)

    // Só carrega para quem pode ver a configuração; o resto do painel funciona
    // igual, sem alerta. Pedir para todo mundo daria 403 no console de quem não
    // tem a permissão, a cada carregamento.
    const habilitado = Boolean(usuario) && pode("config.manage")

    useEffect(() => {
        if (!habilitado) return

        let ativo = true

        getAlertas()
            .then((r) => {
                if (!ativo) return
                registrarSonsEnviados(r.sons ?? [])
                setDados(r)
            })
            .catch(() => {
                // sem config o painel segue funcionando, só não apita
                if (ativo) setDados(null)
            })

        return () => { ativo = false }
    }, [habilitado])

    // o navegador bloqueia áudio até o primeiro gesto; destrava assim que houver um
    useEffect(() => {
        if (!dados) return
        return liberarNoPrimeiroGesto(() => {})
    }, [dados])

    // `habilitado` entra aqui também, e não só no carregamento: quem perde a
    // permissão no meio da sessão para de receber na hora, sem depender de um
    // `setState` dentro do efeito para limpar o que já foi carregado
    useNotificacoes({
        config: dados?.notificacoes,
        alertas: dados?.alertas,
        ativo: habilitado && Boolean(dados)
    })

    return children
}
