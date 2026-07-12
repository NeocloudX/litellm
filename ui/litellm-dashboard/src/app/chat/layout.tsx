"use client";

import { Suspense } from "react";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import Navbar from "@/components/navbar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatShellProvider } from "@/contexts/ChatShellContext";
import ChatShell from "@/components/chat/ChatShell";

// ChatShellProvider uses useSearchParams(), which requires a Suspense boundary for static export.
// NeoX: chat is always enabled — skip the enable_chat_ui gate.
function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const { accessToken, userRole, userId, userEmail, premiumUser } = useAuthorized();

  if (!accessToken) return null;

  return (
    <ThemeProvider accessToken={accessToken}>
      <div className="flex h-screen flex-col">
        <Navbar accessToken={accessToken} isPublicPage={false} />
        <div className="min-h-0 flex-1">
          <ChatShellProvider
            accessToken={accessToken ?? ""}
            userId={userId ?? ""}
            userEmail={userEmail ?? ""}
            userRole={userRole ?? ""}
            premiumUser={premiumUser ?? false}
          >
            <ChatShell>{children}</ChatShell>
          </ChatShellProvider>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <ChatLayoutContent>{children}</ChatLayoutContent>
    </Suspense>
  );
}
