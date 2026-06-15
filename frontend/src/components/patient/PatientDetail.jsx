import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import { avatarUrl } from "../../supabase";
import Sidebar from "../Sidebar";
import "./Patient.css";

function calcAge(birthDate) {
  if (!birthDate) return null;
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return isNaN(age) || age < 0 ? null : age;
}

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [room, setRoom] = useState(null);
  const [tab, setTab] = useState("agenda");
  const [editingCaregiver, setEditingCaregiver] = useState(false);
  const [caregiverInput, setCaregiverInput] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/patients/${id}`).then(({ data }) => {
      setPatient(data);
      if (data.roomId) api.get(`/rooms`).then(({ data: rooms }) => {
        setRoom(rooms.find(r => String(r.id) === String(data.roomId)) || null);
      });
    });
    api.get(`/patients/${id}/prescriptions`).then(({ data }) => setPrescriptions(data));
  }, [id]);

  if (!patient) return <div className="loading">Carregando...</div>;

  async function saveCaregiver() {
    try {
      await api.put(`/patients/${id}`, { ...patient, caregiver: caregiverInput || null });
      setPatient(prev => ({ ...prev, caregiver: caregiverInput || null }));
      setEditingCaregiver(false);
    } catch { alert("Erro ao salvar."); }
  }

  const latest = prescriptions[0];
  const age = calcAge(patient.birthDate);

  return (
    <div className="pl-wrap">
      <Sidebar active="/acolhidos" />

      <div className="pl-main">
        {/* Voltar */}
        <div className="pd-back" onClick={() => navigate("/acolhidos")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          Voltar
        </div>

        {/* Header do acolhido */}
        <div className="pd-header-card">
          <div className="pd-header-left">
            <div className="pd-avatar-wrap">
              <span className="pd-avatar-fallback">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.2"><circle cx="12" cy="8" r="5"/><path d="M3 21c0-5 3.6-9 9-9s9 4 9 9"/></svg>
              </span>
              <img
                src={avatarUrl("patients", patient.id) + "?t=" + patient.id}
                alt=""
                className="pd-avatar-img"
                onLoad={(e) => { e.target.style.display = "block"; e.target.previousSibling.style.display = "none"; }}
                onError={(e) => e.target.style.display = "none"}
                style={{ display: "none" }}
              />
            </div>
            <div className="pd-header-info">
              <h1 className="pd-name">{patient.fullName}</h1>
              <p className="pd-sub">
                {room ? `Quarto ${room.number}` : "Sem quarto"}
                {age != null ? ` · ${age} anos` : ""}
              </p>
            </div>
          </div>
          <div className="pd-header-right">
            <div className="pd-cuidador-card">
              <span className="pd-cuidador-label">Cuidador Responsável</span>
              {editingCaregiver ? (
                <div className="pd-cuidador-edit">
                  <input
                    className="pd-cuidador-input"
                    value={caregiverInput}
                    onChange={e => setCaregiverInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveCaregiver(); if (e.key === "Escape") setEditingCaregiver(false); }}
                    autoFocus
                    placeholder="Nome do cuidador"
                  />
                  <button className="pd-cuidador-save" onClick={saveCaregiver}>✓</button>
                  <button className="pd-cuidador-cancel" onClick={() => setEditingCaregiver(false)}>✕</button>
                </div>
              ) : (
                <span
                  className="pd-cuidador-name pd-cuidador-clickable"
                  onClick={() => { setCaregiverInput(patient.caregiver || ""); setEditingCaregiver(true); }}
                  title="Clique para editar"
                >
                  {patient.caregiver || "—"}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft:5,opacity:0.5}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </span>
              )}
            </div>
            <div className="pd-header-actions">
              <button className="edit-btn" onClick={() => navigate(`/acolhidos/${id}/editar`)}>Editar</button>
              <button className="pl-cadastrar-btn" onClick={() => navigate(`/acolhidos/${id}/prescricao`)}>📋 Prescrição</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="pd-tabs">
          <button className={`pd-tab${tab === "agenda" ? " active" : ""}`} onClick={() => setTab("agenda")}>Agenda do dia</button>
          <button className={`pd-tab${tab === "info" ? " active" : ""}`} onClick={() => setTab("info")}>Informações</button>
        </div>

        {/* Tab: Agenda do dia */}
        {tab === "agenda" && (
          <div className="pd-agenda-card">
            <h2 className="pd-agenda-title">Agenda de hoje</h2>
            {!latest || !latest.items?.length ? (
              <div className="pd-agenda-empty">
                <p>Nenhuma prescrição cadastrada.</p>
                <button className="pl-cadastrar-btn" onClick={() => navigate(`/acolhidos/${id}/prescricao`)}>+ Criar prescrição</button>
              </div>
            ) : (
              <AgendaTimeline items={latest.items} patientId={id} />
            )}
          </div>
        )}

        {/* Tab: Informações */}
        {tab === "info" && (
          <div className="pd-info-card">
            <div className="pd-info-grid">
              <div className="pd-info-item">
                <label>Data de Nascimento</label>
                <span>{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("pt-BR") : "—"}</span>
              </div>
              <div className="pd-info-item">
                <label>Idade</label>
                <span>{age != null ? `${age} anos` : "—"}</span>
              </div>
              <div className="pd-info-item">
                <label>Data de Acolhimento</label>
                <span>{patient.admissionDate ? new Date(patient.admissionDate).toLocaleDateString("pt-BR") : "—"}</span>
              </div>
              <div className="pd-info-item">
                <label>RG</label>
                <span>{patient.rg || "—"}</span>
              </div>
              <div className="pd-info-item">
                <label>CPF</label>
                <span>{patient.cpf || "—"}</span>
              </div>
              <div className="pd-info-item">
                <label>Quarto</label>
                <span className={room ? "room-link" : ""} onClick={() => room && navigate("/quartos")}>
                  {room ? `Quarto ${room.number}` : "—"}
                </span>
              </div>
            </div>

            {patient.diagnosis && (
              <div className="pd-section">
                <h3>Diagnóstico / Condições</h3>
                <p className="pd-section-text">{patient.diagnosis}</p>
              </div>
            )}
            {patient.observations && (
              <div className="pd-section">
                <h3>Observações</h3>
                <p className="pd-section-text">{patient.observations}</p>
              </div>
            )}
            {patient.allergies && (
              <div className="pd-section">
                <h3>Alergias</h3>
                <p className="pd-section-text">{patient.allergies}</p>
              </div>
            )}

            {latest && (
              <div className="pd-presc-summary">
                <div className="pd-presc-summary-header">
                  <span>Prescrição atual</span>
                  <span className="validity-badge">Válida até {new Date(latest.validUntil).toLocaleDateString("pt-BR")}</span>
                  <button className="view-btn" onClick={() => navigate(`/acolhidos/${id}/prescricao`)}>Ver completa</button>
                </div>
                <div className="items-preview">
                  {latest.items?.slice(0, 5).map((item) => (
                    <div key={item.id} className={`item-chip type-${item.itemType?.toLowerCase()}`}>
                      <span>{item.name}</span>
                      <span className="item-freq">{item.frequency}</span>
                    </div>
                  ))}
                  {latest.items?.length > 5 && <div className="item-chip more">+{latest.items.length - 5} mais</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const TYPE_ICON = {
  MEDICATION: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
  ),
  DIET: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
  ),
  CARE: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
};
const TYPE_COLOR = { MEDICATION: "#1565c0", DIET: "#2e7d32", CARE: "#f57f17" };
const TYPE_BG = { MEDICATION: "#e3f2fd", DIET: "#e8f5e9", CARE: "#fff8e1" };

function AgendaTimeline({ items, patientId }) {
  const [administered, setAdministered] = useState({});
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const today = new Date().toDateString();
    items.forEach(async (item) => {
      try {
        const { data: logs } = await api.get(`/prescription-items/${item.id}/administration-logs`);
        logs.forEach(log => {
          if (new Date(log.administeredAt).toDateString() === today) {
            setAdministered(prev => ({ ...prev, [`${item.id}-${log.scheduledTime}`]: true }));
          }
        });
      } catch {}
    });
  }, [items]);

  async function handleAdminister(itemId, time) {
    const key = `${itemId}-${time}`;
    try {
      await api.post(`/administration-logs`, { prescriptionItemId: itemId, scheduledTime: time });
      setAdministered(prev => ({ ...prev, [key]: true }));
    } catch { alert("Erro ao registrar."); }
  }

  // Monta slots por horário
  const slots = {};
  items.forEach(item => {
    const times = [
      ...(item.morningTimes ? item.morningTimes.split("/").map(t => t.trim()) : []),
      ...(item.afternoonTimes ? item.afternoonTimes.split("/").map(t => t.trim()) : []),
      ...(item.nightTimes ? item.nightTimes.split("/").map(t => t.trim()) : []),
    ].filter(Boolean);
    times.forEach(time => {
      if (!slots[time]) slots[time] = [];
      slots[time].push(item);
    });
  });

  const currentMin = now.getHours() * 60 + now.getMinutes();
  const sortedTimes = Object.keys(slots).sort();

  return (
    <div className="pd-timeline">
      {sortedTimes.map(time => {
        const [h, m] = time.split(":").map(Number);
        const slotMin = h * 60 + m;
        const diff = slotMin - currentMin;
        const isPast = diff < -10;
        const isCurrent = diff >= -10 && diff <= 15;

        return (
          <div key={time} className={`pd-timeline-row${isCurrent ? " current" : ""}${isPast ? " past" : ""}`}>
            <div className="pd-timeline-time">{time}</div>
            <div className="pd-timeline-indicator">
              {isCurrent
                ? <span className="pd-tl-dot current"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/></svg></span>
                : isPast
                  ? slots[time].every(item => administered[`${item.id}-${time}`])
                    ? <span className="pd-tl-dot done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                    : <span className="pd-tl-dot past"></span>
                  : <span className="pd-tl-dot future"></span>
              }
              <div className="pd-tl-line" />
            </div>
            <div className="pd-timeline-items">
              {slots[time].map(item => {
                const key = `${item.id}-${time}`;
                const done = administered[key];
                return (
                  <div key={item.id} className={`pd-tl-item${done ? " done" : ""}${isCurrent ? " current" : ""}`}>
                    <div className="pd-tl-item-left">
                      <span className="pd-tl-type-icon" style={{ color: TYPE_COLOR[item.itemType], background: TYPE_BG[item.itemType] }}>
                        {TYPE_ICON[item.itemType]}
                      </span>
                      <div className="pd-tl-item-info">
                        <span className="pd-tl-item-name">
                          {item.name}
                          {isCurrent && !done && <span className="pd-tl-badge">Em breve</span>}
                        </span>
                        {item.quantity && <span className="pd-tl-item-qty">{item.quantity}</span>}
                      </div>
                    </div>
                    <input className="pd-tl-obs" placeholder="Observações (opcional)" />
                    <button
                      className={`pd-tl-btn${done ? " done" : ""}`}
                      onClick={() => !done && handleAdminister(item.id, time)}
                      disabled={done}
                    >
                      {done
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/></svg>
                      }
                      {!done && <span className="pd-tl-btn-label">Registrar</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
