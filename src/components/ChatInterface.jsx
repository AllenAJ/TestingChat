import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Loader2, Plus, MessageSquare, Settings, Bot, 
  Menu, X, Trash2, Copy, CheckCheck, RotateCcw,
  ChevronUp, ChevronDown, AlertCircle, Sparkles, Zap, PenTool
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from './theme-toggler';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MODELS = [
  'Meta-Llama-3-1-8B-Instruct-FP8',
  'Meta-Llama-3-1-405B-Instruct-FP8',
  'Meta-Llama-3-2-3B-Instruct',
  'nvidia-Llama-3-1-Nemotron-70B-Instruct-HF'
];

const API_KEY = 'sk-i-D5uS--HwlLwUy3qTveNA';
const API_URL = 'https://chatapi.akash.network/api/v1/chat/completions';

// Local storage keys
const STORAGE_KEYS = {
  CHATS: 'akash-chats',
  MESSAGES: 'akash-messages',
  SETTINGS: 'akash-settings',
};

const MessageActions = ({ message, onCopy, onRegenerateResponse }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopy}
        >
          {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
        {message.role === 'assistant' && onRegenerateResponse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRegenerateResponse}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

const Message = ({ message, onRegenerateResponse }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`py-6 px-4 group relative ${isUser ? 'bg-background' : 'bg-accent/10'}`}>
      <div className="max-w-4xl mx-auto flex gap-4">
        <Avatar className="w-8 h-8 mt-1 shrink-0">
          <AvatarFallback className={isUser ? 'bg-primary' : 'bg-primary/10'}>
            {isUser ? 'ME' : 'AI'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 prose prose-sm dark:prose-invert max-w-none break-words">
          {message.content}
        </div>
        <MessageActions 
          message={message} 
          onRegenerateResponse={onRegenerateResponse}
        />
      </div>
    </div>
  );
};

const ErrorMessage = ({ error, onRetry }) => (
  <div className="max-w-4xl mx-auto p-4">
    <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
      <AlertCircle className="w-5 h-5" />
      <span className="text-sm">{error}</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="ml-auto"
        >
          Try again
        </Button>
      )}
    </div>
  </div>
);
const QuickAccessCard = ({ icon, title, subtitle, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="cursor-pointer"
    onClick={onClick}
  >
    <Card className="p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </Card>
  </motion.div>
);

const WelcomeScreen = ({ onSelect }) => {
  const quickActions = [
    {
      icon: <Sparkles className="w-4 h-4 text-primary" />,
      title: "Start New Chat",
      subtitle: "Begin a fresh conversation",
      action: "new-chat"
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-bold mb-2">Welcome to AkashChat</h1>
        <p className="text-muted-foreground">
          Ready to assist you with anything you need, from answering questions to providing recommendations.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {quickActions.map((action, index) => (
          <QuickAccessCard
            key={index}
            icon={action.icon}
            title={action.title}
            subtitle={action.subtitle}
            onClick={() => onSelect(action.action)}
          />
        ))}
      </div>
    </div>
  );
};

const ChatInterface = () => {
  // State management
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHATS);
    return saved ? JSON.parse(saved) : [{ 
      id: '1', 
      title: 'New conversation',
      createdAt: new Date().toISOString()
    }];
  });
  
  const [activeChat, setActiveChat] = useState('1');
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return saved ? JSON.parse(saved) : {};
  });
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : {
      model: MODELS[0],
      temperature: 0.7,
    };
  });
  const [collapsedChats, setCollapsedChats] = useState(new Set());



  const messagesEndRef = useRef(null);
  const textAreaRef = useRef(null);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    const savedCollapsed = localStorage.getItem('akash-collapsed-chats');
    if (savedCollapsed) {
      setCollapsedChats(new Set(JSON.parse(savedCollapsed)));
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('akash-collapsed-chats', 
      JSON.stringify(Array.from(collapsedChats))
    );
  }, [collapsedChats]);

  const getCurrentMessages = useCallback(() => {
    return messages[activeChat] || [];
  }, [messages, activeChat]);

  const handleNewChat = () => {
    const newChatId = Date.now().toString();
    setChats(prev => [
      {
        id: newChatId,
        title: 'New conversation',
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
    setActiveChat(newChatId);
    setInputText('');
    setError(null);
  };

  const handleDeleteChat = (chatId) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    setMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[chatId];
      return newMessages;
    });
    
    if (activeChat === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        setActiveChat(remainingChats[0].id);
      } else {
        handleNewChat();
      }
    }
  };
  const toggleChatCollapse = (chatId) => {
    setCollapsedChats(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  };
  const updateChatTitle = (chatId, message) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId && chat.title === 'New conversation') {
        const title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        return { ...chat, title };
      }
      return chat;
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputText.trim() };
    setInputText('');
    setError(null);

    const currentMessages = getCurrentMessages();
    const newMessages = [...currentMessages, userMessage];
    
    setMessages(prev => ({
      ...prev,
      [activeChat]: newMessages
    }));

    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [userMessage],
          max_tokens: 2000,
          temperature: settings.temperature,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message) {
        throw new Error('Invalid API response format');
      }

      const aiMessage = {
        role: 'assistant',
        content: data.choices[0].message.content
      };

      setMessages(prev => ({
        ...prev,
        [activeChat]: [...newMessages, aiMessage]
      }));

      // Update chat title if it's the first message
      if (currentMessages.length === 0) {
        updateChatTitle(activeChat, userMessage);
      }
    } catch (error) {
      setError(error.message);
      // Remove the user message if the API call fails
      setMessages(prev => ({
        ...prev,
        [activeChat]: currentMessages
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateResponse = async () => {
    const currentMessages = getCurrentMessages();
    if (currentMessages.length === 0) return;

    // Remove the last assistant message if it exists
    const messages = currentMessages.filter(m => m.role !== 'assistant');
    const lastUserMessage = messages[messages.length - 1];

    if (lastUserMessage) {
      setMessages(prev => ({
        ...prev,
        [activeChat]: messages
      }));
      setError(null);
      
      // Simulate user typing the last message again
      setInputText(lastUserMessage.content);
      await handleSubmit();
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-background to-background/80 dark:from-background dark:to-background/50">
      {/* Sidebar - keeping existing sidebar code but updating styles */}
      <div 
        className={`
          fixed md:static inset-y-0 left-0 z-20 
          w-72 bg-card/50 backdrop-blur-lg border-r 
          transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Existing sidebar content with updated styling */}
        <div className="h-full p-4 flex flex-col">
          <Button
            className="flex gap-2 mb-4 w-full bg-primary/10 hover:bg-primary/20 text-primary"
            onClick={handleNewChat}
          >
            <Plus className="w-4 h-4" /> New chat
          </Button>

          <div className="flex-1 overflow-y-auto space-y-2">
          {chats.map((chat) => (
  <div key={chat.id} className="group">
    <button
      onClick={() => setActiveChat(chat.id)}
      className={`w-full text-left p-3 rounded-lg flex items-center gap-3 hover:bg-accent/50 transition-colors ${
        activeChat === chat.id ? 'bg-accent' : ''
      }`}
    >
      <MessageSquare className="w-4 h-4 shrink-0" />
      <span className="text-sm truncate flex-1">{chat.title}</span>
      {activeChat === chat.id && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              toggleChatCollapse(chat.id);
            }}
          >
            {collapsedChats.has(chat.id) ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronUp className="w-4 h-4" />
            }
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteChat(chat.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </button>
  </div>
))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="w-4 h-4" />
                  Model: {settings.model.split('-').slice(-2)[0]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {MODELS.map(model => (
                  <DropdownMenuItem
                    key={model}
                    onClick={() => setSettings(prev => ({ ...prev, model }))}
                  >
                    {model.split('-').slice(-4).join(' ')}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen relative">
        {/* Mobile Header */}
        <div className="md:hidden border-b bg-card/50 backdrop-blur-lg p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h1 className="font-semibold">AkashChat</h1>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {getCurrentMessages().length === 0 ? (
            <WelcomeScreen 
            onSelect={(action) => {
              switch (action) {
                case 'new-chat':
                  handleNewChat();
                  break;
                case 'quick-actions':
                  handleNewChat();
                  setInputText(quickActions[1].examples[Math.floor(Math.random() * quickActions[1].examples.length)]);
                  break;
                case 'writing':
                  handleNewChat();
                  setMessages(prev => ({
                    ...prev,
                    [activeChat]: [
                      { role: 'system', content: 'I am a writing assistant ready to help you create high-quality content.' }
                    ]
                  }));
                  break;
              }
              }}
            />
          ) : (
            <>
              {getCurrentMessages().map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Message
                    message={message}
                    onRegenerateResponse={
                      index === getCurrentMessages().length - 1 && message.role === 'assistant'
                        ? handleRegenerateResponse
                        : undefined
                    }
                  />
                </motion.div>
              ))}
            </>
          )}
          
          {error && <ErrorMessage error={error} onRetry={handleRegenerateResponse} />}
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-6 px-4 bg-accent/10"
            >
              <div className="max-w-4xl mx-auto flex gap-4">
                <Avatar>
                  <AvatarFallback className="bg-primary/10">AI</AvatarFallback>
                </Avatar>
                <div className="flex gap-2 items-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating response...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-card/50 backdrop-blur-lg">
          <div className="max-w-4xl mx-auto p-4">
            {/* Temperature slider with updated design */}
            <div className="flex items-center gap-4 mb-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 bg-accent/50 p-2 rounded-lg">
                      <span className="text-sm text-muted-foreground">Temperature:</span>
                      <div className="w-32 h-2 bg-accent rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${settings.temperature * 100}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.temperature}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          temperature: parseFloat(e.target.value)
                        }))}
                        className="w-24"
                      />
                      <span className="text-sm font-medium min-w-[2rem]">
                        {settings.temperature}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adjust response creativity</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Message Input with updated design */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <div className="relative flex items-end gap-2">
                <textarea
                  ref={textAreaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Ask anything..."
                  className="flex-1 resize-none rounded-xl border bg-background/50 backdrop-blur-sm p-3 pr-12 focus-visible:ring-1 focus-visible:ring-primary min-h-[56px]"
                  disabled={isLoading}
                  rows={1}
                />
                <Button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  size="icon"
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                <kbd className="px-2 py-1 rounded bg-muted text-xs">↵ Enter</kbd> to send,{' '}
                <kbd className="px-2 py-1 rounded bg-muted text-xs">Shift + ↵</kbd> for new line
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};


// Custom hook for managing persistent state
const usePersistentState = (key, initialValue) => {
const [state, setState] = useState(() => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : initialValue;
});

useEffect(() => {
  localStorage.setItem(key, JSON.stringify(state));
}, [key, state]);

return [state, setState];
};

// Utility functions
const formatDate = (dateString) => {
const date = new Date(dateString);
return new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
}).format(date);
};

const truncateText = (text, maxLength) => {
if (text.length <= maxLength) return text;
return text.slice(0, maxLength - 3) + '...';
};

// Add command palette for quick actions
const CommandPalette = () => {
// Implementation for command palette
return null;
};

export default ChatInterface;