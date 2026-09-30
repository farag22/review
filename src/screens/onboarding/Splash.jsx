import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PinIcon } from "../../components/Icons";
import { BrandMark } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { accountHomePath } from "../../lib/session";

export default function Splash() {
  const navigate = useNavigate();
  const { session, user, loading, accountType } = useAuth();

  useEffect(() => {
    if (loading) return undefined;
    const next = session?.user || user ? accountHomePath(accountType) : "/welcome";
    const t = setTimeout(() => navigate(next, { replace: true }), 1400);
    return () => clearTimeout(t);
  }, [accountType, loading, navigate, session, user]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-sand">
      <div className="w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center">
        <PinIcon size={44} />
      </div>
      <BrandMark size="text-3xl" />
      <p className="text-ink/50 text-[13px]">راكب</p>
    </div>
  );
}
