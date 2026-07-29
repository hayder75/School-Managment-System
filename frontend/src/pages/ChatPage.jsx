import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/auth";
import { useConversations, useMessages, useCreateConversation, useTeachers, useMarkRead } from "../hooks/useChat";
import { getSocket, connectSocket, disconnectSocket } from "../lib/socket";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Send, MessageSquare, Plus } from "lucide-react";

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [selectedConv, setSelectedConv] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", teacher_id: "" });
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const { data: convsData } = useConversations();
  const { data: msgsData, refetch: refetchMsgs } = useMessages(selectedConv?.id);
  const { data: teachersData } = useTeachers();
  const createConv = useCreateConversation();
  const markRead = useMarkRead();

  const conversations = convsData?.data || [];
  const teachers = teachersData?.data || [];

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on("message:new", (msg) => {
      if (msg.conversation_id === selectedConv?.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("typing", ({ conversationId, userId: typingUserId }) => {
      if (typingUserId !== user?.id) {
        setTypingUsers((prev) => ({ ...prev, [conversationId]: true }));
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[conversationId];
            return next;
          });
        }, 3000);
      }
    });

    socket.on("typing:stopped", ({ conversationId }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    });

    return () => disconnectSocket();
  }, []);

  function handleTyping() {
    if (!selectedConv) return;
    const socket = getSocket();
    socket?.emit("typing:start", selectedConv.id);
  }

  useEffect(() => {
    if (msgsData?.data) setMessages(msgsData.data);
  }, [msgsData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConv) {
      markRead.mutate(selectedConv.id);
      const socket = getSocket();
      socket?.emit("join:conversation", selectedConv.id);
      return () => {
        socket?.emit("leave:conversation", selectedConv.id);
      };
    }
  }, [selectedConv?.id]);

  function handleSelectConv(conv) {
    setSelectedConv(conv);
    refetchMsgs();
  }

  function handleSend() {
    if (!message.trim() || !selectedConv) return;
    const socket = getSocket();
    socket?.emit("message:send", { conversationId: selectedConv.id, content: message });
    setMessage("");
  }

  async function handleCreateConv(e) {
    e.preventDefault();
    await createConv.mutateAsync({
      subject: form.subject || `Chat with ${teachers.find((t) => t.id === form.teacher_id)?.first_name || "Teacher"}`,
      participant_ids: [form.teacher_id],
    });
    setOpen(false);
    setForm({ subject: "", teacher_id: "" });
  }

  const otherParticipants = selectedConv
    ? conversations
        .filter((c) => c.id === selectedConv.id)
        .flatMap(() => [])
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      <div className="w-80 border rounded-lg flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Conversations</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateConv} className="space-y-4">
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject (optional)</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Start Conversation</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center p-4">No conversations yet</p>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConv(conv)}
              className={`w-full text-left p-3 rounded-md text-sm transition-colors ${
                selectedConv?.id === conv.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <p className="font-medium truncate">{conv.subject || "Conversation"}</p>
              <p className="text-xs opacity-70 truncate">
                {conv.last_message_at
                  ? new Date(conv.last_message_at).toLocaleDateString()
                  : "No messages"}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 border rounded-lg flex flex-col">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a conversation</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b">
              <h2 className="font-semibold">{selectedConv.subject || "Conversation"}</h2>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                      msg.sender_id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.sender_id !== user?.id && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.first_name} {msg.last_name}
                      </p>
                    )}
                    <p>{msg.content}</p>
                    <p className="text-xs mt-1 opacity-50">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {selectedConv && typingUsers[selectedConv.id] && (
                <p className="text-xs text-muted-foreground italic pl-2">Someone is typing...</p>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <Input
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
