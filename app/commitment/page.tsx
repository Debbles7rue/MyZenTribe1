// app/commitment/page.tsx
"use client";
import Link from "next/link";

type Commitment = { 
  title: string; 
  body: string;
  icon: string;
};

const COMMITMENTS: Commitment[] = [
  {
    title: "No Ads. Ever.",
    icon: "🚫",
    body:
      "You will never see invasive banner ads, pop-ups, or unrelated product pitches here. Your experience on MyZenTribe will remain peaceful, focused, and free from the noise that clutters so many other online spaces.",
  },
  {
    title: "Transparent Funding",
    icon: "💎",
    body:
      "We are funded entirely through voluntary donations and, in the future, a simple and affordable membership model. Until January 1, 2026, MyZenTribe is completely free for everyone. After that, you'll have the option to join with a membership plan — or continue supporting through donations if you wish.",
  },
  {
    title: "Community First",
    icon: "🤝",
    body:
      "Our decisions, features, and updates are shaped with you in mind. We welcome feedback and actively listen to our members to make this a space that truly serves the needs of spiritual, wellness, and community-focused individuals.",
  },
  {
    title: "A Safe & Supportive Environment",
    icon: "🛡️",
    body:
      "We take safety seriously. From clear community guidelines to built-in reporting features, MyZenTribe is committed to creating a space where everyone feels welcome, respected, and protected.",
  },
  {
    title: "Giving Back",
    icon: "✨",
    body:
      "Through features like Karma Corner, community events, and opportunities for members to showcase their skills and services, we aim to create ripples of kindness and support that reach far beyond the screen.",
  },
];

export default function CommitmentPage() {
  return (
    <div className="lavender-page">
      <style jsx>{`
        .lavender-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%);
          padding: 1rem;
        }

        .commitment-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 1rem 0;
        }

        .home-button-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .btn-home {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: white;
          color: #1f2937;
          border: 2px solid rgba(147, 51, 234, 0.2);
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.1);
          min-height: 48px;
        }

        .btn-home:hover {
          background: linear-gradient(135deg, #f9f5ff, #ede9fe);
          border-color: #9333ea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.2);
        }

        .hero-section {
          text-align: center;
          margin-bottom: 3rem;
          padding: 0 1rem;
        }

        .brand-lockup {
          font-family: "Playfair Display", ui-serif, Georgia, serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1.5rem;
          letter-spacing: 0.2px;
          line-height: 1.2;
        }

        .zen {
          background: linear-gradient(135deg, #9333ea, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-text {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #374151;
          max-width: 800px;
          margin: 0 auto;
        }

        .commitments-grid {
          display: grid;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .commitment-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 16px rgba(147, 51, 234, 0.1);
          border: 1px solid rgba(147, 51, 234, 0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .commitment-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          background: linear-gradient(180deg, #9333ea, #c084fc);
          transition: width 0.3s ease;
        }

        .commitment-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(147, 51, 234, 0.2);
          border-color: #9333ea;
        }

        .commitment-card:hover::before {
          width: 8px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .card-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 4px rgba(147, 51, 234, 0.2));
        }

        .card-title {
          font-family: "Playfair Display", ui-serif, Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          line-height: 1.3;
        }

        .card-body {
          font-size: 1rem;
          line-height: 1.7;
          color: #4b5563;
          margin: 0;
        }

        .closing-message {
          text-align: center;
          font-size: 1.125rem;
          line-height: 1.7;
          color: #374151;
          font-weight: 500;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(147, 51, 234, 0.1);
          border: 1px solid rgba(147, 51, 234, 0.1);
        }

        /* Mobile Optimizations */
        @media (max-width: 640px) {
          .lavender-page {
            padding: 0.5rem;
          }

          .commitment-container {
            padding: 0.5rem 0;
          }

          .brand-lockup {
            font-size: 2rem;
            margin-bottom: 1rem;
          }

          .hero-text {
            font-size: 1rem;
          }

          .hero-section {
            margin-bottom: 2rem;
          }

          .commitments-grid {
            gap: 1rem;
            margin-bottom: 2rem;
          }

          .commitment-card {
            padding: 1.5rem;
          }

          .card-icon {
            font-size: 2rem;
          }

          .card-title {
            font-size: 1.25rem;
          }

          .card-body {
            font-size: 0.95rem;
          }

          .closing-message {
            font-size: 1rem;
            padding: 1.5rem;
          }

          .btn-home {
            padding: 0.75rem 1.5rem;
            font-size: 0.95rem;
          }
        }

        /* Tablet */
        @media (min-width: 641px) and (max-width: 1024px) {
          .brand-lockup {
            font-size: 2.25rem;
          }

          .commitment-card {
            padding: 1.75rem;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .commitment-card,
          .btn-home,
          .commitment-card::before {
            transition: none;
          }

          .commitment-card:hover {
            transform: none;
          }
        }
      `}</style>

      <div className="commitment-container">
        {/* Home Button */}
        <div className="home-button-wrapper">
          <Link href="/" className="btn-home">
            ← Home
          </Link>
        </div>

        {/* Hero Section */}
        <div className="hero-section">
          <h1 className="brand-lockup">
            Our <span className="zen">Commitment</span>
          </h1>
          <p className="hero-text">
            At MyZenTribe, we believe connection, community, and kindness should never be
            overshadowed by distractions or profit-driven agendas. That's why we've built this
            platform with a clear commitment to our members:
          </p>
        </div>

        {/* Commitments Grid */}
        <div className="commitments-grid">
          {COMMITMENTS.map((item, index) => (
            <article key={index} className="commitment-card">
              <div className="card-header">
                <span className="card-icon">{item.icon}</span>
                <h3 className="card-title">{item.title}</h3>
              </div>
              <p className="card-body">{item.body}</p>
            </article>
          ))}
        </div>

        {/* Closing Message */}
        <div className="closing-message">
          💜 Together, we can make this a space where meaningful connections grow, ideas flourish,
          and kindness leads the way.
        </div>
      </div>
    </div>
  );
}
