import {
  Home,
  Clock,
  ThumbsUp,
  History,
  User,
  Video,
  Download,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

type SidebarNavProps = {
  onNavigate?: () => void;
};

const SidebarNav = ({ onNavigate }: SidebarNavProps) => {
  const { user } = useUser();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  return (
    <>
      <nav className="space-y-1">
        <Link href="/" onClick={onNavigate}>
          <Button variant="ghost" className="w-full justify-start">
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>

        {user && (
          <div className="border-t pt-2 mt-2">
            <Link href="/call" onClick={onNavigate}>
              <Button variant="ghost" className="w-full justify-start">
                <Video className="w-5 h-5 mr-3" />
                Video call
              </Button>
            </Link>
            <Link href="/history" onClick={onNavigate}>
              <Button variant="ghost" className="w-full justify-start">
                <History className="w-5 h-5 mr-3" />
                History
              </Button>
            </Link>
            <Link href="/liked" onClick={onNavigate}>
              <Button variant="ghost" className="w-full justify-start">
                <ThumbsUp className="w-5 h-5 mr-3" />
                Liked videos
              </Button>
            </Link>
            <Link href="/watch-later" onClick={onNavigate}>
              <Button variant="ghost" className="w-full justify-start">
                <Clock className="w-5 h-5 mr-3" />
                Watch later
              </Button>
            </Link>
            <Link href="/downloads" onClick={onNavigate}>
              <Button variant="ghost" className="w-full justify-start">
                <Download className="w-5 h-5 mr-3" />
                Downloads
              </Button>
            </Link>
            {user?.channelname ? (
              <Link href={`/channel/${user._id}`} onClick={onNavigate}>
                <Button variant="ghost" className="w-full justify-start">
                  <User className="w-5 h-5 mr-3" />
                  Your channel
                </Button>
              </Link>
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
          </div>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </>
  );
};

export default SidebarNav;
