import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { avatarUrl } from "../../supabase";
import Sidebar from "../Sidebar";
import "./Patient.css";

function calcAge(birthDate) {
  if (!birthDate) return null;
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return isNaN(age) || age < 0 ? null : age;
}

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [activeRoom, setActiveRoom] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    load();
    api.get("/rooms").then(({ data }) => setRooms(data));
  }, []);

  async function load(q = "") {
    const { data } = await api.get(`/patients${q ? `?search=${q}` : ""}`);
    setPatients(data);
  }

  function handleSearch(e) {
    setSearch(e.target.value);
    load(e.target.value);
  }

  const filtered = activeRoom
    ? patients.filter(p => String(p.roomId) === String(activeRoom))
    : patients;

  const roomsWithPatients = rooms.filter(r => patients.some(p => String(p.roomId) === String(r.id)));

  return (
    <div className="pl-wrap">
      <Sidebar active="/acolhidos" />

      <div className="pl-main">
        {/* Cabeçalho */}
        <div className="pl-header">
          <div>
            <h1 className="pl-title">Acolhidos</h1>
            <p className="pl-subtitle">Gerencie todos os acolhidos cadastrados</p>
          </div>
          <button className="pl-cadastrar-btn" onClick={() => navigate("/acolhidos/novo")}>
            Cadastrar +
          </button>
        </div>

        {/* Card branco */}
        <div className="pl-card">
          {/* Busca */}
          <div className="pl-search-wrap">
            <svg className="pl-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="pl-search"
              placeholder="Buscar acolhido..."
              value={search}
              onChange={handleSearch}
            />
          </div>

          {/* Filtros por quarto */}
          {roomsWithPatients.length > 0 && (
            <div className="pl-filters">
              <button
                className={`pl-filter-btn${activeRoom === null ? " active" : ""}`}
                onClick={() => setActiveRoom(null)}
              >
                Todos
              </button>
              {roomsWithPatients.map(r => (
                <button
                  key={r.id}
                  className={`pl-filter-btn${String(activeRoom) === String(r.id) ? " active" : ""}`}
                  onClick={() => setActiveRoom(r.id)}
                >
                  Quarto {r.number}
                </button>
              ))}
            </div>
          )}

          {/* Grid de cards */}
          {filtered.length === 0 ? (
            <p className="pl-empty">Nenhum acolhido encontrado.</p>
          ) : (
            <div className="pl-grid">
              {filtered.map(p => (
                <div key={p.id} className="pl-patient-card" onClick={() => navigate(`/acolhidos/${p.id}`)}>
                  <div className="pl-card-top">
                    <PatientAvatar patient={p} />
                    <div className="pl-card-info">
                      <span className="pl-card-name">{p.fullName}</span>
                      <span className="pl-card-room">
                        {p.roomId ? `Quarto ${rooms.find(r => String(r.id) === String(p.roomId))?.number || p.roomId}` : "Sem quarto"}
                      </span>
                    </div>
                  </div>
                  <div className="pl-card-details">
                    <span>Idade: {calcAge(p.birthDate) != null ? `${calcAge(p.birthDate)} anos` : "—"}</span>
                    <span className="pl-card-diag">Condição: {p.diagnosis ? p.diagnosis.split("\n")[0].slice(0, 40) : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientAvatar({ patient }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className="pl-avatar-fallback">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5">
          <circle cx="12" cy="8" r="5"/><path d="M3 21c0-5 3.6-9 9-9s9 4 9 9"/>
        </svg>
      </div>
    );
  }
  return (
    <img
      className="pl-avatar"
      src={avatarUrl("patients", patient.id) + "?t=" + patient.id}
      alt={patient.fullName}
      onError={() => setErr(true)}
    />
  );
}
