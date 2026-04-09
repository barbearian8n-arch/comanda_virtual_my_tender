import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useRequest } from "../hooks/useRequest"
import { HandleResponse } from "../components/HandleResponse"
import { getProduto, updateProduto } from "../services/produtos"
import { formatPrice } from "../utils/formatters"
import toast from "react-hot-toast"

export default function PageProdutoView() {
    const { id } = useParams()
    const navigate = useNavigate()
    const response = useRequest(async () => getProduto(id), [id])
    
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        preco: 0,
        unidade: '',
        g_por_uni: '',
        is_disponivel: true
    })
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (response.data) {
            setFormData({
                preco: response.data.preco || 0,
                unidade: response.data.unidade || '',
                g_por_uni: response.data.g_por_uni || '',
                is_disponivel: response.data.is_disponivel !== false
            })
        }
    }, [response.data, isEditing])

    const precoPorUniCalc = () => {
        if (formData.unidade === 'kg' && formData.g_por_uni) {
            return Number(formData.g_por_uni) * Number(formData.preco);
        }
        return null;
    }

    const handleSave = async () => {
        try {
            setIsSaving(true)
            const preco_por_uni = precoPorUniCalc()
            const payload = {
                preco: Number(formData.preco),
                unidade: formData.unidade,
                g_por_uni: formData.g_por_uni ? Number(formData.g_por_uni) : null,
                preco_por_uni: preco_por_uni,
                is_disponivel: formData.is_disponivel
            }
            await updateProduto(id, payload)
            toast.success("Produto atualizado com sucesso!")
            setIsEditing(false)
            response.refetch()
        } catch (error) {
            toast.error("Erro ao atualizar produto")
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="d-flex flex-column h-100">
            <div className="page-content">
                <HandleResponse response={response}>
                    {(produto) => (
                        <>
                            <div className="d-flex justify-content-between align-items-center page-title-section">
                                <div>
                                    <h4>{produto.nome}</h4>
                                    <p className="subtitle">Detalhes do produto</p>
                                </div>
                                <button 
                                    className={`btn ${isEditing ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                                    onClick={() => setIsEditing(!isEditing)}
                                    disabled={isSaving}
                                >
                                    {isEditing ? 'Cancelar' : 'Editar'}
                                </button>
                            </div>
                            
                            <div className="custom-card card-comanda-container">
                                {isEditing ? (
                                    <div className="d-flex flex-column gap-3">
                                        <div className="form-check form-switch">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                id="is_disponivel"
                                                checked={formData.is_disponivel}
                                                onChange={e => setFormData({...formData, is_disponivel: e.target.checked})}
                                            />
                                            <label className="form-check-label fw-bold fw-semibold" htmlFor="is_disponivel">
                                                Produto Disponível (Ativo)
                                            </label>
                                        </div>

                                        <div>
                                            <label className="form-label fw-semibold">Preço</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="form-control" 
                                                value={formData.preco}
                                                onChange={e => setFormData({...formData, preco: e.target.value})}
                                            />
                                        </div>

                                        <div>
                                            <label className="form-label fw-semibold">Unidade</label>
                                            <select
                                                className="form-select" 
                                                value={formData.unidade}
                                                onChange={e => setFormData({...formData, unidade: e.target.value})}
                                            >
                                                <option value="" disabled>Selecione uma unidade</option>
                                                <option value="kg">kg (Quilograma)</option>
                                                <option value="uni">uni (Unidade)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="form-label fw-semibold">Grama por unidade (g_por_uni)</label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={formData.g_por_uni}
                                                onChange={e => setFormData({...formData, g_por_uni: e.target.value})}
                                            />
                                        </div>

                                        <div>
                                            <label className="form-label fw-semibold">Preço por uni. (Cálculo Automático)</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={precoPorUniCalc() !== null ? formatPrice(precoPorUniCalc()) : ''}
                                                disabled
                                                readOnly
                                            />
                                            <div className="form-text">
                                                Vazio se unidade for 'uni' ou g_por_uni for nulo.
                                            </div>
                                        </div>

                                        <button 
                                            className="btn btn-primary mt-3"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? 'Salvando...' : 'Salvar Alteraçoes'}
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mb-3 d-flex gap-2">
                                            {produto.categoria && (
                                                <span className="badge bg-secondary">{produto.categoria}</span>
                                            )}
                                            {produto.is_disponivel ? (
                                                <span className="badge bg-success">Ativo</span>
                                            ) : (
                                                <span className="badge bg-danger">Indisponível</span>
                                            )}
                                        </div>
                                        <p className="card-meta mb-2">
                                            <strong>Unidade: </strong> {produto.unidade || 'N/A'}
                                        </p>
                                        <p className="card-meta mb-2">
                                            <strong>Grama por uni: </strong> {produto.g_por_uni ? `${produto.g_por_uni}g` : 'N/A'}
                                        </p>
                                        {produto.preco_por_uni != null && (
                                            <p className="card-meta mb-2">
                                                <strong>Preço por uni: </strong> {formatPrice(produto.preco_por_uni)}
                                            </p>
                                        )}
                                        {produto.descricao && (
                                            <p className="card-meta mb-2">
                                                <strong>Descrição: </strong><br/>
                                                {produto.descricao}
                                            </p>
                                        )}
                                        <p className="card-meta mt-3">
                                            <strong>Preço: </strong><br/>
                                            <span className="fs-5 text-success fw-bold">
                                                {formatPrice(produto.preco)}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </HandleResponse>
            </div>
        </div>
    )
}
