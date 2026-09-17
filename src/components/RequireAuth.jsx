import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { Loading } from "./HandleResponse"

/**
 * Guarda de rota.
 *
 * Esconder a tela é conveniência, não segurança — quem barra de verdade é o
 * middleware em cada endpoint. Isto existe para a pessoa não ficar olhando uma
 * página vazia de erros 403 sem entender que o problema é o papel dela.
 */
export default function RequireAuth({ permissao, children }) {
    const { usuario, carregando, pode } = useAuth()
    const location = useLocation()

    // enquanto o token está sendo revalidado, não dá para decidir nada: mandar
    // para o login aqui expulsaria quem está perfeitamente logado
    if (carregando) {
        return <Loading />
    }

    if (!usuario) {
        // guarda de onde veio, para voltar ao destino depois de entrar
        return <Navigate to="/login" replace state={{ de: location.pathname }} />
    }

    if (permissao && !pode(permissao)) {
        return (
            <div className="page-content">
                <div className="alert alert-warning d-flex gap-3 align-items-start">
                    <i className="bi bi-shield-lock fs-4"></i>
                    <div>
                        <div className="fw-bold">Sem acesso a esta tela</div>
                        <div className="small">
                            Ela exige a permissão <span className="font-monospace">{permissao}</span>,
                            que o papel <strong>{usuario.role}</strong> não tem. Peça a um admin
                            da loja se você precisa dela.
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return children
}
