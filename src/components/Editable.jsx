import { useState } from "react"
import toast from "react-hot-toast"

export function Editable({ onSave, children, initialValue = "" }) {
    const [status, setStatus] = useState("idle")
    const [value, setValue] = useState(initialValue)

    async function save() {
        try {
            setStatus("saving")
            await onSave(value)
            toast.success("Valor atualizado com sucesso!")
            setStatus("idle")
        } catch (error) {
            toast.error(error.message)
            setStatus("editing")
        }
    }

    function cancel() {
        setValue(initialValue)
        setStatus("idle")
    }

    function edit() {
        setStatus("editing")
    }

    if (status === "saving") {
        return (
            <span className="footer-detail-value not-defined d-flex align-items-center gap-2">
                <input type="text" className="form-control form-control-sm editable-input" onChange={(e) => setValue(e.target.value)} value={value} disabled />
                <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </span>
        )
    }

    if (status === "idle") {
        return (
            <span className="footer-detail-value not-defined d-flex align-items-center gap-2">
                {children}
                <button className="btn btn-link p-0" onClick={edit}>
                    <i className="bi bi-pencil text-muted"></i>
                </button>
            </span>
        )
    }

    if (status === "editing") {
        return (
            <span className="footer-detail-value not-defined d-flex align-items-center gap-2">
                <input type="text" className="form-control form-control-sm editable-input" onChange={(e) => setValue(e.target.value)} value={value} />
                <button className="btn btn-link p-0" onClick={save}>
                    <i className="bi bi-save text-success"></i>
                </button>
                <button className="btn btn-link p-0" onClick={cancel}>
                    <i className="bi bi-x text-danger"></i>
                </button>
            </span>
        )
    }

    console.error("Unknown status", status)
    return null
}