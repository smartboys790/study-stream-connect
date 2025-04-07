
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoom } from "@/contexts/RoomContext";
import { useAuth } from "@/contexts/AuthContext";
import { Send } from "lucide-react";
import { format } from "date-fns";

const ChatPanel = () => {
  const { chatMessages, sendChatMessage } = useRoom();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && user) {
      sendChatMessage(message.trim());
      setMessage("");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const formatTime = (date: Date) => {
    return format(date, "h:mm a");
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border">
      <div className="p-3 border-b border-border">
        <h3 className="font-medium">Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage
                  src={`https://avatar.vercel.sh/${msg.senderId}?size=128`}
                  alt={msg.senderName}
                />
                <AvatarFallback>
                  {getInitials(msg.senderName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-sm truncate">
                    {msg.senderName}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="mt-1 text-sm">{msg.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-border flex gap-2"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-background text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim()}
          className="bg-study-600 hover:bg-study-700"
        >
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
};

export default ChatPanel;
