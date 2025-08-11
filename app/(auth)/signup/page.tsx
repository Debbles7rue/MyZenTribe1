"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMsg(error.message);
    } else {
      router.push("/"); // Redirect after login
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSignIn} className="p-6 rounded-lg bg-white shadow-lg w-80">
        <h1 className="text-lg font-semibold mb-4">Sign In</h1>
        {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
        <input
          type="email"
          placeholder="Email"
          className="input mb-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="input mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-brand w-full">Sign In</button>
      </form>
    </div>
  );
}
