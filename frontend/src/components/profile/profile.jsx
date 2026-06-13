import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { uploadAvatar, removeAvatar, avatarUrl } from "../../supabase";
import Sidebar from "../Sidebar";
import "./Profile.css";

export default function Profile() {
  const [user, setUser] = useState({ name: "", email: "" });
  const [password, setPassword] = useState({ current: "", next: "" });
  const [message, setMessage] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/users/me").then(({ data }) => {
      setUser(data);
      setPhotoPreview(avatarUrl("users", data.id) + "?t=" + Date.now());
      setPhotoError(false);
    }).catch(() => navigate("/"));
  }, []);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError(false);
  }

  async function handleRemovePhoto() {
    if (!window.confirm("Remover foto de perfil?")) return;
    try {
      await removeAvatar("users", user.id);
      setPhotoPreview(null);
      setPhotoFile(null);
      setPhotoError(true);
      setMessage("Foto removida.");
    } catch {
      setMessage("Erro ao remover foto.");
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    try {
      const { data } = await api.put("/users/me", { name: user.name, email: user.email });
      if (photoFile) await uploadAvatar(photoFile, "users", data.id);
      localStorage.setItem("user", JSON.stringify(data));
      setMessage("Perfil atualizado com sucesso!");
      setPhotoFile(null);
    } catch {
      setMessage("Erro ao atualizar perfil.");
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    try {
      await api.put("/users/me/password", {
        currentPassword: password.current,
        newPassword: password.next,
      });
      setMessage("Senha alterada com sucesso!");
      setPassword({ current: "", next: "" });
    } catch {
      setMessage("Senha atual incorreta.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  return (
    <div className="page-layout">
      <Sidebar active="/perfil" />
      <main className="page-main">
        <div className="profile-page">
          <div className="profile-card">

            <div className="profile-header">
            <div className="avatar-wrap">
              <div className="avatar-upload" onClick={() => document.getElementById("profile-photo").click()}>
                {photoPreview && !photoError
                  ? <img src={photoPreview} alt="Foto" onError={() => setPhotoError(true)} />
                  : <span className="avatar-placeholder">👤</span>
                }
                <div className="avatar-overlay">Trocar foto</div>
              </div>
              <input id="profile-photo" type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              {!photoError && photoPreview && (
                <button type="button" className="avatar-remove-btn" onClick={handleRemovePhoto}>
                  Remover foto
                </button>
              )}
            </div>
              <div className="profile-header-info">
                <h1>{user.name || "..."}</h1>
                <p>{user.role || "Usuário"}</p>
              </div>
            </div>

            {message && <div className="profile-msg">{message}</div>}

            <form onSubmit={handleUpdateProfile}>
              <div className="profile-section">
                <h3>Informações Pessoais</h3>
                <div className="profile-input">
                  <span>👤</span>
                  <input type="text" placeholder="Nome" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
                </div>
                <div className="profile-input">
                  <span>✉️</span>
                  <input type="email" placeholder="Email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
                </div>
                <button className="profile-save-btn" type="submit">Salvar</button>
              </div>
            </form>

            <hr className="profile-divider" />

            <form onSubmit={handleChangePassword}>
              <div className="profile-section">
                <h3>Mudar Senha</h3>
                <div className="profile-input">
                  <span>🔒</span>
                  <input type="password" placeholder="Senha atual" value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })} />
                </div>
                <div className="profile-input">
                  <span>✏️</span>
                  <input type="password" placeholder="Nova senha" value={password.next} onChange={(e) => setPassword({ ...password, next: e.target.value })} />
                </div>
                <button className="profile-save-btn" type="submit">Alterar Senha</button>
              </div>
            </form>

            <div className="profile-logout" onClick={handleLogout}>
              <span>Sair</span>
              <span>↪</span>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
