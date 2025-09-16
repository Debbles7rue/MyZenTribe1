// app/business/test/page.tsx
// CREATE THIS AS A TEST FILE
export default function TestBusinessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">✅ Routing Works!</h1>
        <p className="text-xl">If you can see this, the business routes are working.</p>
        <p className="mt-4 text-gray-600">Now we just need to fix the [slug] dynamic route.</p>
      </div>
    </div>
  );
}
