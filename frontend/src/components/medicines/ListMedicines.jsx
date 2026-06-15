import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import Sidebar from "../Sidebar";
import "./Medicines.css";

const TODAY = new Date();
const IN_30_DAYS = new Date(TODAY.getTime() + 30 * 24 * 60 * 60 * 1000);
const PAGE_SIZE_OPTIONS = [7, 10, 15, 20];

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d <= IN_30_DAYS && d >= TODAY;
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < TODAY;
}

export default function ListMedicines() {
  const [medicines, setMedicines] = useState([]);
  const [linkedCountByMed, setLinkedCountByMed] = useState({});
  const [timesByMed, setTimesByMed] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: meds } = await api.get("/medications");
        if (!alive) return;
        setMedicines(meds);
        const counts = await Promise.all(
          (meds || []).map((m) =>
            api.get(`/medications/${m.id}/patients`)
              .then((r) => ({ id: m.id, count: (r.data || []).length }))
              .catch(() => ({ id: m.id, count: 0 }))
          )
        );
        const map = {};
        counts.forEach(({ id, count }) => { map[id] = count; });
        if (alive) setLinkedCountByMed(map);

        const itemRes = await Promise.all(
          (meds || []).map((m) =>
            api.get(`/medications/${m.id}/items`)
              .then((r) => ({ id: m.id, items: r.data || [] }))
              .catch(() => ({ id: m.id, items: [] }))
          )
        );
        const timesMap = {};
        itemRes.forEach(({ id, items }) => {
          const allTimes = new Set();
          items.forEach((item) => {
            [item.morningTimes, item.afternoonTimes, item.nightTimes].forEach((t) => {
              if (t) t.split(/[,/]/).map((x) => x.trim()).filter(Boolean).forEach((time) => allTimes.add(time));
            });
          });
          timesMap[id] = [...allTimes].sort();
        });
        if (alive) setTimesByMed(timesMap);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function handleDelete(id) {
    if (!window.confirm("Deseja excluir este medicamento?")) return;
    try {
      await api.delete(`/medications/${id}`);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } catch {
      alert("Erro ao excluir.");
    }
  }

  const categories = [...new Set(medicines.map(m => m.category).filter(Boolean))];

  const filtered = medicines.filter((m) => {
    const matchSearch = !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.category?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !filterCategory || m.category === filterCategory;
    const matchStatus = !filterStatus ||
      (filterStatus === "low" && (m.stock ?? 0) < (m.minStock ?? 0)) ||
      (filterStatus === "ok" && (m.stock ?? 0) >= (m.minStock ?? 0)) ||
      (filterStatus === "expired" && isExpired(m.expiresAt)) ||
      (filterStatus === "soon" && !isExpired(m.expiresAt) && isExpiringSoon(m.expiresAt));
    return matchSearch && matchCategory && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalMeds = medicines.length;
  const lowStock = medicines.filter((m) => (m.stock ?? 0) < (m.minStock ?? 0));
  const expiringSoon = medicines.filter((m) => !isExpired(m.expiresAt) && isExpiringSoon(m.expiresAt));
  const linkedCount = medicines.filter((m) => (linkedCountByMed[m.id] || 0) > 0).length;

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleAll() {
    if (paginated.every(m => selected.has(m.id))) {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(m => s.delete(m.id)); return s; });
    } else {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(m => s.add(m.id)); return s; });
    }
  }

  function handleExport() {
    const headers = ["Medicamento", "Dosagem", "Categoria", "Horários", "Estoque", "Estoque Mínimo", "Validade"];
    const rows = filtered.map((m) => [
      m.name,
      m.concentration || m.unit || "",
      m.category || "",
      (timesByMed[m.id] || []).join("; "),
      m.stock ?? 0,
      m.minStock ?? 0,
      m.expiresAt || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medicamentos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePageChange(p) {
    if (p >= 1 && p <= totalPages) setPage(p);
  }

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);

  return (
    <div className="pl-wrap">
      <Sidebar active="/medicamentos" />

      <div className="pl-main">
        {/* Header */}
        <div className="pl-header">
          <div>
            <h1 className="pl-title">Medicamentos</h1>
            <p className="pl-subtitle">Gerencie todos os medicamentos cadastrados</p>
          </div>
        </div>

        {/* Barra de busca + filtros + botão */}
        <div className="med-toolbar">
          <div className="med-search-wrap">
            <svg className="med-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="med-search"
              placeholder="Buscar medicamentos..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <select className="med-filter-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
            <option value="">Tipos</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select className="med-filter-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">Status</option>
            <option value="ok">Estoque OK</option>
            <option value="low">Estoque Baixo</option>
            <option value="soon">Vencendo em 30d</option>
            <option value="expired">Vencido</option>
          </select>

          <button className="pl-cadastrar-btn" onClick={() => navigate("/medicamentos/novo")}>
            Cadastrar +
          </button>
        </div>

        {/* Summary cards */}
        <div className="med-summary-grid">
          <div className="med-summary-card">
            <div className="med-summary-icon" style={{ background: "#e3f2fd" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6M12 9v6"/></svg>
            </div>
            <div className="med-summary-info">
              <span className="med-summary-label">Total de Medicamentos</span>
              <span className="med-summary-value">{totalMeds}</span>
            </div>
          </div>

          <div className="med-summary-card">
            <div className="med-summary-icon" style={{ background: "#fff3e0" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            <div className="med-summary-info">
              <span className="med-summary-label">Baixo Estoque</span>
              <span className="med-summary-value" style={{ color: lowStock.length ? "#e65100" : "inherit" }}>{lowStock.length}</span>
            </div>
          </div>

          <div className="med-summary-card">
            <div className="med-summary-icon" style={{ background: "#fce4ec" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </div>
            <div className="med-summary-info">
              <span className="med-summary-label">Vencendo (30d)</span>
              <span className="med-summary-value" style={{ color: expiringSoon.length ? "#c62828" : "inherit" }}>{expiringSoon.length}</span>
            </div>
          </div>

          <div className="med-summary-card">
            <div className="med-summary-icon" style={{ background: "#e8f5e9" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>
            </div>
            <div className="med-summary-info">
              <span className="med-summary-label">Vinculados a acolhidos</span>
              <span className="med-summary-value" style={{ color: "#2e7d32" }}>{linkedCount}</span>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="med-card">
          <div className="med-card-toolbar">
            <span className="med-showing">
              Mostrando: {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length}
            </span>
            <button className="med-export-btn" onClick={handleExport}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar
            </button>
          </div>

          <div className="med-table-wrap">
            <table className="med-table">
              <thead>
                <tr>
                  <th className="med-th-check">
                    <input type="checkbox" checked={paginated.length > 0 && paginated.every(m => selected.has(m.id))} onChange={toggleAll} />
                  </th>
                  <th>Medicamento</th>
                  <th>Dosagem</th>
                  <th>Horários</th>
                  <th>Estoque</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="med-td-empty">Carregando...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={6} className="med-td-empty">Nenhum medicamento encontrado.</td></tr>
                ) : paginated.map((m) => {
                  const stockLow = (m.stock ?? 0) < (m.minStock ?? 0);
                  const times = timesByMed[m.id] || [];

                  return (
                    <tr key={m.id} className={selected.has(m.id) ? "med-tr selected" : "med-tr"}>
                      <td className="med-td-check">
                        <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} />
                      </td>
                      <td className="med-td-name">{m.name}</td>
                      <td>{m.concentration || m.unit || "—"}</td>
                      <td>
                        <div className="med-times">
                          {times.length > 0
                            ? times.map(t => <span key={t} className="med-time-chip">{t}</span>)
                            : <span className="med-td-muted">—</span>
                          }
                        </div>
                      </td>
                      <td>
                        <div className="med-stock-cell">
                          <span>{m.stock ?? 0}</span>
                          <span className={`med-stock-badge ${stockLow ? "low" : "ok"}`}>{stockLow ? "Baixo" : "OK"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="med-actions">
                          <button className="med-action-edit" onClick={() => navigate(`/medicamentos/${m.id}/editar`)} title="Editar">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="med-action-del" onClick={() => handleDelete(m.id)} title="Excluir">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="med-pagination">
            <span className="med-showing">Mostrando:</span>
            <button className="med-page-btn" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>‹</button>
            {pageNumbers.map(n => (
              <button key={n} className={`med-page-btn${page === n ? " active" : ""}`} onClick={() => handlePageChange(n)}>{n}</button>
            ))}
            <button className="med-page-btn" onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>›</button>
            <span className="med-page-size-label">Itens por página:</span>
            <select className="med-page-size-select" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
