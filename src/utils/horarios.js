/**
 * O formato gravado é `{dia} {hh:mm}-{hh:mm}`, ex.: `seg 07:00-19:00` — uma
 * entrada por faixa, então um dia com pausa para o almoço aparece duas vezes na
 * lista. É o mesmo formato que o `operating_time` do mytender-v2 usa, para o
 * robô não precisar aprender dois.
 *
 * A tela pensa por dia da semana; o banco guarda uma lista corrida. Estas duas
 * funções são a tradução entre as duas visões, e ficam fora do componente para
 * poderem ser testadas sem montar React.
 */

export const DIAS = [
    { id: "dom", label: "Domingo" },
    { id: "seg", label: "Segunda" },
    { id: "ter", label: "Terça" },
    { id: "qua", label: "Quarta" },
    { id: "qui", label: "Quinta" },
    { id: "sex", label: "Sexta" },
    { id: "sab", label: "Sábado" }
]

const IDS = DIAS.map((dia) => dia.id)

/** Mesmo padrão que o servidor valida — o que não casar aqui seria recusado lá. */
export const PADRAO_HORARIO =
    /^(dom|seg|ter|qua|qui|sex|sab) ([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/

/**
 * As três agendas da empresa. O `id` é o nome do campo em `enterprise.config`
 * — é por ele que o robô lê do outro lado, então mudar aqui é mudar o contrato.
 */
export const AGENDAS = [
    {
        id: "schedule_agent",
        label: "Atendimento IA",
        curto: "IA",
        icone: "bi-robot",
        cor: "primary",
        ajuda: "Quando o robô responde no WhatsApp. Fora dessas faixas ele fica em silêncio."
    },
    {
        id: "schedule_store",
        label: "Loja",
        curto: "Loja",
        icone: "bi-shop",
        cor: "success",
        ajuda: "Abertura e fechamento — o atendimento presencial."
    },
    {
        id: "schedule_booking",
        label: "Agendamento",
        curto: "Agenda",
        icone: "bi-calendar-check",
        cor: "warning",
        ajuda: "Faixas em que o cliente pode marcar entrega ou retirada de encomenda."
    }
]

/**
 * O campo do interruptor de uma agenda: `schedule_agent` →
 * `schedule_agent_enabled`. Mesmo par que o servidor monta em
 * `models/enterprise.js` — derivado nos dois lados em vez de escrito à mão,
 * para não existir a chance de um lado grafar diferente do outro.
 */
export function campoAtivo(agendaId) {
    return `${agendaId}_enabled`
}

export const FAIXA_PADRAO = { inicio: "08:00", fim: "18:00" }

/**
 * `['seg 07:00-19:00']` → `{ dom: [], seg: [{ inicio, fim }], ... }`.
 *
 * Entrada fora do formato é descartada em silêncio: o que chega aqui já passou
 * pela validação do servidor, e derrubar a tela inteira por causa de uma linha
 * torta no banco deixaria a pessoa sem como consertar justamente essa linha.
 */
export function parseAgenda(lista) {
    const porDia = Object.fromEntries(IDS.map((id) => [id, []]))

    for (const entrada of Array.isArray(lista) ? lista : []) {
        const texto = String(entrada ?? "").trim()

        if (!PADRAO_HORARIO.test(texto)) {
            continue
        }

        const dia = texto.slice(0, 3)
        const [inicio, fim] = texto.slice(4).split("-")

        porDia[dia].push({ inicio, fim })
    }

    return porDia
}

/** O caminho de volta: `{ seg: [{ inicio, fim }] }` → `['seg 07:00-19:00']`. */
export function serializarAgenda(porDia) {
    const lista = []

    for (const id of IDS) {
        for (const faixa of porDia?.[id] ?? []) {
            const entrada = `${id} ${faixa.inicio}-${faixa.fim}`

            if (PADRAO_HORARIO.test(entrada)) {
                lista.push(entrada)
            }
        }
    }

    return lista
}

/**
 * Replica as faixas de UMA agenda num dia para todos os dias da semana,
 * devolvendo o mapa completo. As outras agendas voltam exatamente como entraram.
 *
 * É função pura e mora aqui, e não dentro do componente, porque foi justamente
 * aqui que se errou uma vez: a versão anterior copiava o dia inteiro (as três
 * agendas de uma vez) e, partindo de um dia com colunas vazias, espalhava esse
 * vazio por toda a semana — apagando horário já cadastrado nos outros dias.
 */
export function copiarParaSemana(agendas, tipoId, diaId) {
    const faixas = agendas?.[tipoId]?.[diaId] ?? []

    return {
        ...agendas,
        [tipoId]: Object.fromEntries(
            DIAS.map((dia) => [dia.id, faixas.map((faixa) => ({ ...faixa }))])
        )
    }
}
