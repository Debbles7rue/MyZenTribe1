// app/(public)/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <style jsx>{`
        .logo {
          width: 220px; height: 220px; margin: 8px auto 20px; border-radius: 50%;
          background: url("/logo-myzentribe.png") center/contain no-repeat;
          box-shadow: 0 0 30px rgba(135, 76, 255, 0.25);
          animation: pulse 2.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 18px rgba(135,76,255,.22); }
          50%     { box-shadow: 0 0 36px rgba(135,76,255,.36); }
        }
        .container { max-width: 960px; margin: 0 auto; text-align: center; }
        h1 { font-size: 40px; margin: 0 0 10px; font-weight: 800; letter-spacing: -0.02em; }
        h1 .i { font-style: italic; }
        p.lead { font-size: 18px; margin: 12px 0; }
        .primary {
          display:inline-block; margin-top:12px; padding:12px 18px; border-radius:16px;
          background:#000; color:#fff; text-decoration:none;
        }
        .card {
          margin: 28px auto 0; max-width: 760px; background: rgba(255,255,255,.85);
          border:1px solid #e5e7eb; border-radius:22px; padding:22px;
          box-shadow: 0 6px 24px rgba(0,0,0,.06); text-align: center;
        }
        .secondary {
          display:inline-block; margin-top:14px; padding:10px 16px; border-radius:16px;
          border:1px solid #e5e7eb; background:#fff; text-decoration:none; color:inherit;
        }
      `}</style>

      <div className="logo" aria-label="MyZenTribe Logo" />

      <section className="container">
        <h1>
          Welcome to <span className="i">My</span>Zen<span className="i">Tribe</span>
        </h1>
        <p className="lead">A space to connect, recharge, and share what matters.</p>
        <p className="lead">
          From daily mindfulness and gratitude practices to meaningful events, MyZenTribe
          makes it easy to find your people and build something good together.
        </p>
        <Link href="/auth" className="primary">Sign up / Sign in</Link>
      </section>

      <section className="card" id="intention">
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Our Intention</h2>
        <p style={{ marginTop: 8 }}>
          To bring people together across local and global communities, support talented
          small businesses, and encourage every member to play a part in making the world
          a better place.
        </p>
        <Link href="/commitment" className="secondary">Our Commitment</Link>
      </section>
    </>
  );
}
