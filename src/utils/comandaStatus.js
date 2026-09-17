/**
 * Os estados de uma comanda, com rótulo e cor.
 *
 * Ficava duplicado: a Home conhecia dois estados (`open` e `closed`) e a tela da
 * comanda conhecia cinco. Como o banco produz `closing`, `weighing` e
 * `confirming`, a Home renderizava `class="undefined"` para eles — e nenhuma das
 * duas sabia de `finished`, que é o estado em que `finishComanda` deixa a linha.
 *
 * Uma lista só, e um padrão para o que não estiver nela: estado desconhecido
 * aparece com o próprio nome em cinza, em vez de derrubar a tela.
 */
const STATUS_COMANDA = {
    open: { label: "Aberta", classe: "bg-success text-white" },
    weighing: { label: "Pesando", classe: "bg-warning text-dark" },
    closing: { label: "Fechando", classe: "bg-warning text-dark" },
    confirming: { label: "Confirmando", classe: "bg-warning text-dark" },
    closed: { label: "Fechada", classe: "bg-secondary text-white" },
    finished: { label: "Finalizada", classe: "bg-dark text-white" }
}

export function descreverStatus(status) {
    return STATUS_COMANDA[status] ?? {
        label: status || "Sem status",
        classe: "bg-secondary text-white"
    }
}

/**
 * A comanda tem item pendente de pesagem?
 *
 * A view já responde isso em `to_be_weighed`; os testes sobre os itens são a
 * reserva para quando a comanda vem de um caminho que não passa pela view.
 */
export function precisaPesar(comanda) {
    if (comanda?.to_be_weighed != null) {
        return Boolean(comanda.to_be_weighed)
    }

    return Boolean(
        comanda?.items?.some(
            (i) => i.to_be_weighed || i.menu_info?.unit === "kg" || i.base_unit === "kg"
        ) || comanda?.is_weighing
    )
}
