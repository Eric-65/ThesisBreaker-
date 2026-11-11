"use client";

import { useEffect, useState } from "react";

export interface Me {
  authEnabled: boolean;
  providers: { google: boolean; email: boolean };
  signedIn: boolean;
  email: string | null;
  name: string | null;
  image: string | null;
}

let inflight: Promise<Me | null> | null = null;

function loadMe(): Promise<Me | null> {
  inflight ??= fetch("/api/me", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
    .catch(() => null);
  return inflight;
}

/** Shared, fetched-once view of who is signed in. Null while loading or if unavailable. */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let live = true;
    void loadMe().then((m) => live && setMe(m));
    return () => {
      live = false;
    };
  }, []);
  return me;
}
