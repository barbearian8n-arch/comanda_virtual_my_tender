/**
 * O que cada papel pode fazer.
 *
 * Mora em código, e não numa tabela de permissões: são dois papéis e uma loja
 * só. Um catálogo no banco custaria um join em toda requisição para responder
 * algo que já está aqui — e a troca de papel exigiria uma tela de administração
 * inteira para o que hoje é uma linha de diff.
 *
 * Se um dia forem precisos papéis criados sem deploy, aí sim vale a tabela
 * (é o desenho do mytender-v2, com role/permission/role_permission).
 */

/** Toda permissão que existe. Uma permissão fora daqui é erro de digitação. */
export const PERMISSOES = [
    "comanda.manage",     // abrir, fechar, pesar, taxa de entrega
    "produto.manage",     // cadastro de produtos e categorias
    "mensagem.view",      // ler as conversas do WhatsApp
    "mensagem.send",      // responder o cliente pelo painel
    "conexao.manage",     // conectar/trocar a instância do WhatsApp
    "config.manage",      // horários e configurações da empresa
    "usuario.manage"      // criar, desativar e trocar papel de usuários
];

/**
 * O balcão (`atendente`) recebe o que se usa atendendo: comandas e conversa com
 * o cliente. Fica de fora o que muda o comportamento da loja inteira — cadastro,
 * conexão do WhatsApp, horários e usuários — porque são decisões de dono, não de
 * turno, e um erro ali afeta todo mundo de uma vez.
 */
const POR_PAPEL = {
    admin: PERMISSOES,
    atendente: ["comanda.manage", "mensagem.view", "mensagem.send"]
};

export const PAPEIS = Object.keys(POR_PAPEL);

/**
 * Papel desconhecido devolve lista vazia — nega tudo.
 *
 * É o padrão seguro: se alguém gravar 'gerente' direto no banco, a pessoa fica
 * sem acesso em vez de ganhar acesso a algo que ninguém decidiu conceder.
 */
export function permissoesDoPapel(papel) {
    return POR_PAPEL[papel] ?? [];
}

export function podeFazer(papel, permissao) {
    return permissoesDoPapel(papel).includes(permissao);
}
