import ProtectedNav from "@/components/ProtectedNav";

export const metadata = { title: "Karma Corner • MyZenTribe" };

export default function KarmaCornerPage() {
  return (
    <div className="min-h-screen">
      <ProtectedNav />
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-semibold">Karma Corner / Good News</h1>
        <p className="text-gray-700">
          Share anonymous acts of kindness or uplifting news. (Posts & weekly challenges coming next.)
        </p>
        <div className="card p-4">
          <p className="text-sm text-gray-600">Coming soon: post form, moderation, and “kindness challenges”.</p>
        </div>
      </main>
    </div>
  );
}
