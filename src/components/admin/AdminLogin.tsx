"use client";

import { useActionState } from "react";
import { adminLogin, type AdminLoginState } from "@/app/actions/admin";

const INITIAL: AdminLoginState = { error: "" };

export function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, INITIAL);
  return (
    <form action={action} className="glass mt-8 space-y-4 p-5 sm:p-6">
      <label htmlFor="token" className="text-sm font-semibold">
        Admin token
      </label>
      <input
        id="token"
        name="token"
        type="password"
        required
        autoComplete="off"
        className="w-full rounded-xl border border-line bg-bg/70 px-4 py-3 text-[15px] text-ink focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
      />
      {state.error && (
        <p role="alert" className="rounded-lg border border-block/40 bg-block/10 p-3 text-sm text-ink">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full justify-center" disabled={pending}>
        {pending ? "Checking…" : "Open admin"}
      </button>
    </form>
  );
}
