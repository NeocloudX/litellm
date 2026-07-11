"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Trash2, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import dayjs from "dayjs";
import { Conversation } from "./types";

interface Props {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

type DateGroup = "Recents" | "Yesterday" | "Last 7 Days" | "Older";

const getDateGroup = (timestamp: number): DateGroup => {
  const now = dayjs();
  const date = dayjs(timestamp);
  if (date.isSame(now, "day")) return "Recents";
  if (date.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
  if (date.isAfter(now.subtract(7, "day"))) return "Last 7 Days";
  return "Older";
};

const DATE_GROUP_ORDER: DateGroup[] = ["Recents", "Yesterday", "Last 7 Days", "Older"];

interface GroupedConversations {
  group: DateGroup;
  items: Conversation[];
}

const groupConversations = (conversations: Conversation[]): GroupedConversations[] => {
  const map = new Map<DateGroup, Conversation[]>();
  for (const conv of conversations) {
    const group = getDateGroup(conv.updatedAt);
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(conv);
  }
  return DATE_GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
    group: g,
    items: map.get(g)!,
  }));
};

interface ConversationRowProps {
  conv: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

const ConversationRow: React.FC<ConversationRowProps> = ({ conv, isActive, onSelect, onDelete, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conv.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(conv.title);
    setEditing(true);
  };

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conv.title) {
      onRename(conv.id, trimmed);
    }
    setEditing(false);
  };

  const cancelEditing = () => {
    setEditValue(conv.title);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const truncatedTitle = conv.title.length > 40 ? conv.title.slice(0, 40) + "\u2026" : conv.title;

  return (
    <div
      onClick={() => !editing && onSelect(conv.id)}
      className="conversation-row group"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 8px",
        borderRadius: 6,
        cursor: editing ? "default" : "pointer",
        backgroundColor: isActive ? "rgba(61,220,151,0.12)" : "transparent",
        transition: "background-color 0.15s",
        minHeight: 34,
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "#171c23";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
        }
      }}
    >
      {editing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          className="h-7 text-[13px] flex-1"
        />
      ) : (
        <>
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: isActive ? "#3ddc97" : "#e6edf3",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              fontWeight: isActive ? 500 : 400,
            }}
            title={conv.title}
          >
            {truncatedTitle}
          </Text>

          <div
            className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={startEditing} variant="ghost" size="icon-xs" className="text-muted-foreground">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Rename</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialog>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Delete</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(conv.id)}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  );
};

interface SearchModalProps {
  open: boolean;
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ open, conversations, onSelect, onClose }) => {
  const [query, setQuery] = useState("");
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setQuery("");
  }

  const filtered = query.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
    : conversations;

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={null}
      width={480}
      styles={{ body: { padding: "16px 16px 8px" } }}
    >
      <Input
        autoFocus
        prefix={<SearchOutlined style={{ color: "#5b6670" }} />}
        placeholder="Search conversations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />

      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#5b6670" }}>
            No conversations found
          </div>
        ) : (
          filtered.map((conv) => {
            const truncated =
              conv.title.length > 55 ? conv.title.slice(0, 55) + "…" : conv.title;
            return (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "background-color 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = "#171c23";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                }}
              >
                <MessageOutlined style={{ color: "#5b6670", flexShrink: 0 }} />
                <Text style={{ fontSize: 13 }}>{truncated}</Text>
                <Text
                  type="secondary"
                  style={{ fontSize: 11, marginLeft: "auto", flexShrink: 0 }}
                >
                  {dayjs(conv.updatedAt).format("MMM D")}
                </Text>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};

const ConversationList: React.FC<Props> = ({ conversations, activeConversationId, onSelect, onDelete, onRename }) => {
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setSearchModalOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  const grouped = groupConversations(conversations);

  return (
    <>
      <div className="flex flex-col h-full w-full overflow-hidden">
        <ScrollArea className="flex-1 h-0 px-1.5 pt-2">
          {grouped.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#5b6670",
                fontSize: 12,
                marginTop: 32,
                padding: "0 12px",
              }}
            >
              No conversations yet.
              <br />
              Start a new chat above
            </div>
          ) : (
            grouped.map(({ group, items }) => (
              <div key={group} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#5b6670",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "8px 8px 4px",
                  }}
                >
                  {group}
                </div>
                {items.map((conv) => (
                  <ConversationRow
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === activeConversationId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onRename={onRename}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Bottom: user avatar placeholder */}
        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid #232a32",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Avatar
            size={28}
            icon={<UserOutlined />}
            style={{ backgroundColor: "rgba(61,220,151,0.12)", color: "#3ddc97", flexShrink: 0 }}
          />
          <Text
            style={{
              fontSize: 13,
              color: "#8b98a5",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            My Account
          </Text>
        </div>
      </div>

      <SearchModal
        open={searchModalOpen}
        conversations={conversations}
        onSelect={onSelect}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
};

export default ConversationList;
