interface ToggleProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  size?: "sm" | "md" | "lg";
  // สีตอนเปิด — เขียวสำหรับสถานี/สถานีย่อย, น้ำเงินสำหรับสวิตช์หลักของเส้นทาง
  tone?: "green" | "blue";
}

const SIZE = {
  sm: { track: "h-5 w-9", knob: "h-4 w-4", shift: "translate-x-4" },
  md: { track: "h-6 w-11", knob: "h-5 w-5", shift: "translate-x-5" },
  lg: { track: "h-8 w-14", knob: "h-7 w-7", shift: "translate-x-6" },
};

const Toggle = ({
  checked,
  onChange,
  disabled = false,
  label,
  size = "md",
  tone = "green",
}: ToggleProps) => {
  const s = SIZE[size];
  const on = tone === "blue" ? "bg-blue-600" : "bg-green-500";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${s.track} ${
        checked ? on : "bg-gray-300"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform ${s.knob} ${
          checked ? s.shift : ""
        }`}
      />
    </button>
  );
};

export default Toggle;
