'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { ExpenseReport } from '@/lib/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ReportChatProps {
  report: ExpenseReport;
}

export default function ReportChat({ report }: ReportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug: Log when component renders
  useEffect(() => {
    console.log('ReportChat component rendered', { report: report?.politician?.name });
  }, [report]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Debug: Log what data is being sent
    console.log('Sending to API:', {
      message: userMessage,
      politician: report.politician?.name,
      hasIncome: !!report.income,
      hasExpenses: !!report.expenses,
      transactionCount: report.transactions?.length || 0,
    });

    try {
      const response = await fetch('/api/report-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          report: report,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      console.log('Received response:', data.message.substring(0, 100));
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '申し訳ございませんが、エラーが発生しました。もう一度お試しください。',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] bg-primary-500 text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
        aria-label="AIに質問"
        style={{ zIndex: 100 }}
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="hidden sm:inline font-medium text-sm sm:text-base">AIに質問</span>
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] w-[calc(100vw-2rem)] sm:w-[400px] h-[calc(100vh-8rem)] sm:h-[600px] max-h-[600px] bg-white rounded-[22px] border-2 border-neutral-200 shadow-2xl flex flex-col"
      style={{ zIndex: 100 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-neutral-200 bg-neutral-50 rounded-t-[22px]">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary-500" />
          <h3 className="font-bold text-text-primary">AIに質問</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-neutral-200 rounded-full transition-colors"
          aria-label="閉じる"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p className="text-sm">
              レポートについて質問してください。
              <br />
              例: 「収入の内訳を教えてください」
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-[18px] px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-text-primary'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 rounded-[18px] px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t-2 border-neutral-200 bg-neutral-50 rounded-b-[22px]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="質問を入力..."
            disabled={loading}
            className="flex-1 px-4 py-2 border-2 border-neutral-200 rounded-[18px] focus:outline-none focus:border-primary-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-primary-500 text-white rounded-[18px] hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            aria-label="送信"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

