"use client";
import SiteHeader from "@/components/SiteHeader";
import { useState } from "react";

export default function GratitudePage() {
  const [entry, setEntry] = useState("");
  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app">
          <h1 className="page-title">Gratitude</h1>
          <div className="card p-3">
            <p className="muted">Jot a quick gratitude. (We’ll wire saving soon.)</p>
            <textarea
              className="input"
              rows={6}
              placeholder="Today I'm grateful for…"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
            />
            <div className="right" style={{marginTop:10}}>
              <button className="btn btn-brand" onClick={() => alert("Saving soon!")}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
