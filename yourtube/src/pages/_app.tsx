import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { SidebarProvider } from "@/lib/SidebarContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <UserProvider>
        <SidebarProvider>
          <Head>
            <title>YourTube</title>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, viewport-fit=cover"
            />
          </Head>
          <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            <Header />
            <Toaster />
            <div className="flex min-w-0">
              <Sidebar />
              <div className="flex-1 min-w-0">
                <Component {...pageProps} />
              </div>
            </div>
          </div>
        </SidebarProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
