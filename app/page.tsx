export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl w-full text-center">
        <img
          src="/logo.png"
          alt="MyZenTribe Logo"
          className="mx-auto mb-6 w-48 h-auto"
        />
        <h1 className="text-4xl font-bold mb-4">Welcome to MyZenTribe</h1>
        <p className="text-lg text-gray-700 mb-6">
          A space to connect, recharge, and share what matters.
        </p>
        <p className="text-lg text-gray-700 mb-6">
          From daily mindfulness and gratitude practices to meaningful events, MyZenTribe makes it easy to find your people and build something good together.
        </p>
        <div className="flex justify-center gap-4 mb-8">
          <a href="/signup" className="bg-green-500 text-white px-6 py-3 rounded-lg shadow hover:bg-green-600">Sign Up</a>
          <a href="/signin" className="bg-purple-500 text-white px-6 py-3 rounded-lg shadow hover:bg-purple-600">Sign In</a>
        </div>

        <h2 className="text-3xl font-semibold mb-4">Our Intention</h2>
        <p className="text-gray-700 mb-6">
          To bring people together across local and global communities, support talented small businesses, and encourage every member to play a part in making the world a better place.
        </p>
        <a href="/commitment" className="text-blue-600 hover:underline font-medium">
          Our Commitment
        </a>
      </div>
    </main>
  );
}
