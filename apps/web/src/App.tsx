import { Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import BoardPage from "@/pages/BoardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        }
      />
      <Route
        path="/board/:id"
        element={
          <AuthGuard>
            <BoardPage />
          </AuthGuard>
        }
      />
    </Routes>
  );
}
