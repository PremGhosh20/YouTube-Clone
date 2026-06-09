import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import api from "./api-client";

const UserContext = createContext(null);

async function syncUserWithBackend(firebaseUser) {
  const token = await firebaseUser.getIdToken();
  const payload = {
    name: firebaseUser.displayName,
    image: firebaseUser.photoURL || "",
  };
  const response = await api.post("/user/login", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.result;
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const dbUser = await syncUserWithBackend(result.user);
      login(dbUser);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const dbUser = await syncUserWithBackend(firebaseUser);
          login(dbUser);
        } catch (error) {
          console.error(error);
          await logout();
        }
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{ user, login, logout, handlegooglesignin, authLoading }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
};
