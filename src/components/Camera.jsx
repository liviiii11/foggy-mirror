import { forwardRef, useEffect } from "react";

// Owns the <video> element and the camera stream. `on` toggles the stream.
const Camera = forwardRef(function Camera({ on, onError, onReady }, videoRef) {
  useEffect(() => {
    const video = videoRef.current;
    if (!on) return;
    let stream, cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        video.srcObject = stream;
        await video.play();
        onReady?.();
      } catch (e) {
        onError?.(e);
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [on]); // eslint-disable-line

  // scaleX(-1) = mirror; object-fit: cover = fill without distortion
  return <video ref={videoRef} className="camera" playsInline muted style={{ opacity: on ? 1 : 0 }} />;
});
export default Camera;
