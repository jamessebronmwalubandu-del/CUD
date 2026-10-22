"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageCircle, Send, Search, Plus, File, SmilePlus,
  X, ChevronLeft, Paperclip,
} from "lucide-react";
import { api, initials, formatFileSize } from "@/lib/utils/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";
import type { Member } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ConvSummary {
  id: string; type: "DIRECT" | "GROUP";
  name: string | null; avatarUrl: string | null;
  participants: { id: string; fullName: string; profilePhoto: string | null }[];
  lastMessage: { id: string; content: string; type: string; senderId: string; senderName: string; createdAt: string } | null;
  unreadCount: number; updatedAt: string;
}

interface ChatMessage {
  id: string; conversationId: string; senderId: string;
  type: "TEXT" | "IMAGE" | "FILE" | "EMOJI";
  content: string; fileName: string | null; fileSize: number | null;
  deleted: boolean; createdAt: string;
  sender: { id: string; fullName: string; profilePhoto: string | null };
}

// ─── Emoji picker ─────────────────────────────────────────────────────────────
const EMOJIS = ["😀","😂","😍","🥰","😊","😎","🤔","😅","🙏","👍","👏","❤️","🔥","✨","🎉","😢","😭","🤣","😇","🥳","💪","🫂","🙌","👋","😔","😤","🤝","💯","🎶","🕊️","✝️","📖","🫶","💬","🌟","☀️"];

function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="absolute bottom-14 left-0 z-50 bg-background border rounded-xl shadow-lg p-2 grid grid-cols-9 gap-1 w-72">
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => onPick(e)}
          className="text-lg hover:bg-accent rounded p-0.5 transition-colors">{e}</button>
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  const isImage = msg.type === "IMAGE";
  const isFile = msg.type === "FILE";
  return (
    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      {!isMe && (
        <Avatar className="h-6 w-6 shrink-0 mb-1">
          {msg.sender.profilePhoto && <AvatarImage src={msg.sender.profilePhoto} />}
          <AvatarFallback className="text-[9px] bg-primary/15 text-primary">{initials(msg.sender.fullName)}</AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && <span className="text-[10px] text-muted-foreground ml-1">{msg.sender.fullName}</span>}
        <div className={`rounded-2xl px-3 py-2 text-sm break-words ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
          {msg.deleted ? (
            <span className="italic opacity-60 text-xs">🚫 Message deleted</span>
          ) : isImage ? (
            <a href={msg.content} target="_blank" rel="noopener noreferrer">
              <img src={msg.content} alt="img" className="rounded-lg max-w-full max-h-48 object-cover" />
            </a>
          ) : isFile ? (
            <a href={msg.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80">
              <File className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{msg.fileName ?? "File"}</p>
                {msg.fileSize && <p className="text-[10px] opacity-70">{formatFileSize(msg.fileSize)}</p>}
              </div>
            </a>
          ) : (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mx-1">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── New Conversation Dialog ───────────────────────────────────────────────────
function NewConvDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const { member: me } = useAuth();
  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const d = await api.get<{ items: Member[] }>(`/api/members/search?q=${encodeURIComponent(search)}&limit=10`);
        setResults((d.items ?? []).filter((m) => m.id !== me?.id));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, me?.id]);

  const toggle = (m: Member) => {
    if (tab === "direct") setSelected([m]);
    else setSelected((s) => s.find((x) => x.id === m.id) ? s.filter((x) => x.id !== m.id) : [...s, m]);
  };

  const create = async () => {
    if (selected.length === 0) return;
    setCreating(true);
    try {
      const conv = await api.post<{ id: string }>("/api/chat/conversations", {
        type: tab === "direct" ? "DIRECT" : "GROUP",
        name: tab === "group" ? groupName.trim() : undefined,
        participantIds: selected.map((m) => m.id),
      });
      onCreated(conv.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setCreating(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />{t("chat.newConversation")}</DialogTitle>
        </DialogHeader>
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {(["direct", "group"] as const).map((tt) => (
            <button key={tt} onClick={() => { setTab(tt); setSelected([]); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === tt ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tt === "direct" ? t("chat.directMessage") : t("chat.groupChat")}
            </button>
          ))}
        </div>
        {tab === "group" && (
          <Input placeholder={t("chat.groupName")} value={groupName} onChange={(e) => setGroupName(e.target.value)} className="text-sm" />
        )}
        <Input placeholder={t("chat.searchMembers")} value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm" />
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map((m) => (
              <Badge key={m.id} variant="secondary" className="gap-1 text-xs">
                {m.fullName}<button onClick={() => toggle(m)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        )}
        <div className="max-h-48 overflow-y-auto space-y-1">
          {results.map((m) => (
            <button key={m.id} onClick={() => toggle(m)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${selected.find((x) => x.id === m.id) ? "bg-primary/10" : "hover:bg-accent"}`}>
              <Avatar className="h-8 w-8">
                {m.profilePhoto && <AvatarImage src={m.profilePhoto} />}
                <AvatarFallback className="text-[10px] bg-primary/15 text-primary">{initials(m.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{m.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{m.course}</p>
              </div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>{t("common.cancel")}</Button>
          <Button onClick={create} disabled={creating || selected.length === 0 || (tab === "group" && !groupName.trim())}>
            {creating ? t("common.loading") : t("chat.startChat")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ChatView ────────────────────────────────────────────────────────────
export function ChatView() {
  const { t } = useI18n();
  const { member: me } = useAuth();
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [convSearch, setConvSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

  const loadConvs = useCallback(async () => {
    try {
      const d = await api.get<{ items: ConvSummary[] }>("/api/chat/conversations");
      setConversations(d.items ?? []);
    } catch { /* ignore */ } finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  const loadMsgs = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const d = await api.get<{ items: ChatMessage[] }>(`/api/chat/messages?conversationId=${id}`);
      setMessages(d.items ?? []);
      setConversations((prev) => prev.map((c) => c.id === id ? { ...c, unreadCount: 0 } : c));
    } catch { /* ignore */ } finally { setLoadingMsgs(false); }
  }, []);

  const selectConv = (id: string) => {
    setActiveId(id); setMessages([]); loadMsgs(id); setMobileThread(true);
  };

  // Polling every 3 seconds
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadConvs();
      if (activeId) loadMsgs(activeId, true);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId, loadConvs, loadMsgs]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMsg = async (content: string, type: ChatMessage["type"] = "TEXT", fileName?: string, fileSize?: number) => {
    if (!activeId || !content.trim()) return;
    setSending(true);
    try {
      const msg = await api.post<ChatMessage>("/api/chat/messages", { conversationId: activeId, content, type, fileName, fileSize });
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) => c.id === activeId
          ? { ...c, lastMessage: { id: msg.id, content: msg.content, type: msg.type, senderId: msg.senderId, senderName: msg.sender.fullName, createdAt: msg.createdAt }, updatedAt: msg.createdAt }
          : c
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
      setText("");
    } catch (err) { toast.error(err instanceof Error ? err.message : t("chat.sendFailed")); }
    finally { setSending(false); }
  };

  const { startUpload } = useUploadThing("documentUploader", { onUploadProgress: () => setUploading(true) });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    setUploading(true);
    try {
      const result = await startUpload([file]);
      if (!result?.[0]) throw new Error("Upload failed");
      const { ufsUrl, name, size } = result[0];
      await sendMsg(ufsUrl, file.type.startsWith("image/") ? "IMAGE" : "FILE", name, size);
    } catch (err) { toast.error(err instanceof Error ? err.message : t("chat.uploadFailed")); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const lastMsgPreview = (c: ConvSummary) => {
    if (!c.lastMessage) return t("chat.noMessages");
    const isMe = c.lastMessage.senderId === me?.id;
    const prefix = isMe ? `${t("chat.you")}: ` : "";
    if (c.lastMessage.type === "IMAGE") return `${prefix}📷 ${t("chat.photo")}`;
    if (c.lastMessage.type === "FILE") return `${prefix}📎 ${t("chat.file")}`;
    return `${prefix}${c.lastMessage.content.slice(0, 40)}`;
  };

  const filtered = conversations.filter((c) =>
    !convSearch || (c.name ?? "").toLowerCase().includes(convSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden bg-background">

      {/* ── Sidebar ── */}
      <div className={`w-full sm:w-80 flex-shrink-0 border-r border-border flex flex-col ${mobileThread ? "hidden sm:flex" : "flex"}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm">{t("chat.title")}</h2>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder={t("chat.searchConversations")} value={convSearch} onChange={(e) => setConvSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{t("chat.noConversations")}</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowNew(true)}>
                <Plus className="h-3.5 w-3.5" />{t("chat.startFirst")}
              </Button>
            </div>
          ) : (
            filtered.map((conv) => (
              <button key={conv.id} onClick={() => selectConv(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 hover:bg-accent/50 ${activeId === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                <Avatar className="h-10 w-10 shrink-0">
                  {conv.avatarUrl && <AvatarImage src={conv.avatarUrl} />}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">{initials(conv.name ?? "?")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold truncate">{conv.name ?? t("chat.unknown")}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{lastMsgPreview(conv)}</p>
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 shrink-0">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Thread panel ── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!mobileThread && !activeId ? "hidden sm:flex" : "flex"}`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageCircle className="h-14 w-14 text-muted-foreground/20 mb-3" />
            <p className="font-medium text-muted-foreground">{t("chat.selectConversation")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("chat.selectConversationDesc")}</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={() => setMobileThread(false)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-9 w-9">
                {activeConv.avatarUrl && <AvatarImage src={activeConv.avatarUrl} />}
                <AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(activeConv.name ?? "?")}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{activeConv.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeConv.type === "GROUP"
                    ? `${activeConv.participants.length} ${t("chat.members")}`
                    : t("chat.online")}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className={`h-10 w-48 rounded-2xl ${i % 2 ? "ml-auto" : ""}`} />)}</div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground">{t("chat.noMessages")}</p>
                </div>
              ) : (
                messages.map((msg) => <Bubble key={msg.id} msg={msg} isMe={msg.senderId === me?.id} />)
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="border-t p-3">
              <div className="relative flex items-end gap-2">
                {showEmoji && <EmojiPicker onPick={(e) => { setText((t) => t + e); setShowEmoji(false); }} />}
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowEmoji((v) => !v)}>
                  <SmilePlus className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder={t("chat.typeMessage")}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) sendMsg(text.trim()); } }}
                  className="flex-1 text-sm"
                  disabled={sending || uploading}
                />
                <Button size="icon" className="h-9 w-9 shrink-0" disabled={sending || !text.trim() || uploading}
                  onClick={() => sendMsg(text.trim())}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </>
        )}
      </div>

      <NewConvDialog open={showNew} onClose={() => setShowNew(false)} onCreated={(id) => { loadConvs(); selectConv(id); }} />
    </div>
  );
}
