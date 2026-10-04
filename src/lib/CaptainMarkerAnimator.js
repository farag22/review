// src/lib/CaptainMarkerAnimator.js

/**
 * Helper to smoothly animate or update leaflet marker positions and rotations.
 */
export class CaptainMarkerAnimator {
  constructor(marker, map) {
    this.marker = marker;
    this.map = map;
    this.animationFrameId = null;
  }

  // Update marker rotation/heading if available
  updateHeading(heading) {
    if (!this.marker || heading === null || heading === undefined) return;
    try {
      const icon = this.marker.getElement?.();
      if (!icon) return;
      const innerImg = icon.querySelector(".driver-marker-icon") || icon;
      innerImg.style.transform = `rotate(${heading}deg)`;
      innerImg.style.transition = "transform 0.3s ease-out";
    } catch {
      /* ignore */
    }
  }

  // Smooth linear interpolation for position movement
  animateTo(newLat, newLng, duration = 1000) {
    if (!this.marker || !this.marker.getLatLng) return;

    const startLatLng = this.marker.getLatLng();
    const endLatLng = [newLat, newLng];
    
    // If distance is too small, just set it
    if (startLatLng.lat === newLat && startLatLng.lng === newLng) return;

    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out formula
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentLat = startLatLng.lat + (endLatLng[0] - startLatLng.lat) * easeProgress;
      const currentLng = startLatLng.lng + (endLatLng[1] - startLatLng.lng) * easeProgress;

      this.marker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(step);
      }
    };

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(step);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
