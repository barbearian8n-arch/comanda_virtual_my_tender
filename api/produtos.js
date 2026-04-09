import { createHandler } from "../infra/handlers.js";
import produtos from "../models/produtos.js";
import { v } from "../infra/validation/validator.js";

const handler = createHandler();

handler.middleware.get(
    v.middleware.query(
        v.object({
            id: v.number({ cast: true }).optional(),
            page: v.number({ cast: true }).optional(),
            limit: v.number({ cast: true }).optional()
        })
    )
);

handler.get(async (req, res) => {
    const { id, page = 0, limit = 10 } = req.query;

    console.log(id, page, limit);

    if (id == null) {
        const produtosList = await produtos.listProdutos(page, limit);
        res.status(200).json(produtosList);
        return;
    }

    const produto = await produtos.getProduto(id);

    res.status(200).json(produto);
});

export default handler;