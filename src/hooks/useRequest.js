import { useState, useEffect } from "react"

export function useRequest(asyncFn, args = [], dependencies = []) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    /**
     * `silencioso` é a recarga em segundo plano: não acende o `loading` nem
     * publica o erro no estado. Os dois trocariam a tela inteira por spinner ou
     * por "algo deu errado", apagando o conteúdo que a pessoa está lendo — o que
     * numa recarga automática é pior que simplesmente manter o dado anterior.
     *
     * Devolve sempre uma promessa que resolve, para quem chamou conseguir saber
     * quando a recarga terminou sem precisar tratar rejeição.
     */
    const fetchData = (opcoes = {}) => {
        const silencioso = opcoes.silencioso === true

        if (!silencioso) {
            setLoading(true)
            setError(null)
        }

        return asyncFn(...args)
            .then((resultado) => {
                setData(resultado)
                setError(null)
            })
            .catch((erro) => {
                if (silencioso) {
                    console.error("Falha na recarga em segundo plano:", erro)
                    return
                }

                setError(erro)
            })
            .finally(() => {
                if (!silencioso) {
                    setLoading(false)
                }
            })
    }

    useEffect(() => {
        console.log('fetched', asyncFn.name)
        fetchData()
    }, dependencies)

    return {
        data,
        loading,
        error,
        refetch: () => fetchData(),
        refetchSilencioso: () => fetchData({ silencioso: true })
    }
}
