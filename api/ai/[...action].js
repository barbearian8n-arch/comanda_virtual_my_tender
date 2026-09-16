import { createHandler } from "../../infra/handlers.js"
import waMessages from "../../models/waMessages.js"
import { MethodNotAllowedError, NotFoundError, ValidationError } from "../../infra/errors.js"

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
    // Upload de áudio da loja para a conversa. O arquivo vem no corpo como
    // application/octet-stream e o tipo real no cabeçalho — se fosse pelo
    // Content-Type, a Vercel tentaria interpretar o corpo em vez de entregá-lo
    // como Buffer.
    audio: {
        post: async (req, res) => {
            const { sender, telefone } = req.query

            const contentType = (req.headers["x-audio-content-type"] || req.headers["content-type"] || "")
                .split(";")[0]
                .trim()

            const buffer = Buffer.isBuffer(req.body) ? req.body : null

            const mensagem = await waMessages.uploadAudio(sender, telefone, buffer, contentType)

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
