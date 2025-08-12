export function generateICS(event: {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyZenTribe//Calendar//EN",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(event.start)}`,
    `DTEND:${fmt(event.end)}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description}` : null,
    event.location ? `LOCATION:${event.location}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return new Blob([ics], { type: "text/calendar;charset=utf-8" });
}
