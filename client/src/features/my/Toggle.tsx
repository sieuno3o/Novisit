import { useState } from "react";

export default function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button
      type="button"
      className={`toggle ${on ? "on" : "off"}`}
      aria-pressed={on}
      onClick={() => setOn(v => !v)}
    >
      <span className="knob" />
    </button>
  );
}
