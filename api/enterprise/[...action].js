import { createHandler } from "../../infra/handlers.js"
import enterprise from "../../models/enterprise.js"
import { MethodNotAllowedError, NotFoundError } from "../../infra/errors.js"

const handler = createHandler()

// Rota dinâmica por recurso, como api/comandas, api/produtos e api/ai: uma
// Serverless Function para todas as ações da empresa, e não uma por ação.
const actions = {
    // As três agendas da tela de Configurações. GET devolve sempre as três;
    // POST aceita qualquer subconjunto e só grava o que veio.
    schedules: {
        get: async (req, res) => {
            const schedules = await enterprise.getSchedules()

            res.status(200).json(schedules)
        },
        post: async (req, res) => {
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

export default handler
