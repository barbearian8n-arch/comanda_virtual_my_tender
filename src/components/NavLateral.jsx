import { Link } from "react-router-dom"
import { gruposVisiveis, itemEstaAtivo } from "../navegacao"

/**
 * A navegação inteira em uma coluna, para telas largas.
 *
 * O painel nasceu para o tablet do balcão, com tudo espremido no cabeçalho: dois
 * atalhos e um botão Gestão que escondia cinco telas atrás de um clique. Em tela
 * de computador sobra largura à esquerda, e é onde a navegação cabe aberta.
 *
 * No celular ela some (CSS) e continuam valendo a barra de cima e o menu
 * Gestão — as três leem a mesma lista, `src/navegacao.js`.
 */
export default function NavLateral({ pode, caminhoAtual }) {
    const grupos = gruposVisiveis(pode)

    if (grupos.length === 0) {
        return null
    }

    return (
        <aside className="nav-lateral">
            {grupos.map(({ titulo, itens }) => (
                <div className="nav-lateral-grupo" key={titulo ?? "principal"}>
                    {titulo && <div className="nav-lateral-titulo">{titulo}</div>}

                    {itens.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`nav-lateral-item ${itemEstaAtivo(item, caminhoAtual) ? "is-ativo" : ""}`}
                        >
                            <i className={`bi ${item.icone}`}></i>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>
            ))}
        </aside>
    )
}
