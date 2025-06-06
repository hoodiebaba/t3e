// src/hooks/useAuthGuard.ts
import { useUser } from "../context/UserContext";
import { useRouter, usePathname } from "next/navigation.js";
import { useEffect } from "react";

export function useAuthGuard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/") {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);
}
