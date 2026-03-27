import { createHandler } from "../../infra/handlers.js";
import comandas from "../../models/comandas.js";

const handler = createHandler();

handler.put(async (req, res) => {
    const { items } = req.body;

    await comandas.updateCommandItems(items);

    res.status(200).json({ success: true });
});

export default handler;