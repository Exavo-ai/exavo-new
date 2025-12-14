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

// Initialize theme on load - default to light, only dark if explicitly saved
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  const root = document.documentElement;
  
  // Only use dark if explicitly set, otherwise default to light
  if (savedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.add('light');
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
