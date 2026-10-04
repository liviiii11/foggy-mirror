export default function WelcomeScreen({ onStart }) {
  return (
    <main className="welcome">
      <div className="floaty f1">♡</div><div className="floaty f2">✦</div>
      <div className="floaty f3">♡</div><div className="floaty f4">✦</div>
      <h1>♡ foggy little mirror ♡</h1>
      <p>Use your finger to wipe the fog away</p>
      <button className="btn big" onClick={onStart}>let's go ♡</button>
    </main>
  );
}
