"use client";

import { useEffect } from "react";

export default function SessionHistory() {
  useEffect(() => {
    function recheckSession(event: PageTransitionEvent) {
      const accountPage = /^\/(?:dashboard|profile|addfood|updatefood)\//.test(window.location.pathname);
      if (event.persisted && accountPage) window.location.reload();
    }

    window.addEventListener("pageshow", recheckSession);
    return () => window.removeEventListener("pageshow", recheckSession);
  }, []);

  return null;
}
