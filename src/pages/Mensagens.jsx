import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import { HandleResponse, Loading } from "../components/HandleResponse"
import { useRequest } from "../hooks/useRequest"
import { useAutoRefresh } from "../hooks/useAutoRefresh"
import { listSenders, listConversations, listMessages, uploadAudio } from "../services/agent"
import { formatPhone } from "../utils/formatters"

const INTERVALO_MS = 60_000

/** Altura dos dois painéis. Fixa de propósito: é ela que cria a barra de rolagem. */
const ALTURA_PAINEL = "65vh"

/** Distância do fim ainda considerada "no fim" — evita brigar com o scroll suave. */
const FOLGA_FIM = 60

/**
 * A busca só faz sentido depois que um número de origem foi escolhido. Sem esta
 * guarda, o primeiro render (antes do `<select>` ter valor) dispararia uma
 * chamada que a API recusa por falta de `sender`, e a tela abriria em erro.
 *
 * Fica no módulo, e não dentro do componente, para manter a identidade estável
 * entre renders — `useRequest` compara a lista de dependências, não a função.
 */
async function carregarConversas(sender) {
    if (!sender) {
        return { conversas: [] }
    }

    return await listConversations(sender)
}

/** `Roberta Machado` → `RM`. */
function iniciais(nome) {
    const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean)

    if (partes.length === 0) return "?"
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()

    return (partes[0][0] + partes.at(-1)[0]).toUpperCase()
}

function formatarQuando(iso) {
    const data = new Date(iso)
    const hoje = new Date()
    const mesmoDia = data.toDateString() === hoje.toDateString()

    return data.toLocaleString("pt-BR", {
        ...(mesmoDia ? {} : { day: "2-digit", month: "2-digit" }),
        hour: "2-digit",
        minute: "2-digit"
    })
}

function rotuloDoDia(iso) {
    const data = new Date(iso)
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(hoje.getDate() - 1)

    if (data.toDateString() === hoje.toDateString()) return "Hoje"
    if (data.toDateString() === ontem.toDateString()) return "Ontem"

    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/**
 * Rosquinha da contagem regressiva: o arco vai se esvaziando até a próxima
 * recarga e gira enquanto ela acontece. `strokeDasharray` é a circunferência
 * inteira, então o `strokeDashoffset` desenha exatamente a fração que falta.
 */
function AnelContagem({ restanteMs, totalMs, atualizando }) {
    const raio = 8
    const circunferencia = 2 * Math.PI * raio
    const fracao = atualizando ? 0.25 : Math.max(0, Math.min(1, restanteMs / totalMs))

    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            className={atualizando ? "anel-girando" : ""}
            aria-hidden="true"
        >
            <circle cx="10" cy="10" r={raio} fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
            <circle
                cx="10"
                cy="10"
                r={raio}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={circunferencia}
                strokeDashoffset={circunferencia * (1 - fracao)}
                transform="rotate(-90 10 10)"
                // sem a transição o arco pula de segundo em segundo
                style={{ transition: atualizando ? "none" : "stroke-dashoffset 1s linear" }}
            />
        </svg>
    )
}

function ItemConversa({ conversa, ativa, onSelecionar }) {
    const nome = conversa.nome ?? formatPhone(conversa.telefone)

    return (
        <button
            type="button"
            className={`list-group-item list-group-item-action d-flex gap-3 py-3 ${ativa ? "active" : ""}`}
            onClick={() => onSelecionar(conversa.telefone)}
        >
            <div
                className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold ${ativa ? "bg-white text-dark" : "bg-success-subtle text-success"
                    }`}
                style={{ width: 40, height: 40, fontSize: ".8rem" }}
            >
                {iniciais(nome)}
            </div>

            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="d-flex justify-content-between align-items-baseline gap-2">
                    <span className="fw-semibold text-truncate">{nome}</span>
                    <span className={`small text-nowrap ${ativa ? "" : "text-muted"}`}>
                        {formatarQuando(conversa.ultima.criado_em)}
                    </span>
                </div>

                <div className={`small text-truncate ${ativa ? "" : "text-muted"}`}>
                    {conversa.ultima.de_mim && <i className="bi bi-reply-fill me-1"></i>}
                    {/* na prévia o áudio não toca, então vale o que foi dito nele;
                        sem transcrição ainda, ao menos diz que é um áudio */}
                    {conversa.ultima.midia ? (
                        <>
                            <i className="bi bi-mic-fill me-1"></i>
                            {conversa.ultima.transcricao || <em>Áudio</em>}
                        </>
                    ) : (
                        conversa.ultima.texto || <em>{conversa.ultima.tipo}</em>
                    )}
                </div>

                <div className="d-flex gap-1 mt-1">
                    <span className={`badge ${ativa ? "bg-white text-dark" : "bg-light text-dark border"}`}>
                        {conversa.recebidas} recebida(s)
                    </span>
                </div>
            </div>
        </button>
    )
}

/**
 * O áudio e, embaixo, o que foi dito nele.
 *
 * A transcrição vem do n8n e chega depois do arquivo, então `null` aqui não é
 * erro: é o intervalo entre o áudio subir e a transcrição ficar pronta. Dizer
 * isso em letras é melhor que não mostrar nada, que pareceria uma transcrição
 * que nunca vai vir.
 *
 * `preload="none"` porque uma conversa pode ter dezenas de áudios: sem isso o
 * navegador começaria a baixar todos ao abrir a thread.
 */
function Audio({ mensagem }) {
    return (
        <>
            <audio
                controls
                preload="none"
                src={mensagem.midia}
                className="d-block"
                style={{ width: "min(280px, 100%)" }}
            />

            {mensagem.transcricao ? (
                <div className="mt-2 pt-2 border-top">
                    <span className="text-muted d-block" style={{ fontSize: ".7rem" }}>
                        <i className="bi bi-card-text me-1"></i>transcrição
                    </span>
                    <span className="small" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {mensagem.transcricao}
                    </span>
                </div>
            ) : (
                <div className="mt-2 pt-2 border-top text-muted" style={{ fontSize: ".7rem" }}>
                    <i className="bi bi-hourglass-split me-1"></i>sem transcrição ainda
                </div>
            )}
        </>
    )
}

function Balao({ mensagem }) {
    const minha = mensagem.de_mim
    const temAudio = Boolean(mensagem.midia)

    return (
        <div className={`d-flex mb-2 ${minha ? "justify-content-end" : "justify-content-start"}`}>
            <div
                className={`rounded-4 px-3 py-2 ${minha ? "bg-success-subtle" : "bg-light border"}`}
                style={{ maxWidth: "min(560px, 85%)" }}
            >
                {/* com player à vista, repetir "audio" em cima dele não informa nada */}
                {mensagem.tipo !== "text" && !temAudio && (
                    <div className="small fw-semibold text-muted mb-1">
                        <i className="bi bi-paperclip me-1"></i>{mensagem.tipo}
                    </div>
                )}

                {temAudio ? (
                    <Audio mensagem={mensagem} />
                ) : (
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {mensagem.texto || <em className="text-muted">sem texto</em>}
                    </div>
                )}

                <div className="d-flex align-items-center justify-content-end gap-2 mt-1">
                    {minha && (
                        <span className="badge bg-secondary-subtle text-secondary-emphasis">
                            {mensagem.do_robo ? "robô" : "loja"}
                        </span>
                    )}
                    <span className="text-muted" style={{ fontSize: ".7rem" }}>
                        {formatarQuando(mensagem.criado_em)}
                    </span>
                </div>
            </div>
        </div>
    )
}

function Conversa({ telefone, nome, mensagens, carregando, onVoltar, onEnviarAudio }) {
    const painelRef = useRef(null)
    const noFimRef = useRef(true)
    const telefoneRenderizadoRef = useRef(null)
    const [mostrarBotaoFim, setMostrarBotaoFim] = useState(false)
    const [enviando, setEnviando] = useState(false)

    async function escolherArquivo(evento) {
        const arquivo = evento.target.files?.[0]

        // limpo já: sem isso, escolher o MESMO arquivo de novo depois de um erro
        // não dispara o onChange e parece que o botão travou
        evento.target.value = ""

        if (!arquivo) return

        setEnviando(true)
        try {
            await onEnviarAudio(arquivo)
        } finally {
            setEnviando(false)
        }
    }

    function aoRolar() {
        const painel = painelRef.current
        if (!painel) return

        const noFim = painel.scrollHeight - painel.scrollTop - painel.clientHeight <= FOLGA_FIM

        noFimRef.current = noFim
        setMostrarBotaoFim(!noFim)
    }

    function irParaOFim(suave = true) {
        const painel = painelRef.current
        if (!painel) return

        painel.scrollTo({ top: painel.scrollHeight, behavior: suave ? "smooth" : "auto" })
    }

    /**
     * Ancora no fim: a conversa abre já nas mensagens mais recentes, e cada
     * recarga acompanha as novas — mas só se a pessoa já estivesse no fim. Se ela
     * subiu para ler algo antigo, puxar a rolagem de volta seria arrancar o texto
     * da frente dela no meio da leitura.
     *
     * `useLayoutEffect` porque isto tem que acontecer antes da pintura, senão o
     * conteúdo aparece no topo e salta.
     */
    useLayoutEffect(() => {
        const painel = painelRef.current
        if (!painel) return

        const trocouConversa = telefoneRenderizadoRef.current !== telefone
        telefoneRenderizadoRef.current = telefone

        if (trocouConversa || noFimRef.current) {
            painel.scrollTop = painel.scrollHeight
            noFimRef.current = true
            // o scrollTop acima dispara `aoRolar`, que esconde o botão sozinho
        }
    }, [mensagens, telefone, carregando])

    const comDias = useMemo(() => {
        const lista = mensagens ?? []

        return lista.map((mensagem, indice) => {
            const dia = rotuloDoDia(mensagem.criado_em)
            const anterior = indice > 0 ? rotuloDoDia(lista[indice - 1].criado_em) : null

            return { mensagem, dia: dia === anterior ? null : dia }
        })
    }, [mensagens])

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-3">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-lg-none"
                    onClick={onVoltar}
                    title="Voltar para a lista"
                >
                    <i className="bi bi-chevron-left"></i>
                </button>

                <div style={{ minWidth: 0 }}>
                    <div className="fw-bold text-truncate">{nome ?? formatPhone(telefone)}</div>
                    <div className="small text-muted font-monospace">{formatPhone(telefone)}</div>
                </div>
            </div>

            <div className="position-relative">
                <div
                    ref={painelRef}
                    onScroll={aoRolar}
                    className="card-body"
                    style={{ height: ALTURA_PAINEL, overflowY: "auto" }}
                >
                    {carregando && <Loading />}

                    {!carregando && comDias.length === 0 && (
                        <div className="text-center text-muted py-5">Nenhuma mensagem nesta conversa.</div>
                    )}

                    {!carregando && comDias.map(({ mensagem, dia }) => (
                        <div key={mensagem.id}>
                            {dia && (
                                <div className="text-center my-3">
                                    <span className="badge bg-light text-dark border">{dia}</span>
                                </div>
                            )}
                            <Balao mensagem={mensagem} />
                        </div>
                    ))}
                </div>

                {mostrarBotaoFim && (
                    <button
                        type="button"
                        className="btn btn-danger rounded-circle shadow position-absolute"
                        style={{ right: 20, bottom: 20, width: 42, height: 42 }}
                        onClick={() => irParaOFim()}
                        title="Ir para as mensagens mais recentes"
                    >
                        <i className="bi bi-arrow-down"></i>
                    </button>
                )}
            </div>

            <div className="card-footer bg-white d-flex align-items-center gap-2 flex-wrap">
                {/* <label> embrulhando um input escondido: é o jeito de ter um
                    botão de verdade sem o seletor de arquivo cru do navegador */}
                <label className={`btn btn-sm btn-outline-success mb-0 ${enviando ? "disabled" : ""}`}>
                    {enviando ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Enviando áudio…
                        </>
                    ) : (
                        <>
                            <i className="bi bi-mic-fill me-2"></i>Enviar áudio
                        </>
                    )}

                    <input
                        type="file"
                        accept="audio/*"
                        className="d-none"
                        disabled={enviando}
                        onChange={escolherArquivo}
                    />
                </label>

                <span className="text-muted" style={{ fontSize: ".72rem" }}>
                    A transcrição é feita depois, pelo robô.
                </span>
            </div>
        </div>
    )
}

export default function PageMensagens() {
    const respostaSenders = useRequest(listSenders, [], [])
    const [sender, setSender] = useState("")

    const senders = useMemo(() => respostaSenders.data ?? [], [respostaSenders.data])

    // `sender` guarda só a escolha explícita de quem está usando a tela. Enquanto
    // não houver uma, vale o primeiro número da lista (o de uso mais recente):
    // abrir num <select> vazio obrigaria a um clique extra para ver qualquer
    // coisa. Derivado no render de propósito — como estado sincronizado por
    // efeito, o primeiro render sairia sem número e a tela piscaria vazia.
    const senderEfetivo = sender || senders[0]?.jid || ""

    const response = useRequest(carregarConversas, [senderEfetivo], [senderEfetivo])

    const [busca, setBusca] = useState("")
    const [selecionada, setSelecionada] = useState(null)
    const [thread, setThread] = useState({ telefone: null, mensagens: [] })

    const selecionadaRef = useRef(null)

    // `carregarThread` precisa do sender atual sem ser recriada a cada troca —
    // recriá-la reprogramaria o timer do auto-refresh e reiniciaria a contagem.
    const senderRef = useRef(senderEfetivo)
    useEffect(() => {
        senderRef.current = senderEfetivo
    }, [senderEfetivo])

    const carregandoThread = Boolean(selecionada) && thread.telefone !== selecionada

    const carregarThread = useCallback(async (telefone) => {
        if (!telefone || !senderRef.current) return

        const senderDaBusca = senderRef.current

        try {
            const mensagens = await listMessages(senderDaBusca, telefone)

            // a pessoa pode ter trocado de conversa — ou de número de origem —
            // enquanto isto voltava
            if (selecionadaRef.current === telefone && senderRef.current === senderDaBusca) {
                setThread({ telefone, mensagens })
            }
        } catch (error) {
            if (selecionadaRef.current !== telefone) return

            toast.error(error.response?.data?.message || error.message)
            setThread({ telefone, mensagens: [] })
        }
    }, [])

    // A carga sai do clique, não de um efeito sobre `selecionada`: abrir uma
    // conversa é um evento do usuário, e reagir a ele direto evita o render
    // extra em cascata que o efeito provocaria.
    function selecionarConversa(telefone) {
        selecionadaRef.current = telefone
        setSelecionada(telefone)
        carregarThread(telefone)
    }

    function voltarParaLista() {
        selecionadaRef.current = null
        setSelecionada(null)
    }

    // Trocar de número de origem invalida a conversa aberta: ela pertence ao
    // número anterior, e deixá-la na tela mostraria a thread de um número dentro
    // da lista de outro.
    function trocarSender(novo) {
        selecionadaRef.current = null
        setSelecionada(null)
        setThread({ telefone: null, mensagens: [] })
        setBusca("")
        setSender(novo)
    }

    /**
     * O arquivo sobe e a conversa recarrega na hora — a lista também, porque o
     * áudio vira a última mensagem e a prévia à esquerda ficaria desatualizada.
     *
     * Erro vira toast e não derruba nada: o áudio não foi enviado, mas a
     * conversa que estava na tela continua lá para tentar de novo.
     */
    const enviarAudio = useCallback(async (arquivo) => {
        const telefone = selecionadaRef.current

        if (!telefone || !senderRef.current) return

        try {
            await uploadAudio(senderRef.current, telefone, arquivo)
            await Promise.all([carregarThread(telefone), response.refetchSilencioso()])
            toast.success("Áudio enviado")
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }, [carregarThread, response])

    // uma recarga só para as duas metades da tela: sem isto o indicador apagaria
    // antes de a conversa aberta terminar de chegar
    const recarregar = useCallback(async () => {
        await Promise.all([
            response.refetchSilencioso(),
            carregarThread(selecionadaRef.current)
        ])
    }, [response, carregarThread])

    const { restanteMs, atualizando, atualizarAgora } = useAutoRefresh(INTERVALO_MS, recarregar)

    const conversas = useMemo(() => response.data?.conversas ?? [], [response.data])

    const visiveis = useMemo(() => {
        const termo = busca.trim().toLowerCase()
        const digitos = termo.replace(/\D/g, "")

        if (!termo) return conversas

        return conversas.filter((conversa) => {
            if (String(conversa.nome ?? "").toLowerCase().includes(termo)) return true
            if (String(conversa.ultima.texto ?? "").toLowerCase().includes(termo)) return true

            return digitos.length > 0 && conversa.telefone.includes(digitos)
        })
    }, [conversas, busca])

    const conversaAtiva = conversas.find((conversa) => conversa.telefone === selecionada)

    return (
        <div className="page-content">
            <div className="page-title-section mb-3 d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                    <h4>Mensagens</h4>
                    <p className="subtitle mb-0">
                        Conversas do WhatsApp com os clientes — somente leitura
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                    {/* De qual número estas conversas foram recebidas. Trocar a
                        instância do Evolution troca o número, e o histórico antigo
                        fica gravado com o anterior — por isso a origem é uma
                        escolha, e não um valor fixo: o histórico continua alcançável. */}
                    <div className="input-group" style={{ width: "auto" }}>
                        <span className="input-group-text bg-white border-end-0">
                            <i className="bi bi-whatsapp text-success"></i>
                        </span>
                        <select
                            className="form-select border-start-0 ps-1"
                            value={senderEfetivo}
                            onChange={(e) => trocarSender(e.target.value)}
                            disabled={respostaSenders.loading || senders.length === 0}
                            title="Número que recebeu as mensagens"
                            aria-label="Número de origem das mensagens"
                        >
                            {respostaSenders.loading && <option value="">Carregando…</option>}

                            {!respostaSenders.loading && senders.length === 0 && (
                                <option value="">Nenhum número encontrado</option>
                            )}

                            {senders.map(({ jid, telefone }) => (
                                <option key={jid} value={jid}>
                                    {formatPhone(telefone)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="btn btn-outline-secondary d-flex align-items-center gap-2 flex-shrink-0"
                        onClick={atualizarAgora}
                        disabled={atualizando}
                        title="Atualizar agora e reiniciar a contagem"
                    >
                        <AnelContagem
                            restanteMs={restanteMs}
                            totalMs={INTERVALO_MS}
                            atualizando={atualizando}
                        />
                        <span className="d-none d-sm-inline">
                            {atualizando
                                ? "Carregando mensagens recentes…"
                                : `Próxima em ${Math.ceil(restanteMs / 1000)}s`}
                        </span>
                    </button>
                </div>
            </div>

            {!respostaSenders.loading && senders.length === 0 ? (
                <div className="alert alert-warning d-flex gap-3 align-items-start">
                    <i className="bi bi-exclamation-triangle-fill fs-4"></i>
                    <div>
                        <div className="fw-bold">Nenhuma mensagem registrada ainda</div>
                        <div className="small">
                            A tabela <span className="font-monospace">wa_message</span> está vazia.
                            Quem grava nela é o robô, fora deste projeto — assim que a primeira
                            mensagem chegar, o número de origem aparece aqui para ser escolhido.
                        </div>
                    </div>
                </div>
            ) : (
                <HandleResponse response={response}>
                    {() => (
                        <div className="row g-3">
                            {/* no celular, uma coisa de cada vez: lista OU conversa */}
                            <div className={`col-12 col-lg-4 ${selecionada ? "d-none d-lg-block" : ""}`}>
                                <div className="card border-0 shadow-sm">
                                    <div className="card-body p-3 pb-0">
                                        <div className="input-group mb-3">
                                            <span className="input-group-text bg-white border-end-0">
                                                <i className="bi bi-search text-muted"></i>
                                            </span>
                                            <input
                                                type="search"
                                                className="form-control border-start-0 ps-0"
                                                placeholder="Buscar por nome, telefone ou texto"
                                                value={busca}
                                                onChange={(e) => setBusca(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div
                                        className="list-group list-group-flush"
                                        style={{ maxHeight: ALTURA_PAINEL, overflowY: "auto" }}
                                    >
                                        {visiveis.map((conversa) => (
                                            <ItemConversa
                                                key={conversa.telefone}
                                                conversa={conversa}
                                                ativa={conversa.telefone === selecionada}
                                                onSelecionar={selecionarConversa}
                                            />
                                        ))}

                                        {visiveis.length === 0 && (
                                            <div className="text-center text-muted py-5">
                                                <i className="bi bi-chat-dots fs-1 d-block mb-2"></i>
                                                {conversas.length === 0
                                                    ? "Nenhuma mensagem para este número."
                                                    : "Nenhuma conversa corresponde a esta busca."}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={`col-12 col-lg-8 ${selecionada ? "" : "d-none d-lg-block"}`}>
                                {selecionada ? (
                                    <Conversa
                                        telefone={selecionada}
                                        nome={conversaAtiva?.nome}
                                        mensagens={thread.telefone === selecionada ? thread.mensagens : []}
                                        carregando={carregandoThread}
                                        onVoltar={voltarParaLista}
                                        onEnviarAudio={enviarAudio}
                                    />
                                ) : (
                                    <div className="card border-0 shadow-sm">
                                        <div className="card-body text-center text-muted py-5">
                                            <i className="bi bi-chat-left-text fs-1 d-block mb-2"></i>
                                            Escolha uma conversa à esquerda para ler as mensagens.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </HandleResponse>
            )}

            <style>{`
                @keyframes anelGirando { to { transform: rotate(360deg); } }
                .anel-girando { animation: anelGirando 1s linear infinite; }
            `}</style>
        </div>
    )
}
