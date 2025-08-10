export default function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo.svg"   // change to /logo.png if that’s your file
        alt="MyZenTribe logo"
        width={40}
        height={40}
        style={{ display: 'block' }}
      />
      <span className="text-2xl font-semibold italic">
        My<span className="not-italic">Zen</span><span className="italic">Tribe</span>
      </span>
    </div>
  );
}
