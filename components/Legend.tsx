export default function Legend() {
  const items = [
    { color: "#22c55e", label: "Friends going" },
    { color: "#fde68a", label: "I’m interested" },
    { color: "#60a5fa", label: "Followed orgs" },
    { color: "#a78bfa", label: "Community" },
    { color: "#9ca3af", label: "Other" }
  ];
  return (
    <div className="flex flex-wrap gap-4 text-sm mt-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

