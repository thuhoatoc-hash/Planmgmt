
import React, { useState, useRef, useEffect } from 'react';
import { generateGeminiResponse } from '../services/gemini';
import { MessageSquare, X, Send, Loader2, Sparkles, Trash2, Minimize2, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface GeminiChatProps {
  contextData: any; // Dữ liệu toàn bộ App để AI phân tích
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const GeminiChat: React.FC<GeminiChatProps> = ({ contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Xin chào! Tôi là trợ lý ảo Gemini. Tôi có thể giúp gì cho bạn về dữ liệu dự án, hợp đồng hay nhân sự hôm nay?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Chuẩn bị lịch sử chat để gửi kèm (lấy 5 tin nhắn gần nhất để tiết kiệm token)
    const history = messages.slice(-5).map(m => ({ role: m.role, text: m.text }));

    try {
        const responseText = await generateGeminiResponse(userMsg.text, contextData, history);
        
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText || 'Xin lỗi, tôi không có câu trả lời.',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: 'Đã xảy ra lỗi khi kết nối.',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
      setMessages([
        {
            id: 'welcome',
            role: 'model',
            text: 'Dữ liệu chat đã được làm mới. Bạn cần hỗ trợ gì?',
            timestamp: new Date()
        }
      ]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-[#EE0033] to-rose-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 animate-bounce-slow flex items-center justify-center group"
        title="Hỏi Gemini AI"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="absolute right-full mr-3 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Hỏi trợ lý AI
        </span>
      </button>
    );
  }

  return (
    <div 
        className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
            isMinimized 
            ? 'bottom-6 right-6 w-72 h-14 overflow-hidden' 
            : 'bottom-6 right-6 w-[90vw] md:w-[400px] h-[500px] max-h-[80vh]'
        }`}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-gradient-to-r from-[#EE0033] to-rose-600 text-white cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
                <h3 className="font-bold text-sm">Trợ lý ảo Gemini</h3>
                {!isMinimized && <p className="text-[10px] text-white/80 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Online</p>}
            </div>
        </div>
        <div className="flex items-center gap-1">
            {!isMinimized && (
                <button onClick={(e) => { e.stopPropagation(); clearHistory(); }} className="p-1.5 hover:bg-white/20 rounded text-white/80 hover:text-white" title="Xóa lịch sử">
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
            <button className="p-1.5 hover:bg-white/20 rounded">
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }} className="p-1.5 hover:bg-white/20 rounded">
                <X className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4 chat-scroll">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                            }`}
                        >
                            {msg.role === 'model' ? (
                                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1">
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                            ) : (
                                msg.text
                            )}
                            <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#EE0033]" />
                            <span className="text-xs text-slate-500">Gemini đang suy nghĩ...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-200">
                <div className="relative flex items-center gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Hỏi về dự án, doanh thu, KPI..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#EE0033] outline-none resize-none max-h-32"
                        rows={1}
                        style={{ minHeight: '44px' }}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-[#EE0033] transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-400">Gemini có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.</p>
                </div>
            </div>
          </>
      )}
    </div>
  );
};

export default GeminiChat;
