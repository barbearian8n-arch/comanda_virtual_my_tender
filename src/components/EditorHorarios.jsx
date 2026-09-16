import { AGENDAS, DIAS, FAIXA_PADRAO, copiarParaSemana } from "../utils/horarios"

/**
 * A semana inteira numa tela só: cada dia é uma linha, e dentro dela as três
 * agendas ficam lado a lado.
 *
 * O eixo é o dia, e não o tipo de agenda, porque as perguntas que essa tela
 * responde são do tipo "na segunda, até que horas?" — e elas cruzam os três
 * tipos. Separado por tipo (uma aba cada), comparar o fechamento da loja com o
 * silêncio do robô exigia trocar de aba e guardar o número de cabeça.
 *
 * Trabalha no formato por dia (`{ schedule_agent: { seg: [{ inicio, fim }] } }`)
 * — quem chama traduz com `parseAgenda`/`serializarAgenda`.
 */
export default function EditorHorarios({ agendas, ativos, onChange }) {
    /** Sem o mapa de interruptores, tudo conta como ligado. */
    const estaLigado = (tipoId) => !ativos || ativos[tipoId] === true

    function alterarFaixas(tipoId, diaId, faixas) {
        onChange({
            ...agendas,
            [tipoId]: { ...agendas[tipoId], [diaId]: faixas }
        })
    }

    function alterarFaixa(tipoId, diaId, indice, campo, novo) {
        const faixas = (agendas[tipoId]?.[diaId] ?? []).map((faixa, i) =>
            i === indice ? { ...faixa, [campo]: novo } : faixa
        )

        alterarFaixas(tipoId, diaId, faixas)
    }

    function adicionarFaixa(tipoId, diaId) {
        const faixas = agendas[tipoId]?.[diaId] ?? []
        // a faixa nova começa onde a anterior terminou: o caso comum é a pausa
        // do almoço, e repetir o horário já digitado seria um erro silencioso
        const ultima = faixas.at(-1)
        const nova = ultima ? { inicio: ultima.fim, fim: FAIXA_PADRAO.fim } : { ...FAIXA_PADRAO }

        alterarFaixas(tipoId, diaId, [...faixas, nova])
    }

    function removerFaixa(tipoId, diaId, indice) {
        alterarFaixas(tipoId, diaId, (agendas[tipoId]?.[diaId] ?? []).filter((_, i) => i !== indice))
    }

    /**
     * Replica ESTA coluna deste dia na semana inteira — as outras duas agendas
     * não são tocadas. A regra em si mora em `copiarParaSemana`, para poder ser
     * testada: já foi por dia (as três de uma vez) e apagava coluna dos outros
     * dias, que é o tipo de erro que só um teste segura.
     */
    function copiarColunaParaTodos(tipoId, diaId) {
        onChange(copiarParaSemana(agendas, tipoId, diaId))
    }

    return (
        <div>
            {DIAS.map((dia) => {
                // só as agendas ligadas contam: desligada não é "fechado", é
                // "sem restrição" — anunciar um dia como fechado por causa dela
                // diria o contrário do que acontece
                const ligadas = AGENDAS.filter((tipo) => estaLigado(tipo.id))
                const totalDoDia = ligadas.reduce(
                    (soma, tipo) => soma + (agendas[tipo.id]?.[dia.id] ?? []).length,
                    0
                )

                return (
                    <div key={dia.id} className="card border-0 shadow-sm mb-2">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center gap-2 py-2">
                            <span className="fw-bold">{dia.label}</span>

                            {ligadas.length > 0 && totalDoDia === 0 && (
                                <span className="text-muted small">
                                    <i className="bi bi-moon me-1"></i>Fechado o dia todo
                                </span>
                            )}
                        </div>

                        <div className="card-body py-3">
                            <div className="row g-3">
                                {AGENDAS.map((tipo) => {
                                    const faixas = agendas[tipo.id]?.[dia.id] ?? []
                                    const ligado = estaLigado(tipo.id)

                                    return (
                                        // esmaecida, mas não desabilitada: o caminho normal é
                                        // montar a semana com calma e só então ligar a agenda
                                        <div
                                            key={tipo.id}
                                            className="col-12 col-md-4"
                                            style={ligado ? undefined : { opacity: 0.55 }}
                                        >
                                            <div
                                                className={`small fw-semibold mb-2 ${ligado ? `text-${tipo.cor}-emphasis` : "text-muted"}`}
                                            >
                                                <i className={`bi ${tipo.icone} me-1`}></i>
                                                {tipo.label}
                                                {!ligado && (
                                                    <span className="fw-normal ms-1">(desligada)</span>
                                                )}
                                            </div>

                                            {faixas.length === 0 && (
                                                <div className="text-muted small mb-2">—</div>
                                            )}

                                            {faixas.map((faixa, indice) => (
                                                <div
                                                    key={indice}
                                                    className="d-flex align-items-center gap-1 mb-1"
                                                >
                                                    <input
                                                        type="time"
                                                        className="form-control form-control-sm"
                                                        style={{ minWidth: 0 }}
                                                        value={faixa.inicio}
                                                        onChange={(e) =>
                                                            alterarFaixa(tipo.id, dia.id, indice, "inicio", e.target.value)
                                                        }
                                                        aria-label={`${tipo.label}, ${dia.label}: início da faixa ${indice + 1}`}
                                                    />

                                                    <span className="text-muted">–</span>

                                                    <input
                                                        type="time"
                                                        className="form-control form-control-sm"
                                                        style={{ minWidth: 0 }}
                                                        value={faixa.fim}
                                                        onChange={(e) =>
                                                            alterarFaixa(tipo.id, dia.id, indice, "fim", e.target.value)
                                                        }
                                                        aria-label={`${tipo.label}, ${dia.label}: fim da faixa ${indice + 1}`}
                                                    />

                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-link text-danger p-0 ms-1"
                                                        onClick={() => removerFaixa(tipo.id, dia.id, indice)}
                                                        title="Remover esta faixa"
                                                    >
                                                        <i className="bi bi-x-lg"></i>
                                                    </button>
                                                </div>
                                            ))}

                                            <div className="d-flex gap-3 flex-wrap">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-link p-0 text-decoration-none"
                                                    onClick={() => adicionarFaixa(tipo.id, dia.id)}
                                                >
                                                    <i className="bi bi-plus-lg me-1"></i>Adicionar faixa
                                                </button>

                                                {/* só com faixa preenchida: numa coluna vazia este
                                                    botão seria um "apagar a semana" disfarçado */}
                                                {faixas.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-link p-0 text-decoration-none text-muted"
                                                        onClick={() => copiarColunaParaTodos(tipo.id, dia.id)}
                                                        title={`Repetir este horário de ${tipo.label} em todos os dias da semana`}
                                                    >
                                                        <i className="bi bi-files me-1"></i>Copiar p/ semana
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
