export function HandleResponse({ response, children }) {
    const { data, loading, error } = response

    if (loading) return <Loading />
    if (error) return <Error error={error} />
    if (!data) return null

    return children(data)
}

export function Loading() {
    return (
        <div className="loading-wrapper flex-grow-1">
            <div className="spinner-border text-danger mt-5 mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="fw-medium">Buscando dados...</p>
        </div>
    )
}

export function Error({ error }) {
    return (
        <div className="p-4 text-center mt-5">
            <i className="bi bi-exclamation-circle text-danger fs-1 mb-3 d-block"></i>
            <h5 className="fw-bold">Ops, algo deu errado</h5>
            <p className="text-muted">{error.message}</p>
        </div>
    )
}
