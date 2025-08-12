// app/auth/page.tsx
import { redirect } from "next/navigation";

export default function AuthPage() {
  redirect("/login");
  return null;
}
