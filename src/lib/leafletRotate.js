import L from "./leaflet";

try {
  if (typeof globalThis !== "undefined") globalThis.L = L;
} catch {
  /* ignore */
}

export default L;
