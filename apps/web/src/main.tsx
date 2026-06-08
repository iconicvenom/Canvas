import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "font-hand border-2 border-black rounded-xl shadow-card",
            style: { background: "#fdfcf9" },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
