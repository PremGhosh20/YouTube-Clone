import type { AppUser } from "@/types/user";
import type { ReactNode } from "react";

export interface AuthContextValue {
  user: AppUser | null;
  authLoading: boolean;
  login: (userdata: AppUser) => void;
  logout: () => Promise<void>;
  handlegooglesignin: () => Promise<void>;
  refreshUser: () => Promise<AppUser | null>;
}

export function UserProvider(props: { children: ReactNode }): JSX.Element;
export function useUser(): AuthContextValue;
