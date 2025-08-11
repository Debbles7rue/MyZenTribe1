export default function Legend() {
  const items = [
    { color: "#4cafef", label: "Public" },
    { color: "#4caf50", label: "Friends" },
    { color: "#ff9800", label: "Community" },
    { color: "#9e9e9e", label: "Private" },
  ];
  return (
    <div className="flex gap-4 text-sm mt-2">
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
