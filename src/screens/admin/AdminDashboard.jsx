import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { formatEgp } from "../../lib/geo";

const TYPE_LABELS = {
  economy: "اقتصادي",
  comfort: "Comfort",
  masseya: "Masseya",
  tuktuk: "توك توك",
  scooter: "سكوتر",
};

const STATUS_LABELS = {
  requested: "معلق",
  scheduled: "مجدول",
  accepted: "مقبول",
  arrived: "وصل",
  in_progress: "جارية",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

const TABS = [
  { id: "overview", label: "نظرة عامة" },
  { id: "drivers", label: "السائقون" },
  { id: "rides", label: "الرحلات" },
  { id: "riders", label: "الركاب" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [riders, setRiders] = useState([]);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setError("");
    setLoading(true);
    const [{ data: driverRows, error: dErr }, { data: rideRows, error: rErr }, { data: riderRows, error: pErr }] =
      await Promise.all([
        supabase.from("drivers").select("*").order("created_at", { ascending: false }),
        supabase.from("rides").select("*").order("requested_at", { ascending: false }).limit(80),
        supabase.from("profiles").select("id, full_name, phone, role, created_at").order("created_at", { ascending: false }).limit(80),
      ]);
    if (dErr || rErr || pErr) {
      setError(dErr?.message || rErr?.message || pErr?.message || "تعذر تحميل بيانات الإدارة. شغّل supabase/admin.sql");
    }
    setDrivers(driverRows || []);
    setRides(rideRows || []);
    setRiders(riderRows || []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function guard() {
      if (!user?.id) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      if (data?.role !== "admin") {
        navigate("/admin/signin", { replace: true });
        return;
      }
      await load();
    }
    guard();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const todayRides = rides.filter((r) => (r.requested_at || "") >= todayIso);
    const completed = rides.filter((r) => r.status === "completed");
    const revenue = completed.reduce((sum, r) => sum + (Number(r.fare) || 0), 0);
    return {
      drivers: drivers.length,
      online: drivers.filter((d) => d.is_online).length,
      riders: riders.filter((p) => p.role !== "admin").length,
      rides: rides.length,
      today: todayRides.length,
      active: rides.filter((r) => ["accepted", "arrived", "in_progress"].includes(r.status)).length,
      pending: rides.filter((r) => r.status === "requested").length,
      revenue,
    };
  }, [drivers, rides, riders]);

  async function toggleDriver(driver) {
    setBusyId(driver.id);
    const { error: err } = await supabase
      .from("drivers")
      .update({ is_online: !driver.is_online })
      .eq("id", driver.id);
    setBusyId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setDrivers((list) => list.map((d) => (d.id === driver.id ? { ...d, is_online: !d.is_online } : d)));
  }

  async function cancelRide(ride) {
    setBusyId(ride.id);
    const { error: err } = await supabase.from("rides").update({ status: "cancelled" }).eq("id", ride.id);
    setBusyId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setRides((list) => list.map((r) => (r.id === ride.id ? { ...r, status: "cancelled" } : r)));
  }

  const name = user?.user_metadata?.full_name || "المدير";

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-ink/50">إدارة Sahil Drive</p>
          <p className="font-extrabold text-[18px]">{name}</p>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate("/admin/signin");
          }}
          className="text-[12px] font-bold text-ink/45"
        >
          خروج
        </button>
      </div>

      <div className="px-5 mt-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 px-4 rounded-full text-[13px] font-bold whitespace-nowrap ${
              tab === t.id ? "bg-brand-600 text-white" : "bg-white border border-black/10 text-ink/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="px-5 mt-3 text-red-500 text-[13px]">{error}</p>}
      {loading && <p className="px-5 mt-6 text-ink/45 text-[13px]">جاري التحميل...</p>}

      {!loading && tab === "overview" && (
        <div className="px-5 mt-5 grid grid-cols-2 gap-3 pb-6">
          <Stat label="سائقون" value={stats.drivers} />
          <Stat label="متصل الآن" value={stats.online} />
          <Stat label="ركاب" value={stats.riders} />
          <Stat label="رحلات اليوم" value={stats.today} />
          <Stat label="رحلات نشطة" value={stats.active} />
          <Stat label="طلبات معلّقة" value={stats.pending} />
          <div className="col-span-2 rounded-2xl bg-brand-600 text-white p-4">
            <p className="text-[12px] text-white/80">إيراد الرحلات المكتملة</p>
            <p className="text-[22px] font-extrabold mt-1">{formatEgp(stats.revenue)}</p>
          </div>
        </div>
      )}

      {!loading && tab === "drivers" && (
        <div className="px-5 mt-4 space-y-3 pb-6">
          {drivers.length === 0 && <Empty text="لا يوجد سائقون بعد" />}
          {drivers.map((d) => (
            <div key={d.id} className="rounded-2xl bg-white shadow-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[14px]">{d.full_name || "سائق"}</p>
                  <p className="text-[12px] text-ink/50 mt-0.5">
                    {d.phone || "بدون هاتف"} · {d.car_model || "مركبة"} {d.plate_number ? `· ${d.plate_number}` : ""}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg ${
                    d.is_online ? "bg-brand-50 text-brand-700" : "bg-sand text-ink/50"
                  }`}
                >
                  {d.is_online ? "متصل" : "غير متصل"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-ink/50">
                <span>{TYPE_LABELS[d.ride_type] || d.ride_type || "بدون نوع"}</span>
                <span>{d.rating ? `★ ${d.rating}` : ""}</span>
              </div>
              <button
                disabled={busyId === d.id}
                onClick={() => toggleDriver(d)}
                className="w-full h-10 rounded-xl border border-black/10 text-[13px] font-bold"
              >
                {d.is_online ? "تحويل لغير متصل" : "تحويل لمتصل"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "rides" && (
        <div className="px-5 mt-4 space-y-3 pb-6">
          {rides.length === 0 && <Empty text="لا توجد رحلات بعد" />}
          {rides.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white shadow-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[13px] truncate">{r.pickup_address || "نقطة الانطلاق"}</p>
                  <p className="text-[12px] text-ink/50 truncate">إلى {r.dropoff_address || "الوجهة"}</p>
                </div>
                <span className="text-[11px] font-bold bg-sand px-2 py-1 rounded-lg shrink-0">
                  {STATUS_LABELS[r.status] || r.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-ink/50">
                <span>{TYPE_LABELS[r.ride_type] || r.ride_type || "—"}</span>
                <span>{formatEgp(r.fare)}</span>
              </div>
              {["requested", "accepted", "arrived", "in_progress"].includes(r.status) && (
                <button
                  disabled={busyId === r.id}
                  onClick={() => cancelRide(r)}
                  className="w-full h-10 rounded-xl border border-red-200 text-red-500 text-[13px] font-bold"
                >
                  إلغاء الرحلة
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "riders" && (
        <div className="px-5 mt-4 space-y-3 pb-6">
          {riders.length === 0 && <Empty text="لا يوجد ركاب بعد" />}
          {riders.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white shadow-card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[14px]">{p.full_name || "راكب"}</p>
                <p className="text-[12px] text-ink/50 mt-0.5">{p.phone || "بدون هاتف"}</p>
              </div>
              <span className="text-[11px] font-bold bg-sand px-2 py-1 rounded-lg">
                {p.role === "admin" ? "إدارة" : p.role === "captain" ? "كابتن" : "راكب"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white shadow-card p-4">
      <p className="text-[12px] text-ink/50">{label}</p>
      <p className="text-[22px] font-extrabold mt-1">{value}</p>
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-[13px] text-ink/50 bg-white rounded-2xl p-4">{text}</p>;
}
