import { useEffect } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const INDEX_TIP = 8; // MediaPipe landmark id for the index fingertip

// Headless: runs detection each frame, reports the fingertip in video-normalized
// coords (0..1, un-mirrored) or null if no hand is visible.
export default function HandTracker({ videoRef, active, onTip, onStatus }) {
  useEffect(() => {
    if (!active) return;
    let raf, landmarker, stopped = false, lastTime = -1;

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
            const p = res.landmarks?.[0]?.[INDEX_TIP];
            onTip(p ? { x: p.x, y: p.y } : null);
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
