import { Bell, Crown, Menu, Mic, Play, Search, User, VideoIcon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import PremiumUpgradeDialog from "./PremiumUpgradeDialog";
import WatchUpgradeDialog from "./WatchUpgradeDialog";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { isPremiumActive } from "@/lib/premium";
import { getEffectiveWatchTier, watchTierLabel } from "@/lib/watch";
import { useTheme } from "@/lib/ThemeContext";

const Header = () => {
  const { user, logout, handlegooglesignin } = useUser();
  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [watchUpgradeOpen, setWatchUpgradeOpen] = useState(false);
  const router = useRouter();
  const premiumActive = isPremiumActive(user);
  const watchTier = getEffectiveWatchTier(user);
  const { theme, appearance } = useTheme();
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Menu className="w-6 h-6" />
        </Button>
        <Link href="/" className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-xl font-medium">YourTube</span>
          <span className="text-xs text-gray-400 ml-1">IN</span>
          {appearance && (
            <span
              className="text-[10px] ml-2 px-1.5 py-0.5 rounded-full border border-border text-muted-foreground hidden lg:inline"
              title={`IST ${appearance.istHour}:00 · ${appearance.region}`}
            >
              {theme === "light" ? "Light" : "Dark"} · {appearance.region}
            </span>
          )}
        </Link>
      </div>
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 flex-1 max-w-2xl mx-4"
      >
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyPress={handleKeypress}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border-r-0 focus-visible:ring-0"
          />
          <Button
            type="submit"
            className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Mic className="w-5 h-5" />
        </Button>
      </form>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/call" title="Video call with friends">
                <VideoIcon className="w-6 h-6" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-red-700 hover:text-red-800 hidden md:flex"
              onClick={() => setWatchUpgradeOpen(true)}
            >
              <Play className="w-4 h-4" />
              {watchTier === "free" ? "Upgrade plan" : watchTierLabel(watchTier)}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-amber-700 hover:text-amber-800 hidden sm:flex"
              onClick={() => setPremiumOpen(true)}
            >
              <Crown className="w-4 h-4" />
              {premiumActive ? "Premium" : "Get Premium"}
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="w-6 h-6" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/channel/${user?._id}`}>Your channel</Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setisdialogeopen(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/liked">Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watch-later">Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/downloads">Downloads</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWatchUpgradeOpen(true)}>
                  <Play className="w-4 h-4 mr-2 text-red-600" />
                  {watchTier === "free"
                    ? "Upgrade watch plan"
                    : `${watchTierLabel(watchTier)} plan`}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPremiumOpen(true)}>
                  <Crown className="w-4 h-4 mr-2 text-amber-600" />
                  {premiumActive ? "Manage Premium" : "Get Premium"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-red-700 hover:text-red-800 hidden sm:flex"
              onClick={() => setWatchUpgradeOpen(true)}
            >
              <Play className="w-4 h-4" />
              Upgrade plan
            </Button>
            <Button
              className="flex items-center gap-2"
              onClick={handlegooglesignin}
            >
              <User className="w-4 h-4" />
              Sign in
            </Button>
          </>
        )}{" "}
      </div>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
      <PremiumUpgradeDialog open={premiumOpen} onOpenChange={setPremiumOpen} />
      <WatchUpgradeDialog
        open={watchUpgradeOpen}
        onOpenChange={setWatchUpgradeOpen}
      />
    </header>
  );
};

export default Header;
