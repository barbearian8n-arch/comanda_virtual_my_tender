/**
 * A navegação do painel em um lugar só.
 *
 * Existiam duas listas dentro do `App.jsx` (a barra de cima e o menu Gestão).
 * Com a barra lateral seriam três lugares para manter sincronizados, e a
 * primeira divergência seria a lateral oferecendo uma tela que o menu não tem —
 * ou pior, oferecendo uma que a pessoa não pode abrir.
 *
 * Daqui saem as três: a barra lateral das telas largas, a barra de cima do
 * celular e o menu Gestão. Mesma lista, lida de sítios diferentes.
 */

/**
 * `topo: true` é o que o balcão usa o tempo todo, e é o que sobra na barra de
 * cima quando a tela é estreita demais para a lateral. O resto fica no menu
 * Gestão — a mesma divisão de antes da lateral existir.
 *
 * `exato` porque "/" casaria com tudo em `startsWith`.
 */
export const GRUPOS_NAVEGACAO = [
    {
        titulo: null,
        itens: [
            { to: "/", label: "Comandas", icone: "bi-receipt", permissao: "comanda.manage", exato: true, topo: true },
            // sem permissão: o cardápio é a mesma tela que o cliente final abre
            { to: "/cardapio", label: "Cardápio", icone: "bi-journal-text", permissao: null, topo: true }
        ]
    },
    {
        titulo: "Atendimento",
        itens: [
            { to: "/mensagens", label: "Mensagens", icone: "bi-whatsapp", permissao: "mensagem.view" },
            { to: "/whatsapp", label: "Conexão", icone: "bi-qr-code", permissao: "conexao.manage" }
        ]
    },
    {
        titulo: "Cadastro",
        itens: [
            { to: "/produtos", label: "Produtos", icone: "bi-box", permissao: "produto.manage" }
        ]
    },
    {
        titulo: "Administração",
        itens: [
            { to: "/configuracoes", label: "Configurações", icone: "bi-gear", permissao: "config.manage" },
            { to: "/alertas", label: "Alertas sonoros", icone: "bi-bell", permissao: "config.manage" },
            { to: "/usuarios", label: "Usuários", icone: "bi-people", permissao: "usuario.manage" }
        ]
    }
]

/** Os itens da barra de cima (celular): o que o balcão usa o tempo todo. */
export const LINKS_TOPO = GRUPOS_NAVEGACAO.flatMap(({ itens }) => itens.filter(({ topo }) => topo))

/** O resto, que no celular vive atrás do botão Gestão. */
export const LINKS_GESTAO = GRUPOS_NAVEGACAO.flatMap(({ itens }) => itens.filter(({ topo }) => !topo))

export function itemEstaAtivo(item, caminhoAtual) {
    return item.exato ? caminhoAtual === item.to : caminhoAtual.startsWith(item.to)
}

/** Aplica as permissões de quem está logado, descartando grupo que ficou vazio. */
export function gruposVisiveis(pode) {
    return GRUPOS_NAVEGACAO
        .map((grupo) => ({
            ...grupo,
            itens: grupo.itens.filter(({ permissao }) => !permissao || pode(permissao))
        }))
        .filter((grupo) => grupo.itens.length > 0)
}
