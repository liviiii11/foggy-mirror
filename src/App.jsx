import { useState } from "react";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import Mirror from "./components/Mirror.jsx";

export default function App() {
  const [started, setStarted] = useState(false);
  return started ? <Mirror /> : <WelcomeScreen onStart={() => setStarted(true)} />;
}
