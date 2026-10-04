import { useEffect } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Landmarks: 4 = thumb tip, 8 = index tip, 0 = wrist, 9 = middle knuckle.
// Headless: runs detection each frame, reports the pencil point (midpoint of
// thumb and index tips, video-normalized 0..1, un-mirrored) plus whether the
// fingers are pinched. Reports null if no hand is visible.
export default function HandTracker({ videoRef, active, onTip, onStatus }) {
  useEffect(() => {
    if (!active) return;
    let raf, landmarker, stopped = false, lastTime = -1;
    let pinching = false; // remembered between frames so the line doesn't flicker

    (async () => {
      try {
        onStatus?.("loading");
        const fileset = await FilesetResolver.forVisionTasks(WASM);
        const make = (delegate) =>
          HandLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL, delegate },
            runningMode: "VIDEO",
            numHands: 1,
          });
        try { landmarker = await make("GPU"); } catch { landmarker = await make("CPU"); }
        if (stopped) return landmarker.close();
        onStatus?.("ready");

        const loop = () => {
          const v = videoRef.current;
          if (v && v.readyState >= 2 && v.currentTime !== lastTime) {
            lastTime = v.currentTime;
            const res = landmarker.detectForVideo(v, performance.now());
            const L = res.landmarks?.[0];

            if (!L) {
              pinching = false;
              onTip(null);
            } else {
              const aspect = v.videoWidth / v.videoHeight; // x and y are normalized separately
              const dist = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
              const ratio = dist(L[4], L[8]) / dist(L[0], L[9]); // thumb-index gap vs hand size
              // A finger counts as "open" when its tip is farther from the wrist than its middle joint.
              const open = (tip, pip) => dist(L[tip], L[0]) > dist(L[pip], L[0]);
              const othersOpen = [[12, 10], [16, 14], [20, 18]].filter(([t, p]) => open(t, p)).length;
              const notFist = othersOpen >= 2; // middle, ring, pinky: at least 2 must be open
              const pinched = pinching ? ratio < 0.5 : ratio < 0.3; // start tight, release looser
              pinching = pinched && notFist;              onTip({
                x: (L[4].x + L[8].x) / 2,
                y: (L[4].y + L[8].y) / 2,
                pinching,
              });
            }
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.error("Hand tracking failed:", e);
        onStatus?.("error");
      }
    })();

    return () => { stopped = true; cancelAnimationFrame(raf); landmarker?.close(); };
  }, [active]); // eslint-disable-line
  return null;
}