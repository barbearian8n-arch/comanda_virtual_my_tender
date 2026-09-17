import { useCallback, useEffect, useMemo, useState } from "react"
import { login as loginApi, logout as logoutApi, me } from "../services/auth"
import { setToken, getToken, EVENTO_SESSAO_EXPIRADA } from "../services/http"
import { AuthContext } from "./auth-context.js"

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null)

    /**
     * `carregando` começa true quando há token guardado: o app precisa perguntar
     * ao servidor se ele ainda vale antes de desenhar qualquer coisa. Sem isso a
     * tela piscaria o login no primeiro render de quem já estava logado.
     */
    const [carregando, setCarregando] = useState(() => Boolean(getToken()))

    const encerrar = useCallback(() => {
        setToken(null)
        setUsuario(null)
    }, [])

    /**
     * Revalida o token a cada abertura do app.
     *
     * Não basta ter token guardado: ele pode ter expirado, a sessão ter sido
     * revogada ou a conta desativada desde a última visita. Quem decide é o
     * servidor — o cliente só guarda a credencial.
     */
    useEffect(() => {
        if (!getToken()) {
            return
        }

        let ativo = true

        me()
            .then((dados) => {
                if (ativo) setUsuario(dados)
            })
            .catch(() => {
                if (ativo) encerrar()
            })
            .finally(() => {
                if (ativo) setCarregando(false)
            })

        return () => {
            ativo = false
        }
    }, [encerrar])

    // o interceptor do axios avisa quando alguma chamada voltou 401
    useEffect(() => {
        function aoExpirar() {
            setUsuario(null)
        }

        window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
        return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
    }, [])

    const entrar = useCallback(async (email, senha) => {
        const { token, usuario: dados } = await loginApi(email, senha)

        setToken(token)
        setUsuario(dados)

        return dados
    }, [])

    const sair = useCallback(async () => {
        // avisa o servidor para revogar a sessão, mas sai localmente de todo
        // jeito: falha de rede não pode prender ninguém dentro do painel
        await logoutApi().catch(() => {})
        encerrar()
    }, [encerrar])

    /**
     * As permissões vêm resolvidas do servidor, junto do usuário. O cliente não
     * deduz nada a partir do papel: quem manda é o mapa do servidor, e isto aqui
     * só decide o que desenhar. Quem barra de verdade é o middleware da rota.
     */
    const pode = useCallback(
        (permissao) => Boolean(usuario?.permissoes?.includes(permissao)),
        [usuario]
    )

    const valor = useMemo(
        () => ({ usuario, carregando, entrar, sair, pode }),
        [usuario, carregando, entrar, sair, pode]
    )

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
