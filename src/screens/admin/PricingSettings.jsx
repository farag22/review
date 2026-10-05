import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { formatEgp } from "../../lib/geo";

const DEFAULT_FORM = {
  passenger_base: 8, passenger_per_km: 4, passenger_per_min: 0.75, passenger_min_fare: 20,
  captain_base: 6, captain_per_km: 3, captain_per_min: 0.5,
  commission_mode: "percent", commission_value: 15,
  booking_fee_enabled: false, booking_fee: 0,
  waiting_fee_enabled: false, waiting_fee_per_min: 0,
  cancellation_fee_enabled: false, cancellation_fee: 0,
  toll_fee_enabled: false, toll_fee: 0,
  surge_enabled: true, default_surge_multiplier: 1,
};

export default function PricingSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [zones, setZones] = useState([]);
  const [surges, setSurges] = useState([]);
  const [vehicleRules, setVehicleRules] = useState([]);
  const [versions, setVersions] = useState([]);
  const [test, setTest] = useState({ distance: 10, minutes: 15, rideType: "economy" });
  const [quote, setQuote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [zone, setZone] = useState({ name: "القليوبية", priority: 10, min_lat: 30.0, min_lng: 30.9, max_lat: 30.7, max_lng: 31.55, passenger_base: "", passenger_per_km: "", passenger_per_min: "", passenger_min_fare: "", commission_mode: "", commission_value: "" });

  async function load() {
    const [{ data: settings }, { data: zoneRows }, { data: surgeRows }, { data: versionRows }, { data: vehicleRows }] = await Promise.all([
      supabase.from("pricing_settings").select("*").eq("id", "default").maybeSingle(),
      supabase.from("pricing_zones").select("*").order("priority", { ascending: false }),
      supabase.from("surge_rules").select("*").order("created_at", { ascending: false }),
      supabase.from("pricing_versions").select("version_no, source, created_at").order("version_no", { ascending: false }).limit(12),
      supabase.from("pricing_vehicle_rules").select("*").order("ride_type"),
    ]);
    if (settings) setForm((old) => ({ ...old, ...settings }));
    setZones(zoneRows || []);
    setSurges(surgeRows || []);
    setVersions(versionRows || []);
    setVehicleRules(vehicleRows || []);
  }

  useEffect(() => { load(); }, []);

  function change(name, value) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  async function save() {
    setSaving(true); setError(""); setMessage("");
    const payload = { ...form, id: "default", updated_by: user?.id || null, updated_at: new Date().toISOString() };
    const { error: saveError } = await supabase.from("pricing_settings").upsert(payload);
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    setMessage("تم حفظ الإعدادات وإنشاء إصدار أسعار جديد");
    await load();
  }

  async function calculate() {
    setError("");
    const { data, error: quoteError } = await supabase.rpc("pricing_quote", {
      p_pickup_lat: 30.466, p_pickup_lng: 31.185, p_dropoff_lat: 30.55, p_dropoff_lng: 31.25,
      p_distance_km: Number(test.distance), p_duration_minutes: Number(test.minutes), p_ride_type: test.rideType, p_waiting_minutes: 0,
    });
    if (quoteError) { setError(quoteError.message); return; }
    setQuote(Array.isArray(data) ? data[0] : data);
  }

  async function addZone(event) {
    event.preventDefault();
    const cleanZone = Object.fromEntries(Object.entries(zone).map(([key, value]) => [key, value === "" ? null : value]));
    const { error: zoneError } = await supabase.from("pricing_zones").insert({ ...cleanZone, active: true });
    if (zoneError) setError(zoneError.message); else { setMessage("تمت إضافة المنطقة"); setZones((rows) => [...rows, { ...zone, active: true }]); }
  }

  async function removeZone(id) {
    const { error: zoneError } = await supabase.from("pricing_zones").delete().eq("id", id);
    if (zoneError) setError(zoneError.message); else setZones((rows) => rows.filter((row) => row.id !== id));
  }

  async function addSurge() {
    const multiplier = Number(prompt("معامل الذروة (مثال 1.2 أو 1.5)", "1.2"));
    if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 5) return;
    const { data, error: surgeError } = await supabase.from("surge_rules").insert({ name: `ذروة ×${multiplier}`, multiplier, active: true }).select().single();
    if (surgeError) setError(surgeError.message); else setSurges((rows) => [data, ...rows]);
  }

  async function removeSurge(id) {
    const { error: surgeError } = await supabase.from("surge_rules").delete().eq("id", id);
    if (surgeError) setError(surgeError.message); else setSurges((rows) => rows.filter((row) => row.id !== id));
  }

  async function addVehicleRule() {
    const rideType = prompt("نوع المركبة (economy / comfort / tuktuk / motorcycle)", "economy");
    const value = Number(prompt("قيمة العمولة بالنسبة المئوية", "15"));
    if (!rideType || !Number.isFinite(value) || value < 0) return;
    const { data, error: ruleError } = await supabase.from("pricing_vehicle_rules").insert({ ride_type: rideType, commission_mode: "percent", commission_value: value, active: true }).select().single();
    if (ruleError) setError(ruleError.message); else setVehicleRules((rows) => [data, ...rows]);
  }

  async function removeVehicleRule(id) {
    const { error: ruleError } = await supabase.from("pricing_vehicle_rules").delete().eq("id", id);
    if (ruleError) setError(ruleError.message); else setVehicleRules((rows) => rows.filter((row) => row.id !== id));
  }

  return (
    <div className="flex-1 px-5 pt-5 pb-10 space-y-5" dir="rtl">
      <div><p className="text-[12px] text-ink/50">لوحة الإدارة</p><h1 className="text-2xl font-extrabold">إعدادات التسعير</h1><p className="text-[12px] text-ink/55 mt-1">كل تعديل ينشئ نسخة أسعار جديدة ولا يغير الرحلات القديمة.</p></div>
      {error && <p className="rounded-xl bg-red-50 text-red-600 p-3 text-[13px]">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 text-emerald-700 p-3 text-[13px]">{message}</p>}

      <section className="rounded-2xl bg-white shadow-card p-4 space-y-4">
        <h2 className="font-extrabold">تسعير الراكب</h2>
        <div className="grid grid-cols-2 gap-3">{[
          ["passenger_base", "أجرة البداية", 8], ["passenger_per_km", "سعر الكيلومتر", 4], ["passenger_per_min", "سعر الدقيقة", 0.75], ["passenger_min_fare", "الحد الأدنى", 20],
        ].map(([name, label, placeholder]) => <Field key={name} label={label} value={form[name]} placeholder={placeholder} onChange={(v) => change(name, Number(v))} />)}</div>
      </section>

      <section className="rounded-2xl bg-white shadow-card p-4 space-y-4">
        <h2 className="font-extrabold">مستحق الكابتن</h2>
        <div className="grid grid-cols-2 gap-3">{[
          ["captain_base", "بداية الكابتن", 6], ["captain_per_km", "سعر كم للكابتن", 3], ["captain_per_min", "سعر دقيقة للكابتن", 0.5],
        ].map(([name, label, placeholder]) => <Field key={name} label={label} value={form[name]} placeholder={placeholder} onChange={(v) => change(name, Number(v))} />)}</div>
      </section>

      <section className="rounded-2xl bg-white shadow-card p-4 space-y-4">
        <h2 className="font-extrabold">عمولة المنصة والذروة</h2>
        <div className="grid grid-cols-2 gap-3"><label className="text-[12px] text-ink/60">نوع العمولة<select className="mt-1 w-full rounded-xl border border-black/10 p-3" value={form.commission_mode} onChange={(e) => change("commission_mode", e.target.value)}><option value="percent">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option><option value="none">بدون عمولة</option></select></label><Field label="قيمة العمولة" value={form.commission_value} onChange={(v) => change("commission_value", Number(v))} /></div>
        <div className="flex items-center gap-3"><input type="checkbox" checked={form.surge_enabled} onChange={(e) => change("surge_enabled", e.target.checked)} /><span className="text-[13px]">تفعيل الذروة</span><Field label="المعامل الافتراضي" value={form.default_surge_multiplier} onChange={(v) => change("default_surge_multiplier", Number(v))} /></div>
        <div className="flex gap-2 flex-wrap">{surges.map((s) => <span key={s.id} className="rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-[12px]">{s.name} <button onClick={() => removeSurge(s.id)} className="mr-1">×</button></span>)}<button onClick={addSurge} className="rounded-full border border-amber-200 px-3 py-1 text-[12px]">+ قاعدة ذروة</button></div>
      </section>

      <section className="rounded-2xl bg-white shadow-card p-4 space-y-3"><h2 className="font-extrabold">عمولة حسب نوع المركبة</h2><button onClick={addVehicleRule} className="rounded-xl border border-brand-200 px-3 py-2 text-[12px] font-bold text-brand-700">+ إضافة قاعدة مركبة</button>{vehicleRules.map((rule) => <div key={rule.id} className="flex items-center justify-between border-t border-black/5 pt-2 text-[13px]"><span>{rule.ride_type} · {rule.commission_mode === "percent" ? `${rule.commission_value}%` : `${rule.commission_value} ج.م`}</span><button onClick={() => removeVehicleRule(rule.id)} className="text-red-500">حذف</button></div>)}</section>

      <section className="rounded-2xl bg-white shadow-card p-4 space-y-3"><h2 className="font-extrabold">الرسوم الإضافية</h2><FeeRow label="رسوم الحجز" enabled={form.booking_fee_enabled} amount={form.booking_fee} onToggle={(v) => change("booking_fee_enabled", v)} onAmount={(v) => change("booking_fee", Number(v))} /><FeeRow label="رسوم الانتظار لكل دقيقة" enabled={form.waiting_fee_enabled} amount={form.waiting_fee_per_min} onToggle={(v) => change("waiting_fee_enabled", v)} onAmount={(v) => change("waiting_fee_per_min", Number(v))} /><FeeRow label="رسوم الإلغاء" enabled={form.cancellation_fee_enabled} amount={form.cancellation_fee} onToggle={(v) => change("cancellation_fee_enabled", v)} onAmount={(v) => change("cancellation_fee", Number(v))} /><FeeRow label="رسوم الطرق والبوابات" enabled={form.toll_fee_enabled} amount={form.toll_fee} onToggle={(v) => change("toll_fee_enabled", v)} onAmount={(v) => change("toll_fee", Number(v))} /></section>

      <button onClick={save} disabled={saving} className="w-full h-13 rounded-2xl bg-brand-600 text-white font-bold disabled:opacity-50">{saving ? "جاري الحفظ..." : "حفظ وإنشاء إصدار أسعار"}</button>

      <section className="rounded-2xl bg-white shadow-card p-4 space-y-3"><h2 className="font-extrabold">معاينة السعر</h2><div className="grid grid-cols-2 gap-3"><Field label="المسافة كم" value={test.distance} onChange={(v) => setTest((x) => ({ ...x, distance: v }))} /><Field label="المدة دقيقة" value={test.minutes} onChange={(v) => setTest((x) => ({ ...x, minutes: v }))} /></div><button onClick={calculate} className="w-full h-11 rounded-xl bg-slate-900 text-white font-bold">احسب السعر</button>{quote && <div className="grid grid-cols-2 gap-2 text-[13px] bg-sand rounded-xl p-3"><Price label="سعر الراكب" value={quote.passenger_total} /><Price label="إجمالي الكابتن" value={quote.captain_gross} /><Price label="عمولة المنصة" value={quote.platform_commission} /><Price label="صافي الكابتن" value={quote.captain_net} /><Price label="الذروة" value={`×${quote.surge_multiplier}`} /></div>}</section>

      <section className="rounded-2xl bg-white shadow-card p-4 space-y-3"><h2 className="font-extrabold">المناطق</h2><form onSubmit={addZone} className="grid grid-cols-2 gap-2"><Field label="اسم المنطقة" value={zone.name} onChange={(v) => setZone((x) => ({ ...x, name: v }))} /><Field label="الأولوية" value={zone.priority} onChange={(v) => setZone((x) => ({ ...x, priority: Number(v) }))} /><Field label="خط العرض الأدنى" value={zone.min_lat} onChange={(v) => setZone((x) => ({ ...x, min_lat: Number(v) }))} /><Field label="خط الطول الأدنى" value={zone.min_lng} onChange={(v) => setZone((x) => ({ ...x, min_lng: Number(v) }))} /><Field label="خط العرض الأعلى" value={zone.max_lat} onChange={(v) => setZone((x) => ({ ...x, max_lat: Number(v) }))} /><Field label="خط الطول الأعلى" value={zone.max_lng} onChange={(v) => setZone((x) => ({ ...x, max_lng: Number(v) }))} /><Field label="بداية خاصة (اختياري)" value={zone.passenger_base} onChange={(v) => setZone((x) => ({ ...x, passenger_base: v }))} /><Field label="سعر كم خاص" value={zone.passenger_per_km} onChange={(v) => setZone((x) => ({ ...x, passenger_per_km: v }))} /><Field label="سعر دقيقة خاص" value={zone.passenger_per_min} onChange={(v) => setZone((x) => ({ ...x, passenger_per_min: v }))} /><Field label="حد أدنى خاص" value={zone.passenger_min_fare} onChange={(v) => setZone((x) => ({ ...x, passenger_min_fare: v }))} /><Field label="عمولة المنطقة" value={zone.commission_value} onChange={(v) => setZone((x) => ({ ...x, commission_value: v }))} /><button className="col-span-2 h-11 rounded-xl border border-brand-200 text-brand-700 font-bold">إضافة منطقة</button></form>{zones.map((z) => <div key={z.id} className="flex items-center justify-between border-t border-black/5 pt-2 text-[13px]"><span>{z.name} · أولوية {z.priority} {z.passenger_per_km ? `· ${z.passenger_per_km} ج/كم` : ""}</span><button onClick={() => removeZone(z.id)} className="text-red-500">حذف</button></div>)}</section>

      <section className="rounded-2xl bg-white shadow-card p-4"><h2 className="font-extrabold mb-2">سجل الإصدارات</h2>{versions.map((v) => <div key={v.version_no} className="flex justify-between text-[12px] py-1 border-b border-black/5"><span>الإصدار #{v.version_no}</span><span>{new Date(v.created_at).toLocaleString("ar-EG")}</span></div>)}</section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) { const isText = typeof value === "string"; return <label className="text-[12px] text-ink/60">{label}<input type={isText ? "text" : "number"} step={isText ? undefined : "0.01"} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 p-3 text-ink" /></label>; }
function FeeRow({ label, enabled, amount, onToggle, onAmount }) { return <div className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} /><span className="flex-1 text-[13px]">{label}</span><input type="number" step="0.01" value={amount} onChange={(e) => onAmount(e.target.value)} className="w-24 rounded-xl border border-black/10 p-2" /></div>; }
function Price({ label, value }) { return <div><p className="text-ink/50">{label}</p><p className="font-extrabold">{typeof value === "string" ? value : formatEgp(value)}</p></div>; }
