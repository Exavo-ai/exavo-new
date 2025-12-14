import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { TeamProvider } from "./contexts/TeamContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Initialize theme on load
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const root = document.documentElement;
  
  if (savedTheme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(savedTheme);
  }
};

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <SettingsProvider>
            <AuthProvider>
              <TeamProvider>
                <App />
              </TeamProvider>
            </AuthProvider>
          </SettingsProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
