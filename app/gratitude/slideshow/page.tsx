// app/gratitude/slideshow/page.tsx
import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import GratitudeSlideshow from "@/components/GratitudeSlideshow";

export default function SlideshowPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const year = Number(searchParams?.year ?? new Date().getFullYear());

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              Slideshow {isFinite(year) ? year : ""}
            </h1>
            <div className="controls">
              <Link className="btn btn-neutral" href="/gratitude">
                Back to journal
              </Link>
            </div>
          </div>

          {/* The actual slideshow (client) */}
          <GratitudeSlideshow year={isFinite(year) ? year : new Date().getFullYear()} />
        </div>
      </div>
    </div>
  );
}
