import { createHandler } from "../../infra/handlers.js"
import products from "../../models/produtos.js"

const handler = createHandler()

handler.post(async (req, res) => {
    const { id } = req.body

    await products.updateEmbedding(id)

    res.status(200).json({ success: true })
})

export default handler