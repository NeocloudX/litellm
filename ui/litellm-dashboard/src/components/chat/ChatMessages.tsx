"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coy } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Tooltip, Collapse } from "antd";
import { EditOutlined, CheckOutlined, CopyOutlined, ToolOutlined } from "@ant-design/icons";
import ReasoningContent from "@/components/chat_ui/ReasoningContent";
import MCPEventsDisplay from "@/components/chat_ui/MCPEventsDisplay";
import { ChatMessage } from "./types";

const { Panel } = Collapse;

const REDACTED_KEY_PATTERNS = /token|key|secret|password|auth/i;

function redactSensitiveValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACTED_KEY_PATTERNS.test(k)) {
      result[k] = "[redacted]";
    } else if (Array.isArray(v)) {
      result[k] = v.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? redactSensitiveValues(item as Record<string, unknown>)
          : item,
      );
    } else if (v !== null && typeof v === "object") {
      result[k] = redactSensitiveValues(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function MarkdownCodeRenderer({
  node,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"code"> & { node?: unknown }) {
  const match = /language-(\w+)/.exec(className || "");
  return match ? (
    <SyntaxHighlighter
      style={coy as Record<string, React.CSSProperties>}
      language={match[1]}
      PreTag="div"
      className="rounded-md my-2"
      {...(props as Record<string, unknown>)}
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  ) : (
    <code className={`${className ?? ""} px-1.5 py-0.5 rounded bg-muted text-sm font-mono`} {...props}>
      {children}
    </code>
  );
}

interface UserBubbleProps {
  message: ChatMessage;
  onEdit?: (messageId: string, newContent: string) => void;
  isStreaming?: boolean;
}

function UserBubble({ message, onEdit, isStreaming }: UserBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [editValue, editing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== message.content && onEdit) {
      onEdit(message.id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditValue(message.content);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{
          width: "72%",
          background: "#171c23",
          border: "1.5px solid #3ddc97",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 0 0 3px rgba(61,220,151,0.1)",
        }}>
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: 14,
              lineHeight: "1.6",
              color: "#e6edf3",
              fontFamily: "inherit",
              background: "transparent",
              boxSizing: "border-box",
              minHeight: 40,
            }}
          />
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "6px 10px 8px",
            borderTop: "1px solid #232a32",
          }}>
            <button
              onClick={() => { setEditValue(message.content); setEditing(false); }}
              style={{
                padding: "4px 12px", borderRadius: 6, border: "1px solid #232a32",
                background: "#12161b", color: "#e6edf3", fontSize: 13, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editValue.trim()}
              style={{
                padding: "4px 12px", borderRadius: 6, border: "none",
                background: editValue.trim() ? "#3ddc97" : "#232a32",
                color: editValue.trim() ? "#0a0c0f" : "#5b6670",
                fontSize: 13, fontWeight: 500, cursor: editValue.trim() ? "pointer" : "not-allowed",
              }}
            >
              Save &amp; Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-end w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-end gap-1.5 max-w-[72%]">
        {hovered && !isStreaming && onEdit && (
          <Tooltip title="Edit message">
            <button
              onClick={() => { setEditValue(message.content); setEditing(true); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "4px 6px", borderRadius: 5,
                color: "#5b6670", fontSize: 13, flexShrink: 0,
                display: "flex", alignItems: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8b98a5"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#5b6670"; }}
            >
              <EditOutlined />
            </button>
          </Tooltip>
        )}
        <div
          style={{
            backgroundColor: "#171c23",
            borderRadius: 16,
            padding: "10px 14px",
            fontSize: 14,
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#e6edf3",
          }}
        >
          {message.content}
        </div>
      </div>
      <span style={{ fontSize: 11, color: "#5b6670", marginTop: 4 }}>
        {formatTimestamp(message.timestamp)}
      </span>
    </div>
  );
}

interface AssistantBubbleProps {
  message: ChatMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
  isTypingIndicator: boolean;
  mcpEvents?: ChatMessage["mcpEvents"];
}

function AssistantBubble({ message, isLastMessage, isStreaming, isTypingIndicator, mcpEvents }: AssistantBubbleProps) {
  const [reasoningKey, setReasoningKey] = useState(0);
  const prevStreamingRef = useRef<boolean>(isStreaming);

  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      setReasoningKey((k) => k + 1);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const showReasoningPlaceholder = isLastMessage && isStreaming && !message.reasoningContent;
  const showReasoning = !!message.reasoningContent || showReasoningPlaceholder;

  if (isTypingIndicator) {
    return (
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-1 px-1 py-2.5">
          <TypingDots />
        </div>
      </div>
    );
  }

  let mainContent = message.content;
  let stoppedSuffix = false;
  if (mainContent.endsWith("[stopped]")) {
    mainContent = mainContent.slice(0, -"[stopped]".length);
    stoppedSuffix = true;
  }

  return (
    <div className="flex flex-col items-start max-w-[80%]">
      {showReasoning &&
        (showReasoningPlaceholder ? (
          <ThinkingPlaceholder />
        ) : (
          <ReasoningContent key={reasoningKey} reasoningContent={message.reasoningContent!} />
        ))}

      <div
        style={{
          fontSize: 14,
          lineHeight: "1.7",
          color: "#e6edf3",
          wordBreak: "break-word",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: MarkdownCodeRenderer as React.ComponentType<React.ComponentPropsWithoutRef<"code">>,
          }}
        >
          {mainContent}
        </ReactMarkdown>
        {stoppedSuffix && (
          <span style={{ color: "#5b6670", fontStyle: "italic" }}> [stopped]</span>
        )}
      </div>

      <CopyButton text={mainContent} />
      {mcpEvents && mcpEvents.length > 0 && (
        <div className="mt-2 max-w-full">
          <MCPEventsDisplay events={mcpEvents} />
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
      <Tooltip title={copied ? "Copied!" : "Copy"}>
        <button
          onClick={handleCopy}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: 5,
            color: copied ? "#3ddc97" : "#5b6670",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#8b98a5";
          }}
          onMouseLeave={(e) => {
            if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#5b6670";
          }}
        >
          {copied ? <CheckOutlined /> : <CopyOutlined />}
        </button>
      </Tooltip>
    </div>
  );
}

function ThinkingPlaceholder() {
  return (
    <>
      <style>{`
        @keyframes thinking-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .chat-thinking-text {
          animation: thinking-pulse 1.4s ease-in-out infinite;
        }
      `}</style>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          marginBottom: 8,
          backgroundColor: "#171c23",
          border: "1px solid #232a32",
          borderRadius: 8,
          fontSize: 12,
          color: "#8b98a5",
        }}
      >
        <span className="chat-thinking-text">Thinking...</span>
      </div>
    </>
  );
}

function TypingDots() {
  return (
    <>
      <style>{`
        @keyframes chat-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .chat-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #5b6670;
          animation: chat-typing-bounce 1.2s ease-in-out infinite;
        }
        .chat-dot:nth-child(2) { animation-delay: 0.2s; }
        .chat-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      <div className="chat-dot" />
      <div className="chat-dot" />
      <div className="chat-dot" />
    </>
  );
}

interface ToolCardProps {
  message: ChatMessage;
}

function ToolCard({ message }: ToolCardProps) {
  const redactedArgs = message.toolArgs ? redactSensitiveValues(message.toolArgs) : undefined;
  const [open, setOpen] = useState(false);

  return (
    <div style={{ maxWidth: "80%" }}>
      <Collapse
        size="small"
        style={{
          backgroundColor: "#171c23",
          border: "1px solid #232a32",
          borderRadius: 8,
        }}
      >
        <Panel
          header={
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <ToolOutlined style={{ color: "#8b98a5" }} />
              <span style={{ color: "#e6edf3", fontWeight: 500 }}>
                {message.toolName ?? "Tool call"}
              </span>
            </span>
          }
          key="tool"
        >
          {redactedArgs !== undefined && (
            <div style={{ marginBottom: message.toolResult ? 12 : 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#5b6670",
                  marginBottom: 4,
                }}
              >
                Arguments
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "8px 10px",
                  backgroundColor: "#0a0c0f",
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "#e6edf3",
                }}
              >
                {JSON.stringify(redactedArgs, null, 2)}
              </pre>
            </div>
          )}
          {message.toolResult && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#5b6670",
                  marginBottom: 4,
                }}
              >
                Result
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#e6edf3",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}
              >
                {message.toolResult}
              </div>
            </div>
          )}
        </Panel>
      </Collapse>
      <div style={{ fontSize: 11, color: "#5b6670", marginTop: 4 }}>
        {formatTimestamp(message.timestamp)}
      </div>
    </div>
  );
}

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

const ChatMessages: React.FC<Props> = ({ messages, isStreaming, onEditMessage }) => {
  const lastIndex = messages.length - 1;
  const lastMsg = messages[lastIndex] ?? null;
  const isTypingIndicator = isStreaming && lastMsg !== null && lastMsg.role === "assistant" && lastMsg.content === "";

  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg, idx) => {
        const isLastMessage = idx === lastIndex;

        if (msg.role === "user") {
          return <UserBubble key={msg.id} message={msg} onEdit={onEditMessage} isStreaming={isStreaming} />;
        }

        if (msg.role === "tool") {
          return <ToolCard key={msg.id} message={msg} />;
        }

        return (
          <AssistantBubble
            key={msg.id}
            message={msg}
            isLastMessage={isLastMessage}
            isStreaming={isStreaming}
            isTypingIndicator={isLastMessage && isTypingIndicator}
            mcpEvents={msg.mcpEvents}
          />
        );
      })}
    </div>
  );
};

export default ChatMessages;
