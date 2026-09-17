import { useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { getComandaByClientId, createComanda } from "../services/comandas"

export default function PageClienteEntrada() {
    const { client_id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()

    function catch404(error) {
        if (error.status === 404) {
            return null
        }

        throw error
    }

    useEffect(() => {
        async function loadComanda() {
            let comanda = null

            comanda = await getComandaByClientId(client_id).catch(catch404)

            if (!comanda) {
                comanda = await createComanda(client_id)
            }

            const expires = new Date(Date.now() + 60 * 60 * 1000).toUTCString()
            document.cookie = `comanda_key=${encodeURIComponent(comanda.key)}; path=/; expires=${expires}; SameSite=Lax`
            // Leva a query adiante. É por ela que o robô manda o cliente direto
            // ao que ele perguntou (`?categoria=pizza`); descartada aqui, o link
            // caía sempre na primeira categoria do cardápio, que raramente tem
            // relação com a conversa.
            navigate(`/cardapio${location.search}`, { replace: true })
        }

        loadComanda()
    }, [client_id, navigate, location.search])

    return (
        <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center">
                <div className="spinner-border text-danger mb-3" role="status" />
                <p className="text-muted">Abrindo seu cardápio...</p>
            </div>
        </div>
    )
}
