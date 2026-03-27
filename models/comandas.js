import { NotFoundError } from "../infra/errors.js";
import supabase from "../infra/supabase.js";

/**
 * @param {DBViewCommandJoin} comanda 
 * @returns {APICommand}
 */
function mapComandaToAPI(comanda) {
    return {
        id: comanda.command_id,
        key: comanda.command_key,
        redis_key: `comanda/${comanda.command_key}`,
        status: comanda.command_status,
        contact: {
            lead_id: comanda.client_id,
            name: comanda.client_name,
            number: String(comanda.client_numero),
            number_normalized: String(comanda.client_numero)
        },
        items: comanda.items.map(mapComandaItemToAPI),
        formated_items: comanda.formated_items
    };
}

/**
 * @param {DBCommandItemJoin} item 
 * @returns {APICommandItem}
 */
function mapComandaItemToAPI(item) {
    return {
        id: item.id,
        name: item.menu_nome,
        menu_info: {
            id: item.menu_id,
            name: item.menu_nome,
            unit: item.menu_unidade,
            price_per_unit: item.menu_preco_por_uni,
            category: item.menu_categoria,
            is_available: item.menu_is_disponivel,
            g_per_unit: item.menu_g_por_uni
        },

        requested: {
            quantity: item.req_quantity,
            unit: item.req_unit,
            estimated_price: item.req_estimated_price,
        },

        real: {
            quantity: item.real_quantity,
            unit: item.real_unit,
            total_price: item.real_total_price,
        },

        to_be_weighed: item.to_be_weighed
    };
}

/**
 * @param {APICommandItem[]} items
 * @returns {Promise<DBCommandItem[]>}
 */
function mapCommandItemsToDB(items) {
    return items.map(item => ({
        id: item.id,
        menu_id: item.menu_info.id,
        req_unit: item.requested.unit,
        req_quantity: item.requested.quantity,
        req_estimated_price: item.requested.estimated_price,
        real_unit: item.real.unit,
        real_quantity: item.real.quantity,
        real_total_price: item.real.total_price,
        to_be_weighed: item.to_be_weighed
    }));
}

/**
 * @returns {Promise<APICommand[]>}
 */
async function listComandas() {
    const { data, error } = await supabase.schema("public").from("view_command_w_items").select("*");
    if (error) {
        throw error;
    }

    return data.map(mapComandaToAPI);
}

/**
 * @param {string} key
 * @returns {Promise<APICommand>}
 */
async function getComanda(key) {
    const { data, error } = await supabase.schema("public").from("view_command_w_items").select("*").eq("command_key", key);
    if (error) {
        throw error;
    }

    if (data.length === 0) {
        throw new NotFoundError("Comanda não encontrada");
    }

    return mapComandaToAPI(data[0]);
}

/**
 * @param {APICommandItem[]} items
 * @returns {Promise<DBCommandItem[]>}
 */
async function updateCommandItems(items) {
    const dbItems = mapCommandItemsToDB(items);

    const { data, error } = await supabase
        .schema("public")
        .from("command_items")
        .upsert(dbItems)
        .select();

    if (error) {
        throw error;
    }

    return data;
}

export default {
    listComandas,
    getComanda,
    updateCommandItems
}