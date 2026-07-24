import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import MatchDetail from "./pages/MatchDetail";
import Teams from "./pages/Teams";
import Leagues from "./pages/Leagues";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PrivateRoute from "./components/ui/PrivateRoute";
import { useThemeStore } from "./store/theme";
import { Toaster } from "sonner";

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<Home />} />
          <Route path="/cricket" element={<Home />} />
          <Route path="/football" element={<Home />} />
          <Route path="/match/:id" element={<MatchDetail />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster theme="dark" position="bottom-right" richColors />
    </>
  );
}
