"use client";
import Link from "next/link";

export default function BackLink({
  href,
  children,
}: {
  href: string;
  children?: React.ReactNode;
}) {
  return <Link href={href} className="btn">{children ?? "Back"}</Link>;
}
