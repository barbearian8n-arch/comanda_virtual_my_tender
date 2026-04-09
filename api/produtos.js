import { createHandler } from "../infra/handlers.js";
import produtos from "../models/produtos.js";
import { v } from "../infra/validation/validator.js";

const handler = createHandler();

handler.middleware.get(
    v.middleware.query(
        v.object({
            id: v.number({ cast: true }).optional(),
            page: v.number({ cast: true }).optional(),
            limit: v.number({ cast: true }).optional(),
            f_nome: v.string().optional(),
            f_categoria: v.string().optional(),
        })
    )
);

handler.get(async (req, res) => {
    const { id, page = 0, limit = 10, f_nome, f_categoria } = req.query;

    if (id == null) {
        const filters = {};

        if (f_nome) {
            filters.nome = f_nome;
        }

        if (f_categoria) {
            filters.categoria = f_categoria;
        }

        const produtosList = await produtos.listProdutos(page, limit, filters);
        res.status(200).json(produtosList);
        return;
    }

    const produto = await produtos.getProduto(id);

    res.status(200).json(produto);
});

export default handler;