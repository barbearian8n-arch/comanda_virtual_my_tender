import { createHandler } from "../infra/handlers.js";
import produtos from "../models/produtos.js";

const handler = createHandler();

handler.get(async (req, res) => {
    const categorias = await produtos.getCategorias();
    res.status(200).json(categorias);
});

export default handler;
