import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./auth/AuthContext";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </HelmetProvider>,
);
