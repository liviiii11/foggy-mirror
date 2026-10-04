export default function Controls({ camOn, onClear, onReset, onToggleCam, onSave }) {
  return (
    <div className="controls">
      <button className="btn" onClick={onClear}>clear all</button>
      <button className="btn" onClick={onReset}>reset mirror</button>
      <button className="btn" onClick={onToggleCam}>camera {camOn ? "off" : "on"}</button>
      <button className="btn" onClick={onSave}>save ♡</button>
    </div>
  );
}
