"use client";

import SOSButton from "@/components/SOSButton";

export default function HomeFeed() {
  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>TEST - HOMEFEED IS LOADING</h1>
      <p>If you can see this, the HomeFeed component is working.</p>
      
      <div style={{ marginTop: "30px" }}>
        <h2>Testing SOS Button:</h2>
        <SOSButton variant="hero" label="TEST SOS BUTTON" />
      </div>
      
      <div style={{ marginTop: "30px" }}>
        <a href="/safety">Go to Safety Setup</a>
      </div>
    </div>
  );
}
