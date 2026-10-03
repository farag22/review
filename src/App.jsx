import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { RideProvider } from "./context/RideContext";
import { CaptainProvider } from "./context/CaptainContext";
import { useAuth } from "./context/AuthContext";
import { accountHomePath } from "./lib/session";

import Landing from "./screens/landing/Landing";
import Splash from "./screens/onboarding/Splash";
import Welcome from "./screens/onboarding/Welcome";
import SignIn from "./screens/auth/SignIn";
import SignUp from "./screens/auth/SignUp";
import ForgotPassword from "./screens/auth/ForgotPassword";
import VerifyCode from "./screens/auth/VerifyCode";
import CreateNewPassword from "./screens/auth/CreateNewPassword";
import PasswordUpdated from "./screens/auth/PasswordUpdated";

import Home from "./screens/home/Home";
import SetDestination from "./screens/home/SetDestination";
import AddStops from "./screens/home/AddStops";
import ChooseRide from "./screens/home/ChooseRide";
import ConfirmRide from "./screens/home/ConfirmRide";

import FindingDriver from "./screens/trip/FindingDriver";
import ConfirmPickup from "./screens/trip/ConfirmPickup";
import TripProgress from "./screens/trip/TripProgress";
import TripCompleted from "./screens/trip/TripCompleted";

import Wallet from "./screens/wallet/Wallet";
import ScheduleRide from "./screens/schedule/ScheduleRide";
import Profile from "./screens/profile/Profile";

import CaptainSignIn from "./screens/captain/CaptainSignIn";
import CaptainSignUp from "./screens/captain/CaptainSignUp";
import CaptainDashboard from "./screens/captain/CaptainDashboard";
import CaptainActiveRide from "./screens/captain/CaptainActiveRide";
import CaptainDebt from "./screens/captain/CaptainDebt";

import AdminSignIn from "./screens/admin/AdminSignIn";
import AdminDashboard from "./screens/admin/AdminDashboard";

function AuthLoading() {
  return (
    <div className="flex-1 flex items-center justify-center text-ink/50 text-[14px]">
      جاري استعادة الجلسة...
    </div>
  );
}

function RedirectIfAuthed({ children }) {
  const { session, user, loading, accountType } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (session?.user || user) {
    const next = accountHomePath(accountType);
    if (location.pathname !== next) return <Navigate to={next} replace />;
  }
  return children;
}

function RequireAuth({ children }) {
  const { session, user, loading, accountType } = useAuth();
  if (loading) return <AuthLoading />;
  if (!(session?.user || user)) return <Navigate to="/signin" replace />;
  if (accountType === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (accountType === "captain") return <Navigate to="/captain/dashboard" replace />;
  return children;
}

function RequireCaptainAuth({ children }) {
  const { session, user, loading, accountType } = useAuth();
  if (loading) return <AuthLoading />;
  if (!(session?.user || user)) return <Navigate to="/captain" replace />;
  if (accountType === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (accountType !== "captain") return <Navigate to="/home" replace />;
  return children;
}

function RequireAdminAuth({ children }) {
  const { session, user, loading, accountType } = useAuth();
  if (loading) return <AuthLoading />;
  if (!(session?.user || user)) return <Navigate to="/admin" replace />;
  if (accountType !== "admin") return <Navigate to={accountHomePath(accountType)} replace />;
  return children;
}

function AppFrame({ children }) {
  const location = useLocation();
  if (location.pathname === "/") return children;
  return (
    <div className="app-shell">
      <div className="screen-scroll flex flex-col">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <AppFrame>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/app"
            element={
              <RedirectIfAuthed>
                <Welcome />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/splash"
            element={
              <RedirectIfAuthed>
                <Splash />
              </RedirectIfAuthed>
            }
          />
          <Route path="/welcome" element={<Navigate to="/app" replace />} />
          <Route
            path="/signin"
            element={
              <RedirectIfAuthed>
                <SignIn />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfAuthed>
                <SignUp />
              </RedirectIfAuthed>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-code" element={<VerifyCode />} />
          <Route path="/create-new-password" element={<CreateNewPassword />} />
          <Route path="/password-updated" element={<PasswordUpdated />} />

          <Route
            path="/admin"
            element={
              <RedirectIfAuthed>
                <AdminSignIn />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/admin/signin"
            element={
              <RedirectIfAuthed>
                <AdminSignIn />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/admin/*"
            element={
              <RequireAdminAuth>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Routes>
              </RequireAdminAuth>
            }
          />

          <Route
            path="/captain"
            element={
              <RedirectIfAuthed>
                <CaptainSignIn />
              </RedirectIfAuthed>
            }
          />
          <Route path="/captain-login" element={<Navigate to="/captain" replace />} />
          <Route
            path="/captain/signin"
            element={
              <RedirectIfAuthed>
                <CaptainSignIn />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/captain/signup"
            element={
              <RedirectIfAuthed>
                <CaptainSignUp />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/captain/*"
            element={
              <RequireCaptainAuth>
                <CaptainProvider>
                  <Routes>
                    <Route path="dashboard" element={<CaptainDashboard />} />
                    <Route path="ride" element={<CaptainActiveRide />} />
                    <Route path="debt" element={<CaptainDebt />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/captain/dashboard" replace />} />
                  </Routes>
                </CaptainProvider>
              </RequireCaptainAuth>
            }
          />

          <Route
            path="/*"
            element={
              <RequireAuth>
                <RideProvider>
                  <Routes>
                    <Route path="home" element={<Home />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="set-destination" element={<SetDestination />} />
                    <Route path="add-stops" element={<AddStops />} />
                    <Route path="choose-ride" element={<ChooseRide />} />
                    <Route path="confirm-ride" element={<ConfirmRide />} />
                    <Route path="finding-driver" element={<FindingDriver />} />
                    <Route path="confirm-pickup" element={<ConfirmPickup />} />
                    <Route path="trip-progress" element={<TripProgress />} />
                    <Route path="trip-completed" element={<TripCompleted />} />
                    <Route path="wallet" element={<Wallet />} />
                    <Route path="schedule-ride" element={<ScheduleRide />} />
                    <Route path="*" element={<Navigate to="/home" replace />} />
                  </Routes>
                </RideProvider>
              </RequireAuth>
            }
          />
        </Routes>
    </AppFrame>
  );
}
