import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import {
  useConversations, useMessages, useContacts, useStartDirect, useSendMessage, useMarkRead,
  useReportConversation, useChatReports, useResolveReport, useRestrictUser,
} from "../hooks/useChat";
import { getSocket, connectSocket, disconnectSocket } from "../lib/socket";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Send, MessageSquare, Plus, Search, Flag, ShieldAlert, Check } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

const MODERATORS = ["owner", "admin"];
const roleColor = {
  student: "bg-blue-100 text-blue-700",
  parent: "bg-purple-100 text-purple-700",
  teacher: "bg-emerald-100 text-emerald-700",
  admin: "bg-neutral-900 text-white",
  owner: "bg-neutral-900 text-white",
};

function initials(a, b) {
  return `${(a || "?")[0] || ""}${(b || "")[0] || ""}`.toUpperCase();
}
function displayName(conv, fallback) {
  const parts = conv?.participants || [];
  if (parts.length === 1) return `${parts[0].first_name || ""} ${parts[0].last_name || ""}`.trim();
  if (parts.length > 1) return `${parts[0].first_name || ""} +${parts.length - 1}`;
  return conv?.subject || fallback;
}
function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const isModerator = MODERATORS.includes(user?.role);

  const [selectedConv, setSelectedConv] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [convSearch, setConvSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [pane, setPane] = useState("chats"); // chats | reports

  const [newOpen, setNewOpen] = useState(false);
  const [contactFilter, setContactFilter] = useState("all");
  const [contactQ, setContactQ] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [restrictTarget, setRestrictTarget] = useState(null);

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const selectedConvRef = useRef(null);
  const userIdRef = useRef(user?.id);

  useEffect(() => { selectedConvRef.current = selectedConv; }, [selectedConv]);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  const { data: convsData } = useConversations();
  const { data: msgsData, refetch: refetchMsgs } = useMessages(selectedConv?.id);
  const { data: contactsData } = useContacts(newOpen ? { filter: contactFilter, q: contactQ } : {});
  const { data: reportsData } = useChatReports({}, isModerator);
  const startDirect = useStartDirect();
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();
  const reportConv = useReportConversation();
  const resolveReport = useResolveReport();
  const restrictUser = useRestrictUser();

  const conversations = convsData?.data || [];
  const contacts = contactsData?.data?.contacts || [];
  const contactFilters = contactsData?.data?.filters || ["all"];
  const reports = reportsData?.data || [];
  const openReports = reports.filter((r) => r.status === "open").length;

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    socket.on("message:new", (msg) => {
      if (msg.conversation_id === selectedConvRef.current?.id) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });
    socket.on("typing", ({ conversationId, userId: typingUserId }) => {
      if (typingUserId !== userIdRef.current) {
        setTypingUsers((prev) => ({ ...prev, [conversationId]: true }));
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => { const n = { ...prev }; delete n[conversationId]; return n; });
        }, 3000);
      }
    });
    socket.on("typing:stopped", ({ conversationId }) => {
      setTypingUsers((prev) => { const n = { ...prev }; delete n[conversationId]; return n; });
    });
    return () => disconnectSocket();
  }, [token]);

  useEffect(() => { if (msgsData?.data) setMessages(msgsData.data); }, [msgsData]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!selectedConv) return;
    markRead.mutate(selectedConv.id);
    const socket = getSocket();
    socket?.emit("join:conversation", selectedConv.id);
    return () => { socket?.emit("leave:conversation", selectedConv.id); };
  }, [selectedConv?.id]);

  function handleTyping() {
    if (!selectedConv) return;
    getSocket()?.emit("typing:start", selectedConv.id);
  }

  async function handleSend() {
    if (!message.trim() || !selectedConv) return;
    const content = message;
    const convId = selectedConv.id;
    setMessage("");
    // Keep typing feel but also guarantee the message persists + shows.
    getSocket()?.emit("typing:stop", convId);
    try {
      const res = await sendMessage.mutateAsync({ conversationId: convId, content });
      const msg = res.data || res;
      if (msg?.id) setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch {
      setMessage(content); // restore on failure
    }
  }

  async function pickContact(c) {
    try {
      const res = await startDirect.mutateAsync(c.id);
      const conv = res.data || res;
      setNewOpen(false);
      setContactQ("");
      setPane("chats");
      setSelectedConv(conv);
      refetchMsgs();
    } catch { /* handled by mutation */ }
  }

  async function submitReport() {
    if (!selectedConv) return;
    await reportConv.mutateAsync({ conversationId: selectedConv.id, reason: reportReason });
    setReportOpen(false);
    setReportReason("");
  }

  async function doRestrict(active) {
    if (!restrictTarget) return;
    await restrictUser.mutateAsync({ userId: restrictTarget.id, active, reason: "restricted from chat" });
    setRestrictTarget(null);
  }

  const filtered = conversations.filter((c) => {
    const unread = c.last_message_at && (!c.last_read_at || new Date(c.last_read_at) < new Date(c.last_message_at));
    if (filter === "unread" && !unread) return false;
    if (convSearch.trim()) {
      const name = displayName(c, t("Conversation")).toLowerCase();
      if (!name.includes(convSearch.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Left pane */}
      <div className="w-80 border rounded-lg flex flex-col min-w-0">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{pane === "reports" ? t("Reports") : t("Chats")}</h2>
            {isModerator && (
              <Button size="sm" variant={pane === "reports" ? "default" : "outline"} onClick={() => setPane(pane === "reports" ? "chats" : "reports")}>
                <ShieldAlert className="h-4 w-4 mr-1" /> {t("Reports")}{openReports > 0 && ` (${openReports})`}
              </Button>
            )}
          </div>

          {pane === "chats" ? (
            <>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder={t("Search chats...")} value={convSearch} onChange={(e) => setConvSearch(e.target.value)} />
                </div>
                <Dialog open={newOpen} onOpenChange={setNewOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" title={t("New chat")}><Plus className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{t("New chat")}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-8" autoFocus placeholder={t("Search people...")} value={contactQ} onChange={(e) => setContactQ(e.target.value)} />
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {contactFilters.map((f) => (
                          <button key={f} onClick={() => setContactFilter(f)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${contactFilter === f ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 hover:bg-muted"}`}>
                            {t(f)}
                          </button>
                        ))}
                      </div>
                      <div className="max-h-72 overflow-y-auto space-y-1">
                        {contacts.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">{t("No contacts found")}</p>}
                        {contacts.map((c) => (
                          <button key={c.id} onClick={() => pickContact(c)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left">
                            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${roleColor[c.role] || "bg-neutral-200"}`}>{initials(c.first_name, c.last_name)}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium truncate">{c.first_name} {c.last_name}</span>
                              <span className="block text-xs text-muted-foreground capitalize">{c.role}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex gap-2">
                {["all", "unread"].map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${filter === f ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 hover:bg-muted"}`}>
                    {t(f === "all" ? "All" : "Unread")}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("Reported conversations. Click to review and act.")}</p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {pane === "reports" ? (
            reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-4">{t("No reports")}</p>
            ) : reports.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.reporter_first_name} {r.reporter_last_name}</span>
                  <Badge variant={r.status === "open" ? "secondary" : "success"}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.reason || "—"}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 italic">{r.last_message_preview || r.subject || "—"}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedConv({ id: r.conversation_id, subject: r.subject, participants: r.participants || [] }); refetchMsgs(); }}>
                    {t("Open")}
                  </Button>
                  {r.status === "open" && (
                    <Button size="sm" onClick={() => resolveReport.mutate(r.id)}><Check className="h-3 w-3 mr-1" />{t("Resolve")}</Button>
                  )}
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center p-4">{t("No conversations yet")}</p>
          ) : filtered.map((conv) => {
            const unread = conv.last_message_at && (!conv.last_read_at || new Date(conv.last_read_at) < new Date(conv.last_message_at));
            const other = conv.participants?.[0];
            return (
              <button key={conv.id} onClick={() => { setPane("chats"); setSelectedConv(conv); }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${selectedConv?.id === conv.id ? "bg-muted" : "hover:bg-muted/60"}`}>
                <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${roleColor[other?.role] || "bg-neutral-200"}`}>
                  {initials(other?.first_name, other?.last_name)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{displayName(conv, t("Conversation"))}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{fmtTime(conv.last_message_at)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">{conv.last_message_preview || t("No messages")}</span>
                    {unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right pane */}
      <div className="flex-1 border rounded-lg flex flex-col min-w-0">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t("Select a conversation")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 border-b flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-semibold truncate">{displayName(selectedConv, t("Conversation"))}</h2>
                {selectedConv.participants?.[0] && (
                  <Badge className={`capitalize ${roleColor[selectedConv.participants[0].role] || ""}`}>{selectedConv.participants[0].role}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isModerator && selectedConv.participants?.map((p) => (
                  <Button key={p.id} size="sm" variant="outline" className="text-red-600" onClick={() => setRestrictTarget(p)}>
                    <ShieldAlert className="h-3.5 w-3.5 mr-1" />{t("Restrict")}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setReportOpen(true)}><Flag className="h-4 w-4 mr-1" />{t("Report")}</Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3 bg-muted/20">
              {messages.map((msg) => {
                const mine = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white border rounded-bl-sm"}`}>
                      {!mine && <p className="text-[11px] font-semibold mb-0.5 opacity-70">{msg.first_name} {msg.last_name}</p>}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {typingUsers[selectedConv.id] && <p className="text-xs text-muted-foreground italic pl-2">{t("Someone is typing...")}</p>}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <Input value={message} onChange={(e) => { setMessage(e.target.value); handleTyping(); }} placeholder={t("Type a message...")} className="flex-1" />
                <Button type="submit" disabled={!message.trim()}><Send className="h-4 w-4" /></Button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Report conversation")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>{t("Reason")}</Label>
            <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder={t("Describe the issue...")} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReportOpen(false)}>{t("Cancel")}</Button>
              <Button onClick={submitReport} disabled={reportConv.isPending}>{t("Submit report")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restrict dialog */}
      <Dialog open={!!restrictTarget} onOpenChange={(v) => { if (!v) setRestrictTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Restrict chat access")}</DialogTitle></DialogHeader>
          {restrictTarget && (
            <div className="space-y-4">
              <p className="text-sm">{restrictTarget.first_name} {restrictTarget.last_name} <span className="text-muted-foreground capitalize">({restrictTarget.role})</span></p>
              <p className="text-xs text-muted-foreground">{t("A restricted user cannot start new chats. You can lift this any time.")}</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRestrictTarget(null)}>{t("Cancel")}</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => doRestrict(true)} disabled={restrictUser.isPending}>{t("Restrict")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
