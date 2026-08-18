import { createHandler } from "../../infra/handlers.js"
import comandas from "../../models/comandas.js"
import chat from "../../models/chat.js"
import { MethodNotAllowedError, NotFoundError } from "../../infra/errors.js"

const handler = createHandler()

// Cada rota de api/comandas/*.js virou uma entrada aqui — mesmo path
// (/api/comandas/close, /api/comandas/finish, ...), um arquivo a menos por
// ação. É o que mantém a conta de Serverless Functions do plano Hobby da
// Vercel (limite de 12) sob controle conforme a API cresce.
const actions = {
    close: {
        post: async (req, res) => {
            const { key } = req.body

            await comandas.closeComanda(key)

            await chat.notifyComandaClosed(key)

            res.status(200).json({ success: true })
        }
    },
    "delivery-fee": {
        post: async (req, res) => {
            const { key, value } = req.body

            await comandas.updateDeliveryFee(key, value)

            await chat.notifyDeliveryFeeUpdated(key)

            res.status(200).json({ success: true })
        }
    },
    finish: {
        post: async (req, res) => {
            const { key } = req.body

            await comandas.finishComanda(key)

            await chat.notifyComandaFinished(key)

            res.status(200).json({ success: true })
        }
    },
    // Também altera delivery_fee, por um caminho diferente do `delivery-fee`.
    values: {
        post: async (req, res) => {
            const { key, delivery_fee, total_real_price } = req.body

            await comandas.updateComandaValues(key, { delivery_fee, total_real_price })

            if (delivery_fee !== undefined) {
                await chat.notifyDeliveryFeeUpdated(key)
            }

            res.status(200).json({ success: true })
        }
    },
    weights: {
        post: async (req, res) => {
            const { key, items } = req.body

            await comandas.updateCommandItems(items)

            await comandas.updateCommandStatusToOpen(key)

            await chat.notifyWeighingFinished(key)

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
