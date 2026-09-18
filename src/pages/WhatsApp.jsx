import { useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { HandleResponse } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import {
    listInstances,
    getInstanceState,
    createInstance,
    connectInstance,
    disconnectInstance,
    restartInstance,
    setPrimaryInstance,
    removeInstance
} from "../services/enterprise"
import { formatPhone } from "../utils/formatters"

/** De quanto em quanto o estado é reconsultado enquanto o QR está na tela. */
const INTERVALO_QR_MS = 3000

/**
 * De quanto em quanto um QR novo é pedido. O código do Baileys vence sozinho em
 * pouco mais de um minuto: sem trocar, quem demora a pegar o celular lê um
 * código morto e o pareamento simplesmente não acontece, sem erro nenhum.
 */
const INTERVALO_REGERAR_MS = 30_000

const ESTADOS = {
    open: { rotulo: "Conectado", cor: "success", icone: "bi-check-circle-fill" },
    close: { rotulo: "Desconectado", cor: "danger", icone: "bi-x-circle-fill" },
    connecting: { rotulo: "Conectando", cor: "warning", icone: "bi-arrow-repeat" },
    unknown: { rotulo: "Desconhecido", cor: "secondary", icone: "bi-question-circle" }
}

function Estado({ status }) {
    const { rotulo, cor, icone } = ESTADOS[status] ?? ESTADOS.unknown

    return (
        <span className={`badge bg-${cor}-subtle text-${cor}-emphasis border border-${cor}-subtle`}>
            <i className={`bi ${icone} me-1`}></i>{rotulo}
        </span>
    )
}

export default function PageWhatsApp() {
    const response = useRequest(listInstances)

    return (
        <div className="page-content">
            <div className="page-title-section">
                <div>
                    <h4>Conexão do WhatsApp</h4>
                    <p className="subtitle mb-0">
                        Onde o robô e o painel falam com os clientes
                    </p>
                </div>
            </div>

            {/*
                Recarga SILENCIOSA de propósito. `refetch` acende o `loading`, e
                aí o HandleResponse troca a lista por spinner — o que desmonta
                `Conexoes` e joga fora o estado dela, inclusive o QR que a ação
                acabou de trazer. O modal nunca chegava a abrir.
            */}
            <HandleResponse response={response}>
                {(instancias) => <Conexoes instancias={instancias} onMudou={response.refetchSilencioso} />}
            </HandleResponse>
        </div>
    )
}

function Conexoes({ instancias, onMudou }) {
    const [ocupado, setOcupado] = useState(null)
    const [qr, setQr] = useState(null)
    const [nova, setNova] = useState("")
    const [criando, setCriando] = useState(false)

    /**
     * Um só lugar para executar ação: todas travam a tela do mesmo jeito,
     * recarregam a lista e transformam a falha em toast. Espalhado por botão,
     * cada um esqueceria uma parte.
     */
    const executar = useCallback(async (chave, fn, sucesso) => {
        setOcupado(chave)
        try {
            const resultado = await fn()
            if (sucesso) toast.success(sucesso)
            await onMudou()
            return resultado
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
            return null
        } finally {
            setOcupado(null)
        }
    }, [onMudou])

    async function conectar(instancia) {
        const r = await executar(`conectar-${instancia.id}`, () => connectInstance(instancia.id))

        if (!r) return

        if (r.conectada) {
            toast.success("Já está conectada")
            return
        }

        // sem QR na resposta o modal não fica vazio: ele pede outro sozinho
        setQr({ id: instancia.id, nome: instancia.instance_name, imagem: r.qrcode ?? null })
    }

    async function criar(evento) {
        evento.preventDefault()

        if (!nova.trim() || criando) return

        setCriando(true)
        try {
            const r = await createInstance(nova.trim())
            toast.success("Conexão criada")
            setNova("")
            await onMudou()

            // O webhook não derruba mais a criação, mas ninguém pode sair daqui
            // achando que o robô já vai atender.
            if (r?.webhookErro) {
                toast.error(
                    `Conexão criada, mas o webhook não foi configurado: ${r.webhookErro} ` +
                    "Use \"Tornar principal\" depois de parear.",
                    { duration: 12_000 }
                )
            }

            if (r?.instancia) {
                setQr({ id: r.instancia.id, nome: r.instancia.instance_name, imagem: r.qrcode ?? null })
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setCriando(false)
        }
    }

    async function remover(instancia) {
        const confirmado = window.confirm(
            `Remover a conexão "${instancia.instance_name}"?\n\n` +
            "Ela é apagada do servidor do Evolution e o WhatsApp dela é desconectado. Não dá para desfazer."
        )

        if (!confirmado) return

        const r = await executar(`remover-${instancia.id}`, () => removeInstance(instancia.id))

        if (r?.sumiuDoServidor) {
            toast("A instância já não existia no servidor — o registro foi limpo", { icon: "ℹ️" })
        } else if (r) {
            toast.success("Conexão removida")
        }
    }

    return (
        <>
            {qr && (
                <ModalQr
                    qr={qr}
                    onFechar={() => setQr(null)}
                    onConectou={async () => {
                        setQr(null)
                        toast.success("WhatsApp conectado")
                        await onMudou()
                    }}
                />
            )}

            {instancias.length === 0 && (
                <div className="alert alert-warning d-flex gap-3 align-items-start">
                    <i className="bi bi-exclamation-triangle-fill fs-4"></i>
                    <div>
                        <div className="fw-bold">Nenhuma conexão registrada</div>
                        <div className="small">
                            Se a loja já tem WhatsApp funcionando, rode o
                            <span className="font-monospace"> .dev_scripts/002_evolution_instance.sql</span> —
                            ele adota a conexão que já está no config da empresa. Criar outra aqui
                            sem isso deixaria duas apontando para a mesma loja.
                        </div>
                    </div>
                </div>
            )}

            <div className="row g-3 mb-4">
                {instancias.map((instancia) => (
                    <div className="col-12 col-lg-6" key={instancia.id}>
                        <Cartao
                            instancia={instancia}
                            ocupado={ocupado}
                            onConectar={() => conectar(instancia)}
                            onDesconectar={() =>
                                executar(`desconectar-${instancia.id}`, () => disconnectInstance(instancia.id), "Desconectada")
                            }
                            onReiniciar={() =>
                                executar(`reiniciar-${instancia.id}`, () => restartInstance(instancia.id), "Reiniciada")
                            }
                            onPromover={() =>
                                executar(`principal-${instancia.id}`, () => setPrimaryInstance(instancia.id), "Agora é a principal")
                            }
                            onRemover={() => remover(instancia)}
                        />
                    </div>
                ))}
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    <h6 className="fw-bold mb-1">Nova conexão</h6>
                    <p className="text-muted small mb-3">
                        O nome é global no servidor do Evolution, que é compartilhado com outros
                        sistemas — se já existir um igual lá, a criação falha. Use algo que
                        identifique esta loja.
                    </p>

                    <form onSubmit={criar} className="d-flex gap-2 flex-wrap">
                        <input
                            type="text"
                            className="form-control"
                            style={{ maxWidth: 320 }}
                            placeholder="ex.: padaria-alem-do-pao"
                            value={nova}
                            onChange={(e) => setNova(e.target.value)}
                            maxLength={60}
                            disabled={criando}
                            aria-label="Nome da nova conexão"
                        />
                        <button type="submit" className="btn btn-danger fw-bold" disabled={criando || !nova.trim()}>
                            {criando ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Criando…
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-plus-lg me-2"></i>Criar e ler QR
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </>
    )
}

function Cartao({ instancia, ocupado, onConectar, onDesconectar, onReiniciar, onPromover, onRemover }) {
    const conectada = instancia.status === "open"
    const travado = ocupado !== null

    return (
        <div className={`card border-0 shadow-sm h-100 ${instancia.is_primary ? "border-start border-4 border-success" : ""}`}>
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div style={{ minWidth: 0 }}>
                        <div className="fw-bold text-truncate">{instancia.instance_name}</div>
                        {instancia.owner_jid && (
                            <div className="small text-muted font-monospace">
                                {formatPhone(instancia.owner_jid.split("@")[0])}
                            </div>
                        )}
                        {instancia.profile_name && (
                            <div className="small text-muted">{instancia.profile_name}</div>
                        )}
                    </div>

                    <div className="d-flex flex-column align-items-end gap-1 flex-shrink-0">
                        <Estado status={instancia.status} />
                        {instancia.is_primary && (
                            <span className="badge bg-success">
                                <i className="bi bi-star-fill me-1"></i>Principal
                            </span>
                        )}
                    </div>
                </div>

                <div className="d-flex gap-2 flex-wrap mt-3">
                    {conectada ? (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={onDesconectar}
                            disabled={travado}
                        >
                            <i className="bi bi-box-arrow-right me-1"></i>Desconectar
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={onConectar}
                            disabled={travado}
                        >
                            <i className="bi bi-qr-code me-1"></i>Conectar
                        </button>
                    )}

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onReiniciar}
                        disabled={travado}
                    >
                        <i className="bi bi-arrow-clockwise me-1"></i>Reiniciar
                    </button>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        onClick={onPromover}
                        disabled={travado}
                        title={
                            instancia.is_primary
                                ? "Reaplica o webhook — conserta uma conexão mexida por fora"
                                : "Passa a responder pela loja e grava o webhook do robô"
                        }
                    >
                        <i className="bi bi-star me-1"></i>
                        {instancia.is_primary ? "Reaplicar webhook" : "Tornar principal"}
                    </button>

                    {/* a principal não some daqui: apagá-la deixaria o robô sem número */}
                    {!instancia.is_primary && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={onRemover}
                            disabled={travado}
                        >
                            <i className="bi bi-trash me-1"></i>Remover
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

/**
 * O QR e a espera pela leitura.
 *
 * O laço pergunta o estado ao servidor porque o Evolution não avisa ninguém
 * quando o celular lê o código — sem isto a pessoa leria o QR e ficaria olhando
 * para uma tela que não muda.
 */
function ModalQr({ qr, onFechar, onConectou }) {
    const [segundos, setSegundos] = useState(0)
    const [imagem, setImagem] = useState(qr.imagem)
    const [regerando, setRegerando] = useState(!qr.imagem)
    const [erro, setErro] = useState(null)
    const onConectouRef = useRef(onConectou)
    const vivoRef = useRef(true)

    useEffect(() => {
        onConectouRef.current = onConectou
    })

    useEffect(() => {
        vivoRef.current = true
        return () => {
            vivoRef.current = false
        }
    }, [])

    const regerar = useCallback(async () => {
        setRegerando(true)

        try {
            const r = await connectInstance(qr.id)

            if (!vivoRef.current) return

            if (r?.conectada) {
                onConectouRef.current()
                return
            }

            setImagem(r?.qrcode ?? null)
            setErro(r?.qrcode ? null : "O servidor não devolveu um QR — tentando de novo.")
        } catch (error) {
            if (!vivoRef.current) return
            setErro(error.response?.data?.message || error.message)
        } finally {
            if (vivoRef.current) setRegerando(false)
        }
    }, [qr.id])

    // Criada sem QR na resposta: busca um agora, em vez de deixar a moldura
    // vazia até o primeiro ciclo.
    useEffect(() => {
        if (!qr.imagem) regerar()

        const timer = setInterval(regerar, INTERVALO_REGERAR_MS)
        return () => clearInterval(timer)
    }, [qr.imagem, regerar])

    useEffect(() => {
        let ativo = true

        const timer = setInterval(async () => {
            if (!ativo) return

            setSegundos((s) => s + INTERVALO_QR_MS / 1000)

            try {
                const estado = await getInstanceState(qr.id)

                if (ativo && estado?.status === "open") {
                    ativo = false
                    onConectouRef.current()
                }
            } catch {
                // servidor oscilando no meio da leitura não é motivo para fechar
                // o QR na cara de quem está com o celular na mão
            }
        }, INTERVALO_QR_MS)

        return () => {
            ativo = false
            clearInterval(timer)
        }
    }, [qr.id])

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
            style={{ background: "rgba(0,0,0,.55)", zIndex: 1080 }}
            onClick={onFechar}
        >
            <div
                className="card border-0 shadow"
                style={{ maxWidth: 380, width: "100%" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="card-body text-center">
                    <h6 className="fw-bold mb-1">Conectar {qr.nome}</h6>
                    <p className="text-muted small mb-3">
                        No celular: WhatsApp › Aparelhos conectados › Conectar um aparelho
                    </p>

                    {erro && <div className="alert alert-warning small py-2">{erro}</div>}

                    {imagem ? (
                        <img
                            src={imagem}
                            alt="QR Code para conectar o WhatsApp"
                            className="img-fluid border rounded mb-3"
                            style={{ maxWidth: 280 }}
                        />
                    ) : (
                        <div className="py-5 text-muted">
                            <div className="spinner-border text-danger mb-3" role="status"></div>
                            <div>Gerando o QR code…</div>
                        </div>
                    )}

                    <div className="text-muted small mb-3">
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Esperando a leitura… ({Math.round(segundos)}s)
                    </div>

                    <div className="d-flex gap-2 justify-content-center">
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={regerar}
                            disabled={regerando}
                        >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            {regerando ? "Gerando…" : "Gerar outro"}
                        </button>
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onFechar}>
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
