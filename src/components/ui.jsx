import React from "react";
import { useNavigate } from "react-router-dom";

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`w-full h-14 rounded-2xl bg-brand-600 text-white font-bold text-[15px]
        active:bg-brand-700 disabled:opacity-40 disabled:pointer-events-none transition-colors
        shadow-card ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      className={`w-full h-14 rounded-2xl border border-black/10 bg-white text-ink font-semibold text-[15px]
        active:bg-black/5 transition-colors flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextField({ label, id, name, dir, className = "", ...props }) {
  const fieldId = id || name;
  return (
    <label className="block" htmlFor={fieldId}>
      {label && (
        <span className="block text-[13px] text-ink/60 mb-1.5">{label}</span>
      )}
      <input
        id={fieldId}
        name={name}
        dir={dir}
        className={`w-full h-13 py-3.5 px-4 rounded-xl bg-white border border-black/10
          text-[15px] placeholder:text-ink/35 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
        {...props}
      />
    </label>
  );
}

export function ScreenHeader({ title, subtitle, onBack, right }) {
  const navigate = useNavigate();
  return (
    <div className="px-5 pt-4 pb-5 flex items-start gap-3">
      {onBack !== null && (
        <button
          onClick={onBack || (() => navigate(-1))}
          className="w-10 h-10 rounded-full bg-white shadow-card flex items-center justify-center shrink-0"
          aria-label="رجوع"
        >
          <ArrowIcon />
        </button>
      )}
      <div className="flex-1 pt-1.5">
        <h1 className="text-[19px] font-extrabold text-ink">{title}</h1>
        {subtitle && <p className="text-[13px] text-ink/55 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function ArrowIcon() {
  // RTL: "back" points right
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 5l7 7-7 7"
        stroke="#0d1f18"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandMark({ size = "text-2xl" }) {
  return (
    <div className={`font-extrabold ${size} text-ink flex items-baseline gap-1`}>
      <span>Sahil</span>
      <span className="text-brand-600">Drive</span>
    </div>
  );
}

export function PinInputs({ length = 4, value, onChange }) {
  const refs = React.useRef([]);
  const digits = value.split("");
  while (digits.length < length) digits.push("");

  function handleChange(i, v) {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    onChange(next.join(""));
    if (clean && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  return (
    <div className="flex gap-3 justify-center" dir="ltr">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          inputMode="numeric"
          maxLength={1}
          className="w-14 h-16 text-center text-2xl font-bold rounded-xl border border-black/10
            bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      ))}
    </div>
  );
}

export function Stars({ value, onChange, size = 34 }) {
  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} aria-label={`${n} نجوم`}>
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7-5.4-4.7 7.1-.6L12 2z"
              fill={n <= value ? "#0b7350" : "#e8ece9"}
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, children, ...props }) {
  return (
    <button
      className={`px-4 h-10 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
        active
          ? "bg-brand-600 text-white"
          : "bg-white text-ink/70 border border-black/10"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
