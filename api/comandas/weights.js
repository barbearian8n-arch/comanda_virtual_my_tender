import { createHandler } from "../../infra/handlers.js";
import comandas from "../../models/comandas.js";

const handler = createHandler();

handler.put(async (req, res) => {
    const { key, items } = req.body;

    await comandas.saveWeights(key, items);

    res.status(200).json({ success: true });
});

export default handler;