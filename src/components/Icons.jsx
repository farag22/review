import React from "react";

const base = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export function PinIcon({ size = 20, color = "#0b7350" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22s7-7.2 7-12.5A7 7 0 0 0 5 9.5C5 14.8 12 22 12 22z"
        stroke={color}
        {...base}
      />
      <circle cx="12" cy="9.5" r="2.5" stroke={color} {...base} />
    </svg>
  );
}

export function SearchIcon({ size = 18, color = "#0d1f18" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={color} {...base} />
      <path d="M21 21l-4-4" stroke={color} {...base} />
    </svg>
  );
}

export function HomeIcon({ size = 18, color = "#0d1f18" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-7 8 7" stroke={color} {...base} />
      <path d="M6 10v9h12v-9" stroke={color} {...base} />
    </svg>
  );
}

export function WorkIcon({ size = 18, color = "#0d1f18" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="11" rx="1.5" stroke={color} {...base} />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke={color} {...base} />
    </svg>
  );
}

export function StarOutlineIcon({ size = 18, color = "#0d1f18" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l2.6 5.6 6.1.5-4.6 4 1.4 6-5.5-3.3L6.5 19l1.4-6-4.6-4 6.1-.5L12 3z"
        stroke={color}
        {...base}
      />
    </svg>
  );
}

export function WalletIcon({ size = 18, color = "#0d1f18" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke={color} {...base} />
      <path d="M3 10h18" stroke={color} {...base} />
      <circle cx="16.5" cy="14" r="1.2" fill={color} />
    </svg>
  );
}

export function PhoneCallIcon({ size = 18, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v3a2 2 0 0 1-2 2C10.6 19 5 13.4 5 6a2 2 0 0 1 1-3z"
        stroke={color}
        {...base}
      />
    </svg>
  );
}

export function ChatIcon({ size = 18, color = "#0d1f18" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5h16v11H8l-4 4V5z"
        stroke={color}
        {...base}
      />
    </svg>
  );
}

export function ShieldIcon({ size = 18, color = "#0d1f18" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"
        stroke={color}
        {...base}
      />
    </svg>
  );
}

export function ClockIcon({ size = 18, color = "#0d1f18" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} {...base} />
      <path d="M12 7v5l3.5 2" stroke={color} {...base} />
    </svg>
  );
}

export function PlusIcon({ size = 18, color = "#0b7350" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={color} {...base} />
    </svg>
  );
}

export function CarBadge({ label, price, eta, size = 44 }) {
  return (
    <div
      className="rounded-xl bg-brand-50 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 16v-3.2c0-.5.2-1 .6-1.3l1.8-1.7c.3-.3.7-.5 1.2-.5h8.8c.5 0 .9.2 1.2.5l1.8 1.7c.4.3.6.8.6 1.3V16"
          stroke="#0b7350"
          {...base}
        />
        <rect x="3" y="16" width="18" height="3" rx="1" stroke="#0b7350" {...base} />
        <circle cx="7.5" cy="16" r="1.4" fill="#0b7350" />
        <circle cx="16.5" cy="16" r="1.4" fill="#0b7350" />
      </svg>
    </div>
  );
}

function RideGlyph({ children, size, active }) {
  return (
    <div
      className={`rounded-2xl flex items-center justify-center shrink-0 ${
        active ? "bg-emerald-400/20 ring-1 ring-emerald-300/40" : "bg-white/10"
      }`}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}

export function RideTypeIcon({ type = "economy", size = 48, active = false }) {
  const stroke = active ? "#6ee7b7" : "#e2e8f0";
  const fill = active ? "#34d399" : "#cbd5e1";
  const id = String(type || "").toLowerCase();
  const iconSize = size * 0.56;

  if (id.includes("tuktuk") || id.includes("tuk")) {
    return (
      <RideGlyph size={size} active={active}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path d="M4 16V10.5L7 7h7.5L19 11v5" stroke={stroke} {...base} />
          <path d="M4 16h15" stroke={stroke} {...base} />
          <circle cx="7.2" cy="16.4" r="1.6" fill={fill} />
          <circle cx="16.6" cy="16.4" r="1.6" fill={fill} />
          <path d="M11 7v4h8" stroke={stroke} {...base} />
        </svg>
      </RideGlyph>
    );
  }

  if (id.includes("scooter") || id.includes("bike")) {
    return (
      <RideGlyph size={size} active={active}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <circle cx="6.5" cy="17" r="2.2" stroke={stroke} {...base} />
          <circle cx="17.5" cy="17" r="2.2" stroke={stroke} {...base} />
          <path d="M8.5 17h5L16 9h2.5" stroke={stroke} {...base} />
          <path d="M13.5 12.5H10" stroke={stroke} {...base} />
        </svg>
      </RideGlyph>
    );
  }

  if (id.includes("delivery") || id.includes("parcel") || id.includes("box")) {
    return (
      <RideGlyph size={size} active={active}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path d="M4 8.5L12 4l8 4.5v11L12 20l-8-4.5v-11z" stroke={stroke} {...base} />
          <path d="M12 20V11M4 8.5l8 2.5 8-2.5" stroke={stroke} {...base} />
        </svg>
      </RideGlyph>
    );
  }

  if (id.includes("comfort") || id.includes("premium") || id.includes("masseya")) {
    return (
      <RideGlyph size={size} active={active}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path
            d="M3.5 16v-3l2-4.2A2 2 0 0 1 7.4 7.5h9.2a2 2 0 0 1 1.9 1.3l2 4.2V16"
            stroke={stroke}
            {...base}
          />
          <path d="M3.5 16h17" stroke={stroke} {...base} />
          <circle cx="7.2" cy="16.2" r="1.7" fill={fill} />
          <circle cx="16.8" cy="16.2" r="1.7" fill={fill} />
          <path d="M8 10.5h8" stroke={stroke} {...base} />
        </svg>
      </RideGlyph>
    );
  }

  return (
    <RideGlyph size={size} active={active}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 16v-3.2c0-.5.2-1 .6-1.3l1.8-1.7c.3-.3.7-.5 1.2-.5h8.8c.5 0 .9.2 1.2.5l1.8 1.7c.4.3.6.8.6 1.3V16"
          stroke={stroke}
          {...base}
        />
        <rect x="3" y="16" width="18" height="3" rx="1" stroke={stroke} {...base} />
        <circle cx="7.5" cy="16" r="1.4" fill={fill} />
        <circle cx="16.5" cy="16" r="1.4" fill={fill} />
      </svg>
    </RideGlyph>
  );
}

export function CashIcon({ size = 18, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} {...base} />
      <circle cx="12" cy="12" r="2.2" stroke={color} {...base} />
      <path d="M7 9.2c.6-.5 1.4-.8 2.2-.8M17 14.8c-.6.5-1.4.8-2.2.8" stroke={color} {...base} />
    </svg>
  );
}

export function CardPayIcon({ size = 18, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} {...base} />
      <path d="M3 10h18" stroke={color} {...base} />
      <path d="M7 15h4" stroke={color} {...base} />
    </svg>
  );
}

export function BankIcon({ size = 18, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 10h16M12 4l10 6H2l10-6z" stroke={color} {...base} />
      <path d="M6 10v6M10 10v6M14 10v6M18 10v6M4 16h16v2H4z" stroke={color} {...base} />
    </svg>
  );
}

export function PaymentMethodIcon({ method = "cash", size = 18, color = "#fff" }) {
  if (method === "wallet") return <WalletIcon size={size} color={color} />;
  if (method === "card") return <CardPayIcon size={size} color={color} />;
  if (method === "bank") return <BankIcon size={size} color={color} />;
  return <CashIcon size={size} color={color} />;
}
