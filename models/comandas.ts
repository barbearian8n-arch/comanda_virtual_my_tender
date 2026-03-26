import mytenderClient from "infra/mytender";

export interface Comanda {
    id: number;
    key: string;
    redis_key: string;
    status: string;
    contact: {
        lead_id: number;
        name: string;
        number: string;
        number_normalized: string;
    };
    items: ComandaItem[];
    formated_items: string;
}

export interface ComandaItem {
    id: number;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    base_unit: string;
    formated_item: string;
}

async function listComandas() {
    const resp = await mytenderClient.get(`/comandas`);
    if (!resp.data.success) {
        throw new Error(resp.data.message);
    }

    return resp.data.comandas;
}

async function getComanda(key: string) {
    const resp = await mytenderClient.get(`/comandas?key=${key}`);
    if (!resp.data.success) {
        throw new Error(resp.data.message);
    }

    return resp.data.data;
}

export default {
    listComandas,
    getComanda
}