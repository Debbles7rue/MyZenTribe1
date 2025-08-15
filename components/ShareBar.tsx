"use client";

export default function ShareBar({ url, title }: { url: string; title: string }) {
  const encoded = encodeURIComponent(url);
  const msg = encodeURIComponent(title);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    alert("Link copied!");
  };

  return (
    <div className="section-row">
      <div className="muted">Share:</div>
      <a className="btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noreferrer">Facebook</a>
      <a className="btn" href={`https://twitter.com/intent/tweet?url=${encoded}&text=${msg}`} target="_blank" rel="noreferrer">Twitter/X</a>
      <button className="btn" onClick={copy}>Copy link</button>
    </div>
  );
}
