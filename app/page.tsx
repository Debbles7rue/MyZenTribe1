"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      {/* Brand Name */}
      <h1 className="text-center text-4xl font-bold mb-6">
        <span style={{ fontFamily: "Georgia, serif", fontWeight: "bold" }}>
          My<em style={{ fontStyle: "italic" }}>Zen</em>Tribe
        </span>
      </h1>

      {/* Your existing content — unchanged */}
      <section className="our-intention bg-white rounded-2xl shadow-md p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Our Intention</h2>
        <p className="text-gray-700 mb-4">
          Welcome to MyZenTribe — a space where connection, community, and
          healing come together. Our mission is to connect people to local and
          global communities, support talented small businesses, and encourage
          everyone to make the world a better place.
        </p>
        <div className="mt-4">
          <Link
            href="/commitment"
            className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
          >
            Our Commitment
          </Link>
        </div>
      </section>

      {/* Signup / Login section */}
      <section className="mt-8 flex flex-col items-center">
        <div className="flex gap-4">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Sign Up
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 transition"
          >
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
