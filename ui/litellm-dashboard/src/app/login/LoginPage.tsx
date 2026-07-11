"use client";

import { useLogin } from "@/app/(dashboard)/hooks/login/useLogin";
import { useUIConfig } from "@/app/(dashboard)/hooks/uiConfig/useUIConfig";
import LoadingScreen from "@/components/common_components/LoadingScreen";
import { exchangeLoginCode, getProxyBaseUrl, switchToWorkerUrl } from "@/components/networking";
import { clearTokenCookies, getCookieFromDocument } from "@/utils/cookieUtils";
import { isJwtExpired } from "@/utils/jwtUtils";
import { consumeReturnUrl, getReturnUrl, isValidReturnUrl } from "@/utils/returnUrlUtils";
import { CloudServerOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Popover, Select, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWorker } from "@/hooks/useWorker";

// NeoX design tokens
const N = {
  canvas: "#0a0c0f",
  panel: "#12161b",
  panelHi: "#171c23",
  hairline: "#232a32",
  ink: "#e6edf3",
  muted: "#8b98a5",
  faint: "#5b6670",
  accent: "#3ddc97",
  accentDim: "#1f6f52",
};

function NeoXLogo({ size = 40 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size}>
      <rect width="32" height="32" rx="7" fill={N.canvas} />
      <rect x="1" y="1" width="30" height="30" rx="6" fill="none" stroke={N.accent} strokeOpacity="0.3" />
      <path d="M9.5 23V9h2.7l8.1 10.2V9H23v14h-2.7L12.2 12.8V23z" fill={N.accent} />
    </svg>
  );
}

function LoginPageContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { data: uiConfig, isLoading: isConfigLoading } = useUIConfig();
  const loginMutation = useLogin();
  const router = useRouter();
  const { workers, selectWorker } = useWorker();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // Pre-select worker from URL param (e.g. /ui/login?worker=team-b)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workerParam = params.get("worker");
    if (workerParam) {
      setSelectedWorkerId(workerParam);
    }
  }, []);

  useEffect(() => {
    if (isConfigLoading) {
      return;
    }

    // Check if admin UI is disabled
    if (uiConfig && uiConfig.admin_ui_disabled) {
      setIsLoading(false);
      return;
    }

    // Cross-origin SSO: worker redirected back with a single-use code.
    // Exchange it for the JWT via the worker's /v3/login/exchange endpoint.
    const params = new URLSearchParams(window.location.search);
    const rawSsoCode = params.get("code");
    // Validate the SSO code is a plausible OAuth authorization code (alphanumeric
    // plus common URL-safe chars) so that arbitrary user input cannot trigger the
    // exchange endpoint.
    const ssoCode = rawSsoCode && /^[a-zA-Z0-9._~+/=-]+$/.test(rawSsoCode) ? rawSsoCode : null;
    if (ssoCode) {
      const rawWorkerUrl = localStorage.getItem("litellm_worker_url");
      // Validate the stored worker URL: only allow http(s) URLs.
      const workerUrl = rawWorkerUrl && /^https?:\/\/.+/.test(rawWorkerUrl) ? rawWorkerUrl : null;
      exchangeLoginCode(ssoCode, workerUrl).then(() => {
        params.delete("code");
        const cleanSearch = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (cleanSearch ? `?${cleanSearch}` : ""));
        router.replace("/ui/?login=success");
      });
      return;
    }

    // If switching workers on a control plane, clear the old token and show login
    const switchingWorker = params.has("worker");
    if (switchingWorker && uiConfig?.is_control_plane) {
      clearTokenCookies();
      setIsLoading(false);
      return;
    }

    const rawToken = getCookieFromDocument("token");
    if (rawToken && !isJwtExpired(rawToken)) {
      // User already logged in - redirect to return URL or default
      const returnUrl = consumeReturnUrl();
      if (returnUrl) {
        router.replace(returnUrl);
      } else {
        router.replace("/ui");
      }
      return;
    }

    if (uiConfig && uiConfig.auto_redirect_to_sso) {
      // For SSO, pass the return URL to the SSO endpoint
      const returnUrl = getReturnUrl();
      let ssoUrl = `${getProxyBaseUrl()}/sso/key/generate`;
      if (returnUrl && isValidReturnUrl(returnUrl)) {
        ssoUrl += `?redirect_to=${encodeURIComponent(returnUrl)}`;
      }
      router.push(ssoUrl);
      return;
    }

    setIsLoading(false);
  }, [isConfigLoading, router, uiConfig]);

  const handleSubmit = () => {
    // If a worker is selected, point proxyBaseUrl at it before login
    const selectedWorker = workers.find((w) => w.worker_id === selectedWorkerId);
    if (selectedWorker) {
      switchToWorkerUrl(selectedWorker.url);
    }

    loginMutation.mutate(
      { username, password, useV3: !!selectedWorker },
      {
        onSuccess: (data) => {
          // Update the worker context with the selected worker
          if (selectedWorker) {
            selectWorker(selectedWorker.worker_id);
            // Stay on the CP's UI — proxyBaseUrl already points at the worker
            router.push("/ui/?login=success");
          } else {
            // Normal (non-control-plane) login — follow the server's redirect
            const returnUrl = consumeReturnUrl();
            if (returnUrl) {
              router.push(returnUrl);
            } else {
              router.push(data.redirect_url);
            }
          }
        },
        onError: () => {
          // Reset proxyBaseUrl on login failure
          if (selectedWorker) {
            switchToWorkerUrl(null);
          }
        },
      },
    );
  };

  const error = loginMutation.error instanceof Error ? loginMutation.error.message : null;
  const isLoginLoading = loginMutation.isPending;

  if (isConfigLoading || isLoading) {
    return <LoadingScreen />;
  }

  const gridBg = {
    backgroundImage: `
      linear-gradient(to right, rgba(255,255,255,0.018) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.018) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
  };

  const inputStyle: React.CSSProperties = {
    background: N.panelHi,
    border: `1px solid ${N.hairline}`,
    color: N.ink,
    borderRadius: 6,
  };

  const labelStyle: React.CSSProperties = {
    color: N.muted,
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };

  if (uiConfig && uiConfig.admin_ui_disabled) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: N.canvas, ...gridBg }}>
        <div style={{ background: N.panel, border: `1px solid ${N.hairline}`, borderRadius: 12, padding: "40px 44px", width: "100%", maxWidth: 440 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 28 }}>
            <NeoXLogo size={44} />
            <span style={{ color: N.muted, fontSize: 13 }}>NeoX LLM Gateway</span>
          </div>
          <Alert
            message="Admin UI Disabled"
            description={
              <span style={{ fontSize: 13, color: N.muted }}>
                Set <code style={{ background: N.panelHi, padding: "1px 5px", borderRadius: 4 }}>DISABLE_ADMIN_UI=False</code> to re-enable.
              </span>
            }
            type="warning"
            showIcon
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .neox-login .ant-input,
        .neox-login .ant-input-password,
        .neox-login .ant-input-affix-wrapper {
          background: ${N.panelHi} !important;
          border-color: ${N.hairline} !important;
          color: ${N.ink} !important;
          border-radius: 6px !important;
        }
        .neox-login .ant-input-affix-wrapper:hover,
        .neox-login .ant-input-affix-wrapper:focus,
        .neox-login .ant-input-affix-wrapper-focused {
          border-color: ${N.accent} !important;
          box-shadow: 0 0 0 2px ${N.accentDim}55 !important;
        }
        .neox-login .ant-input:focus,
        .neox-login .ant-input:hover {
          border-color: ${N.accent} !important;
          box-shadow: 0 0 0 2px ${N.accentDim}55 !important;
        }
        .neox-login .ant-input::placeholder,
        .neox-login .ant-input-affix-wrapper input::placeholder {
          color: ${N.faint} !important;
        }
        .neox-login .ant-input-password-icon,
        .neox-login .anticon-eye,
        .neox-login .anticon-eye-invisible {
          color: ${N.faint} !important;
        }
        .neox-login .ant-input-password-icon:hover,
        .neox-login .anticon-eye:hover {
          color: ${N.muted} !important;
        }
        .neox-login .ant-form-item-label > label {
          color: ${N.muted} !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          letter-spacing: 0.06em !important;
          text-transform: uppercase !important;
        }
        .neox-login .ant-form-item-explain-error {
          color: #f87171 !important;
          font-size: 12px !important;
        }
        .neox-login .ant-btn-primary {
          background: ${N.accent} !important;
          border-color: ${N.accent} !important;
          color: #0a0c0f !important;
          font-weight: 600 !important;
          letter-spacing: 0.03em !important;
          border-radius: 6px !important;
        }
        .neox-login .ant-btn-primary:hover:not(:disabled) {
          background: #56e8a8 !important;
          border-color: #56e8a8 !important;
        }
        .neox-login .ant-btn-primary:disabled {
          background: ${N.accentDim} !important;
          border-color: ${N.accentDim} !important;
          color: ${N.faint} !important;
          opacity: 0.6 !important;
        }
        .neox-login .ant-btn-default {
          background: ${N.panelHi} !important;
          border-color: ${N.hairline} !important;
          color: ${N.muted} !important;
          border-radius: 6px !important;
        }
        .neox-login .ant-btn-default:hover:not(:disabled) {
          border-color: ${N.accent} !important;
          color: ${N.accent} !important;
        }
        .neox-login .ant-btn-default:disabled {
          background: ${N.panelHi} !important;
          border-color: ${N.hairline} !important;
          color: ${N.faint} !important;
          opacity: 0.5 !important;
        }
        .neox-login .ant-select-selector {
          background: ${N.panelHi} !important;
          border-color: ${N.hairline} !important;
          color: ${N.ink} !important;
          border-radius: 6px !important;
        }
        .neox-login .ant-select-selection-placeholder {
          color: ${N.faint} !important;
        }
        .neox-login .ant-select-arrow {
          color: ${N.faint} !important;
        }
        .neox-login .ant-alert {
          background: ${N.panelHi} !important;
          border-color: ${N.hairline} !important;
          border-radius: 6px !important;
        }
        .neox-login .ant-alert-message,
        .neox-login .ant-alert-description {
          color: ${N.muted} !important;
        }
        .neox-login .ant-alert-error {
          border-color: #dc2626 !important;
        }
        .neox-login .ant-alert-error .ant-alert-message {
          color: #f87171 !important;
        }
        .neox-login .ant-form-item {
          margin-bottom: 18px !important;
        }
      `}</style>
      <div
        className="neox-login"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: N.canvas, ...gridBg }}
      >
        <div style={{ background: N.panel, border: `1px solid ${N.hairline}`, borderRadius: 12, padding: "40px 44px", width: "100%", maxWidth: 440, boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>

          {/* NeoX branding */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 36 }}>
            <NeoXLogo size={48} />
            <div style={{ textAlign: "center" }}>
              <div style={{ color: N.ink, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>NeoX LLM Gateway</div>
              <div style={{ color: N.faint, fontSize: 13, marginTop: 4 }}>Sign in to manage your inference stack</div>
            </div>
          </div>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}

          <Form onFinish={handleSubmit} layout="vertical" requiredMark={false}>
            {uiConfig?.is_control_plane && workers.length > 0 && (
              <Form.Item label="Worker" style={{ marginBottom: 18 }}>
                <Select
                  value={selectedWorkerId || undefined}
                  onChange={(value) => setSelectedWorkerId(value)}
                  placeholder="Choose a worker to connect to"
                  size="large"
                  suffixIcon={<CloudServerOutlined style={{ color: N.faint }} />}
                  options={workers.map((w) => ({
                    label: w.name,
                    value: w.worker_id,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item
              label="Username"
              name="username"
              rules={[{ required: true, message: "Please enter your username" }]}
            >
              <Input
                placeholder="Enter your username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoginLoading}
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Please enter your password" }]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoginLoading}
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 10 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoginLoading}
                disabled={isLoginLoading}
                block
                size="large"
              >
                {isLoginLoading ? "Signing in…" : "Sign in"}
              </Button>
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              {!uiConfig?.sso_configured ? (
                <Popover content={<span style={{ color: N.muted }}>SSO is not configured.</span>} trigger="hover">
                  <Button disabled block size="large">
                    Sign in with SSO
                  </Button>
                </Popover>
              ) : (
                <Button
                  disabled={isLoginLoading || (!!selectedWorkerId && workers.length === 0)}
                  onClick={() => {
                    const selectedWorker = workers.find((w) => w.worker_id === selectedWorkerId);
                    if (selectedWorker) {
                      localStorage.setItem("litellm_selected_worker_id", selectedWorkerId!);
                      switchToWorkerUrl(selectedWorker.url);
                    }
                    const ssoBase = selectedWorker?.url ?? getProxyBaseUrl();
                    const returnTo = encodeURIComponent(window.location.origin + "/ui/login");
                    router.push(`${ssoBase}/sso/key/generate?return_to=${returnTo}`);
                  }}
                  block
                  size="large"
                >
                  Sign in with SSO
                </Button>
              )}
            </Form.Item>
          </Form>

          {uiConfig?.sso_configured && (
            <div style={{ marginTop: 20, padding: "12px 14px", background: N.panelHi, border: `1px solid ${N.hairline}`, borderRadius: 6 }}>
              <Typography.Text style={{ color: N.faint, fontSize: 12 }}>
                SSO is enabled. Set{" "}
                <code style={{ background: N.canvas, padding: "1px 5px", borderRadius: 3, color: N.muted }}>
                  AUTO_REDIRECT_UI_LOGIN_TO_SSO=true
                </code>{" "}
                to auto-redirect.
              </Typography.Text>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
