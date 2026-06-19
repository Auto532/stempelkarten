"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("qrToken");
    if (token) {
      router.replace("/me");
    } else {
      router.replace("/admin");
    }
  }, [router]);

  return null;
}
