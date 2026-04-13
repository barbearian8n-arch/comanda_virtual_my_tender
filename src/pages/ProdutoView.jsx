import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useRequest } from "../hooks/useRequest"
import { HandleResponse } from "../components/HandleResponse"
import { getProduto, updateProduto, deleteProduto } from "../services/produtos"
import { formatPrice } from "../utils/formatters"
import toast from "react-hot-toast"

export default function PageProdutoView() {
    const { id } = useParams()
    const navigate = useNavigate()
    const response = useRequest(async () => getProduto(id), [id])
    
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        nome: '',
        categoria: '',
        preco: 0,
        unidade: '',
        g_por_uni: '',
        is_disponivel: true
    })
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        if (response.data) {
            setFormData({
                nome: response.data.nome || '',
                categoria: response.data.categoria || '',
                preco: response.data.preco || 0,
                unidade: response.data.unidade || '',
                g_por_uni: response.data.g_por_uni || '',
                is_disponivel: response.data.is_disponivel !== false
            })
        }
    }, [response.data, isEditing])

    const precoPorUniCalc = () => {
        if (formData.unidade === 'kg' && formData.g_por_uni) {
            return (Number(formData.g_por_uni) * Number(formData.preco)) / 1000;
        }

        if (formData.unidade === 'uni') {
            return Number(formData.preco);
        }

        return null;
    }

    const handleSave = async () => {
        try {
            setIsSaving(true)
            const preco_por_uni = precoPorUniCalc()
            const payload = {
                nome: formData.nome,
                categoria: formData.categoria,
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

    const handleDelete = async () => {
        if (window.confirm("Atenção: Tem certeza que deseja remover este produto definitivamente?")) {
            try {
                setIsDeleting(true)
                await deleteProduto(id)
                toast.success("Produto removido com sucesso!")
                navigate("/produtos", { replace: true })
            } catch (error) {
                toast.error("Erro ao remover o produto")
                console.error(error)
                setIsDeleting(false)
            }
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
                                <div className="d-flex gap-2">
                                    {!isEditing && (
                                        <button 
                                            className="btn btn-outline-danger"
                                            onClick={handleDelete}
                                            disabled={isDeleting || isSaving}
                                        >
                                            <i className="bi bi-trash"></i> Excluir
                                        </button>
                                    )}
                                    <button 
                                        className={`btn ${isEditing ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                                        onClick={() => setIsEditing(!isEditing)}
                                        disabled={isSaving || isDeleting}
                                    >
                                        {isEditing ? 'Cancelar' : 'Editar'}
                                    </button>
                                </div>
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
                                            <label className="form-label fw-semibold">Nome</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={formData.nome}
                                                onChange={e => setFormData({...formData, nome: e.target.value})}
                                            />
                                        </div>

                                        <div>
                                            <label className="form-label fw-semibold">Categoria</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={formData.categoria}
                                                onChange={e => setFormData({...formData, categoria: e.target.value})}
                                            />
                                        </div>

                                        <div>
                                            <label className="form-label fw-semibold">Preço</label>
                                            <div className="input-group">
                                                <span className="input-group-text border-primary bg-primary text-white">R$</span>
                                                <input 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    className="form-control border-primary" 
                                                    value={formData.preco !== '' ? Number(formData.preco || 0).toFixed(2).replace('.', ',') : ''}
                                                    onChange={e => {
                                                        let onlyDigits = e.target.value.replace(/\D/g, '');
                                                        let numericValue = (parseInt(onlyDigits, 10) || 0) / 100;
                                                        setFormData({...formData, preco: numericValue})
                                                    }}
                                                />
                                            </div>
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
                                            <div className="input-group text-muted">
                                                <span className="input-group-text border-primary bg-primary text-white" style={{opacity: 0.8}}>R$</span>
                                                <input 
                                                    type="text" 
                                                    className="form-control border-primary bg-light" 
                                                    value={precoPorUniCalc() !== null ? Number(precoPorUniCalc()).toFixed(2).replace('.', ',') : ''}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                            <div className="form-text">
                                                (Preço &times; Grama por Unidade) &divide; 1000 &rarr; se unidade for 'kg'.
                                                <br />
                                                utilizado na estimativa de preço da unidade.
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
