import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { createProduto } from "../services/produtos"
import toast from "react-hot-toast"

export default function PageProdutoNovo() {
    const navigate = useNavigate()
    
    const [formData, setFormData] = useState({
        nome: '',
        categoria: '',
        preco: 0,
        unidade: '',
        g_por_uni: '',
        is_disponivel: true
    })
    const [isSaving, setIsSaving] = useState(false)

    const precoPorUniCalc = () => {
        if (formData.unidade === 'kg' && formData.g_por_uni) {
            return Number(formData.g_por_uni) * Number(formData.preco);
        }
        return null;
    }

    const handleSave = async () => {
        try {
            if (!formData.nome || !formData.categoria || !formData.unidade || !formData.preco) {
                toast.error("Preencha todos os campos obrigatórios")
                return
            }

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
            await createProduto(payload)
            toast.success("Produto criado com sucesso!")
            navigate("/produtos")
        } catch (error) {
            toast.error("Erro ao criar produto")
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="d-flex flex-column h-100">
            <div className="page-content">
                <div className="d-flex justify-content-between align-items-center page-title-section">
                    <div>
                        <h4>Novo Produto</h4>
                        <p className="subtitle">Adicionar novo item ao cardápio</p>
                    </div>
                </div>
                
                <div className="custom-card card-comanda-container">
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
                            <label className="form-label fw-semibold">Nome*</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={formData.nome}
                                onChange={e => setFormData({...formData, nome: e.target.value})}
                                placeholder="Ex: X-Burguer"
                            />
                        </div>

                        <div>
                            <label className="form-label fw-semibold">Categoria*</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={formData.categoria}
                                onChange={e => setFormData({...formData, categoria: e.target.value})}
                                placeholder="Ex: Lanches, Bebidas..."
                            />
                        </div>

                        <div>
                            <label className="form-label fw-semibold">Preço*</label>
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
                            <label className="form-label fw-semibold">Unidade*</label>
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
                                Vazio se unidade for 'uni' ou g_por_uni for nulo.
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary mt-3"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Salvando...' : 'Adicionar Produto'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
