import { createHandler } from "../infra/handlers.js";
import comandas from "../models/comandas.js";
import { requirePermissao } from "../infra/authMiddleware.js";

const handler = createHandler();

handler.get(async (req, res) => {
    const { key, client_id } = req.query;

    if (client_id != null) {
        const comandasList = await comandas.getCommandByClientId(client_id);
        res.status(200).json(comandasList);
        return;
    }

    if (key != null) {
        const comanda = await comandas.getCommand(key);
        res.status(200).json(comanda);
        return;
    }

    // A listagem geral é a tela do balcão e mostra TODOS os clientes — só com
    // login. As duas consultas acima ficam abertas porque são o fluxo do cliente
    // final: o link /cliente/:id é a credencial dele, e a chave da comanda é a
    // credencial de quem está com o carrinho aberto.
    await requirePermissao("comanda.manage").handle(req, res);

    const comandasList = await comandas.listCommands();
    res.status(200).json(comandasList);
});

handler.post(async (req, res) => {
    const { client_id } = req.body

    const comanda = await comandas.createCommand(client_id)

    res.status(200).json(comanda)
})

handler.patch(async (req, res) => {
    const { key, delivery_address, payment_method, delivery_payment_change } = req.body

    await comandas.updateComanda(key, { delivery_address, payment_method, delivery_payment_change })

    res.status(200).json({ success: true })
})

export default handler;