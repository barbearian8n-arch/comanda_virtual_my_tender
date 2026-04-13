import mytenderClient from "../infra/mytender.js";
import supabase from "../infra/supabase.js";

async function listProdutos(page = 0, limit = 10, filters = {}) {
    let query = supabase.from("cardapio").select("*");

    query = applyFilters(query, filters);

    if (limit !== -1) {
        const start = page * limit;
        const end = start + limit - 1;
        query = query.range(start, end);
    }

    const { data, error } = await query
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

        if (filters.is_disponivel !== undefined && filters.is_disponivel !== "") {
            query = query.eq("is_disponivel", filters.is_disponivel === "true" || filters.is_disponivel === true);
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
    const produtoAntigo = await getProduto(id);

    const { data, error } = await supabase
        .from("cardapio")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    if (updates.nome !== produtoAntigo.nome || updates.categoria !== produtoAntigo.categoria) {
        console.log("> Atualizando embedding...");
        await updateEmbedding(data.id);
    }

    return data;
}

async function updateEmbedding(id) {
    const { data, error } = await mytenderClient.post(`/menu/embedding`, { id })

    if (error) {
        throw error;
    }

    return data;
}

async function createProduto(produtoData) {
    const { data, error } = await supabase
        .from("cardapio")
        .insert(produtoData)
        .select()
        .single();

    if (error) {
        throw error;
    }

    await updateEmbedding(data.id);

    return data;
}

async function deleteProduto(id) {
    const { data, error } = await supabase
        .from("cardapio")
        .delete()
        .eq("id", id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    const deleteEmbedding = await supabase
        .from("embedding_cardapio")
        .delete()
        .eq("id_cardapio", id)
        .select();

    if (deleteEmbedding.error) {
        throw deleteEmbedding.error;
    }

    return data;
}

export default {
    listProdutos,
    getProduto,
    getCategorias,
    updateProduto,
    updateEmbedding,
    createProduto,
    deleteProduto
}