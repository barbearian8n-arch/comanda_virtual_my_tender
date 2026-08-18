import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Chama `aoAtualizar` de tempos em tempos e expõe quanto falta para a próxima
 * vez, para a tela conseguir desenhar a contagem regressiva.
 *
 * O relógio conta a partir do **fim** de cada recarga, não do início: com uma
 * resposta lenta, contar do início encavalaria uma chamada em cima da outra.
 *
 * Com a aba em segundo plano o ciclo adia sem buscar nada — a tela fica aberta o
 * dia inteiro e cada disparo é uma invocação serverless. Ao voltar para a aba,
 * recarrega na hora: quem volta quer ver o que chegou, não esperar o ciclo.
 */
export function useAutoRefresh(intervaloMs, aoAtualizar) {
    const [restanteMs, setRestanteMs] = useState(intervaloMs)
    const [atualizando, setAtualizando] = useState(false)

    const alvoRef = useRef(Date.now() + intervaloMs)
    const rodandoRef = useRef(false)
    const callbackRef = useRef(aoAtualizar)

    // a função chega nova a cada render do pai; guardá-la num ref evita
    // reprogramar o timer — e reiniciar a contagem — sem necessidade
    useEffect(() => {
        callbackRef.current = aoAtualizar
    })

    const atualizarAgora = useCallback(async () => {
        // uma recarga lenta não pode acumular fila com o tique do relógio
        if (rodandoRef.current) {
            return
        }

        rodandoRef.current = true
        setAtualizando(true)

        try {
            await callbackRef.current()
        } finally {
            rodandoRef.current = false
            setAtualizando(false)
            alvoRef.current = Date.now() + intervaloMs
            setRestanteMs(intervaloMs)
        }
    }, [intervaloMs])

    useEffect(() => {
        const id = setInterval(() => {
            const restante = alvoRef.current - Date.now()

            if (restante > 0) {
                setRestanteMs(restante)
                return
            }

            if (document.hidden) {
                alvoRef.current = Date.now() + intervaloMs
                setRestanteMs(intervaloMs)
                return
            }

            atualizarAgora()
        }, 1000)

        return () => clearInterval(id)
    }, [intervaloMs, atualizarAgora])

    useEffect(() => {
        function aoTrocarVisibilidade() {
            if (!document.hidden) {
                atualizarAgora()
            }
        }

        document.addEventListener("visibilitychange", aoTrocarVisibilidade)
        return () => document.removeEventListener("visibilitychange", aoTrocarVisibilidade)
    }, [atualizarAgora])

    return { restanteMs, atualizando, atualizarAgora }
}
