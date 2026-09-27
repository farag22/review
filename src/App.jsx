import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RideProvider } from "./context/RideContext";
import { useAuth } from "./context/AuthContext";

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

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <div className="screen-scroll flex flex-col">
        <Routes>
          {/* Onboarding + Auth */}
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-code" element={<VerifyCode />} />
          <Route path="/create-new-password" element={<CreateNewPassword />} />
          <Route path="/password-updated" element={<PasswordUpdated />} />

          {/* Rider flow (auth required) */}
          <Route
            path="/*"
            element={
              <RequireAuth>
                <RideProvider>
                  <Routes>
                    <Route path="home" element={<Home />} />
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
      </div>
    </div>
  );
}
