import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import toast from "react-hot-toast"
import { useAuth } from "../context/useAuth"
import { authStatus, register } from "../services/auth"

export default function PageLogin() {
    const { usuario, entrar } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const [email, setEmail] = useState("")
    const [senha, setSenha] = useState("")
    const [nome, setNome] = useState("")
    const [enviando, setEnviando] = useState(false)

    /**
     * Loja sem nenhum usuário: a tela vira cadastro do primeiro acesso.
     *
     * `null` enquanto não se sabe — desenhar "entrar" e trocar para "criar conta"
     * depois da resposta faria a tela saltar na frente de quem já está digitando.
     */
    const [precisaCadastro, setPrecisaCadastro] = useState(null)

    const destino = location.state?.de ?? "/"

    useEffect(() => {
        authStatus()
            .then((s) => setPrecisaCadastro(s.precisa_cadastro))
            .catch(() => setPrecisaCadastro(false))
    }, [])

    // já logado não tem o que fazer aqui
    useEffect(() => {
        if (usuario) {
            navigate(destino, { replace: true })
        }
    }, [usuario, destino, navigate])

    async function enviar(evento) {
        evento.preventDefault()

        if (enviando) return

        setEnviando(true)
        try {
            if (precisaCadastro) {
                await register({ nome, email, senha })
                toast.success("Conta de admin criada")
            }

            await entrar(email, senha)
            navigate(destino, { replace: true })
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="page-content d-flex justify-content-center">
            <div style={{ maxWidth: 380, width: "100%" }}>
                <div className="text-center mb-4 mt-4">
                    <h4 className="fw-bold mb-1">
                        {precisaCadastro ? "Primeiro acesso" : "Entrar"}
                    </h4>
                    <p className="subtitle mb-0">
                        {precisaCadastro
                            ? "Esta loja ainda não tem nenhuma conta. A primeira nasce como admin."
                            : "Painel da loja"}
                    </p>
                </div>

                <form onSubmit={enviar} className="card border-0 shadow-sm">
                    <div className="card-body">
                        {precisaCadastro && (
                            <div className="mb-3">
                                <label htmlFor="nome" className="form-label small fw-bold text-muted">
                                    Seu nome
                                </label>
                                <input
                                    id="nome"
                                    type="text"
                                    className="form-control"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    autoComplete="name"
                                />
                            </div>
                        )}

                        <div className="mb-3">
                            <label htmlFor="email" className="form-label small fw-bold text-muted">
                                E-mail
                            </label>
                            <input
                                id="email"
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="senha" className="form-label small fw-bold text-muted">
                                Senha
                            </label>
                            <input
                                id="senha"
                                type="password"
                                className="form-control"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                autoComplete={precisaCadastro ? "new-password" : "current-password"}
                                required
                            />
                            {precisaCadastro && (
                                <div className="form-text">Mínimo de 8 caracteres.</div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-danger fw-bold w-100"
                            disabled={enviando || precisaCadastro === null}
                        >
                            {enviando ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    {precisaCadastro ? "Criando…" : "Entrando…"}
                                </>
                            ) : (
                                precisaCadastro ? "Criar conta de admin" : "Entrar"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
