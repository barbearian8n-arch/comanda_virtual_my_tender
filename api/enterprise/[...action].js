import { createHandler } from "../../infra/handlers.js"
import enterprise from "../../models/enterprise.js"
import instancias from "../../models/evolutionInstances.js"
import { MethodNotAllowedError, NotFoundError, ValidationError } from "../../infra/errors.js"
import { requirePermissao } from "../../infra/authMiddleware.js"

const handler = createHandler()

/**
 * O `id` vem da tela e é o ÚNICO jeito de apontar uma conexão. Nome de
 * instância nunca é aceito daqui: o servidor do Evolution é compartilhado com
 * outros produtos, e um nome vindo do cliente permitiria operar a instância
 * alheia. Quem traduz id → nome é o model, lendo a nossa tabela.
 */
function exigirId(valor) {
    const id = Number(valor)

    if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError("Informe a conexão (id)")
    }

    return id
}

// Rota dinâmica por recurso, como api/comandas, api/produtos e api/ai: uma
// Serverless Function para todas as ações da empresa, e não uma por ação.
const actions = {
    // As três agendas da tela de Configurações. GET devolve sempre as três;
    // POST aceita qualquer subconjunto e só grava o que veio.
    schedules: {
        get: async (req, res) => {
            await requirePermissao("config.manage").handle(req, res)

            const schedules = await enterprise.getSchedules()

            res.status(200).json(schedules)
        },
        post: async (req, res) => {
            await requirePermissao("config.manage").handle(req, res)

            const corpo = req.body || {}
            const patch = {}

            // montado a partir da lista do model, e não escrito à mão: campo novo
            // lá passa a ser aceito aqui sem virar um esquecimento silencioso
            for (const campo of enterprise.CAMPOS_AGENDA) {
                for (const chave of [campo, `${campo}_enabled`]) {
                    if (corpo[chave] !== undefined) {
                        patch[chave] = corpo[chave]
                    }
                }
            }

            const salvo = await enterprise.setSchedules(patch)

            res.status(200).json(salvo)
        }
    },

    // Conexões de WhatsApp. O verbo da ação vai no corpo (`acao`) em vez de
    // virar uma rota cada: são seis operações, e seis arquivos a mais estourariam
    // o limite de Serverless Functions do plano Hobby.
    instances: {
        get: async (req, res) => {
            await requirePermissao("conexao.manage").handle(req, res)

            if (req.query.id !== undefined) {
                res.status(200).json(await instancias.getState(exigirId(req.query.id)))
                return
            }

            res.status(200).json(await instancias.listInstances())
        },
        post: async (req, res) => {
            await requirePermissao("conexao.manage").handle(req, res)

            const { acao, id, nome } = req.body || {}

            switch (acao) {
                case "criar":
                    res.status(200).json(await instancias.createInstance(nome))
                    return

                case "conectar":
                    res.status(200).json(await instancias.connectInstance(exigirId(id)))
                    return

                case "desconectar":
                    res.status(200).json(await instancias.disconnectInstance(exigirId(id)))
                    return

                case "reiniciar":
                    res.status(200).json(await instancias.restartInstance(exigirId(id)))
                    return

                case "principal":
                    res.status(200).json(await instancias.setPrimary(exigirId(id)))
                    return

                default:
                    throw new ValidationError(
                        `Ação desconhecida: ${acao ?? "(vazia)"}. Use criar, conectar, desconectar, reiniciar ou principal.`
                    )
            }
        },
        delete: async (req, res) => {
            await requirePermissao("conexao.manage").handle(req, res)

            res.status(200).json(await instancias.removeInstance(exigirId(req.query.id)))
        }
    }
}

function getActionEntry(req) {
    const segments = req.query["...action"]
    const name = Array.isArray(segments) ? segments.join("/") : segments
    const entry = name && !name.includes("/") && actions[name]

    if (!entry) {
        throw new NotFoundError("Rota não encontrada")
    }

    return entry
}

handler.get(async (req, res) => {
    const entry = getActionEntry(req)

    if (!entry.get) {
        throw new MethodNotAllowedError("Method Not Allowed")
    }

    await entry.get(req, res)
})

handler.post(async (req, res) => {
    const entry = getActionEntry(req)

    if (!entry.post) {
        throw new MethodNotAllowedError("Method Not Allowed")
    }

    await entry.post(req, res)
})

handler.delete(async (req, res) => {
    const entry = getActionEntry(req)

    if (!entry.delete) {
        throw new MethodNotAllowedError("Method Not Allowed")
    }

    await entry.delete(req, res)
})

export default handler
