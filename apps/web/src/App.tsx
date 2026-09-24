import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, Route, Routes } from "react-router";
import { FeedbackButton } from "./components/FeedbackButton";
import { InstallBanner } from "./components/InstallBanner";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { VersionBadge } from "./components/VersionBadge";
import { DEV_TOOLS } from "./config";
import { useMe } from "./lib/auth";
import { AdminFeedbackPage } from "./pages/AdminFeedback";
import { DeviceCheckPage } from "./pages/DeviceCheck";
import { EmailLoginPage } from "./pages/EmailLogin";
import { GpsLabPage } from "./pages/GpsLab";
import { HomePage } from "./pages/Home";
import { InvitesPage } from "./pages/Invites";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { ProfilePage } from "./pages/Profile";
import { SignupPage } from "./pages/Signup";

function RequireUser({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { t } = useTranslation();
  const { data: me, isPending } = useMe();
  if (isPending) return <p className="muted">{t("common.loading")}</p>;
  if (!me || (admin && !me.isAdmin)) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  const { t } = useTranslation();
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="/favicon.svg" alt="" width={32} height={32} />
          {t("app.name")}
        </Link>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/email" element={<EmailLoginPage />} />
          <Route path="/device-check" element={<DeviceCheckPage />} />
          <Route
            path="/profile"
            element={
              <RequireUser>
                <ProfilePage />
              </RequireUser>
            }
          />
          <Route
            path="/invites"
            element={
              <RequireUser>
                <InvitesPage />
              </RequireUser>
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <RequireUser admin>
                <AdminFeedbackPage />
              </RequireUser>
            }
          />
          {DEV_TOOLS && <Route path="/dev/gps" element={<GpsLabPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <InstallBanner />
      <UpdatePrompt />
      <footer className="dock">
        <VersionBadge />
        <FeedbackButton />
      </footer>
    </div>
  );
}
