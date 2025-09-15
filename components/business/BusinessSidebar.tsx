// components/business/BusinessSidebar.tsx
'use client';

export default function BusinessSidebar({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold mb-2">Quick Stats</h3>
        <div className="space-y-2 text-sm">
          <div>Views: 0</div>
          <div>Followers: 0</div>
          <div>Rating: N/A</div>
        </div>
      </div>
    </div>
  );
}
