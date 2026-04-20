import { createHandler } from "../../infra/handlers.js"
import comandas from "../../models/comandas.js"
import chat from "../../models/chat.js"

const handler = createHandler()

handler.post(async (req, res) => {
    const { key } = req.body

    await comandas.closeComanda(key)

    await chat.notifyComandaClosed(key)

    res.status(200).json({ success: true })
})

export default handler
