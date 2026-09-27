import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PinIcon, } from "../../components/Icons";
import { BrandMark } from "../../components/ui";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/welcome"), 1400);
    return () => clearTimeout(t);
  }, [navigate]);

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
