import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import Sidebar from "../Sidebar";
import "./Prescription.css";

const TYPE_LABELS = { MEDICATION: "Medicamento", DIET: "Dieta", CARE: "Cuidado" };

function getAllTimes(item) {
  const times = [];
  if (item.morningTimes) times.push(...item.morningTimes.split("/").map(t => t.trim()));
  if (item.afternoonTimes) times.push(...item.afternoonTimes.split("/").map(t => t.trim()));
  if (item.nightTimes) times.push(...item.nightTimes.split("/").map(t => t.trim()));
  return times.filter(Boolean);
}

export default function PrescriptionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [items, setItems] = useState([]);
  const [administered, setAdministered] = useState({});
  const [tab, setTab] = useState("daily");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [history, setHistory] = useState({});
  const [logs, setLogs] = useState({});
  const [expanded, setExpanded] = useState({});
  const [newPrescription, setNewPrescription] = useState({ reviewedAt: "", validUntil: "", notes: "" });
  const intervalRef = useRef(null);

  useEffect(() => {
    load();
    requestNotificationPermission();
    return () => clearInterval(intervalRef.current);
  }, [id]);

  async function load() {
    const { data: pat } = await api.get(`/patients/${id}`);
    setPatient(pat);
    const { data: prescList } = await api.get(`/patients/${id}/prescriptions`);
    if (prescList.length > 0) {
      const latest = prescList[0];
      setPrescription(latest);
      const itemList = latest.items || [];
      setItems(itemList);
      startAlarmCheck(itemList);

      // Reconstrói estado de administrados com base nos logs de hoje
      const today = new Date().toDateString();
      const adminMap = {};
      await Promise.all(itemList.map(async (item) => {
        const { data: itemLogs } = await api.get(`/prescription-items/${item.id}/administration-logs`);
        itemLogs.forEach((log) => {
          if (new Date(log.administeredAt).toDateString() === today) {
            adminMap[`${item.id}-${log.scheduledTime}`] = true;
          }
        });
      }));
      setAdministered(adminMap);
    }
  }

  function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function startAlarmCheck(itemList) {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      itemList.forEach((item) => {
        getAllTimes(item).forEach((t) => {
          if (t === hhmm && Notification.permission === "granted") {
            new Notification(`⏰ ${item.name}`, {
              body: `Horário: ${t} — ${item.quantity || ""} ${item.frequency || ""}`,
              icon: "/favicon.ico",
            });
          }
        });
      });
    }, 30000);
  }

  async function handleAdminister(item, time) {
    const key = `${item.id}-${time}`;
    await api.post(`/administration-logs`, { prescriptionItemId: item.id, scheduledTime: time });
    setAdministered((prev) => ({ ...prev, [key]: true }));
  }

  async function handleUndo(item, time) {
    const key = `${item.id}-${time}`;
    const { data: logs } = await api.get(`/prescription-items/${item.id}/administration-logs`);
    const log = logs.find(l => l.scheduledTime === time);
    if (log) await api.delete(`/administration-logs/${log.id}`);
    setAdministered((prev) => ({ ...prev, [key]: false }));
  }

  async function loadHistory(itemId) {
    const { data } = await api.get(`/prescription-items/${itemId}/history`);
    setHistory((prev) => ({ ...prev, [itemId]: data }));
  }

  async function loadLogs(itemId) {
    const { data } = await api.get(`/prescription-items/${itemId}/administration-logs`);
    setLogs((prev) => ({ ...prev, [itemId]: data }));
  }

  async function handleDeleteItem(itemId) {
    await api.delete(`/prescription-items/${itemId}`);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function handleCreatePrescription(e) {
    e.preventDefault();
    const { data } = await api.post(`/patients/${id}/prescriptions`, newPrescription);
    setPrescription(data);
    setItems([]);
    setNewPrescription({ reviewedAt: "", validUntil: "", notes: "" });
  }

  async function handleSaveItem(itemData) {
    if (editingItem) {
      const { data } = await api.put(`/prescription-items/${editingItem.id}`, itemData);
      setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    } else {
      const { data } = await api.post(`/prescriptions/${prescription.id}/items`, itemData);
      setItems((prev) => [...prev, data]);
    }
    setShowItemForm(false);
    setEditingItem(null);
  }

  if (!patient) return <div className="loading">Carregando...</div>;

  return (
    <div className="pl-wrap">
      <Sidebar active="/acolhidos" />
      <div className="pl-main" style={{ padding: 0 }}>
      <div className="presc-container">
      <div className="presc-topbar">
        <span className="back-btn" onClick={() => navigate(`/acolhidos/${id}`)}>← {patient.fullName}</span>
        <div className="tab-bar">
          <button className={tab === "daily" ? "tab active" : "tab"} onClick={() => setTab("daily")}>Agenda do Dia</button>
          <button className={tab === "prescription" ? "tab active" : "tab"} onClick={() => setTab("prescription")}>Prescrição</button>
          <button className={tab === "history" ? "tab active" : "tab"} onClick={() => setTab("history")}>Histórico</button>
        </div>
        <button className="print-btn" onClick={() => window.print()}>Imprimir</button>
      </div>

      <div className="presc-content">
        {/* SEM PRESCRIÇÃO */}
        {!prescription && (
          <div className="no-presc-card">
            <h3>Criar Nova Prescrição</h3>
            <form onSubmit={handleCreatePrescription} className="presc-form">
              <div className="presc-form-row">
                <div className="presc-field">
                  <label>Revisada em</label>
                  <input type="date" value={newPrescription.reviewedAt} onChange={e => setNewPrescription({...newPrescription, reviewedAt: e.target.value})} required />
                </div>
                <div className="presc-field">
                  <label>Válida até</label>
                  <input type="date" value={newPrescription.validUntil} onChange={e => setNewPrescription({...newPrescription, validUntil: e.target.value})} required />
                </div>
              </div>
              <div className="presc-field">
                <label>Observações</label>
                <textarea value={newPrescription.notes} onChange={e => setNewPrescription({...newPrescription, notes: e.target.value})} rows={3} />
              </div>
              <button type="submit" className="save-btn">Criar Prescrição</button>
            </form>
          </div>
        )}

        {/* ABA AGENDA DO DIA */}
        {prescription && tab === "daily" && (
          <div className="daily-view">
            <div className="presc-header-info">
              <span>Prescrição revisada em <b>{new Date(prescription.reviewedAt).toLocaleDateString("pt-BR")}</b></span>
              <span className="valid-badge">Válida até {new Date(prescription.validUntil).toLocaleDateString("pt-BR")}</span>
            </div>
            {items.length === 0 && <p className="empty">Nenhum item na prescrição.</p>}
            <div className="daily-table">
              <div className="daily-header">
                <span>Item</span><span>Frequência</span><span>Quantidade</span>
                <span>Manhã</span><span>Tarde</span><span>Noite</span><span>Administrar</span>
              </div>
              {items.map((item) => {
                const times = getAllTimes(item);
                return (
                  <div key={item.id} className={`daily-row type-${item.itemType?.toLowerCase()}`}>
                    <span className="item-name-col">
                      <span className={`type-badge ${item.itemType?.toLowerCase()}`}>{TYPE_LABELS[item.itemType] || item.itemType}</span>
                      {item.name}
                      {item.observation && <span className="obs">⚠ {item.observation}</span>}
                    </span>
                    <span>{item.frequency}</span>
                    <span>{item.quantity}</span>
                    <span>{item.morningTimes}</span>
                    <span>{item.afternoonTimes}</span>
                    <span>{item.nightTimes}</span>
                    <span className="administer-col">
                      {times.map((t) => {
                        const key = `${item.id}-${t}`;
                        const done = administered[key];
                        return (
                          <button
                            key={t}
                            className={done ? "adm-btn done" : "adm-btn"}
                            onClick={() => done ? handleUndo(item, t) : handleAdminister(item, t)}
                            title={done ? `Desfazer administração das ${t}` : `Registrar administração às ${t}`}
                          >
                            <span className="adm-label-normal">{done ? "✓" : t}</span>
                            {done && <span className="adm-label-hover">✕ Desfazer</span>}
                          </button>
                        );
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA PRESCRIÇÃO */}
        {prescription && tab === "prescription" && (
          <div className="presc-edit-view">
            <div className="presc-edit-header">
              <div>
                <span>Revisada em <b>{new Date(prescription.reviewedAt).toLocaleDateString("pt-BR")}</b></span>
                {" · "}
                <span>Válida até <b>{new Date(prescription.validUntil).toLocaleDateString("pt-BR")}</b></span>
                {prescription.notes && <p className="presc-notes">Obs: {prescription.notes}</p>}
              </div>
              <button className="add-btn" onClick={() => { setEditingItem(null); setShowItemForm(true); }}>+ Adicionar Item</button>
            </div>

            {showItemForm && (
              <ItemForm
                initial={editingItem}
                onSave={handleSaveItem}
                onCancel={() => { setShowItemForm(false); setEditingItem(null); }}
              />
            )}

            <div className="items-list">
              {items.map((item, idx) => (
                <div key={item.id} className={`presc-item type-${item.itemType?.toLowerCase()}`}>
                  <div className="presc-item-main">
                    <span className={`type-badge ${item.itemType?.toLowerCase()}`}>{TYPE_LABELS[item.itemType]}</span>
                    <span className="presc-item-name">{idx + 1 <= 9 ? `0${idx+1}` : idx+1}. {item.name}</span>
                  </div>
                  <div className="presc-item-details">
                    {item.frequency && <span><b>Freq:</b> {item.frequency}</span>}
                    {item.quantity && <span><b>Qtd:</b> {item.quantity}</span>}
                    {item.morningTimes && <span><b>Manhã:</b> {item.morningTimes}</span>}
                    {item.afternoonTimes && <span><b>Tarde:</b> {item.afternoonTimes}</span>}
                    {item.nightTimes && <span><b>Noite:</b> {item.nightTimes}</span>}
                    {item.observation && <span className="obs-detail">⚠ {item.observation}</span>}
                  </div>
                  <div className="presc-item-actions">
                    <button className="edit-sm" onClick={() => { setEditingItem(item); setShowItemForm(true); }}>Editar</button>
                    <button className="del-sm" onClick={() => handleDeleteItem(item.id)}>Remover</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA HISTÓRICO */}
        {prescription && tab === "history" && (
          <div className="history-view">
            {items.map((item) => {
              const isExpanded = expanded[item.id];
              return (
                <div key={item.id} className="history-item-block">
                  <div className="history-item-header" onClick={() => {
                    if (!isExpanded) { loadHistory(item.id); loadLogs(item.id); }
                    setExpanded(prev => ({ ...prev, [item.id]: !isExpanded }));
                  }}>
                    <span className="presc-item-name">{item.name}</span>
                    <span className="expand-hint">{isExpanded ? "▲ Fechar" : "▼ Expandir"}</span>
                  </div>
                  {isExpanded && history[item.id] !== undefined && (
                    <div className="history-detail">
                      <h4>Alterações</h4>
                      {history[item.id].length === 0 && <p className="empty-sm">Sem alterações registradas.</p>}
                      {history[item.id].map((h) => (
                        <div key={h.id} className="history-entry">
                          <span className="hist-field">{h.fieldChanged}</span>
                          <span className="hist-old">{h.oldValue || "—"}</span>
                          <span>→</span>
                          <span className="hist-new">{h.newValue || "—"}</span>
                          <span className="hist-by">{h.changedBy} · {new Date(h.changedAt).toLocaleString("pt-BR")}</span>
                        </div>
                      ))}
                      <h4>Administrações</h4>
                      {(logs[item.id] || []).length === 0 && <p className="empty-sm">Sem registros de administração.</p>}
                      {(logs[item.id] || []).map((l) => (
                        <div key={l.id} className="history-entry">
                          <span>✓ {l.scheduledTime}</span>
                          <span>{l.administeredBy}</span>
                          <span className="hist-by">{new Date(l.administeredAt).toLocaleString("pt-BR")}</span>
                          {l.notes && <span>{l.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}
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

const emptyItem = { itemType: "MEDICATION", name: "", frequency: "", quantity: "", morningTimes: "", afternoonTimes: "", nightTimes: "", observation: "", sortOrder: 0, medicationId: null };

function ItemForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...emptyItem });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function searchMedications(query) {
    if (!query || query.trim().length === 0) {
      try {
        const { data } = await api.get("/medications");
        setSuggestions(data || []);
        setShowSuggestions((data || []).length > 0);
        setActiveSuggestion(-1);
      } catch {
        setSuggestions([]);
      }
      return;
    }
    try {
      const { data } = await api.get("/medications", { params: { search: query } });
      setSuggestions(data || []);
      setShowSuggestions((data || []).length > 0);
      setActiveSuggestion(-1);
    } catch {
      setSuggestions([]);
    }
  }

  function handleNameChange(e) {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, name: value, medicationId: null }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchMedications(value), 300);
  }

  function selectSuggestion(med) {
    setForm((prev) => ({ ...prev, name: med.name, medicationId: med.id }));
    setShowSuggestions(false);
    setSuggestions([]);
  }

  function handleNameKeyDown(e) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  const f = (field) => ({ value: form[field] || "", onChange: (e) => setForm({ ...form, [field]: e.target.value }) });

  return (
    <div className="item-form">
      <h4>{initial ? "Editar Item" : "Novo Item"}</h4>
      <div className="item-form-grid">
        <div className="if-field">
          <label>Tipo</label>
          <select {...f("itemType")}>
            <option value="MEDICATION">Medicamento</option>
            <option value="DIET">Dieta</option>
            <option value="CARE">Cuidado</option>
          </select>
        </div>
        <div className="if-field full autocomplete-wrap" ref={wrapperRef}>
          <label>Nome *</label>
          <input
            value={form.name || ""}
            onChange={handleNameChange}
            onKeyDown={handleNameKeyDown}
            onFocus={() => searchMedications(form.name || "")}
            required
            placeholder="Ex: Baclofeno 10mg"
          />
          {showSuggestions && (
            <ul className="autocomplete-list">
              {suggestions.map((med, i) => (
                <li
                  key={med.id}
                  className={i === activeSuggestion ? "active" : ""}
                  onMouseDown={() => selectSuggestion(med)}
                >
                  {med.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="if-field">
          <label>Frequência</label>
          <input {...f("frequency")} placeholder="Ex: 4x/dia" />
        </div>
        <div className="if-field">
          <label>Quantidade</label>
          <input {...f("quantity")} placeholder="Ex: 01 cp / 5 ml" />
        </div>
        <div className="if-field">
          <label>Horários Manhã</label>
          <input {...f("morningTimes")} placeholder="Ex: 08:00/10:00" />
        </div>
        <div className="if-field">
          <label>Horários Tarde</label>
          <input {...f("afternoonTimes")} placeholder="Ex: 12:00/18:00" />
        </div>
        <div className="if-field">
          <label>Horários Noite</label>
          <input {...f("nightTimes")} placeholder="Ex: 22:00" />
        </div>
        <div className="if-field">
          <label>Ordem</label>
          <input type="number" {...f("sortOrder")} />
        </div>
        <div className="if-field full">
          <label>Observação</label>
          <input {...f("observation")} placeholder="Ex: Aumentado em 09/04*" />
        </div>
      </div>
      <div className="if-actions">
        <button className="save-btn" onClick={() => onSave(form)}>Salvar</button>
        <button className="cancel-btn" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
