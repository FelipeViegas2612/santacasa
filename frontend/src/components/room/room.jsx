import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import Sidebar from "../Sidebar";
import "./Room.css";

const STATUS_LABELS = {
  AVAILABLE: "Disponível",
  OCCUPIED: "Ocupado",
  MAINTENANCE: "Manutenção",
};

export default function Room() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ number: "", type: "", capacity: 1, description: "", status: "AVAILABLE" });
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { localStorage.removeItem("user"); return {}; } })();

  useEffect(() => {
    api.get("/rooms").then(({ data }) => setRooms(data)).catch(() => navigate("/"));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const { data } = await api.post("/rooms", form);
    setRooms([...rooms, data]);
    setForm({ number: "", type: "", capacity: 1, description: "", status: "AVAILABLE" });
    setShowForm(false);
  }

  async function handleStatusChange(id, status) {
    const { data } = await api.put(`/rooms/${id}/status`, { status });
    setRooms(rooms.map((r) => (r.id === id ? data : r)));
  }

  async function handleDelete(id) {
    await api.delete(`/rooms/${id}`);
    setRooms(rooms.filter((r) => r.id !== id));
  }

  return (
    <div className="room-layout">
      <Sidebar active="/quartos" />

      {/* Conteúdo principal */}
      <main className="room-main">
        <div className="room-main-inner">
          <div className="room-main-header">
            <button className="add-btn" onClick={() => setShowForm(!showForm)}>+ Novo Quarto</button>
          </div>

          {showForm && (
            <form className="room-form" onSubmit={handleCreate}>
              <h3>Novo Quarto</h3>
              <input placeholder="Número" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
              <input placeholder="Tipo (ex: Solteiro, Casal)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
              <input type="number" placeholder="Capacidade" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
              <textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="form-buttons">
                <button type="submit" className="save-btn">Salvar</button>
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          <div className="rooms-grid">
            {rooms.length === 0 && <p className="empty">Nenhum quarto cadastrado.</p>}
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`room-card status-${room.status.toLowerCase()}`}
                onClick={() => navigate(`/quartos/${room.id}/agenda`)}
              >
                <div className="room-card-name">Quarto {room.number}</div>
                <div className="room-card-meta">{room.type}</div>
                <div className="room-card-status">{STATUS_LABELS[room.status] || room.status}</div>
                <div className="room-card-actions" onClick={(e) => e.stopPropagation()}>
                  <select value={room.status} onChange={(e) => handleStatusChange(room.id, e.target.value)}>
                    <option value="AVAILABLE">Disponível</option>
                    <option value="OCCUPIED">Ocupado</option>
                    <option value="MAINTENANCE">Manutenção</option>
                  </select>
                  <button className="delete-btn" onClick={() => handleDelete(room.id)}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
