import { useHealthReadinessDetails } from "@/app/(dashboard)/hooks/healthReadiness/useHealthReadinessDetails";
import { useDisableBouncingIcon } from "@/app/(dashboard)/hooks/useDisableBouncingIcon";
import { useDisableShowPrompts } from "@/app/(dashboard)/hooks/useDisableShowPrompts";
import { useWorker } from "@/hooks/useWorker";
import { getProxyBaseUrl } from "@/components/networking";
import { useTheme } from "@/contexts/ThemeContext";
import { clearTokenCookies } from "@/utils/cookieUtils";
import { clearStoredReturnUrl } from "@/utils/returnUrlUtils";
import useProxySettings from "@/app/(dashboard)/hooks/proxySettings/useProxySettings";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, Tag } from "antd";
import Link from "next/link";
import React from "react";
import { BlogDropdown } from "./Navbar/BlogDropdown/BlogDropdown";
import { CommunityEngagementButtons } from "./Navbar/CommunityEngagementButtons/CommunityEngagementButtons";
import { NAV_PRODUCT_LINK_CLASS } from "./Navbar/navProductLinkClass";
import { NotificationsBell } from "./Navbar/NotificationsBell/NotificationsBell";
import UserDropdown from "./Navbar/UserDropdown/UserDropdown";
import ViewSwitcher from "./Navbar/ViewSwitcher";
import WorkerDropdown from "./Navbar/WorkerDropdown/WorkerDropdown";

function NeoXMark({ size = 28 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size} style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="7" fill="#0a0c0f" />
      <rect x="1" y="1" width="30" height="30" rx="6" fill="none" stroke="#3ddc97" strokeOpacity="0.3" />
      <path d="M9.5 23V9h2.7l8.1 10.2V9H23v14h-2.7L12.2 12.8V23z" fill="#3ddc97" />
    </svg>
  );
}

interface NavbarProps {
  accessToken: string | null;
  isPublicPage: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  accessToken,
  isPublicPage = false,
  sidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const baseUrl = getProxyBaseUrl();
  const proxySettings = useProxySettings(accessToken);
  const { logoUrl } = useTheme();
  const { data: healthData } = useHealthReadinessDetails(accessToken);
  const version = healthData?.litellm_version;
  const disableBouncingIcon = useDisableBouncingIcon();
  const hideCommunityLinks = useDisableShowPrompts();
  const { isControlPlane, selectedWorker } = useWorker();
  const showWorkerSwitch = isControlPlane && selectedWorker !== null;

  const imageUrl = logoUrl || `${baseUrl}/get_image`;

  const handleLogout = () => {
    clearTokenCookies();
    localStorage.removeItem("litellm_selected_worker_id");
    localStorage.removeItem("litellm_worker_url");
    window.location.href = proxySettings.PROXY_LOGOUT_URL || "";
  };

  const handleWorkerSwitch = (workerId: string) => {
    clearTokenCookies();
    clearStoredReturnUrl();
    localStorage.removeItem("litellm_selected_worker_id");
    localStorage.removeItem("litellm_worker_url");
    window.location.href = `/ui/login?worker=${encodeURIComponent(workerId)}`;
  };

  return (
    <>
    <style>{`
      .neox-nav-right .ant-btn-text,
      .neox-nav-right .ant-btn-text:hover,
      .neox-nav-right .ant-typography {
        color: #8b98a5 !important;
      }
      .neox-nav-right .ant-btn-text:hover {
        background: #171c23 !important;
        color: #e6edf3 !important;
      }
      .neox-nav-right .anticon {
        color: #8b98a5 !important;
      }
      .neox-nav-right .ant-dropdown-trigger:hover .anticon,
      .neox-nav-right .ant-dropdown-trigger:hover .ant-typography {
        color: #e6edf3 !important;
      }
    `}</style>
    <nav style={{ background: "#12161b", borderBottom: "1px solid #232a32" }} className="sticky top-0 z-10">
      <div className="w-full">
        <div className="flex h-14 items-center px-4">
          <div className="flex shrink-0 items-center">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                style={{ color: "#8b98a5" }}
                className="flex items-center justify-center w-10 h-10 mr-2 rounded transition-colors hover:opacity-80"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <span className="text-lg">{sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <Link href={baseUrl ? baseUrl : "/"} className="flex items-center gap-2 no-underline">
                <NeoXMark size={28} />
                <span style={{ color: "#e6edf3", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>
                  NeoX Gateway
                </span>
              </Link>
              {version && (
                <Tag style={{ background: "#171c23", border: "1px solid #232a32", color: "#5b6670", fontSize: 11 }}>
                  <a
                    href="https://docs.litellm.ai/release_notes"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit" }}
                  >
                    v{version}
                  </a>
                </Tag>
              )}
            </div>
          </div>

          {!isPublicPage && (
            <div className="ml-4 flex shrink-0 items-center border-l border-gray-800 pl-4">
              <ViewSwitcher />
            </div>
          )}

          <div className="neox-nav-right flex items-center space-x-4 ml-auto">
            {showWorkerSwitch && (
              <div className="flex shrink-0 items-center">
                <WorkerDropdown onWorkerSwitch={handleWorkerSwitch} />
              </div>
            )}
            {!hideCommunityLinks && <CommunityEngagementButtons />}
            <Button
              type="text"
              href="https://docs.litellm.ai/docs/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#8b98a5" }}
            >
              Docs
            </Button>
            <BlogDropdown />
            {!isPublicPage && (
              <div className="flex items-center gap-0.5">
                <NotificationsBell />
                <UserDropdown onLogout={handleLogout} />
              </div>
            )}
          </div>
          {/* Dark mode toggle: keep disabled until the dashboard supports dark styles end-to-end. */}
        </div>
      </div>
    </nav>
    </>
  );
};

export default Navbar;
