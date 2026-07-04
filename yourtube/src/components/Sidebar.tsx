import React from "react";
import SidebarNav from "./SidebarNav";
import { useSidebar } from "@/lib/SidebarContext";

const Sidebar = () => {
  const { isOpen, close } = useSidebar();

  return (
    <>
      <aside className="hidden md:block w-64 bg-background border-r border-border min-h-[calc(100vh-57px)] p-2 shrink-0">
        <SidebarNav />
      </aside>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={close}
          />
          <aside className="fixed top-[57px] left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-background border-r border-border p-2 overflow-y-auto md:hidden shadow-xl">
            <SidebarNav onNavigate={close} />
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
