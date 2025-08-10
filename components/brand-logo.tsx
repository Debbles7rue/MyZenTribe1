export default function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.svg"   // <-- if you uploaded PNG, change to /logo.png
        alt="MyZenTribe logo"
        width={40}
        height={40}
        priority
      />
      <span className="text-2xl font-semibold italic">
        My<span className="not-italic">Zen</span><span className="italic">Tribe</span>
      </span>
    </div>
  );
}
