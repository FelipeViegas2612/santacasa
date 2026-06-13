import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import Sidebar from "../Sidebar";
import { avatarUrl } from "../../supabase";
import "./Room.css";

const TYPE_LABELS = { MEDICATION: "Medicamento", DIET: "Dieta", CARE: "Cuidado" };
const TYPE_COLOR = { MEDICATION: "#1565c0", DIET: "#2e7d32", CARE: "#f57f17" };
const TYPE_BG = { MEDICATION: "#e3f2fd", DIET: "#e8f5e9", CARE: "#fff8e1" };

function toHHMM(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function diffMinutes(timeA, timeB) {
  const [ah, am] = timeA.split(":").map(Number);
  const [bh, bm] = timeB.split(":").map(Number);
  return (ah * 60 + am) - (bh * 60 + bm);
}

function getAllTimedItems(patients) {
  const slots = {};
  patients.forEach(({ patient, items }) => {
    (items || []).forEach((item) => {
      const times = [];
      if (item.morningTimes) times.push(...item.morningTimes.split("/").map(t => t.trim()));
      if (item.afternoonTimes) times.push(...item.afternoonTimes.split("/").map(t => t.trim()));
      if (item.nightTimes) times.push(...item.nightTimes.split("/").map(t => t.trim()));
      times.filter(Boolean).forEach((time) => {
        if (!slots[time]) slots[time] = [];
        slots[time].push({ patient, item });
      });
    });
  });
  return Object.entries(slots).sort(([a], [b]) => a.localeCompare(b));
}

function playAlertSound(ctxRef) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    const pattern = [
      { freq: 523, start: 0.0,  dur: 0.18 },
      { freq: 659, start: 0.2,  dur: 0.18 },
      { freq: 784, start: 0.4,  dur: 0.18 },
      { freq: 659, start: 0.62, dur: 0.18 },
      { freq: 523, start: 0.84, dur: 0.38 },
    ];
    const cycleLen = 1.5;
    const totalCycles = 7;
    for (let i = 0; i < totalCycles; i++) {
      pattern.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * cycleLen + start;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t);
        osc.stop(t + dur);
      });
    }
  } catch (_) {}
}

function stopAlertSound(ctxRef) {
  try {
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
  } catch (_) {}
}

export default function RoomDailyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [daily, setDaily] = useState([]);
  const [administered, setAdministered] = useState({});
  const [viewMode, setViewMode] = useState("timeline");
  const [now, setNow] = useState(new Date());
  const [soundOn, setSoundOn] = useState(true);
  const alertedKeys = useRef(new Set());
  const audioCtxRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: r }, { data: d }] = await Promise.all([
          api.get(`/rooms/${id}`),
          api.get(`/rooms/${id}/daily`),
        ]);
        if (!alive) return;
        setRoom(r);
        setDaily(d || []);
      } catch {
        if (alive) setRoom(null);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  async function handleAdminister(itemId, time) {
    const key = `${itemId}-${time}`;
    alertedKeys.current.delete(key);
    setAdministered((prev) => ({ ...prev, [key]: true }));
    stopAlertSound(audioCtxRef);
    try {
      await api.post("/administration-logs", { prescriptionItemId: itemId, scheduledTime: time });
    } catch {
      setAdministered((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      alert("Erro ao registrar administração.");
    }
  }

  const currentTime = toHHMM(now);
  const timeSlots = getAllTimedItems(daily);

  const alerts = [];
  timeSlots.forEach(([time, entries]) => {
    const diff = diffMinutes(time, currentTime);
    const isUrgent = diff >= -10 && diff <= 15;
    if (!isUrgent) return;
    entries.forEach(({ patient, item }) => {
      const key = `${item.id}-${time}`;
      if (!administered[key]) {
        alerts.push({ time, patient, item, diff });
      }
    });
  });

  useEffect(() => {
    if (!soundOn || alerts.length === 0) return;
    const newKeys = alerts
      .map(({ item, time }) => `${item.id}-${time}`)
      .filter((k) => !alertedKeys.current.has(k));
    if (newKeys.length > 0) {
      newKeys.forEach((k) => alertedKeys.current.add(k));
      stopAlertSound(audioCtxRef);
      playAlertSound(audioCtxRef);
    }
  }, [alerts.map(a => `${a.item.id}-${a.time}`).join(","), soundOn]);

  if (!room) return <div className="rd-loading">Carregando...</div>;

  return (
    <div className="pl-wrap">
      <Sidebar active="/quartos" />
      <div className="pl-main" style={{ padding: 0 }}>
        <div className="rd-container">

          {/* SUB-HEADER do quarto */}
          <div className="rd-topbar">
            <span className="rd-back" onClick={() => navigate("/quartos")}>← Quartos</span>
            <div className="rd-title">
              <span className="rd-room-number">Quarto {room.number}</span>
              <span className="rd-room-type">{room.type}</span>
            </div>
            <div className="rd-tabs">
              <button className={viewMode === "timeline" ? "rd-tab active" : "rd-tab"} onClick={() => setViewMode("timeline")}>
                Por Horário
              </button>
              <button className={viewMode === "patient" ? "rd-tab active" : "rd-tab"} onClick={() => setViewMode("patient")}>
                Por Paciente
              </button>
            </div>
            <span className="rd-clock">{currentTime}</span>
            <button className="rd-test-sound" onClick={() => { stopAlertSound(audioCtxRef); playAlertSound(audioCtxRef); }} title="Testar som">
              🔔 Testar
            </button>
          </div>

          {/* BANNER DE ALERTA */}
          {alerts.length > 0 && (
            <div className="rd-alert-banner">
              <div className="rd-alert-icon">🔔</div>
              <div className="rd-alert-body">
                <div className="rd-alert-header">
                  <span className="rd-alert-title">
                    {alerts.length === 1 ? "1 item pendente agora" : `${alerts.length} itens pendentes agora`}
                  </span>
                  <button
                    className="rd-alert-mute"
                    onClick={() => setSoundOn((s) => !s)}
                    title={soundOn ? "Silenciar" : "Ativar som"}
                  >
                    {soundOn ? "🔊" : "🔇"}
                  </button>
                </div>
                <div className="rd-alert-list">
                  {alerts.map(({ time, patient, item, diff }) => (
                    <div key={`${item.id}-${time}`} className="rd-alert-item">
                      <span className="rd-alert-time">
                        {diff < 0 ? `${Math.abs(diff)}min atrás` : diff === 0 ? "agora" : `em ${diff}min`}
                      </span>
                      <span className="rd-alert-name">{patient.fullName.split(" ")[0]}</span>
                      <span>—</span>
                      <span>{item.name}</span>
                      <button className="rd-alert-btn" onClick={() => handleAdminister(item.id, time)}>
                        Registrar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rd-content">
            {daily.length === 0 && (
              <div className="rd-empty">Nenhum paciente internado neste quarto.</div>
            )}

            {/* VISÃO POR HORÁRIO */}
            {viewMode === "timeline" && timeSlots.length > 0 && (
              <div className="rd-timeline">
                {timeSlots.map(([time, entries]) => {
                  const diff = diffMinutes(time, currentTime);
                  const isPast = diff < -10;
                  const isCurrent = diff >= -10 && diff <= 15;
                  return (
                    <div key={time} className={`rd-slot ${isCurrent ? "current" : ""} ${isPast ? "past" : ""}`}>
                      <div className="rd-slot-time">
                        <span className="rd-time-label">{time}</span>
                        {isCurrent && diff >= 0 && <span className="rd-now-badge">EM BREVE</span>}
                        {isCurrent && diff < 0 && <span className="rd-now-badge">AGORA</span>}
                        {isPast && <span className="rd-past-badge">Passado</span>}
                      </div>
                      <div className="rd-slot-items">
                        {entries.map(({ patient, item }) => {
                          const key = `${item.id}-${time}`;
                          const done = administered[key];
                          return (
                            <div key={key} className={`rd-task ${done ? "done" : ""}`}>
                              <div className="rd-task-left">
                                <span className="rd-patient-name">{patient.fullName}</span>
                                <div className="rd-task-info">
                                  <span className="rd-type-badge" style={{ background: TYPE_BG[item.itemType], color: TYPE_COLOR[item.itemType] }}>
                                    {TYPE_LABELS[item.itemType] || item.itemType}
                                  </span>
                                  <span className="rd-item-name">{item.name}</span>
                                  {item.quantity && <span className="rd-item-qty">{item.quantity}</span>}
                                  {item.observation && <span className="rd-item-obs">⚠ {item.observation}</span>}
                                </div>
                              </div>
                              <button
                                className={done ? "rd-adm-btn done" : "rd-adm-btn"}
                                onClick={() => !done && handleAdminister(item.id, time)}
                                disabled={done}
                              >
                                {done ? "✓ Feito" : "Registrar"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VISÃO POR PACIENTE */}
            {viewMode === "patient" && (
              <div className="rd-patient-grid">
                {daily.map(({ patient, items }) => {
                  const allSlots = [];
                  (items || []).forEach(item => {
                    const times = [];
                    if (item.morningTimes) times.push(...item.morningTimes.split("/").map(t => t.trim()));
                    if (item.afternoonTimes) times.push(...item.afternoonTimes.split("/").map(t => t.trim()));
                    if (item.nightTimes) times.push(...item.nightTimes.split("/").map(t => t.trim()));
                    times.filter(Boolean).forEach(time => {
                      if (!administered[`${item.id}-${time}`]) allSlots.push({ item, time });
                    });
                  });
                  allSlots.sort((a, b) => a.time.localeCompare(b.time));
                  const next = allSlots[0] || null;

                  const diff = next ? diffMinutes(next.time, currentTime) : null;
                  const isUrgent = diff !== null && diff >= -10 && diff <= 15;
                  const cardStatus = isUrgent && diff < 0 ? "agora" : isUrgent ? "em-breve" : "";

                  return (
                    <div key={patient.id} className={`rd-pc-card${cardStatus ? ` rd-pc-${cardStatus}` : ""}`}>
                      <div className="rd-pc-header">
                        <PatientAvatarSmall patient={patient} />
                        <div className="rd-pc-info">
                          <span className="rd-pc-name">{patient.fullName}</span>
                          <span className="rd-pc-room">Quarto {room.number}</span>
                        </div>
                      </div>

                      {cardStatus === "em-breve" && (
                        <div className="rd-pc-badge em-breve">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                          Em Breve
                        </div>
                      )}
                      {cardStatus === "agora" && (
                        <div className="rd-pc-badge agora">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                          Agora
                        </div>
                      )}

                      <div className="rd-pc-next-label">Proxima atividade:</div>
                      {next ? (
                        <div className="rd-pc-next">
                          <span className="rd-pc-next-icon" style={{ color: TYPE_COLOR[next.item.itemType], background: TYPE_BG[next.item.itemType] }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6M12 9v6"/></svg>
                          </span>
                          <span className="rd-pc-next-name">{next.item.name}</span>
                          <span className="rd-pc-next-time">{next.time}</span>
                        </div>
                      ) : (
                        <div className="rd-pc-next rd-pc-next-empty">Sem atividades pendentes</div>
                      )}

                      <div className="rd-pc-actions">
                        <button className="rd-pc-action-btn" title="Agenda" onClick={() => navigate(`/acolhidos/${patient.id}/prescricao`)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
                        </button>
                        <button className="rd-pc-action-btn" title="Prescrição" onClick={() => navigate(`/acolhidos/${patient.id}/prescricao`)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        </button>
                        <button className="rd-pc-action-btn rd-pc-action-arrow" title="Ver acolhido" onClick={() => navigate(`/acolhidos/${patient.id}`)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function PatientAvatarSmall({ patient }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className="rd-pc-avatar-fallback">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5">
          <circle cx="12" cy="8" r="5"/><path d="M3 21c0-5 3.6-9 9-9s9 4 9 9"/>
        </svg>
      </div>
    );
  }
  return (
    <img
      className="rd-pc-avatar"
      src={avatarUrl("patients", patient.id) + "?t=" + patient.id}
      alt={patient.fullName}
      onError={() => setErr(true)}
    />
  );
}
