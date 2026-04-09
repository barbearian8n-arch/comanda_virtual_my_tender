import supabase from "../infra/supabase.js";

async function listProdutos(page = 0, limit = 10, filters = {}) {
    const start = page * limit;
    const end = start + limit - 1;

    let query = supabase.from("cardapio").select("*");

    query = applyFilters(query, filters);

    const { data, error } = await query
        .range(start, end)
        .order("nome", { ascending: true });

    if (error) {
        throw error;
    }

    return data

    function applyFilters(query, filters) {
        if (filters.categoria) {
            query = query.eq("categoria", filters.categoria);
        }

        if (filters.nome) {
            query = query.ilike("nome", `%${filters.nome}%`);
        }

        return query;
    }
}

async function getProduto(id) {
    const { data, error } = await supabase
        .from("cardapio")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        throw error;
    }

    return data
}

async function getCategorias() {
    const { data, error } = await supabase
        .from("cardapio")
        .select("categoria");

    if (error) {
        throw error;
    }

    const categorias = [...new Set(data.map(item => item.categoria).filter(Boolean))];
    return categorias.sort();
}

async function updateProduto(id, updates) {
    const { data, error } = await supabase
        .from("cardapio")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
    if (error) {
        throw error;
    }
    return data;
}

export default {
    listProdutos,
    getProduto,
    getCategorias,
    updateProduto
}