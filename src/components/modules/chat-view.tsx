"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { MessageCircle, Send, Search, Plus, File, SmilePlus, X, ChevronLeft, Paperclip, ImageIcon, Info, CornerUpLeft } from "lucide-react";
import { api, initials, formatFileSize } from "@/lib/utils/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";
import type { Member } from "@/types";

interface Reaction { id: string; emoji: string; memberId: string; member: { id: string; fullName: string }; }
interface ConvSummary {
  id: string; type: "DIRECT" | "GROUP"; name: string | null; avatarUrl: string | null; description: string | null;
  participants: { id: string; fullName: string; profilePhoto: string | null; course?: string }[];
  lastMessage: { id: string; content: string; type: string; senderId: string; senderName: string; createdAt: string } | null;
  unreadCount: number; updatedAt: string;
}
interface ChatMessage {
  id: string; conversationId: string; senderId: string; type: "TEXT" | "IMAGE" | "FILE" | "EMOJI";
  content: string; fileName: string | null; fileSize: number | null; deleted: boolean; createdAt: string;
  sender: { id: string; fullName: string; profilePhoto: string | null }; reactions: Reaction[];
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];
const EMOJIS = ["😀","😂","😍","🥰","😊","😎","🤔","😅","🙏","👍","👏","❤️","🔥","✨","🎉","😢","😭","🤣","😇","🥳","💪","🫂","🙌","👋","😔","😤","🤝","💯","🎶","🕊️","✝️","📖","🫶","💬","🌟","☀️"];

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  return (
    <div className="absolute bottom-14 left-0 z-50 bg-background border rounded-xl shadow-lg p-2 grid grid-cols-9 gap-1 w-72">
      {EMOJIS.map((e) => <button key={e} type="button" onClick={() => { onPick(e); onClose(); }} className="text-lg hover:bg-accent rounded p-0.5 transition-colors">{e}</button>)}
    </div>
  );
}

function ReactionBar({ reactions, myId, onReact }: { reactions: Reaction[]; myId: string; onReact: (e: string) => void }) {
  if (!reactions.length) return null;
  const grouped: Record<string, { count: number; mine: boolean; names: string[] }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false, names: [] };
    grouped[r.emoji].count++;
    grouped[r.emoji].names.push(r.member.fullName);
    if (r.memberId === myId) grouped[r.emoji].mine = true;
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, data]) => (
        <button key={emoji} onClick={() => onReact(emoji)} title={data.names.join(", ")}
          className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs border transition-colors ${data.mine ? "bg-primary/15 border-primary/40 text-primary" : "bg-muted border-border hover:bg-accent"}`}>
          <span>{emoji}</span><span className="font-medium">{data.count}</span>
        </button>
      ))}
    </div>
  );
}

function Bubble({ msg, isMe, myId, onReact, onReply }: { msg: ChatMessage; isMe: boolean; myId: string; onReact: (id: string, e: string) => void; onReply: (m: ChatMessage) => void }) {
  const [showQ, setShowQ] = useState(false);
  const isImage = msg.type === "IMAGE", isFile = msg.type === "FILE";
  return (
    <div className={`group flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`} onMouseEnter={() => setShowQ(true)} onMouseLeave={() => setShowQ(false)}>
      {!isMe && <Avatar className="h-6 w-6 shrink-0 mb-1">{msg.sender.profilePhoto && <AvatarImage src={msg.sender.profilePhoto} />}<AvatarFallback className="text-[9px] bg-primary/15 text-primary">{initials(msg.sender.fullName)}</AvatarFallback></Avatar>}
      <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && <span className="text-[10px] text-muted-foreground ml-1">{msg.sender.fullName}</span>}
        <div className="relative">
          {showQ && !msg.deleted && (
            <div className={`absolute -top-8 z-10 flex items-center gap-0.5 bg-background border rounded-full shadow-md px-1.5 py-1 ${isMe ? "right-0" : "left-0"}`}>
              {QUICK_REACTIONS.map((e) => <button key={e} onClick={() => onReact(msg.id, e)} className="text-base hover:scale-125 transition-transform px-0.5">{e}</button>)}
              <button onClick={() => onReply(msg)} className="ml-1 text-muted-foreground hover:text-foreground p-0.5"><CornerUpLeft className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <div className={`rounded-2xl px-3 py-2 text-sm break-words ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
            {msg.deleted ? <span className="italic opacity-60 text-xs">🚫 Message deleted</span>
              : isImage ? <a href={msg.content} target="_blank" rel="noopener noreferrer"><img src={msg.content} alt="img" className="rounded-lg max-w-full max-h-48 object-cover" /></a>
              : isFile ? <a href={msg.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80"><File className="h-4 w-4 shrink-0" /><div className="min-w-0"><p className="text-xs font-medium truncate">{msg.fileName ?? "File"}</p>{msg.fileSize && <p className="text-[10px] opacity-70">{formatFileSize(msg.fileSize)}</p>}</div></a>
              : <span className="whitespace-pre-wrap">{msg.content}</span>}
          </div>
        </div>
        <ReactionBar reactions={msg.reactions} myId={myId} onReact={(e) => onReact(msg.id, e)} />
        <span className="text-[10px] text-muted-foreground mx-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  );
}

function GroupInfoDialog({ conv, open, onClose, onUpdated, myId }: { conv: ConvSummary; open: boolean; onClose: () => void; onUpdated: (c: Partial<ConvSummary>) => void; myId: string }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"info" | "members">("info");
  const [name, setName] = useState(conv.name ?? "");
  const [description, setDescription] = useState(conv.description ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("profileImageUploader", { onUploadProgress: () => setUploadingAvatar(true) });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingAvatar(true);
    try {
      const result = await startUpload([file]);
      if (!result?.[0]) throw new Error("Upload failed");
      await api.patch(`/api/chat/conversations/${conv.id}`, { avatarUrl: result[0].ufsUrl });
      onUpdated({ avatarUrl: result[0].ufsUrl }); toast.success(t("chat.groupPhotoUpdated"));
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploadingAvatar(false); e.target.value = ""; }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/chat/conversations/${conv.id}`, { name: name.trim(), description: description.trim() });
      onUpdated({ name: name.trim(), description: description.trim() });
      toast.success(t("chat.groupUpdated")); onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Info className="h-4 w-4 text-primary" />{t("chat.groupInfo")}</DialogTitle><DialogDescription>{conv.name}</DialogDescription></DialogHeader>
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {(["info","members"] as const).map((tt) => <button key={tt} onClick={() => setTab(tt)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${tab===tt?"bg-background shadow-sm":"text-muted-foreground hover:text-foreground"}`}>{tt==="info"?t("chat.groupInfoTab"):`${t("chat.members")} (${conv.participants.length})`}</button>)}
        </div>
        {tab === "info" ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative cursor-pointer" onClick={() => avatarRef.current?.click()}>
                <Avatar className="h-20 w-20">{conv.avatarUrl && <AvatarImage src={conv.avatarUrl} />}<AvatarFallback className="bg-primary/15 text-primary text-2xl font-bold">{initials(conv.name ?? "G")}</AvatarFallback></Avatar>
                <button disabled={uploadingAvatar} className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow"><ImageIcon className="h-3 w-3" /></button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <p className="text-xs text-muted-foreground">{t("chat.tapToChangePhoto")}</p>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">{t("chat.groupName")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">{t("chat.groupDescription")}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t("chat.groupDescriptionPlaceholder")} className="text-sm resize-none" /></div>
          </div>
        ) : (
          <div className="space-y-2">
            {conv.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50">
                <Avatar className="h-9 w-9">{p.profilePhoto && <AvatarImage src={p.profilePhoto} />}<AvatarFallback className="text-[10px] bg-primary/15 text-primary">{initials(p.fullName)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{p.fullName}</p>{p.course && <p className="text-xs text-muted-foreground truncate">{p.course}</p>}</div>
                {p.id === myId && <Badge variant="secondary" className="text-[10px]">You</Badge>}
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          {tab === "info" && <Button onClick={save} disabled={saving || !name.trim()}>{saving ? t("common.saving") : t("common.save")}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewConvDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useI18n(); const { member: me } = useAuth();
  const [tab, setTab] = useState<"direct"|"group">("direct");
  const [search, setSearch] = useState(""); const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member[]>([]); const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState(""); const [groupAvatar, setGroupAvatar] = useState<string|null>(null);
  const [creating, setCreating] = useState(false); const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("profileImageUploader", { onUploadProgress: () => setUploadingAvatar(true) });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setUploadingAvatar(true);
    try { const r = await startUpload([file]); if (r?.[0]) setGroupAvatar(r[0].ufsUrl); }
    catch { toast.error("Photo upload failed"); } finally { setUploadingAvatar(false); e.target.value = ""; }
  };

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try { const d = await api.get<{ items: Member[] }>(`/api/members/search?q=${encodeURIComponent(search)}&limit=10`); setResults((d.items ?? []).filter((m) => m.id !== me?.id)); } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, me?.id]);

  const toggle = (m: Member) => { if (tab==="direct") setSelected([m]); else setSelected((s) => s.find((x)=>x.id===m.id)?s.filter((x)=>x.id!==m.id):[...s,m]); };

  const create = async () => {
    if (!selected.length) return; setCreating(true);
    try {
      const conv = await api.post<{ id: string }>("/api/chat/conversations", { type: tab==="direct"?"DIRECT":"GROUP", name: tab==="group"?groupName.trim():undefined, description: tab==="group"?groupDescription.trim()||undefined:undefined, avatarUrl: tab==="group"?groupAvatar||undefined:undefined, participantIds: selected.map((m)=>m.id) });
      onCreated(conv.id); onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setCreating(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o)=>!o&&onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />{t("chat.newConversation")}</DialogTitle></DialogHeader>
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {(["direct","group"] as const).map((tt)=><button key={tt} onClick={()=>{setTab(tt);setSelected([]);}} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${tab===tt?"bg-background shadow-sm":"text-muted-foreground hover:text-foreground"}`}>{tt==="direct"?t("chat.directMessage"):t("chat.groupChat")}</button>)}
        </div>
        {tab==="group" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative cursor-pointer" onClick={()=>avatarRef.current?.click()}>
                <Avatar className="h-14 w-14">{groupAvatar&&<AvatarImage src={groupAvatar}/>}<AvatarFallback className="bg-primary/15 text-primary text-xl">{groupName?initials(groupName):"G"}</AvatarFallback></Avatar>
                <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><ImageIcon className="h-2.5 w-2.5"/></div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
              </div>
              <div className="flex-1"><Input placeholder={t("chat.groupName")} value={groupName} onChange={(e)=>setGroupName(e.target.value)} className="text-sm"/></div>
            </div>
            <Textarea placeholder={t("chat.groupDescriptionPlaceholder")} value={groupDescription} onChange={(e)=>setGroupDescription(e.target.value)} rows={2} className="text-sm resize-none"/>
          </div>
        )}
        <Input placeholder={t("chat.searchMembers")} value={search} onChange={(e)=>setSearch(e.target.value)} className="text-sm"/>
        {selected.length>0&&<div className="flex flex-wrap gap-1">{selected.map((m)=><Badge key={m.id} variant="secondary" className="gap-1 text-xs">{m.fullName}<button onClick={()=>toggle(m)}><X className="h-3 w-3"/></button></Badge>)}</div>}
        <div className="max-h-44 overflow-y-auto space-y-1">
          {results.map((m)=>(
            <button key={m.id} onClick={()=>toggle(m)} className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${selected.find((x)=>x.id===m.id)?"bg-primary/10":"hover:bg-accent"}`}>
              <Avatar className="h-8 w-8">{m.profilePhoto&&<AvatarImage src={m.profilePhoto}/>}<AvatarFallback className="text-[10px] bg-primary/15 text-primary">{initials(m.fullName)}</AvatarFallback></Avatar>
              <div className="min-w-0"><p className="text-sm font-medium truncate">{m.fullName}</p><p className="text-xs text-muted-foreground truncate">{m.course}</p></div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>{t("common.cancel")}</Button>
          <Button onClick={create} disabled={creating||uploadingAvatar||!selected.length||(tab==="group"&&!groupName.trim())}>{creating?t("common.loading"):t("chat.startChat")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReplyPreview({ msg, onClear }: { msg: ChatMessage; onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-t text-xs">
      <CornerUpLeft className="h-3.5 w-3.5 text-primary shrink-0"/>
      <div className="flex-1 min-w-0"><span className="font-medium text-primary">{msg.sender.fullName}</span><span className="text-muted-foreground ml-1 truncate block">{msg.content.slice(0,60)}</span></div>
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground shrink-0"><X className="h-3.5 w-3.5"/></button>
    </div>
  );
}

export function ChatView() {
  const { t } = useI18n(); const { member: me } = useAuth();
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string|null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [convSearch, setConvSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage|null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find((c)=>c.id===activeId)??null;

  const loadConvs = useCallback(async () => {
    try { const d = await api.get<{ items: ConvSummary[] }>("/api/chat/conversations"); setConversations(d.items??[]); }
    catch { /* ignore */ } finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  const loadMsgs = useCallback(async (id: string, silent=false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const d = await api.get<{ items: ChatMessage[] }>(`/api/chat/messages?conversationId=${id}`);
      setMessages(d.items??[]);
      setConversations((prev)=>prev.map((c)=>c.id===id?{...c,unreadCount:0}:c));
    } catch { /* ignore */ } finally { setLoadingMsgs(false); }
  }, []);

  const selectConv = (id: string) => { setActiveId(id); setMessages([]); loadMsgs(id); setMobileThread(true); setReplyTo(null); };

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => { loadConvs(); if (activeId) loadMsgs(activeId, true); }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId, loadConvs, loadMsgs]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const sendMsg = async (content: string, type: ChatMessage["type"]="TEXT", fileName?: string, fileSize?: number) => {
    if (!activeId || !content.trim()) return;
    setSending(true);
    const finalContent = replyTo ? `↩ ${replyTo.sender.fullName}: "${replyTo.content.slice(0,60)}"\n\n${content}` : content;
    try {
      const msg = await api.post<ChatMessage>("/api/chat/messages", { conversationId: activeId, content: finalContent, type, fileName, fileSize });
      setMessages((prev)=>[...prev,msg]);
      setConversations((prev)=>prev.map((c)=>c.id===activeId?{...c,lastMessage:{id:msg.id,content:msg.content,type:msg.type,senderId:msg.senderId,senderName:msg.sender.fullName,createdAt:msg.createdAt},updatedAt:msg.createdAt}:c).sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()));
      setText(""); setReplyTo(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (err) { toast.error(err instanceof Error?err.message:t("chat.sendFailed")); }
    finally { setSending(false); }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try {
      await api.post("/api/chat/reactions", { messageId: msgId, emoji });
      setMessages((prev)=>prev.map((m)=>{
        if (m.id!==msgId) return m;
        const already = m.reactions.find((r)=>r.memberId===me?.id&&r.emoji===emoji);
        if (already) return { ...m, reactions: m.reactions.filter((r)=>!(r.memberId===me?.id&&r.emoji===emoji)) };
        return { ...m, reactions: [...m.reactions, { id:`tmp-${Date.now()}`, emoji, memberId: me?.id??"", member: { id: me?.id??"", fullName: me?.fullName??"You" } }] };
      }));
    } catch { /* ignore */ }
  };

  const { startUpload } = useUploadThing("documentUploader", { onUploadProgress: ()=>setUploading(true) });
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file||!activeId) return; setUploading(true);
    try {
      const result = await startUpload([file]); if (!result?.[0]) throw new Error("Upload failed");
      const { ufsUrl, name, size } = result[0];
      await sendMsg(ufsUrl, file.type.startsWith("image/")?"IMAGE":"FILE", name, size);
    } catch (err) { toast.error(err instanceof Error?err.message:t("chat.uploadFailed")); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const lastMsgPreview = (c: ConvSummary) => {
    if (!c.lastMessage) return t("chat.noMessages");
    const prefix = c.lastMessage.senderId===me?.id?`${t("chat.you")}: `:"";
    if (c.lastMessage.type==="IMAGE") return `${prefix}📷 ${t("chat.photo")}`;
    if (c.lastMessage.type==="FILE") return `${prefix}📎 ${t("chat.file")}`;
    return `${prefix}${c.lastMessage.content.slice(0,40)}`;
  };

  const filtered = conversations.filter((c)=>!convSearch||(c.name??"").toLowerCase().includes(convSearch.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden bg-background">
      {/* Sidebar */}
      <div className={`w-full sm:w-80 flex-shrink-0 border-r border-border flex flex-col ${mobileThread?"hidden sm:flex":"flex"}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary"/><h2 className="font-semibold text-sm">{t("chat.title")}</h2></div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={()=>setShowNew(true)}><Plus className="h-4 w-4"/></Button>
        </div>
        <div className="px-3 py-2 border-b">
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/><Input placeholder={t("chat.searchConversations")} value={convSearch} onChange={(e)=>setConvSearch(e.target.value)} className="pl-8 h-8 text-xs"/></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? <div className="p-3 space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-14 w-full rounded-lg"/>)}</div>
          : filtered.length===0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-2"/><p className="text-sm text-muted-foreground">{t("chat.noConversations")}</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={()=>setShowNew(true)}><Plus className="h-3.5 w-3.5"/>{t("chat.startFirst")}</Button>
            </div>
          ) : filtered.map((conv)=>(
            <button key={conv.id} onClick={()=>selectConv(conv.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 hover:bg-accent/50 ${activeId===conv.id?"bg-primary/5 border-l-2 border-l-primary":""}`}>
              <Avatar className="h-10 w-10 shrink-0">{conv.avatarUrl&&<AvatarImage src={conv.avatarUrl}/>}<AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">{initials(conv.name??"?")}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-semibold truncate">{conv.name??t("chat.unknown")}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{conv.lastMessage?new Date(conv.lastMessage.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}</span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">{lastMsgPreview(conv)}</p>
                  {conv.unreadCount>0&&<span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 shrink-0">{conv.unreadCount>99?"99+":conv.unreadCount}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 flex flex-col min-w-0 ${!mobileThread&&!activeId?"hidden sm:flex":"flex"}`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageCircle className="h-14 w-14 text-muted-foreground/20 mb-3"/>
            <p className="font-medium text-muted-foreground">{t("chat.selectConversation")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("chat.selectConversationDesc")}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={()=>setMobileThread(false)}><ChevronLeft className="h-4 w-4"/></Button>
              <Avatar className="h-9 w-9 cursor-pointer" onClick={()=>activeConv.type==="GROUP"&&setShowGroupInfo(true)}>{activeConv.avatarUrl&&<AvatarImage src={activeConv.avatarUrl}/>}<AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(activeConv.name??"?")}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1 cursor-pointer" onClick={()=>activeConv.type==="GROUP"&&setShowGroupInfo(true)}>
                <p className="font-semibold text-sm truncate">{activeConv.name}</p>
                <p className="text-xs text-muted-foreground">{activeConv.type==="GROUP"?`${activeConv.participants.length} ${t("chat.members")}`:t("chat.online")}</p>
              </div>
              {activeConv.type==="GROUP"&&<Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>setShowGroupInfo(true)}><Info className="h-4 w-4"/></Button>}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className={`h-10 w-48 rounded-2xl ${i%2?"ml-auto":""}`}/>)}</div>
              : messages.length===0 ? <div className="flex flex-col items-center justify-center h-full text-center"><MessageCircle className="h-10 w-10 text-muted-foreground/20 mb-2"/><p className="text-sm text-muted-foreground">{t("chat.noMessages")}</p></div>
              : messages.map((msg)=><Bubble key={msg.id} msg={msg} isMe={msg.senderId===me?.id} myId={me?.id??""} onReact={handleReact} onReply={(m)=>setReplyTo(m)}/>)}
              <div ref={bottomRef}/>
            </div>

            {/* Reply preview */}
            {replyTo && <ReplyPreview msg={replyTo} onClear={()=>setReplyTo(null)}/>}

            {/* Input bar — uses Textarea for paste/copy/cut/select support */}
            <div className="border-t p-3">
              <div className="relative flex items-end gap-2">
                {showEmoji&&<EmojiPicker onPick={(e)=>setText((v)=>v+e)} onClose={()=>setShowEmoji(false)}/>}
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground" onClick={()=>setShowEmoji((v)=>!v)}><SmilePlus className="h-4 w-4"/></Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground" onClick={()=>fileRef.current?.click()} disabled={uploading}><Paperclip className="h-4 w-4"/></Button>
                <Textarea
                  ref={textareaRef}
                  placeholder={t("chat.typeMessage")}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={(e)=>{ if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); if (text.trim()) sendMsg(text.trim()); } }}
                  rows={1}
                  className="flex-1 text-sm resize-none min-h-[36px] max-h-[120px] py-2 leading-relaxed"
                  disabled={sending||uploading}
                />
                <Button size="icon" className="h-9 w-9 shrink-0" disabled={sending||!text.trim()||uploading} onClick={()=>sendMsg(text.trim())}><Send className="h-4 w-4"/></Button>
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile}/>
            </div>
          </>
        )}
      </div>

      <NewConvDialog open={showNew} onClose={()=>setShowNew(false)} onCreated={(id)=>{ loadConvs(); selectConv(id); }}/>
      {activeConv&&activeConv.type==="GROUP"&&showGroupInfo&&(
        <GroupInfoDialog conv={activeConv} open={showGroupInfo} onClose={()=>setShowGroupInfo(false)} myId={me?.id??""} onUpdated={(updates)=>{ setConversations((prev)=>prev.map((c)=>c.id===activeConv.id?{...c,...updates}:c)); }}/>
      )}
    </div>
  );
}
