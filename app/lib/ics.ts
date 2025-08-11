export function generateICS(event: {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}) {
  const formatDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${event.title}
DESCRIPTION:${event.description || ""}
DTSTART:${formatDate(event.start)}
DTEND:${formatDate(event.end)}
LOCATION:${event.location || ""}
END:VEVENT
END:VCALENDAR
`.trim();

  return new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
}
