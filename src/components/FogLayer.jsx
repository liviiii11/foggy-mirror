import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

function paintFog(ctx, w, h) {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#fbeaf1"); g.addColorStop(0.5, "#f6eef8"); g.addColorStop(1, "#efe6fa");
  ctx.globalAlpha = 0.96; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // soft cloudy condensation texture
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 70;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = Math.random() < 0.5 ? "255,255,255" : "240,215,235";
    rg.addColorStop(0, `rgba(${c},0.22)`); rg.addColorStop(1, `rgba(${c},0)`);
    ctx.globalAlpha = 1; ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

// The fog is a canvas. Wiping = painting with "destination-out", which erases
// pixels (makes them transparent) so the camera underneath shows through.
const FogLayer = forwardRef(function FogLayer(_, ref) {
  const canvasRef = useRef(null);
  const last = useRef(null);
  const radius = useRef(30);

  useEffect(() => {
    const c = canvasRef.current;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = c.getBoundingClientRect();
      const w = Math.round(width * dpr), h = Math.round(height * dpr);
      if (c.width === w && c.height === h) return;
      const old = document.createElement("canvas");
      old.width = c.width; old.height = c.height;
      if (c.width) old.getContext("2d").drawImage(c, 0, 0);
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (old.width) ctx.drawImage(old, 0, 0, w, h); else paintFog(ctx, w, h); // keep drawings on resize
      radius.current = Math.max(22, Math.min(46, Math.min(width, height) * 0.045)) * dpr;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const stamp = (ctx, x, y) => {
    const r = radius.current;
    // wet rim: only paints where fog still exists ("source-atop" on a canvas w/ alpha)
    ctx.globalCompositeOperation = "source-atop";
    const rim = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.4);
    rim.addColorStop(0, "rgba(255,255,255,0)"); rim.addColorStop(0.55, "rgba(255,255,255,0.45)");
    rim.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rim; ctx.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
    // the actual wipe: feathered circle
    ctx.globalCompositeOperation = "destination-out";
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(0.6, "rgba(0,0,0,0.4)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  useImperativeHandle(ref, () => ({
    canvas: () => canvasRef.current,
    wipe(nx, ny) { // nx, ny in 0..1 of the canvas
      const c = canvasRef.current, ctx = c.getContext("2d");
      const x = nx * c.width, y = ny * c.height;
      const p = last.current;
      if (p) { // fill gaps between frames so fast moves make a continuous line
        const d = Math.hypot(x - p.x, y - p.y), step = radius.current / 4;
        for (let t = step; t < d; t += step) stamp(ctx, p.x + ((x - p.x) * t) / d, p.y + ((y - p.y) * t) / d);
      }
      stamp(ctx, x, y);
      last.current = { x, y };
    },
    lift() { last.current = null; },
    clearAll() { const c = canvasRef.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); },
    reset() { const c = canvasRef.current; paintFog(c.getContext("2d"), c.width, c.height); last.current = null; },
  }));

  return <canvas ref={canvasRef} className="fog" />;
});
export default FogLayer;
