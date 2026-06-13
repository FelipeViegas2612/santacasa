import { useState, useEffect } from "react";

export default function DarkToggle() {
  const [dark, setDark] = useState(false);

  // Carrega preferência salva na montagem
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.body.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    setDark(prev => {
      const next = !prev;
      document.body.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <button className="dark-toggle" onClick={toggle} title={dark ? "Modo claro" : "Modo escuro"}>
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
