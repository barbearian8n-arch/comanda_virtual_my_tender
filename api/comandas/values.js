import { createHandler } from "../../infra/handlers.js"
import comandas from "../../models/comandas.js"
import chat from "../../models/chat.js"

const handler = createHandler()

handler.post(async (req, res) => {
    const { key, delivery_fee, total_real_price, delivery_address } = req.body

    await comandas.updateComandaValues(key, { delivery_fee, total_real_price, delivery_address })

    if (delivery_fee !== undefined) {
        await chat.notifyDeliveryFeeUpdated(key)
    }

    res.status(200).json({ success: true })
})

export default handler
