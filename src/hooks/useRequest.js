import { useState, useEffect } from "react"

export function useRequest(asyncFn, args = [], dependencies = []) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = () => {
        setLoading(true)
        setError(null)
        asyncFn(...args)
            .then(setData)
            .catch(setError)
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        console.log('fetched', asyncFn.name)
        fetchData()
    }, dependencies)

    return { data, loading, error, refetch: fetchData }
}