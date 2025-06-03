// src/context/UserContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: number;
  username: string;
  role: string;
  permissions: Record<string, boolean>;
  [key: string]: any;
};

type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refreshUser: () => Promise<void>;
  loading: boolean;
};

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  refreshUser: async () => {},
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    // 👇👇 Add log for token
    console.log("UserProvider: token in storage", token);
    if (token) {
      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json();
        // 👇👇 Add log for API result
        console.log("UserProvider: /api/me data", data);
        if (data.ok && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    // 👇👇 Add log for token in useEffect
    console.log("UserProvider: token in storage", token);
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
