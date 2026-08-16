import type { Metadata } from "next";
import { NowmalApp } from "@/components/nowmal/NowmalApp";

export const metadata: Metadata = {
  title: "Try Nowmal — no account needed",
  description: "Explore a complete sample inbox and see how Nowmal finds tasks, promises, and safe next actions.",
};

export default function DemoPage() {
  return <NowmalApp mode="demo" accountEmail="j.ellery@gmail.com" />;
}
