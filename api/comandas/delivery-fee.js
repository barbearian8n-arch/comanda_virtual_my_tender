import { createHandler } from "../../infra/handlers.js"
import comandas from "../../models/comandas.js"

const handler = createHandler()

handler.post(async (req, res) => {
    const { key, value } = req.body

    console.log("update delivery fee", key, value)
    await comandas.updateDeliveryFee(key, value)

    res.status(200).json({ success: true })
})

export default handler