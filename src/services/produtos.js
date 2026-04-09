import { ProdutosAPI } from "./produtos.api"

const engine = new ProdutosAPI()

export async function getProdutos(page = 0, limit = 10, filters = {}) {
    return await engine.getProdutos(page, limit, filters)
}

export async function getProduto(id) {
    return await engine.getProduto(id)
}

export async function getCategorias() {
    return await engine.getCategorias()
}

export async function updateProduto(id, data) {
    return await engine.updateProduto(id, data)
}
