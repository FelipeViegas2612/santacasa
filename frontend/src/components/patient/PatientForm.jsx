import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import { uploadAvatar, removeAvatar, avatarUrl } from "../../supabase";
import Sidebar from "../Sidebar";
import "./Patient.css";

const empty = { fullName: "", birthDate: "", admissionDate: "", rg: "", cpf: "", diagnosis: "", observations: "", allergies: "", roomId: "" };

function formatRG(value) {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0,2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
  return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}-${digits.slice(8)}`;
}

function formatCPF(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}

function calcAge(birthDate) {
  if (!birthDate) return "";
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return isNaN(age) || age < 0 ? "" : String(age);
}

export default function PatientForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== "novo";
  const [form, setForm] = useState(empty);
  const [rooms, setRooms] = useState([]);
  const [msg, setMsg] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/rooms").then(({ data }) => setRooms(data));
    if (isEdit) {
      api.get(`/patients/${id}`).then(({ data }) => {
        setForm(data);
        setPhotoPreview(avatarUrl("patients", id) + "?t=" + Date.now());
        setPhotoError(false);
      });
    }
  }, []);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError(false);
  }

  async function handleRemovePhoto() {
    if (!window.confirm("Remover foto do acolhido?")) return;
    try {
      await removeAvatar("patients", id);
      setPhotoPreview(null);
      setPhotoFile(null);
      setPhotoError(true);
      setMsg("Foto removida.");
    } catch {
      setMsg("Erro ao remover foto.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    try {
      let savedId = id;
      if (isEdit) {
        await api.put(`/patients/${id}`, form);
        setMsg("Acolhido atualizado!");
      } else {
        const { data } = await api.post("/patients", form);
        savedId = data.id;
      }
      if (photoFile) await uploadAvatar(photoFile, "patients", savedId);
      if (!isEdit) navigate(`/acolhidos/${savedId}`);
    } catch {
      setMsg("Erro ao salvar.");
    } finally {
      setUploading(false);
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="pf-wrap">
      <Sidebar active="/acolhidos" />

      <div className="pf-main">
        {/* Título */}
        <div className="pf-title">
          <button className="pf-title-back" onClick={() => navigate(isEdit ? `/acolhidos/${id}` : "/acolhidos")}>‹</button>
          <h1>{isEdit ? "Editar Acolhido" : "Cadastrar Acolhidos"}</h1>
        </div>

        {/* Card */}
        <div className="pf-card">

          {/* Header: título seção + botão */}
          <div className="pf-section-header">
            <h2>Informações Pessoais</h2>
            <button className="next-btn" type="button" disabled={uploading} onClick={handleSubmit}
              style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {uploading ? "Salvando..." : isEdit ? "Salvar" : "Próximo"}
              {!uploading && <span style={{ fontSize: 18 }}>→</span>}
            </button>
          </div>

          {/* Foto + campos pessoais */}
          <div className="pf-personal">
            <div className="avatar-wrap">
              <div className="pf-avatar" onClick={() => document.getElementById("pf-photo").click()}>
                {photoPreview && !photoError
                  ? <img src={photoPreview} alt="Foto" onError={() => { setPhotoError(true); setPhotoPreview(null); }} />
                  : <svg width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="5"/>
                      <path d="M3 21c0-5 3.6-9 9-9s9 4 9 9"/>
                    </svg>
                }
              </div>
              <input id="pf-photo" type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              {isEdit && photoPreview && !photoError && (
                <button type="button" className="avatar-remove-btn" onClick={handleRemovePhoto}>
                  Remover foto
                </button>
              )}
            </div>

            <div className="pf-fields">
              <div className="pf-field">
                <label>Nome Completo:</label>
                <input value={form.fullName || ""} onChange={set("fullName")} required />
              </div>

              <div className="pf-row">
                <div className="pf-field">
                  <label>CPF:</label>
                  <input value={form.cpf || ""} onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" maxLength={14} />
                </div>
                <div className="pf-field">
                  <label>RG:</label>
                  <input value={form.rg || ""} onChange={e => setForm({ ...form, rg: formatRG(e.target.value) })} placeholder="00.000.000-0" maxLength={11} />
                </div>
                <div className="pf-field">
                  <label>Data de nascimento:</label>
                  <input type="date" value={form.birthDate || ""} onChange={set("birthDate")} required />
                </div>
                <div className="pf-field" style={{ maxWidth: 110 }}>
                  <label>Idade:</label>
                  <input value={calcAge(form.birthDate)} readOnly />
                </div>
              </div>
            </div>
          </div>

          {/* Acomodações */}
          <div className="pf-section">
            <h2>Informações de acomodações</h2>
            <div className="pf-row" style={{ marginTop: 0 }}>
              <div className="pf-field">
                <label>Quarto:</label>
                <select value={form.roomId || ""} onChange={e => setForm({ ...form, roomId: e.target.value || null })}>
                  <option value="">Sem quarto</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>Quarto {r.number}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label>Data de Acolhimento:</label>
                <input type="date" value={form.admissionDate || ""} onChange={set("admissionDate")} required />
              </div>
            </div>
          </div>

          {/* Condições de saúde */}
          <div className="pf-section">
            <h2>Condições de saúde</h2>
            <div className="pf-row" style={{ marginTop: 0 }}>
              <div className="pf-field">
                <label>Condições/Diagnóstico:</label>
                <input value={form.diagnosis || ""} onChange={set("diagnosis")} placeholder="Ex: CID10 G80 Paralisia cerebral" />
              </div>
            </div>
            <div className="pf-row" style={{ marginTop: 20 }}>
              <div className="pf-field">
                <label>Alergias:</label>
                <input value={form.allergies || ""} onChange={set("allergies")} placeholder="Ex: Dipirona, Penicilina" />
              </div>
            </div>
            <div className="pf-row" style={{ marginTop: 20 }}>
              <div className="pf-field">
                <label>Observações:</label>
                <textarea value={form.observations || ""} onChange={set("observations")} placeholder="Observações adicionais..." rows={5} />
              </div>
            </div>
          </div>

          {msg && <p className="pf-msg">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
