import { useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import { HandleResponse } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import { getAlertas, salvarAlertas, enviarSom, renomearSom, removerSom } from "../services/alertas"
import {
    TIMBRES, PREFIXO_ARQUIVO, tocarTimbre, iniciarSirene, registrarSonsEnviados,
    liberarNoPrimeiroGesto, somLiberado, somSuportado
} from "../services/alertaSonoro"

/** Os mesmos ids de `models/enterprise.js`; os dois lados repetem a lista. */
const EVENTOS = [
    { id: "comanda_criada", label: "Comanda criada", ajuda: "Cliente abriu um pedido." },
    { id: "comanda_fechada", label: "Comanda fechada", ajuda: "Cliente finalizou o carrinho." },
    { id: "nova_mensagem", label: "Nova mensagem", ajuda: "Cliente escreveu no WhatsApp." }
]

const SEVERIDADES = [
    { id: "info", label: "Informação" },
    { id: "sucesso", label: "Sucesso" },
    { id: "atencao", label: "Atenção" },
    { id: "urgente", label: "Urgente" }
]

const SIRENES = [
    { id: "nunca", label: "Nunca" },
    { id: "urgente", label: "Só nos urgentes" },
    { id: "sempre", label: "Em tudo que pede confirmação" }
]

export default function PageAlertas() {
    const response = useRequest(getAlertas)

    return (
        <div className="page-content">
            <div className="page-title-section">
                <div>
                    <h4>Alertas sonoros</h4>
                    <p className="subtitle mb-0">Como o balcão é avisado do que chega</p>
                </div>
            </div>

            <HandleResponse response={response}>
                {(dados) => <Painel inicial={dados} onSalvo={response.refetch} />}
            </HandleResponse>
        </div>
    )
}

function Painel({ inicial, onSalvo }) {
    const [alertas, setAlertas] = useState(inicial.alertas)
    const [notificacoes, setNotificacoes] = useState(inicial.notificacoes)
    const [sons, setSons] = useState(inicial.sons ?? [])
    const [salvando, setSalvando] = useState(false)
    const [liberado, setLiberado] = useState(() => somLiberado())

    const pararSireneRef = useRef(null)

    // o motor precisa da lista para baixar os arquivos antes do primeiro alerta
    useEffect(() => {
        registrarSonsEnviados(sons)
    }, [sons])

    /**
     * O navegador só toca som depois de um gesto. Sem este aviso, o painel
     * ficaria a manhã inteira sem apitar e ninguém saberia por quê — a tela não
     * mostra nada de errado.
     */
    useEffect(() => {
        if (liberado) return
        return liberarNoPrimeiroGesto(() => setLiberado(true))
    }, [liberado])

    // sirene de teste não pode continuar tocando depois que a tela sai
    useEffect(() => () => pararSireneRef.current?.(), [])

    const opcoesTimbre = useMemo(() => [
        ...Object.entries(TIMBRES).map(([id, t]) => ({ id, rotulo: t.rotulo })),
        ...sons.map((s) => ({ id: `${PREFIXO_ARQUIVO}${s.id}`, rotulo: `${s.rotulo} (enviado)` }))
    ], [sons])

    const alterado = useMemo(
        () => JSON.stringify(alertas) !== JSON.stringify(inicial.alertas) ||
              JSON.stringify(notificacoes) !== JSON.stringify(inicial.notificacoes),
        [alertas, notificacoes, inicial]
    )

    const volume = alertas.volume / 100

    function testar(timbre) {
        tocarTimbre(timbre, { volume })
    }

    function testarSirene() {
        if (pararSireneRef.current) {
            pararSireneRef.current()
            pararSireneRef.current = null
            return
        }

        pararSireneRef.current = iniciarSirene(alertas.timbreSirene, { volume })
    }

    async function salvar(e) {
        e.preventDefault()
        setSalvando(true)
        try {
            await salvarAlertas({ alertas, notificacoes })
            toast.success("Alertas salvos")
            onSalvo()
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <form onSubmit={salvar}>
            {!somSuportado() && (
                <div className="alert alert-danger small">
                    Este navegador não toca os alertas. Use Chrome, Edge ou Safari recentes.
                </div>
            )}

            {somSuportado() && !liberado && (
                <div className="alert alert-warning d-flex gap-2 align-items-center small">
                    <i className="bi bi-volume-mute fs-5"></i>
                    <span>
                        O navegador bloqueia som até o primeiro clique na página.
                        <strong> Clique em qualquer lugar</strong> para liberar.
                    </span>
                </div>
            )}

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                    <h6 className="fw-bold mb-3">Som</h6>

                    <div className="form-check form-switch mb-3">
                        <input
                            type="checkbox" role="switch" className="form-check-input" id="somLigado"
                            checked={alertas.somLigado}
                            onChange={(e) => setAlertas({ ...alertas, somLigado: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="somLigado">
                            Tocar som nos alertas
                        </label>
                    </div>

                    <label htmlFor="volume" className="form-label small fw-bold text-muted">
                        Volume — {alertas.volume}%
                    </label>
                    <div className="d-flex align-items-center gap-3 mb-3">
                        <input
                            id="volume" type="range" className="form-range" min="0" max="100"
                            value={alertas.volume}
                            onChange={(e) => setAlertas({ ...alertas, volume: Number(e.target.value) })}
                        />
                        <button type="button" className="btn btn-sm btn-outline-secondary flex-shrink-0"
                            onClick={() => testar(alertas.timbres.info)}>
                            <i className="bi bi-play-fill"></i> Testar
                        </button>
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-md-6">
                            <label htmlFor="duracao" className="form-label small fw-bold text-muted">
                                Quanto o aviso fica na tela (segundos)
                            </label>
                            <input
                                id="duracao" type="number" className="form-control" min="2" max="60"
                                value={Math.round(alertas.duracaoMs / 1000)}
                                onChange={(e) => setAlertas({ ...alertas, duracaoMs: Number(e.target.value) * 1000 })}
                            />
                        </div>
                        <div className="col-12 col-md-6">
                            <label htmlFor="repetir" className="form-label small fw-bold text-muted">
                                Repetir enquanto não confirmarem (segundos, 0 = não repetir)
                            </label>
                            <input
                                id="repetir" type="number" className="form-control" min="0" max="300"
                                value={Math.round(alertas.repetirPendenciaMs / 1000)}
                                onChange={(e) => setAlertas({ ...alertas, repetirPendenciaMs: Number(e.target.value) * 1000 })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                    <h6 className="fw-bold mb-1">Timbre por severidade</h6>
                    <p className="text-muted small mb-3">
                        Cada evento abaixo tem uma severidade; é ela que escolhe o toque.
                    </p>

                    {SEVERIDADES.map((sev) => (
                        <div className="d-flex align-items-center gap-2 mb-2" key={sev.id}>
                            <span className="small" style={{ width: 110 }}>{sev.label}</span>
                            <select
                                className="form-select form-select-sm"
                                style={{ maxWidth: 280 }}
                                value={alertas.timbres[sev.id]}
                                onChange={(e) => setAlertas({
                                    ...alertas,
                                    timbres: { ...alertas.timbres, [sev.id]: e.target.value }
                                })}
                                aria-label={`Timbre de ${sev.label}`}
                            >
                                {opcoesTimbre.map((o) => (
                                    <option key={o.id} value={o.id}>{o.rotulo}</option>
                                ))}
                            </select>
                            <button type="button" className="btn btn-sm btn-outline-secondary"
                                onClick={() => testar(alertas.timbres[sev.id])}>
                                <i className="bi bi-play-fill"></i>
                            </button>
                        </div>
                    ))}

                    <hr />

                    <h6 className="fw-bold mb-1">Sirene</h6>
                    <p className="text-muted small mb-3">
                        Toque contínuo, que só para quando alguém confirma o aviso.
                    </p>

                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <select
                            className="form-select form-select-sm" style={{ maxWidth: 240 }}
                            value={alertas.sirene}
                            onChange={(e) => setAlertas({ ...alertas, sirene: e.target.value })}
                            aria-label="Quando usar sirene"
                        >
                            {SIRENES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>

                        {alertas.sirene !== "nunca" && (
                            <>
                                <select
                                    className="form-select form-select-sm" style={{ maxWidth: 260 }}
                                    value={alertas.timbreSirene}
                                    onChange={(e) => setAlertas({ ...alertas, timbreSirene: e.target.value })}
                                    aria-label="Timbre da sirene"
                                >
                                    {opcoesTimbre.map((o) => (
                                        <option key={o.id} value={o.id}>{o.rotulo}</option>
                                    ))}
                                </select>
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={testarSirene}>
                                    <i className={`bi ${pararSireneRef.current ? "bi-stop-fill" : "bi-play-fill"}`}></i>
                                    {" "}Testar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                    <h6 className="fw-bold mb-3">Quais avisos o balcão recebe</h6>

                    {EVENTOS.map((ev) => {
                        const cfg = notificacoes[ev.id]

                        return (
                            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap" key={ev.id}>
                                <div className="form-check form-switch m-0" style={{ width: 190 }}>
                                    <input
                                        type="checkbox" role="switch" className="form-check-input"
                                        id={`ev-${ev.id}`}
                                        checked={cfg.ligado}
                                        onChange={(e) => setNotificacoes({
                                            ...notificacoes,
                                            [ev.id]: { ...cfg, ligado: e.target.checked }
                                        })}
                                    />
                                    <label className="form-check-label small" htmlFor={`ev-${ev.id}`}>
                                        {ev.label}
                                    </label>
                                </div>

                                <select
                                    className="form-select form-select-sm" style={{ maxWidth: 150 }}
                                    value={cfg.severidade}
                                    disabled={!cfg.ligado}
                                    onChange={(e) => setNotificacoes({
                                        ...notificacoes,
                                        [ev.id]: { ...cfg, severidade: e.target.value }
                                    })}
                                    aria-label={`Severidade de ${ev.label}`}
                                >
                                    {SEVERIDADES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>

                                <div className="form-check m-0">
                                    <input
                                        type="checkbox" className="form-check-input" id={`cf-${ev.id}`}
                                        checked={cfg.confirmar}
                                        disabled={!cfg.ligado}
                                        onChange={(e) => setNotificacoes({
                                            ...notificacoes,
                                            [ev.id]: { ...cfg, confirmar: e.target.checked }
                                        })}
                                    />
                                    <label className="form-check-label small" htmlFor={`cf-${ev.id}`}>
                                        exige confirmação
                                    </label>
                                </div>

                                <span className="text-muted" style={{ fontSize: ".75rem" }}>{ev.ajuda}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <SonsEnviados sons={sons} volume={volume} onMudou={setSons} />

            <div
                className="d-flex justify-content-between align-items-center gap-2 flex-wrap bg-white border-top py-3 px-1"
                style={{ position: "sticky", bottom: 0 }}
            >
                <span className="text-muted small">
                    {alterado
                        ? <><i className="bi bi-exclamation-circle text-warning-emphasis me-1"></i>Alterações não salvas</>
                        : <><i className="bi bi-check2 text-success me-1"></i>Tudo salvo</>}
                </span>

                <button type="submit" className="btn btn-danger fw-bold" disabled={salvando || !alterado}>
                    {salvando
                        ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Salvando…</>
                        : <><i className="bi bi-check-lg me-2"></i>Salvar</>}
                </button>
            </div>
        </form>
    )
}

function SonsEnviados({ sons, volume, onMudou }) {
    const [enviando, setEnviando] = useState(false)

    async function escolher(evento) {
        const arquivo = evento.target.files?.[0]
        evento.target.value = ""
        if (!arquivo) return

        const rotulo = arquivo.name.replace(/\.[^.]+$/, "").slice(0, 60)

        setEnviando(true)
        try {
            // a duração sai daqui porque medir no servidor exigiria decodificar o
            // áudio para um número que a tela usa só para escrever "0:03"
            const duracaoMs = await medirDuracao(arquivo).catch(() => null)
            const criado = await enviarSom(arquivo, { rotulo, duracaoMs })
            onMudou([...sons, criado])
            toast.success("Som enviado")
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setEnviando(false)
        }
    }

    async function renomear(som) {
        const novo = window.prompt("Nome do som:", som.rotulo)
        if (novo == null || novo.trim() === som.rotulo) return

        try {
            const atualizado = await renomearSom(som.id, novo.trim())
            onMudou(sons.map((s) => (s.id === som.id ? atualizado : s)))
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }

    async function excluir(som) {
        if (!window.confirm(`Excluir "${som.rotulo}"?\n\nOnde ele estiver escolhido, o alerta volta ao toque padrão.`)) return

        try {
            await removerSom(som.id)
            onMudou(sons.filter((s) => s.id !== som.id))
            toast.success("Som removido")
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }

    return (
        <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
                <h6 className="fw-bold mb-1">Sons da loja</h6>
                <p className="text-muted small mb-3">
                    Enviados por você, aparecem junto dos timbres nos seletores acima.
                    Até 2 MB, em mp3, wav, m4a ou aac.
                </p>

                {sons.length === 0 && <p className="text-muted small">Nenhum som enviado ainda.</p>}

                {sons.map((som) => (
                    <div className="d-flex align-items-center gap-2 mb-2" key={som.id}>
                        <span className="small flex-grow-1 text-truncate">
                            {som.rotulo}
                            {som.duracao_ms ? (
                                <span className="text-muted"> · {(som.duracao_ms / 1000).toFixed(1)}s</span>
                            ) : null}
                        </span>

                        <button type="button" className="btn btn-sm btn-outline-secondary"
                            onClick={() => tocarTimbre(`${PREFIXO_ARQUIVO}${som.id}`, { volume })}>
                            <i className="bi bi-play-fill"></i>
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => renomear(som)}>
                            <i className="bi bi-pencil"></i>
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => excluir(som)}>
                            <i className="bi bi-trash"></i>
                        </button>
                    </div>
                ))}

                <label className={`btn btn-sm btn-outline-success mt-2 mb-0 ${enviando ? "disabled" : ""}`}>
                    {enviando
                        ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Enviando…</>
                        : <><i className="bi bi-upload me-2"></i>Enviar som</>}
                    <input type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/aac,.mp3,.wav,.m4a,.aac"
                        className="d-none" disabled={enviando} onChange={escolher} />
                </label>
            </div>
        </div>
    )
}

/** Mede no navegador, que já tem o decodificador — e o servidor não precisa ter. */
function medirDuracao(arquivo) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(arquivo)
        const audio = new Audio()

        audio.addEventListener("loadedmetadata", () => {
            URL.revokeObjectURL(url)
            resolve(Number.isFinite(audio.duration) ? audio.duration * 1000 : null)
        })
        audio.addEventListener("error", () => {
            URL.revokeObjectURL(url)
            reject(new Error("não foi possível ler o áudio"))
        })

        audio.src = url
    })
}
