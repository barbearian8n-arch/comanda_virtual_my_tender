import supabase from "../infra/supabase.js";

async function listProdutos(page = 0, limit = 10) {
    const start = page * limit;
    const end = start + limit - 1;

    const { data, error } = await supabase
        .from("cardapio")
        .select("*")
        .range(start, end)
        .order("nome", { ascending: true });

    if (error) {
        throw error;
    }

    return data
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

export default {
    listProdutos,
    getProduto
}