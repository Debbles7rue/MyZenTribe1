import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "MyZenTribe — Welcome",
  description:
    "A space to connect, recharge, and share what matters. From daily mindfulness and gratitude practices to meaningful events, MyZenTribe makes it easy to find your people and build something good together.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-purple-100 flex flex-col items-center justify-start p-6">
      {/* Large Logo */}
      <div className="mt-8 mb-6">
        <Image
          src="/logo-myzentribe.png"
          alt="MyZenTribe Logo"
          width={250} // increase this number for bigger logo
          height={250}
          priority
        />
      </div>

      {/* Welcome section */}
      <section className="max-w-4xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to <span className="italic">My</span>Zen
          <span className="italic">Tribe</span>
        </h1>

        <p className="text-lg">
          A space to connect, recharge, and share what matters.
        </p>

        <p className="text-lg">
          From daily mindfulness and gratitude practices to meaningful events,
          MyZenTribe makes it easy to find your people and build something good together.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/auth" className="rounded-2xl bg-black px-4 py-2 text-white">
            Sign up / Sign in
          </Link>
          <Link href="#intention" className="rounded-2xl border px-4 py-2">
            Our Intention
          </Link>
        </div>
      </section>

      {/* Intention box */}
      <section
        id="intention"
        className="mt-10 max-w-3xl rounded-3xl border bg-white/80 p-6 shadow-md"
      >
        <h2 className="mb-2 text-xl font-semibold">Our Intention</h2>
        <p>
          To bring people together across local and global communities, support
          talented small businesses, and encourage every member to play a part
          in making the world a better place.
        </p>
      </section>
    </main>
  );
}
