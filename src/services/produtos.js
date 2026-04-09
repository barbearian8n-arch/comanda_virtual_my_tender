import { ProdutosAPI } from "./produtos.api"

const engine = new ProdutosAPI()

export async function getProdutos(page = 0, limit = 10) {
    return await engine.getProdutos(page, limit)
}

export async function getProduto(id) {
    return await engine.getProduto(id)
}
