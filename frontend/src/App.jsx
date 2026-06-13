import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/login/login";
import Profile from "./components/profile/profile";
import Room from "./components/room/room";
import RoomDailyView from "./components/room/RoomDailyView";
import PatientList from "./components/patient/PatientList";
import PatientForm from "./components/patient/PatientForm";
import PatientDetail from "./components/patient/PatientDetail";
import PrescriptionPage from "./components/prescription/PrescriptionPage";
import TVDashboard from "./components/tv/TVDashboard";
import ListMedicines from "./components/medicines/ListMedicines";
import RegisterMedicines from "./components/medicines/RegisterMedicines";
import DarkToggle from "./components/DarkToggle";

function PrivateRoute({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <DarkToggle />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/quartos" element={<PrivateRoute><Room /></PrivateRoute>} />
        <Route path="/quartos/:id/agenda" element={<PrivateRoute><RoomDailyView /></PrivateRoute>} />
        <Route path="/acolhidos" element={<PrivateRoute><PatientList /></PrivateRoute>} />
        <Route path="/acolhidos/novo" element={<PrivateRoute><PatientForm /></PrivateRoute>} />
        <Route path="/acolhidos/:id" element={<PrivateRoute><PatientDetail /></PrivateRoute>} />
        <Route path="/acolhidos/:id/editar" element={<PrivateRoute><PatientForm /></PrivateRoute>} />
        <Route path="/acolhidos/:id/prescricao" element={<PrivateRoute><PrescriptionPage /></PrivateRoute>} />
        <Route path="/tv" element={<PrivateRoute><TVDashboard /></PrivateRoute>} />
        <Route path="/medicamentos" element={<PrivateRoute><ListMedicines /></PrivateRoute>} />
        <Route path="/medicamentos/novo" element={<PrivateRoute><RegisterMedicines /></PrivateRoute>} />
        <Route path="/medicamentos/:id/editar" element={<PrivateRoute><RegisterMedicines /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
