// app/profile/ProfileClient.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// ... (rest of your imports stay the same)

// Move the AnimatedCounter component here
function AnimatedCounter({ value, label }: { value: number; label: string }) {
  // ... (same code)
}

export default function ProfileClient() {
  // ... (all your existing ProfilePage code goes here)
}
