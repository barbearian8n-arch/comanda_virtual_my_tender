import axios from "axios"

/**
 * Cliente HTTP único do painel.
 *
 * Cada serviço criava o seu `axios.create`, e com login isso vira armadilha:
 * bastaria um esquecer de anexar o token para aquela tela quebrar com 401 sem
 * ninguém entender por quê. Aqui o token entra em TODAS as chamadas, por
 * construção.
 */

const CHAVE_TOKEN = "token"

export function getToken() {
    try {
        return localStorage.getItem(CHAVE_TOKEN)
    } catch {
        // navegador com storage bloqueado: sem token, a tela cai no login
        return null
    }
}

export function setToken(token) {
    try {
        if (token) {
            localStorage.setItem(CHAVE_TOKEN, token)
        } else {
            localStorage.removeItem(CHAVE_TOKEN)
        }
    } catch {
        // idem: não dá para persistir, mas a sessão em memória segue valendo
    }
}

/**
 * Avisa o app que a sessão morreu. Quem escuta é o AuthContext, que limpa o
 * usuário e manda para o login.
 *
 * Por evento, e não por import direto do contexto: este módulo é usado pelos
 * serviços, e serviço importando contexto de React criaria um ciclo.
 */
export const EVENTO_SESSAO_EXPIRADA = "sessao-expirada"

export function createApiClient() {
    const client = axios.create({
        baseURL: import.meta.env.VITE_API_URL,
        headers: { "Content-Type": "application/json" }
    })

    client.interceptors.request.use((config) => {
        const token = getToken()

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    })

    client.interceptors.response.use(
        (resposta) => resposta,
        (erro) => {
            // 401 é "a sessão acabou" — expirou, foi revogada, ou a conta foi
            // desativada. 403 NÃO passa por aqui de propósito: ali a sessão vale,
            // só falta permissão, e deslogar a pessoa esconderia esse motivo.
            if (erro.response?.status === 401) {
                setToken(null)
                window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA))
            }

            return Promise.reject(erro)
        }
    )

    return client
}
