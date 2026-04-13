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
            f_disponivel: v.string().optional(),
        })
    )
);

handler.get(async (req, res) => {
    const { id, page = 0, limit = 10, f_nome, f_categoria, f_disponivel } = req.query;

    if (id == null) {
        const filters = {};

        if (f_nome) {
            filters.nome = f_nome;
        }

        if (f_categoria) {
            filters.categoria = f_categoria;
        }

        if (f_disponivel) {
            filters.is_disponivel = f_disponivel;
        }

        const produtosList = await produtos.listProdutos(page, limit, filters);
        res.status(200).json(produtosList);
        return;
    }

    const produto = await produtos.getProduto(id);

    res.status(200).json(produto);
});

handler.put(async (req, res) => {
    const { id } = req.query;
    if (id == null) {
        res.status(400).json({ error: "Missing id" });
        return;
    }

    const updates = req.body;
    const produto = await produtos.updateProduto(id, updates);

    res.status(200).json(produto);
});

// handler.middleware.post(
//     v.middleware.body(
//         v.object({
//             nome: v.string(),
//             categoria: v.string(),
//             preco: v.number(),
//             unidade: v.string(),
//             g_por_uni: v.number().optional(),
//             preco_por_uni: v.number().optional(),
//             is_disponivel: v.boolean(),
//         })
//     )
// );

handler.post(async (req, res) => {
    const produtoData = req.body;

    const produto = await produtos.createProduto(produtoData);

    res.status(200).json(produto);
});

handler.delete(async (req, res) => {
    const { id } = req.query;
    if (id == null) {
        res.status(400).json({ error: "Missing id" });
        return;
    }

    try {
        const produto = await produtos.deleteProduto(id);
        res.status(200).json(produto);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default handler;