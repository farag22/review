import L from "leaflet";
import "leaflet/dist/leaflet.css";

if (typeof globalThis !== "undefined") {
  globalThis.L = L;
}

export default L;
