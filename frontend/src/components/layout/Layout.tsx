import { Outlet, useLocation, useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import RightPanel from "./RightPanel";
import BottomTabBar from "./BottomTabBar";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function Layout() {
  const location = useLocation();
  const params = useParams();
  useWebSocket();

  const showRightPanel = location.pathname.startsWith("/match/") && !!params.id;

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>
      {showRightPanel && (
        <aside className="hidden w-[280px] shrink-0 border-l border-[var(--border)] p-3 lg:block">
          <RightPanel />
        </aside>
      )}
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  );
}
