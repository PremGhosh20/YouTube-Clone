import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, useContext, createContext, useRef } from "react";
import { provider, auth } from "./firebase";
import api from "./api-client";
import OtpVerifyDialog from "@/components/OtpVerifyDialog";
import { toast } from "sonner";
import { showDevOtpToast } from "./otp-toast";

const UserContext = createContext(null);
const OTP_SESSION_KEY = "yourtube_otp_verified";

function markOtpVerified(uid) {
  sessionStorage.setItem(
    OTP_SESSION_KEY,
    JSON.stringify({ uid, exp: Date.now() + 24 * 60 * 60 * 1000 })
  );
}

function isOtpVerified(uid) {
  try {
    const raw = sessionStorage.getItem(OTP_SESSION_KEY);
    if (!raw) return false;
    const { uid: stored, exp } = JSON.parse(raw);
    return stored === uid && Date.now() < exp;
  } catch {
    return false;
  }
}

function clearOtpVerified() {
  sessionStorage.removeItem(OTP_SESSION_KEY);
}

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
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpMeta, setOtpMeta] = useState(null);
  const [otpFirebaseUser, setOtpFirebaseUser] = useState(null);
  const otpPromptedRef = useRef(false);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    clearOtpVerified();
    setOtpOpen(false);
    setOtpMeta(null);
    setOtpFirebaseUser(null);
    otpPromptedRef.current = false;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const completeLogin = async (firebaseUser) => {
    const dbUser = await syncUserWithBackend(firebaseUser);
    login(dbUser);
    return dbUser;
  };

  const startOtpFlow = async (firebaseUser) => {
    otpPromptedRef.current = true;
    try {
      const token = await firebaseUser.getIdToken();
      const { data } = await api.post(
        "/user/request-otp",
        {
          name: firebaseUser.displayName,
          image: firebaseUser.photoURL || "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOtpMeta(data);
      setOtpFirebaseUser(firebaseUser);
      setOtpOpen(true);
      if (data.devOtp) {
        showDevOtpToast(data.devOtp);
      } else if (data.deliveryNote) {
        toast.warning(data.deliveryNote);
      }
    } catch (error) {
      console.error("OTP flow error:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Could not reach API server. Is it running on port 5000?";
      toast.error(msg);
      await signOut(auth).catch(() => {});
      setOtpOpen(false);
      throw error;
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      if (isOtpVerified(result.user.uid)) {
        await completeLogin(result.user);
        return;
      }
      await startOtpFlow(result.user);
    } catch (error) {
      console.error(error);
      const code = error?.code || "";
      if (code === "auth/popup-closed-by-user") {
        return;
      }
      if (code === "auth/popup-blocked") {
        toast.error("Sign-in popup was blocked. Allow popups for this site.");
        return;
      }
      toast.error(error?.message || "Google sign-in failed");
    }
  };

  const handleOtpVerified = async () => {
    if (!otpFirebaseUser) return;
    markOtpVerified(otpFirebaseUser.uid);
    await completeLogin(otpFirebaseUser);
    setOtpFirebaseUser(null);
    setOtpMeta(null);
  };

  const handleOtpCancel = async () => {
    setOtpOpen(false);
    setOtpMeta(null);
    setOtpFirebaseUser(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (isOtpVerified(firebaseUser.uid)) {
          try {
            await completeLogin(firebaseUser);
          } catch (error) {
            console.error(error);
            await logout();
          }
        } else if (!otpPromptedRef.current && !otpOpen) {
          otpPromptedRef.current = true;
          try {
            await startOtpFlow(firebaseUser);
          } catch (error) {
            console.error(error);
            await signOut(auth);
          }
        }
      } else {
        setUser(null);
        localStorage.removeItem("user");
        otpPromptedRef.current = false;
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    if (!auth.currentUser) return null;
    const dbUser = await syncUserWithBackend(auth.currentUser);
    login(dbUser);
    return dbUser;
  };

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        refreshUser,
        authLoading,
      }}
    >
      {children}
      <OtpVerifyDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        meta={otpMeta}
        onVerified={handleOtpVerified}
        onCancel={handleOtpCancel}
      />
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
