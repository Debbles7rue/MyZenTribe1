// components/BusinessCard.tsx
"use client";

type SocialLinks = {
  website_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
};

export type BusinessCardProps = {
  name?: string | null;
  logo_url?: string | null;
  tagline?: string | null;
  description?: string | null;

  // mini-site & media
  cover_image_url?: string | null;
  gallery?: { url: string; alt?: string }[];

  // links
  links?: SocialLinks;

  // booking (optional)
  booking_url?: string | null;

  // privacy: we do NOT render email in UI per guardrail
  phone_public?: boolean | null;
  phone_number?: string | null;

  // actions
  onFollow?: () => void;
  isFollowing?: boolean;
};

export default function BusinessCard({
  name,
  logo_url,
  tagline,
  description,
  cover_image_url,
  gallery = [],
  links,
  booking_url,
  phone_public,
  phone_number,
  onFollow,
  isFollowing,
}: BusinessCardProps) {
  return (
    <div className="card p-0 overflow-hidden">
      {/* Cover */}
      {cover_image_url ? (
        <div className="w-full h-40 sm:h-56 bg-zinc-200 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : null}

      <div className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo_url}
              alt=""
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-violet-200/70"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-violet-100/60 ring-2 ring-violet-200/70 flex items-center justify-center text-violet-800">
              Biz
            </div>
          )}

          <div className="min-w-0 grow">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{name || "Business"}</h2>
                {tagline ? <p className="text-sm text-zinc-600 dark:text-zinc-300">{tagline}</p> : null}
              </div>

              <div className="flex gap-2">
                {onFollow ? (
                  <button className="btn" onClick={onFollow} aria-label="Follow business">
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                ) : null}
                {booking_url ? (
                  <a className="btn btn-brand" href={booking_url} target="_blank" rel="noreferrer">
                    Book Now
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-3 stack">
          {description ? (
            <p style={{ whiteSpace: "pre-wrap" }}>{description}</p>
          ) : (
            <p className="muted">Add a short description of your services and experience.</p>
          )}

          {/* Social / website */}
          {links && (links.website_url || links.facebook_url || links.instagram_url || links.youtube_url || links.tiktok_url) ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {links.website_url ? (
                <a className="chip" href={links.website_url} target="_blank" rel="noreferrer">
                  Website
                </a>
              ) : null}
              {links.facebook_url ? (
                <a className="chip" href={links.facebook_url} target="_blank" rel="noreferrer">
                  Facebook
                </a>
              ) : null}
              {links.instagram_url ? (
                <a className="chip" href={links.instagram_url} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              ) : null}
              {links.youtube_url ? (
                <a className="chip" href={links.youtube_url} target="_blank" rel="noreferrer">
                  YouTube
                </a>
              ) : null}
              {links.tiktok_url ? (
                <a className="chip" href={links.tiktok_url} target="_blank" rel="noreferrer">
                  TikTok
                </a>
              ) : null}
            </div>
          ) : null}

          {/* Phone (optional, only if public) */}
          {phone_public && phone_number ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">Phone: {phone_number}</div>
          ) : null}

          {/* Website preview (simple) */}
          {links?.website_url ? (
            <div className="mt-3 rounded-xl overflow-hidden ring-1 ring-violet-200/70">
              <iframe
                src={links.website_url}
                className="w-full h-64 bg-white"
                title="Website preview"
                loading="lazy"
              />
            </div>
          ) : null}

          {/* Mini gallery */}
          {gallery.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {gallery.slice(0, 6).map((g, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={g.url} alt={g.alt || ""} className="w-full h-24 object-cover rounded-lg" />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
