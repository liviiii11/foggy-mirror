import { useMemo, useRef, useState } from "react";
import Camera from "./Camera.jsx";
import HandTracker from "./HandTracker.jsx";
import FogLayer from "./FogLayer.jsx";
import Controls from "./Controls.jsx";

export default function Mirror() {
  const boxRef = useRef(), videoRef = useRef(), fogRef = useRef(), dotRef = useRef();
  const smooth = useRef(null);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("loading");

  const drops = useMemo(() => Array.from({ length: 22 }, () => ({
    left: Math.random() * 100, top: Math.random() * 100, s: 6 + Math.random() * 14, tail: Math.random() < 0.4 ? 20 + Math.random() * 60 : 0,
  })), []);

  // Map a video-normalized point to mirror-box pixels, honoring object-fit: cover + horizontal flip.
  const toBox = (p) => {
    const v = videoRef.current, r = boxRef.current.getBoundingClientRect();
    const vw = v.videoWidth || 1, vh = v.videoHeight || 1;
    const k = Math.max(r.width / vw, r.height / vh);
    const x = r.width / 2 + ((1 - p.x) - 0.5) * vw * k; // (1 - x) = mirror
    const y = r.height / 2 + (p.y - 0.5) * vh * k;
    return { x, y, w: r.width, h: r.height };
  };

  const onTip = (p) => {
    const dot = dotRef.current;
    if (!p) { dot.style.opacity = 0; smooth.current = null; fogRef.current.lift(); return; }
    const b = toBox(p);
    const s = smooth.current;
    // exponential smoothing tames landmark jitter
    smooth.current = s ? { x: s.x + (b.x - s.x) * 0.5, y: s.y + (b.y - s.y) * 0.5 } : { x: b.x, y: b.y };
    const { x, y } = smooth.current;
    dot.style.opacity = 1; dot.style.transform = `translate(${x}px, ${y}px)`;
    if (x >= 0 && y >= 0 && x <= b.w && y <= b.h) fogRef.current.wipe(x / b.w, y / b.h);
    else fogRef.current.lift();
  };

  const save = () => {
    const fog = fogRef.current.canvas(), v = videoRef.current;
    const out = document.createElement("canvas"); out.width = fog.width; out.height = fog.height;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#f3dbe6"; ctx.fillRect(0, 0, out.width, out.height);
    if (camOn && v.videoWidth) {
      const k = Math.max(out.width / v.videoWidth, out.height / v.videoHeight);
      const w = v.videoWidth * k, h = v.videoHeight * k;
      ctx.save(); ctx.translate(out.width, 0); ctx.scale(-1, 1);
      ctx.drawImage(v, (out.width - w) / 2, (out.height - h) / 2, w, h); ctx.restore();
    }
    ctx.drawImage(fog, 0, 0);
    const a = document.createElement("a"); a.download = "foggy-mirror.png"; a.href = out.toDataURL("image/png"); a.click();
  };

  return (
    <div className="stage">
      <div className="mirror" ref={boxRef}>
        <Camera ref={videoRef} on={camOn} onError={(e) => { setError(e); setCamOn(false); }} />
        <FogLayer ref={fogRef} />
        <div className="drops">
          {drops.map((d, i) => (
            <i key={i} style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.s, height: d.s + d.tail }} />
          ))}
        </div>
        <span className="spark s1">✦</span><span className="spark s2">♡</span><span className="spark s3">✦</span>
        <div className="tip" ref={dotRef} />
        <HandTracker videoRef={videoRef} active={camOn} onTip={onTip} onStatus={setStatus} />

        {error && (
          <div className="notice">
            <h2>oh no, the mirror can't see you ♡</h2>
            <p>Camera access is needed so your reflection can appear. Allow the camera in your browser's address bar, then try again.</p>
            <button className="btn" onClick={() => { setError(null); setCamOn(true); }}>try again</button>
          </div>
        )}
        {status === "loading" && camOn && !error && <div className="hint top">warming up the mirror…</div>}
        {status === "error" && <div className="hint top">hand tracking couldn't load. check your connection ♡</div>}
        <div className="hint">trace something with your finger ♡</div>
      </div>
      <Controls
        camOn={camOn}
        onClear={() => fogRef.current.clearAll()}
        onReset={() => fogRef.current.reset()}
        onToggleCam={() => { setError(null); setCamOn((v) => !v); }}
        onSave={save}
      />
    </div>
  );
}
