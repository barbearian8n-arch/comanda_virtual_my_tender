import { createHandler } from "../infra/handlers.js";
import comandas from "../models/comandas.js";

const handler = createHandler();

handler.get(async (req, res) => {
    const { key } = req.query;

    if (key == null) {
        const comandasList = await comandas.listComandas();
        res.status(200).json(comandasList);
        return;
    }

    const comanda = await comandas.getComanda(key);

    res.status(200).json(comanda);
});

handler.patch(async (req, res) => {
    const { key, delivery_address, payment_method } = req.body

    await comandas.updateComanda(key, { delivery_address, payment_method })

    res.status(200).json({ success: true })
})

export default handler;