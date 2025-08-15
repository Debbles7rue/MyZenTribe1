"use client";
import React from "react";

type Props = {
  mode: "whats" | "mine";
  setMode: (m: "whats" | "mine") => void;

  typeFilter: "all" | "personal" | "business";
  setTypeFilter: (t: "all" | "personal" | "business") => void;

  showMoon: boolean;
  setShowMoon: (v: boolean) => void;

  theme: "spring" | "summer" | "autumn" | "winter";
  setTheme: (t: "spring" | "summer" | "autumn" | "winter") => void;

  query: string;
  setQuery: (q: string) => void;

  onCreate: () => void;
};

export default function CalendarHeader({
  mode, setMode,
  typeFilter, setTypeFilter,
  showMoon, setShowMoon,
  theme, setTheme,
  query, setQuery,
  onCreate
}: Props) {
  return (
    <div className="header-bar">
      <h1 className="page-title">Calendar</h1>

      <div className="controls">
        <div className="segmented">
          <button className={`seg-btn ${mode==='whats'?'active':''}`} onClick={()=>setMode('whats')}>What’s happening</button>
          <button className={`seg-btn ${mode==='mine'?'active':''}`} onClick={()=>setMode('mine')}>Only my events</button>
        </div>

        <label className="check">
          <span>Type</span>
          <select className="select" value={typeFilter} onChange={e=>setTypeFilter(e.target.value as any)}>
            <option value="all">All</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
        </label>

        <label className="check">
          <input type="checkbox" checked={showMoon} onChange={e=>setShowMoon(e.target.checked)} />
          Show moon
        </label>

        <select className="select" value={theme} onChange={e=>setTheme(e.target.value as any)} title="Color theme">
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="autumn">Autumn</option>
          <option value="winter">Winter</option>
        </select>

        <button className="btn btn-brand" onClick={onCreate}>Create event</button>
      </div>

      <div className="card p-3 mb-3" style={{ marginTop: 10 }}>
        <input
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          placeholder="Search events by title, description or location…"
          className="search-input"
        />
      </div>
    </div>
  );
}
