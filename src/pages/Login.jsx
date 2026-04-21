import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { authService } from "../services/auth.mock"

export default function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        
        if (!email || !password) {
            toast.error("Preencha todos os campos")
            return
        }

        try {
            setLoading(true)
            const response = await authService.login(email, password)
            toast.success(`Bem-vindo, ${response.user.name}!`)
            
            localStorage.setItem('user', JSON.stringify(response.user))
            
            window.location.href = "/" // Reloads app to update header state
        } catch (error) {
            toast.error(error.message || "Erro ao fazer login")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <div className="card shadow-sm border-0 w-100" style={{ maxWidth: '400px', borderRadius: '1rem' }}>
                <div className="card-body p-4 p-md-5">
                    <div className="text-center mb-4">
                        <div className="bg-danger text-white d-inline-flex justify-content-center align-items-center mb-3" style={{ width: '60px', height: '60px', borderRadius: '50%' }}>
                            <i className="bi bi-box-arrow-in-right fs-2"></i>
                        </div>
                        <h2 className="fw-bold mb-1">Entrar</h2>
                        <p className="text-muted small">Acesse sua conta para continuar</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label small fw-semibold text-muted">Email</label>
                            <div className="input-group drop-shadow-sm">
                                <span className="input-group-text bg-light border-end-0">
                                    <i className="bi bi-envelope text-muted"></i>
                                </span>
                                <input 
                                    type="email" 
                                    className="form-control bg-light border-start-0 ps-0" 
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label small fw-semibold text-muted d-flex justify-content-between">
                                Senha
                            </label>
                            <div className="input-group drop-shadow-sm">
                                <span className="input-group-text bg-light border-end-0">
                                    <i className="bi bi-lock text-muted"></i>
                                </span>
                                <input 
                                    type="password" 
                                    className="form-control bg-light border-start-0 ps-0" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-danger w-100 py-2 rounded-pill fw-bold mb-3 shadow-sm"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner-border spinner-border-sm me-2" />
                            ) : (
                                "Entrar"
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-4">
                        <p className="text-muted small mb-0">
                            Não tem uma conta? <Link to="/register" className="text-danger fw-semibold text-decoration-none">Crie agora</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
