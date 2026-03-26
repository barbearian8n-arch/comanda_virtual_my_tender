import mytenderClient from "../infra/mytender.js";

/**
 * @typedef {object} Comanda
 * @property {number} id
 * @property {string} key
 * @property {string} redis_key
 * @property {string} status
 * @property {object} contact
 * @property {number} contact.lead_id
 * @property {string} contact.name
 * @property {string} contact.number
 * @property {string} contact.number_normalized
 * @property {ComandaItem[]} items
 * @property {string} formated_items
 * }
 */

/**
 * @typedef {object} ComandaItem
 * @property {number} id
 * @property {string} name
 * @property {number} quantity
 * @property {number} unit_price
 * @property {number} total_price
 * @property {string} base_unit
 * @property {string} formated_item
 
*/

/**
 * @returns {Promise<Comanda[]>}
 */
async function listComandas() {
    const resp = await mytenderClient.get(`/comandas`);
    if (!resp.data.success) {
        throw new Error(resp.data.message);
    }

    return resp.data.comandas;
}

/**
 * @param {string} key
 * @returns {Promise<Comanda>}
 */
async function getComanda(key) {
    const resp = await mytenderClient.get(`/comandas?key=${key}`);
    if (!resp.data.success) {
        throw new Error(resp.data.message);
    }

    return resp.data.comanda;
}

export default {
    listComandas,
    getComanda
}