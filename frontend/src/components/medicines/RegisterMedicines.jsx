import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import Sidebar from "../Sidebar";
import "./Medicines.css";

const FORM_OPTIONS = ["Comprimido", "Cápsula", "Xarope", "Solução", "Pomada", "Injetável", "Supositório", "Outro"];
const ROUTE_OPTIONS = ["Oral", "Intravenosa", "Intramuscular", "Subcutânea", "Tópica", "Sublingual", "Retal", "Outro"];
const STOCK_OPTIONS = ["0","1","2","5","10","20","30","50","100","200","500"];

const empty = {
  name: "",
  activeIngredient: "",
  concentration: "",
  form: "",
  route: "",
  manufacturer: "",
  lot: "",
  expiresAt: "",
  stock: 0,
  minStock: 0,
  unit: "",
  category: "",
  observation: "",
};

export default function RegisterMedicines() {
  const { id } = useParams();
  const isEdit = !!id && id !== "novo";
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isEdit) {
      api.get(`/medications/${id}`).then(({ data }) => {
        setForm({
          name: data.name || "",
          activeIngredient: data.activeIngredient || "",
          concentration: data.concentration || "",
          form: data.form || "",
          route: data.route || "",
          manufacturer: data.manufacturer || "",
          lot: data.lot || "",
          expiresAt: data.expiresAt || "",
          stock: data.stock ?? 0,
          minStock: data.minStock ?? 0,
          unit: data.unit || "",
          category: data.category || "",
          observation: data.observation || "",
        });
      }).catch(() => {});
    }
  }, [id, isEdit]);

  const f = (field) => ({
    value: form[field] ?? "",
    onChange: (e) => setForm({ ...form, [field]: e.target.value }),
  });

  async function handleDelete() {
    if (!window.confirm("Deseja excluir este medicamento?")) return;
    try {
      await api.delete(`/medications/${id}`);
      navigate("/medicamentos");
    } catch {
      alert("Erro ao excluir.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const payload = {
      ...form,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
      expiresAt: form.expiresAt || null,
    };
    try {
      if (isEdit) {
        await api.put(`/medications/${id}`, payload);
      } else {
        await api.post("/medications", payload);
      }
      navigate("/medicamentos");
    } catch {
      setMsg("Erro ao salvar.");
      setLoading(false);
    }
  }

  return (
    <div className="pf-wrap">
      <Sidebar active="/medicamentos" />

      <div className="pf-main">
        {/* Topbar */}
        <div className="med-form-topbar">
          <button className="med-form-back" onClick={() => navigate("/medicamentos")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="med-form-title">{isEdit ? "Editar Medicamento" : "Cadastrar Medicamentos"}</h1>
          <div className="med-form-actions">
            {isEdit && (
              <button type="button" className="med-form-delete-btn" onClick={handleDelete}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                Excluir
              </button>
            )}
            <button type="submit" form="med-form" className="med-form-save-btn" disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="med-form-card">
          <h2 className="med-form-section-title">Informações do medicamento</h2>

          <form id="med-form" onSubmit={handleSubmit}>
            {/* Nome */}
            <div className="med-form-field full">
              <label>Nome do Medicamento:</label>
              <input {...f("name")} required placeholder="Ex: Dipirona" />
            </div>

            {/* Principio ativo + Concentração */}
            <div className="med-form-row">
              <div className="med-form-field">
                <label>Principio ativo:</label>
                <input {...f("activeIngredient")} placeholder="Ex: Dipirona Sódica" />
              </div>
              <div className="med-form-field">
                <label>Concentração/dosagem:</label>
                <input {...f("concentration")} placeholder="Ex: 500mg" />
              </div>
            </div>

            {/* Forma farmacêutica + Via de administração */}
            <div className="med-form-row">
              <div className="med-form-field">
                <label>Forma farmacêutica:</label>
                <select {...f("form")}>
                  <option value="">Selecionar</option>
                  {FORM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="med-form-field">
                <label>Via de administração:</label>
                <select {...f("route")}>
                  <option value="">Selecionar</option>
                  {ROUTE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Fabricante + Lote */}
            <div className="med-form-row">
              <div className="med-form-field">
                <label>Fabricante:</label>
                <input {...f("manufacturer")} placeholder="Ex: EMS" />
              </div>
              <div className="med-form-field">
                <label>Lote:</label>
                <input {...f("lot")} placeholder="Ex: L12345" />
              </div>
            </div>

            {/* Validade + Estoque atual + Unidade */}
            <div className="med-form-row three">
              <div className="med-form-field">
                <label>Validade:</label>
                <input
                  type="date"
                  value={form.expiresAt || ""}
                  onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
              <div className="med-form-field">
                <label>Estoque atual:</label>
                <select value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}>
                  {[...Array(201).keys()].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="med-form-field">
                <label>Unidade:</label>
                <select {...f("unit")}>
                  <option value="">Selecionar</option>
                  {["mg","ml","g","UI","Gotas","mcg","Outro"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Observações */}
            <div className="med-form-field full">
              <label>Observações:</label>
              <textarea {...f("observation")} rows={4} placeholder="" />
            </div>

            {msg && <p className="pf-msg">{msg}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
