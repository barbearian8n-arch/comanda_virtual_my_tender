import { createHandler } from "../../infra/handlers.js"
import produtos from "../../models/produtos.js"
import { MethodNotAllowedError, NotFoundError } from "../../infra/errors.js"
import { requirePermissao } from "../../infra/authMiddleware.js"

const handler = createHandler()

// Mesma ideia de api/comandas/[...action].js: uma rota dinâmica por recurso
// em vez de um arquivo por ação, para não estourar o limite de Serverless
// Functions do plano Hobby da Vercel.
const actions = {
    embedding: {
        post: async (req, res) => {
            await requirePermissao("produto.manage").handle(req, res)

            const { id } = req.body

            await produtos.updateEmbedding(id)

            res.status(200).json({ success: true })
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

handler.post(async (req, res) => {
    const entry = getActionEntry(req)

    if (!entry.post) {
        throw new MethodNotAllowedError("Method Not Allowed")
    }

    await entry.post(req, res)
})

export default handler
