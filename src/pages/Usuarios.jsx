import { useState } from "react"
import toast from "react-hot-toast"
import { HandleResponse } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import { useAuth } from "../context/useAuth"
import { listUsers, register, updateUser } from "../services/auth"

const PAPEIS = [
    { id: "admin", label: "Admin", ajuda: "Pode tudo, inclusive gerenciar contas." },
    { id: "atendente", label: "Atendente", ajuda: "Comandas e conversas. Não mexe em cadastro, conexão nem configurações." }
]

export default function PageUsuarios() {
    const response = useRequest(listUsers)

    return (
        <div className="page-content">
            <div className="page-title-section">
                <div>
                    <h4>Usuários</h4>
                    <p className="subtitle mb-0">Quem entra no painel e o que cada um pode fazer</p>
                </div>
            </div>

            <div className="row g-2 mb-3">
                {PAPEIS.map((papel) => (
                    <div className="col-12 col-md-6" key={papel.id}>
                        <div className="border rounded p-2 h-100 bg-white">
                            <div className="small fw-semibold mb-1">{papel.label}</div>
                            <div className="text-muted" style={{ fontSize: ".78rem" }}>{papel.ajuda}</div>
                        </div>
                    </div>
                ))}
            </div>

            <HandleResponse response={response}>
                {(usuarios) => <Lista usuarios={usuarios} onMudou={response.refetch} />}
            </HandleResponse>
        </div>
    )
}

function Lista({ usuarios, onMudou }) {
    const { usuario: eu } = useAuth()
    const [ocupado, setOcupado] = useState(null)

    async function alterar(id, patch, chave) {
        setOcupado(chave)
        try {
            await updateUser(id, patch)
            toast.success("Atualizado")
            await onMudou()
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setOcupado(null)
        }
    }

    return (
        <>
            <div className="card border-0 shadow-sm mb-4">
                <div className="list-group list-group-flush">
                    {usuarios.map((u) => {
                        const souEu = u.id === eu?.id

                        return (
                            <div key={u.id} className="list-group-item d-flex flex-wrap gap-2 align-items-center py-3">
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                    <div className="fw-semibold text-truncate">
                                        {u.display_name || u.email}
                                        {souEu && <span className="badge bg-light text-dark border ms-2">você</span>}
                                        {!u.is_active && <span className="badge bg-secondary ms-2">desativado</span>}
                                    </div>
                                    <div className="small text-muted text-truncate">{u.email}</div>
                                </div>

                                <select
                                    className="form-select form-select-sm"
                                    style={{ maxWidth: 150 }}
                                    value={u.role}
                                    disabled={ocupado !== null}
                                    onChange={(e) => alterar(u.id, { papel: e.target.value }, `papel-${u.id}`)}
                                    aria-label={`Papel de ${u.email}`}
                                >
                                    {PAPEIS.map((p) => (
                                        <option key={p.id} value={p.id}>{p.label}</option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    className={`btn btn-sm ${u.is_active ? "btn-outline-danger" : "btn-outline-success"}`}
                                    disabled={ocupado !== null}
                                    onClick={() => alterar(u.id, { ativo: !u.is_active }, `ativo-${u.id}`)}
                                >
                                    {u.is_active ? "Desativar" : "Reativar"}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* trocar papel, desativar ou trocar senha derruba as sessões abertas
                daquela pessoa — o servidor faz isso, e vale dizer aqui */}
            <p className="text-muted small">
                Mudar papel, desativar ou trocar a senha encerra as sessões abertas da pessoa.
                Ela precisa entrar de novo.
            </p>

            <NovoUsuario onCriado={onMudou} />
        </>
    )
}

function NovoUsuario({ onCriado }) {
    const [form, setForm] = useState({ nome: "", email: "", senha: "", papel: "atendente" })
    const [enviando, setEnviando] = useState(false)

    function alterar(campo, valor) {
        setForm((prev) => ({ ...prev, [campo]: valor }))
    }

    async function criar(evento) {
        evento.preventDefault()

        if (enviando) return

        setEnviando(true)
        try {
            await register(form)
            toast.success("Usuário criado")
            setForm({ nome: "", email: "", senha: "", papel: "atendente" })
            await onCriado()
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-body">
                <h6 className="fw-bold mb-3">Novo usuário</h6>

                <form onSubmit={criar} className="row g-2">
                    <div className="col-12 col-md-6">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Nome"
                            value={form.nome}
                            onChange={(e) => alterar("nome", e.target.value)}
                            aria-label="Nome"
                        />
                    </div>
                    <div className="col-12 col-md-6">
                        <input
                            type="email"
                            className="form-control"
                            placeholder="E-mail"
                            value={form.email}
                            onChange={(e) => alterar("email", e.target.value)}
                            required
                            aria-label="E-mail"
                        />
                    </div>
                    <div className="col-12 col-md-6">
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Senha (mínimo 8)"
                            value={form.senha}
                            onChange={(e) => alterar("senha", e.target.value)}
                            required
                            autoComplete="new-password"
                            aria-label="Senha"
                        />
                    </div>
                    <div className="col-12 col-md-4">
                        <select
                            className="form-select"
                            value={form.papel}
                            onChange={(e) => alterar("papel", e.target.value)}
                            aria-label="Papel"
                        >
                            {PAPEIS.map((p) => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-12 col-md-2 d-grid">
                        <button type="submit" className="btn btn-danger fw-bold" disabled={enviando}>
                            {enviando ? "…" : "Criar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
