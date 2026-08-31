import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../hooks/useAuth";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { UnauthorizedPage } from "../pages/UnauthorizedPage";
import { AppLayout } from "../components/layout/AppLayout";
import { Role } from "@biodentis/shared-types";

import { RequestAppointmentPage } from "../pages/patient/RequestAppointmentPage";
import { MyAppointmentsPage } from "../pages/patient/MyAppointmentsPage";
import { MyClinicalHistoryPage } from "../pages/patient/MyClinicalHistoryPage";

import { GeneralAgendaPage } from "../pages/receptionist/GeneralAgendaPage";

import { MyAgendaPage } from "../pages/dentist/MyAgendaPage";
import { ClinicalRecordPage } from "../pages/dentist/ClinicalRecordPage";

import { ManageUsersPage } from "../pages/admin/ManageUsersPage";
import { ReportsPage } from "../pages/admin/ReportsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<div>Dashboard</div>} />

              <Route element={<ProtectedRoute allowedRoles={[Role.PATIENT]} />}>
                <Route path="/appointments/new" element={<RequestAppointmentPage />} />
                <Route path="/appointments" element={<MyAppointmentsPage />} />
                <Route path="/clinical-history" element={<MyClinicalHistoryPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={[Role.RECEPTIONIST]} />}>
                <Route path="/agenda" element={<GeneralAgendaPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={[Role.DENTIST]} />}>
                <Route path="/my-agenda" element={<MyAgendaPage />} />
                <Route path="/clinical-records" element={<ClinicalRecordPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN]} />}>
                <Route path="/admin/users" element={<ManageUsersPage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<div>404</div>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
