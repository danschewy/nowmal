import type { Metadata } from "next";
import { NowmalApp } from "@/components/nowmal/NowmalApp";

export const metadata: Metadata = {
  title: "Nowmal demo — no account needed",
  description: "Explore the full Nowmal product with a realistic seeded inbox.",
};

export default function DemoPage() {
  return <NowmalApp mode="demo" accountEmail="j.ellery@gmail.com" />;
}
