import { createHandler } from "../../infra/handlers.js"
import waMessages from "../../models/waMessages.js"
import { MethodNotAllowedError, NotFoundError, ValidationError } from "../../infra/errors.js"
import { requirePermissao } from "../../infra/authMiddleware.js"

const handler = createHandler()

// Rota dinâmica por recurso, como em api/comandas e api/produtos: uma
// Serverless Function para todas as ações de IA/mensagens, e não uma por ação.
const actions = {
    // Alimenta o <select> da tela de Mensagens.
    senders: {
        get: async (req, res) => {
            const senders = await waMessages.listSenders()

            res.status(200).json(senders)
        }
    },
    conversations: {
        get: async (req, res) => {
            const { sender } = req.query

            if (!sender) {
                throw new ValidationError("Informe o número de origem (sender)")
            }

            const conversas = await waMessages.listConversations(sender)

            res.status(200).json(conversas)
        }
    },
    // Envia um texto da loja para o cliente pelo Evolution e grava a linha.
    // Host e instância saem da config da empresa; a chave, do EVO_KEY.
    send: {
        post: async (req, res) => {
            const { sender, telefone, texto } = req.body || {}

            const mensagem = await waMessages.sendMessage(sender, telefone, texto)

            res.status(200).json(mensagem)
        }
    },
    messages: {
        get: async (req, res) => {
            const { sender, telefone } = req.query

            if (!sender) {
                throw new ValidationError("Informe o número de origem (sender)")
            }

            if (!telefone) {
                throw new ValidationError("Informe o telefone da conversa")
            }

            const mensagens = await waMessages.listMessages(sender, telefone)

            res.status(200).json(mensagens)
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

// Toda a tela de Mensagens é interna: ler conversa de cliente exige conta.
handler.middleware.get(requirePermissao("mensagem.view"))
handler.middleware.post(requirePermissao("mensagem.send"))

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
