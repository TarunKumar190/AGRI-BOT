import SidePanel from "./SidePanel";
import ChatShell from "./ChatShell";

export default function DashboardLayout() {
  return (
    <div className="dashboard">
      {/* LEFT */}
      <div className="dashboard-left">
        <SidePanel />
      </div>

      {/* RIGHT */}
      <div className="dashboard-right">
        <ChatShell />
      </div>
    </div>
  );
}
