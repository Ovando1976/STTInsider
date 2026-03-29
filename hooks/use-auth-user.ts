"use client";

import { useAuthContext } from "@/components/providers/auth-provider";

export function useAuthUser() {
  return useAuthContext();
}
