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
      <div className="lavender-hero">
        <div className="container-app hero-inner">
          <h1 className="brand-display" style={{ fontSize: 36 }}>Our Commitment</h1>
          <p className="hero-tagline">
            The heart of MyZenTribe — simple promises we stand by.
          </p>
        </div>
      </div>

      <div className="container-app">
        <section className="commit-wrap">
          <div className="commit-grid">
            {points.map((p, i) => (
              <div key={i} className="commit-card card">
                <h3 className="commit-title">{p.title}</h3>
                <p className="commit-text">{p.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
