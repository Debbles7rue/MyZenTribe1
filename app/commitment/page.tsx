export const metadata = {
  title: "Our Commitment — MyZenTribe",
  description:
    "No ads, transparent funding, community-first, safety, and giving back. This is our commitment to every member of MyZenTribe.",
};

export default function CommitmentPage() {
  return (
    <main className="min-h-screen bg-purple-100 px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Our Commitment</h1>
        <p className="text-lg opacity-85">
          At MyZenTribe, we believe connection, community, and kindness should never be
          overshadowed by distractions or profit-driven agendas. That’s why we’ve built this
          platform with a clear commitment to our members:
        </p>

        <div className="rounded-3xl border bg-white/90 p-6 shadow">
          <h2 className="mb-2 text-xl font-semibold">1. No Ads. Ever.</h2>
          <p className="opacity-85">
            You will never see invasive banner ads, pop-ups, or unrelated product pitches here.
            Your experience on MyZenTribe will remain peaceful, focused, and free from noise.
          </p>
        </div>

        <div className="rounded-3xl border bg-white/90 p-6 shadow">
          <h2 className="mb-2 text-xl font-semibold">2. Transparent Funding</h2>
          <p className="opacity-85">
            We are funded through voluntary donations and, in the future, a simple and affordable
            membership model. Until January 1, 2026, MyZenTribe is completely free for everyone.
            After that, you’ll have the option to join with a membership plan — or continue
            supporting through donations if you wish.
          </p>
        </div>

        <div className="rounded-3xl border bg-white/90 p-6 shadow">
          <h2 className="mb-2 text-xl font-semibold">3. Community First</h2>
          <p className="opacity-85">
            Our decisions, features, and updates are shaped with you in mind. We welcome feedback
            and actively listen to our members to make this a space that truly serves spiritual,
            wellness, and community-focused individuals.
          </p>
        </div>

        <div className="rounded-3xl border bg-white/90 p-6 shadow">
          <h2 className="mb-2 text-xl font-semibold">4. A Safe & Supportive Environment</h2>
          <p className="opacity-85">
            We take safety seriously. From clear community guidelines to built-in reporting features,
            MyZenTribe is committed to creating a space where everyone feels welcome, respected,
            and protected.
          </p>
        </div>

        <div className="rounded-3xl border bg-white/90 p-6 shadow">
          <h2 className="mb-2 text-xl font-semibold">5. Giving Back</h2>
          <p className="opacity-85">
            Through features like Karma Corner, community events, and opportunities for members to
            showcase their skills and services, we aim to create ripples of kindness that reach far
            beyond the screen.
          </p>
        </div>

        <div className="rounded-3xl border bg-white/90 p-6 shadow">
          <p className="opacity-90">
            💜 Together, we can make this a space where meaningful connections grow, ideas flourish,
            and kindness leads the way.
          </p>
        </div>
      </section>
    </main>
  );
}
