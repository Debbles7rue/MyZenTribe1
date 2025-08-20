"use client";

export function BackgroundSelector({
  value,
  onChange,
}: {
  value: "sunset" | "river" | "mandala";
  onChange: (v: "sunset" | "river" | "mandala") => void;
}) {
  const options: { key: "sunset" | "river" | "mandala"; label: string; preview: string }[] = [
    { key: "sunset", label: "Sunset", preview: "bg-gradient-to-b from-purple-200 via-violet-200 to-rose-200" },
    { key: "river", label: "Flowing River", preview: "bg-gradient-to-b from-blue-200 via-indigo-200 to-purple-200" },
    { key: "mandala", label: "Mandala Glow", preview: "bg-gradient-to-b from-fuchsia-200 via-purple-200 to-violet-200" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          aria-label={o.label}
          className={`h-16 rounded-lg border shadow-inner ${o.preview} ${
            value === o.key ? "ring-2 ring-brand-500" : ""
          }`}
          title={o.label}
        />
      ))}
    </div>
  );
}
