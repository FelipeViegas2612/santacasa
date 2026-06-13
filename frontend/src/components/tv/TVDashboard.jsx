import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { avatarUrl } from "../../supabase";
import "./TVDashboard.css";

const TYPE_COLOR = { MEDICATION: "#29b6f6", DIET: "#66bb6a", CARE: "#ffa726" };
const TYPE_LABEL = { MEDICATION: "MED", DIET: "DIETA", CARE: "CUIDADO" };

function parseTimes(item) {
  const times = [];
  if (item.morningTimes) times.push(...item.morningTimes.split("/").map(t => t.trim()));
  if (item.afternoonTimes) times.push(...item.afternoonTimes.split("/").map(t => t.trim()));
  if (item.nightTimes) times.push(...item.nightTimes.split("/").map(t => t.trim()));
  return times.filter(Boolean);
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function TVDashboard() {
  const [rooms, setRooms] = useState([]);
  const [dailyByRoom, setDailyByRoom] = useState({});
  const [administered, setAdministered] = useState({});
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const now = useNow();
  const reloadRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const currentHHMM = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const currentMin = toMinutes(currentHHMM);

  async function load() {
    const { data: roomList } = await api.get("/rooms");
    setRooms(roomList);
    const map = {};
    const today = new Date().toDateString();
    const adminMap = {};

    await Promise.all(roomList.map(async (r) => {
      const { data } = await api.get(`/rooms/${r.id}/daily`);
      map[r.id] = data;
      // Carrega logs de hoje para cada item
      await Promise.all((data || []).flatMap(({ items }) =>
        (items || []).map(async (item) => {
          const { data: itemLogs } = await api.get(`/prescription-items/${item.id}/logs`);
          itemLogs.forEach((log) => {
            if (new Date(log.administeredAt).toDateString() === today) {
              adminMap[`${item.id}-${log.scheduledTime}`] = true;
            }
          });
        })
      ));
    }));

    setDailyByRoom(map);
    setAdministered(prev => ({ ...prev, ...adminMap }));
  }

  useEffect(() => {
    load();
    reloadRef.current = setInterval(load, 60000);
    return () => clearInterval(reloadRef.current);
  }, []);

  async function handleAdminister(itemId, time) {
    const key = `${itemId}-${time}`;
    await api.post(`/prescription-items/${itemId}/administer`, { scheduledTime: time });
    setAdministered(prev => ({ ...prev, [key]: true }));
  }

  // Constrói lista global de tarefas por horário
  const allSlots = {};
  rooms.forEach(room => {
    (dailyByRoom[room.id] || []).forEach(({ patient, items }) => {
      (items || []).forEach(item => {
        parseTimes(item).forEach(time => {
          if (!allSlots[time]) allSlots[time] = [];
          allSlots[time].push({ room, patient, item });
        });
      });
    });
  });

  const sortedTimes = Object.keys(allSlots).sort();

  // Separa: próximas 2h, passadas, futuras distantes
  const upcoming = sortedTimes.filter(t => {
    const diff = toMinutes(t) - currentMin;
    return diff >= -5 && diff <= 120;
  });
  const next = sortedTimes.filter(t => toMinutes(t) - currentMin > 120).slice(0, 3);
  const past = sortedTimes.filter(t => toMinutes(t) - currentMin < -5).slice(-3).reverse();

  return (
    <div className="tv-root">
      {/* HEADER */}
      <header className="tv-header">
        <img src="/logo.png" alt="Casa Santa Rita" className="tv-logo" />
        <div className="tv-header-center">
          <span className="tv-title">Painel de Enfermagem</span>
          <span className="tv-date">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</span>
        </div>
        <div className="tv-clock">
          {String(now.getHours()).padStart(2,"0")}:{String(now.getMinutes()).padStart(2,"0")}
          <span className="tv-clock-sec">:{String(now.getSeconds()).padStart(2,"0")}</span>
        </div>
        <div className="tv-header-actions">
          <button className="tv-action-btn" onClick={() => setDark(d => !d)} title={dark ? "Modo claro" : "Modo escuro"}>
            {dark ? "☀️" : "🌙"}
          </button>
          <button className="tv-action-btn" onClick={() => navigate("/perfil")} title="Sair do painel TV">
            ✕
          </button>
        </div>
      </header>

      <div className="tv-body">
        {/* COLUNA ESQUERDA — quartos */}
        <div className="tv-left">
          <div className="tv-section-title">Quartos</div>
          <div className="tv-rooms-grid">
            {rooms.map(room => {
              const patients = (dailyByRoom[room.id] || []).map(d => d.patient);
              const pendingCount = (dailyByRoom[room.id] || []).reduce((acc, { items }) => {
                return acc + (items || []).reduce((a, item) => {
                  return a + parseTimes(item).filter(t => {
                    const diff = toMinutes(t) - currentMin;
                    return diff >= -5 && diff <= 60 && !administered[`${item.id}-${t}`];
                  }).length;
                }, 0);
              }, 0);
              return (
                <div key={room.id} className={`tv-room-card ${pendingCount > 0 ? "has-pending" : ""}`}>
                  <div className="tv-room-num">Quarto {room.number}</div>
                  {patients.length === 0
                    ? <div className="tv-room-empty">Vazio</div>
                    : patients.map(p => (
                        <div key={p.id} className="tv-room-patient-row">
                          <div className="tv-patient-avatar-wrap">
                            <span className="tv-patient-avatar-fallback">👤</span>
                            <img
                              src={avatarUrl("patients", p.id)}
                              alt=""
                              className="tv-patient-avatar"
                              onLoad={(e) => { e.target.style.display = "block"; e.target.previousSibling.style.display = "none"; }}
                              onError={(e) => e.target.style.display = "none"}
                              style={{ display: "none" }}
                            />
                          </div>
                          <span className="tv-room-patient">{p.fullName.split(" ").slice(0,2).join(" ")}</span>
                        </div>
                      ))
                  }
                  {pendingCount > 0 && (
                    <div className="tv-pending-badge">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA CENTRAL — agenda próximas 2h */}
        <div className="tv-center">
          <div className="tv-section-title">Próximas 2 horas</div>
          {upcoming.length === 0 && (
            <div className="tv-no-tasks">Nenhuma tarefa nas próximas 2 horas</div>
          )}
          <div className="tv-slots">
            {upcoming.map(time => {
              const entries = allSlots[time];
              const diffMin = toMinutes(time) - currentMin;
              const isNow = Math.abs(diffMin) <= 15;
              const isSoon = diffMin > 15 && diffMin <= 45;
              return (
                <div key={time} className={`tv-slot ${isNow ? "now" : ""} ${isSoon ? "soon" : ""}`}>
                  <div className="tv-slot-time">
                    <span className="tv-hhmm">{time}</span>
                    {isNow && <span className="tv-badge now-badge">AGORA</span>}
                    {isSoon && <span className="tv-badge soon-badge">{diffMin}min</span>}
                  </div>
                  <div className="tv-slot-tasks">
                    {entries.map(({ room, patient, item }) => {
                      const key = `${item.id}-${time}`;
                      const done = administered[key];
                      return (
                        <div key={key} className={`tv-task-row ${done ? "done" : ""}`}>
                          <span className="tv-task-room">Q{room.number}</span>
                          <div className="tv-task-patient-wrap">
                            <div className="tv-patient-avatar-wrap">
                              <span className="tv-patient-avatar-fallback">👤</span>
                              <img
                                src={avatarUrl("patients", patient.id)}
                                alt=""
                                className="tv-patient-avatar"
                                onLoad={(e) => { e.target.style.display = "block"; e.target.previousSibling.style.display = "none"; }}
                                onError={(e) => e.target.style.display = "none"}
                                style={{ display: "none" }}
                              />
                            </div>
                            <span className="tv-task-patient">{patient.fullName.split(" ").slice(0,2).join(" ")}</span>
                          </div>
                          <span className="tv-task-type" style={{ background: TYPE_COLOR[item.itemType] + "33", color: TYPE_COLOR[item.itemType] }}>
                            {TYPE_LABEL[item.itemType]}
                          </span>
                          <span className="tv-task-name">{item.name}</span>
                          {item.quantity && <span className="tv-task-qty">{item.quantity}</span>}
                          {item.observation && <span className="tv-task-obs">⚠ {item.observation}</span>}
                          <button
                            className={`tv-adm-btn ${done ? "done" : ""}`}
                            onClick={() => !done && handleAdminister(item.id, time)}
                            disabled={done}
                          >
                            {done ? "✓" : "OK"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA DIREITA — passadas e próximas */}
        <div className="tv-right">
          {past.length > 0 && (
            <>
              <div className="tv-section-title muted">Anteriores</div>
              <div className="tv-side-slots past">
                {past.map(time => (
                  <div key={time} className="tv-side-slot">
                    <span className="tv-side-time">{time}</span>
                    <div className="tv-side-items">
                      {allSlots[time].map(({ patient, item }) => {
                        const key = `${item.id}-${time}`;
                        return (
                          <div key={key} className={`tv-side-item ${administered[key] ? "done" : "missed"}`}>
                            {administered[key] ? "✓" : "!"} {patient.fullName.split(" ")[0]} — {item.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {next.length > 0 && (
            <>
              <div className="tv-section-title" style={{ marginTop: "20px" }}>Mais tarde</div>
              <div className="tv-side-slots future">
                {next.map(time => (
                  <div key={time} className="tv-side-slot">
                    <span className="tv-side-time">{time}</span>
                    <div className="tv-side-items">
                      {allSlots[time].map(({ patient, item }) => (
                        <div key={`${item.id}-${time}`} className="tv-side-item future">
                          {patient.fullName.split(" ")[0]} — {item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
