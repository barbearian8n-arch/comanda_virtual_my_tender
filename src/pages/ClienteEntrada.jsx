import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"

export default function PageClienteEntrada() {
    const { key } = useParams()
    const navigate = useNavigate()

    useEffect(() => {
        // Cookie expira em 1 hora
        const expires = new Date(Date.now() + 60 * 60 * 1000).toUTCString()
        document.cookie = `comanda_key=${encodeURIComponent(key)}; path=/; expires=${expires}; SameSite=Lax`
        navigate("/cardapio", { replace: true })
    }, [key, navigate])

    return (
        <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center">
                <div className="spinner-border text-danger mb-3" role="status" />
                <p className="text-muted">Abrindo seu cardápio...</p>
            </div>
        </div>
    )
}
