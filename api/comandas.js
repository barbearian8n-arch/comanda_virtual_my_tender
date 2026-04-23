import { createHandler } from "../infra/handlers.js";
import comandas from "../models/comandas.js";

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

    const comandasList = await comandas.listCommands();
    res.status(200).json(comandasList);
});

handler.post(async (req, res) => {
    const { client_id } = req.body

    const comanda = await comandas.createCommand(client_id)

    res.status(200).json(comanda)
})

handler.patch(async (req, res) => {
    const { key, delivery_address, payment_method } = req.body

    await comandas.updateComanda(key, { delivery_address, payment_method })

    res.status(200).json({ success: true })
})

export default handler;