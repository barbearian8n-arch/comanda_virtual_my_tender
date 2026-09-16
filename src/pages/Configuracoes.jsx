import { useMemo, useState } from "react"
import toast from "react-hot-toast"
import { HandleResponse } from "../components/HandleResponse"
import EditorHorarios from "../components/EditorHorarios"
import { useRequest } from "../hooks/useRequest"
import { getSchedules, saveSchedules } from "../services/enterprise"
import { AGENDAS, campoAtivo, parseAgenda, serializarAgenda } from "../utils/horarios"

export default function PageConfiguracoes() {
    const response = useRequest(getSchedules)

    return (
        <div className="page-content">
            <div className="page-title-section">
                <div>
                    <h4>Configurações</h4>
                    <p className="subtitle mb-0">Horários de funcionamento da loja, do robô e das encomendas</p>
                </div>
            </div>

            <HandleResponse response={response}>
                {/* o formulário nasce com os dados já carregados: inicializar por
                    efeito faria a tela abrir vazia e preencher depois, piscando */}
                {(dados) => <FormularioHorarios inicial={dados} onSalvo={response.refetch} />}
            </HandleResponse>
        </div>
    )
}

function FormularioHorarios({ inicial, onSalvo }) {
    const [salvando, setSalvando] = useState(false)

    const [agendas, setAgendas] = useState(() =>
        Object.fromEntries(AGENDAS.map((tipo) => [tipo.id, parseAgenda(inicial?.[tipo.id])]))
    )

    const [ativos, setAtivos] = useState(() =>
        Object.fromEntries(AGENDAS.map((tipo) => [tipo.id, inicial?.[campoAtivo(tipo.id)] === true]))
    )

    // O que de fato vai para o banco. Serve de duas coisas: é o corpo do POST e
    // é a régua para saber se há mudança pendente — comparar o texto final evita
    // marcar como "não salvo" uma edição que deu no mesmo (remover uma faixa e
    // digitá-la de volta, por exemplo).
    const paraSalvar = useMemo(() => {
        const corpo = {}

        for (const tipo of AGENDAS) {
            corpo[tipo.id] = serializarAgenda(agendas[tipo.id])
            corpo[campoAtivo(tipo.id)] = ativos[tipo.id]
        }

        return corpo
    }, [agendas, ativos])

    const alterado = useMemo(
        () =>
            AGENDAS.some(
                (tipo) =>
                    JSON.stringify(paraSalvar[tipo.id]) !== JSON.stringify(inicial?.[tipo.id] ?? []) ||
                    paraSalvar[campoAtivo(tipo.id)] !== (inicial?.[campoAtivo(tipo.id)] === true)
            ),
        [paraSalvar, inicial]
    )

    async function salvar(e) {
        e.preventDefault()

        setSalvando(true)
        try {
            await saveSchedules(paraSalvar)
            toast.success("Horários salvos")
            onSalvo()
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <form onSubmit={salvar}>
            {/* A legenda explica os três tipos uma vez só e guarda o interruptor
                de cada um. O interruptor vale para a semana inteira, então mora
                aqui e não dentro dos dias: repetido sete vezes, não daria para
                saber qual deles manda. */}
            <div className="row g-2 mb-3">
                {AGENDAS.map((tipo) => {
                    const ligado = ativos[tipo.id]
                    const quantidade = paraSalvar[tipo.id].length

                    return (
                        <div className="col-12 col-md-4" key={tipo.id}>
                            <div className={`border rounded p-2 h-100 bg-white ${ligado ? "" : "border-secondary-subtle"}`}>
                                <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                    <div className={`small fw-semibold ${ligado ? `text-${tipo.cor}-emphasis` : "text-muted"}`}>
                                        <i className={`bi ${tipo.icone} me-1`}></i>
                                        {tipo.label}
                                        <span className="badge bg-light text-dark border ms-2">{quantidade}</span>
                                    </div>

                                    <div className="form-check form-switch m-0 flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            role="switch"
                                            className="form-check-input"
                                            id={`ativo-${tipo.id}`}
                                            checked={ligado}
                                            onChange={(e) =>
                                                setAtivos((prev) => ({ ...prev, [tipo.id]: e.target.checked }))
                                            }
                                        />
                                        <label className="visually-hidden" htmlFor={`ativo-${tipo.id}`}>
                                            Ativar {tipo.label}
                                        </label>
                                    </div>
                                </div>

                                <div className="text-muted" style={{ fontSize: ".78rem" }}>
                                    {tipo.ajuda}
                                </div>

                                {/* o erro fácil de cometer: encher a semana de horário e
                                    deixar o interruptor desligado, sem entender por que
                                    nada mudou. Some sozinho quando um dos dois muda. */}
                                {!ligado && quantidade > 0 && (
                                    <div className="text-warning-emphasis mt-1" style={{ fontSize: ".78rem" }}>
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        {quantidade} faixa(s) salvas, mas esta agenda está desligada — não está valendo.
                                    </div>
                                )}

                                {!ligado && quantidade === 0 && (
                                    <div className="text-muted mt-1" style={{ fontSize: ".78rem" }}>
                                        <i className="bi bi-dash-circle me-1"></i>
                                        Desligada — sem restrição de horário.
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <EditorHorarios agendas={agendas} ativos={ativos} onChange={setAgendas} />

            <details className="small mb-3">
                <summary className="text-muted" style={{ cursor: "pointer" }}>
                    Ver como será salvo
                </summary>
                {/* o formato é contrato com o robô: mostrar o texto exato que
                    será gravado deixa conferir sem abrir o banco */}
                <code className="d-block mt-2 p-2 bg-light rounded" style={{ whiteSpace: "pre-wrap" }}>
                    {AGENDAS.map((tipo) =>
                        [
                            `${tipo.id}: [${paraSalvar[tipo.id].map((h) => `'${h}'`).join(", ")}]`,
                            `${campoAtivo(tipo.id)}: ${paraSalvar[campoAtivo(tipo.id)]}`
                        ].join("\n")
                    ).join("\n\n")}
                </code>
            </details>

            {/* barra fixa: são sete dias de altura, e um Salvar só lá embaixo
                obrigaria a rolar a tela inteira depois de cada ajuste */}
            <div
                className="d-flex justify-content-between align-items-center gap-2 flex-wrap bg-white border-top py-3 px-1"
                style={{ position: "sticky", bottom: 0 }}
            >
                <span className="text-muted small">
                    {alterado ? (
                        <>
                            <i className="bi bi-exclamation-circle text-warning-emphasis me-1"></i>
                            Alterações não salvas — o Salvar grava as três agendas de uma vez
                        </>
                    ) : (
                        <>
                            <i className="bi bi-check2 text-success me-1"></i>
                            Tudo salvo
                        </>
                    )}
                </span>

                <button type="submit" className="btn btn-danger fw-bold" disabled={salvando || !alterado}>
                    {salvando ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Salvando…
                        </>
                    ) : (
                        <>
                            <i className="bi bi-check-lg me-2"></i>Salvar
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
