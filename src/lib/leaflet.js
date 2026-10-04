import L from "leaflet";
import "leaflet/dist/leaflet.css";

// leaflet-rotate extends L.Map with setBearing/getBearing. Keep the import
// isolated here so a plugin failure can be handled by MapView's safe fallback.
import "leaflet-rotate";

if (typeof globalThis !== "undefined") {
  globalThis.L = L;
}

export default L;
