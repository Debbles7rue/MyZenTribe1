export default function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/MyZenTribe_Corrected.png"  /* make sure this file is in /public */
        alt="MyZenTribe logo"
        width={50}
        height={50}
        style={{ display: "block" }}
      />
      <span className="text-2xl font-semibold italic">
        My<span className="not-italic">Zen</span><span className="italic">Tribe</span>
      </span>
    </div>
  );
}
