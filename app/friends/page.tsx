// app/friends/page.tsx
import { redirect } from "next/navigation";

export default function FriendsRedirect() {
  // Immediately redirect to the protected friends page
  redirect("/(protected)/friends");
  
  // This return statement will never be reached due to the redirect
  return null;
}
