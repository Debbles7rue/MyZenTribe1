"use client";

export default function CommitmentPage() {
  const points = [
    {
      title: "Kindness first",
      text:
        "We lead with compassion and respect in every interaction — online and in person.",
    },
    {
      title: "Support small & local",
      text:
        "We lift up healers, studios, makers, and small businesses that serve their communities.",
    },
    {
      title: "Inclusive & safe",
      text:
        "We welcome all backgrounds and identities, with clear tools to report harm and keep spaces safe.",
    },
    {
      title: "Mindful tech",
      text:
        "We design features to encourage real connection, reflection, and wellbeing — not doom-scrolling.",
    },
    {
      title: "Give back",
      text:
        "We make it easy to volunteer, donate, and participate in community good.",
    },
  ];

  return (
    <main className="page">
      {/* Lavender full-page backdrop */}
      <div className="lavender-page">
        <div className="container-app">
          {/* Header */}
          <div className="hero-inner" style={{ paddingBottom: 20 }}>
            <h1 className="brand-display" style={{ fontSize: 36, marginBottom: 6 }}>
              Our Commitment
            </h1>
            <p className="hero-tagline">
              The heart of MyZenTribe — simple promises we stand by.
            </p>
          </div>

          {/* Stacked long cards */}
          <section className="commit-stack">
            {points.map((p, i) => (
              <article key={i} className="commit-long card">
                <h3 className="commit-title">{p.title}</h3>
                <p className="commit-text">{p.text}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
