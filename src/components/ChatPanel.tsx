
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoom } from "@/contexts/RoomContext";
import { useAuth } from "@/contexts/AuthContext";
import { Send, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

const ChatPanel = () => {
  const { chatMessages, sendChatMessage } = useRoom();
  const { user, isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If user is not authenticated, show signup prompt
    if (!isAuthenticated) {
      setShowSignupPrompt(true);
      return;
    }
    
    if (message.trim() && user) {
      sendChatMessage(message.trim());
      setMessage("");
      // Focus back on the input field after sending
      inputRef.current?.focus();
    }
  };

  const handleInputFocus = () => {
    if (!isAuthenticated) {
      setShowSignupPrompt(true);
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
    <>
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
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={isAuthenticated ? "Type a message..." : "Sign up to chat..."}
            className="flex-1 bg-background text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (message.trim() || !isAuthenticated) {
                  handleSendMessage(e);
                }
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() && isAuthenticated}
            className="bg-study-600 hover:bg-study-700"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>

      {/* Signup Prompt Dialog */}
      <Dialog open={showSignupPrompt} onOpenChange={setShowSignupPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join the conversation</DialogTitle>
            <DialogDescription>
              Create an account to participate in chat and gain access to more features.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-muted/50 p-4 rounded-lg border">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary/20 text-primary rounded-full p-2">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-medium">Why sign up?</h3>
              </div>
              <ul className="text-sm space-y-2 ml-9">
                <li>• Send and receive messages in study rooms</li>
                <li>• Create private study rooms</li>
                <li>• Schedule study sessions</li>
                <li>• Track your study progress</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-center gap-2 flex flex-col sm:flex-row">
            <Button asChild className="sm:min-w-32">
              <Link to="/signup">Sign Up</Link>
            </Button>
            <Button asChild variant="outline" className="sm:min-w-32">
              <Link to="/login">Log In</Link>
            </Button>
            <Button variant="ghost" onClick={() => setShowSignupPrompt(false)}>
              Continue as Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatPanel;
