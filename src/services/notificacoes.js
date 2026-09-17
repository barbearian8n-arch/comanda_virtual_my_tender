/**
 * Catálogo dos avisos em tempo real: o que existe, por onde chega e no que cada
 * um vira na tela.
 *
 * Os ids são os mesmos de `models/enterprise.js`, que guarda o outro lado (o
 * padrão e a gravação em `enterprise.config`). Servidor e cliente não têm módulo
 * compartilhado neste repo, então os dois lados repetem a lista — mexer num id
 * aqui exige mexer lá.
 */

/**
 * Caminho do SSE de cada evento, no servidor de notificação.
 *
 * Convenção `v1-<entidade>-<particípio>`. O prefixo é o que separa os fluxos
 * deste painel dos do mytender-v2, que usa os mesmos nomes SEM prefixo no mesmo
 * servidor — sem ele, os dois painéis leriam a mesma fila e cada alerta tocaria
 * nos dois lugares.
 *
 * O contrato completo está em `.dev_scripts/eventos-notificacao.md`.
 */
export const CAMINHOS = {
    comanda_criada: "v1-command-created",
    comanda_fechada: "v1-command-closed",
    nova_mensagem: "v1-message-received"
}

export const EVENTOS = Object.keys(CAMINHOS)

/**
 * `{base}/enterprises/{id}/events/{caminho}`.
 *
 * A empresa vai na URL e o servidor confere contra a claim `enterprise_id` do
 * token: token de outra empresa recebe 401, e é assim que um inquilino não lê o
 * fluxo do outro.
 */
export function montarUrlDoEvento(base, enterpriseId, caminho) {
    return `${String(base).replace(/\/$/, "")}/enterprises/${enterpriseId}/events/${caminho}`
}

/**
 * Lê o payload do evento.
 *
 * As grafias alternativas são aceitas de propósito. O servidor de notificação é
 * outro projeto: um alerta que some porque alguém mandou `commandId` em vez de
 * `command_id` seria um dia inteiro de depuração para achar uma diferença de
 * traço — e some em silêncio, que é o pior modo de falhar num alerta.
 */
export function interpretarEvento(data) {
    let payload = data

    try {
        payload = JSON.parse(data)
    } catch {
        // pode ser o id solto, ou um texto qualquer
    }

    if (payload === null || typeof payload !== "object") {
        const cru = String(payload ?? "").trim() || null
        return { comandaId: cru, mensagemId: cru, cliente: null, telefone: null, texto: null }
    }

    const alvo = payload.command ?? payload.comanda ?? payload.message ?? payload.data ?? payload

    /**
     * Dois ids separados, e não um "id" só: o payload de `v1-message-received`
     * carrega `command_id` como contexto (a comanda aberta do cliente), então um
     * campo único pegaria a comanda no lugar da mensagem — e como é ele que
     * serve de chave anti-repetição, duas mensagens da mesma comanda teriam a
     * mesma chave e a segunda seria descartada como repetida.
     */
    const comandaId = alvo.command_id ?? alvo.commandId ?? alvo.comanda_id ?? alvo.comandaId ?? alvo.id ?? null
    const mensagemId = alvo.message_id ?? alvo.messageId ?? alvo.id ?? null

    // `client_name` é o cadastro (padaria.name) e vem primeiro; `push_name` é o
    // nome que a pessoa pôs no próprio WhatsApp, que serve quando não há cadastro
    const cliente =
        alvo.client_name ?? alvo.clientName ?? alvo.nome ?? alvo.contact?.name ??
        alvo.push_name ?? alvo.pushName ?? null

    const telefone =
        alvo.client_phone ?? alvo.clientPhone ?? alvo.telefone ?? alvo.phone ??
        alvo.number_normalized ?? alvo.contact?.number_normalized ?? null

    const texto = alvo.text ?? alvo.texto ?? alvo.body ?? alvo.mensagem ?? null

    // ids e telefone chegam como número no JSON e são comparados como texto
    // (chave anti-repetição, montagem de URL) — normaliza uma vez só
    const comoTexto = (v) => (v === null || v === undefined ? null : String(v))

    return {
        comandaId: comoTexto(comandaId),
        mensagemId: comoTexto(mensagemId),
        cliente: cliente ?? null,
        telefone: comoTexto(telefone),
        texto: texto ?? null
    }
}

/** O texto e o destino de cada aviso na tela. */
export function descreverEvento(evento, dados) {
    const quem = dados.cliente || (dados.telefone ? `o número ${dados.telefone}` : "um cliente")

    switch (evento) {
        case "comanda_criada":
            return { titulo: "Comanda criada", corpo: `${quem} abriu um pedido.`,
                     url: dados.telefone ? `/comandas/${dados.telefone}` : "/" }
        case "comanda_fechada":
            return { titulo: "Comanda fechada", corpo: `${quem} finalizou o pedido.`,
                     url: dados.telefone ? `/comandas/${dados.telefone}` : "/" }
        case "nova_mensagem":
            return { titulo: "Nova mensagem", corpo: dados.texto ? `${quem}: ${dados.texto}` : `${quem} mandou uma mensagem.`,
                     url: "/mensagens" }
        default:
            return { titulo: "Aviso", corpo: "", url: "/" }
    }
}

/**
 * A chave que impede o mesmo aviso de tocar duas vezes.
 *
 * Uma queda de conexão faz o servidor reenviar o que já tinha mandado, e alerta
 * duplicado no balcão é ruído que ensina a ignorar o alerta.
 */
export function chaveDoEvento(evento, dados) {
    const id = evento === "nova_mensagem" ? dados.mensagemId : dados.comandaId
    return `${evento}:${id ?? "sem-id"}`
}
