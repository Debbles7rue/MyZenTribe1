// app/friends-old/page.tsx
// This file has been moved from app/friends/page.tsx to avoid route conflict
// The actual friends page is at app/(protected)/friends/page.tsx
import { redirect } from "next/navigation";

export default function OldFriendsRedirect() {
  // Redirect to the actual friends page
  redirect("/friends");
  
  return null;
}
