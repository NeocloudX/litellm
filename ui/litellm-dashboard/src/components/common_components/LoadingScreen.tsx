import { cx } from "@/lib/cva.config";
import { UiLoadingSpinner } from "../ui/ui-loading-spinner";

export default function LoadingScreen() {
  return (
    <div className={cx("h-screen", "flex items-center justify-center gap-4")}>
      <div className="flex items-center gap-2 py-2 pr-4" style={{ borderRight: "1px solid #232a32" }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="22" height="22">
          <rect width="32" height="32" rx="7" fill="#0a0c0f" />
          <rect x="1" y="1" width="30" height="30" rx="6" fill="none" stroke="#3ddc97" strokeOpacity="0.3" />
          <path d="M9.5 23V9h2.7l8.1 10.2V9H23v14h-2.7L12.2 12.8V23z" fill="#3ddc97" />
        </svg>
        <span style={{ color: "#e6edf3", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>NeoX Gateway</span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <UiLoadingSpinner className="size-4" />
        <span style={{ color: "#8b98a5" }} className="text-sm">Loading...</span>
      </div>
    </div>
  );
}
