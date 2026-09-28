import React, { useState } from 'react';
import { MessageCircle, X, Send, Mic } from 'lucide-react';
import { MensagemChat } from '../../types';

export function SOSCopilotoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');

  React.useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open_sos_ia', handler);
    return () => window.removeEventListener('open_sos_ia', handler);
  }, []);

  const [messages, setMessages] = useState<MensagemChat[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou o assistente do Licita Aí. Como posso ajudar com este edital?',
      timestamp: new Date().toISOString()
    }
  ]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    setMessages([...messages, {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date().toISOString()
    }]);
    
    setInputText('');
    
    // Simulate response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Estou analisando sua dúvida sobre o edital...',
        timestamp: new Date().toISOString()
      }]);
    }, 1000);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 bg-ocean-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-ocean-700 transition-colors z-50 animate-pulse"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[600px] bg-white md:rounded-2xl shadow-2xl z-50 flex flex-col border border-slate-200">
          <div className="bg-ocean-600 text-white p-4 flex justify-between items-center md:rounded-t-2xl">
            <h3 className="font-bold flex items-center">
              <span className="mr-2">🤖</span> SOS Licita Aí
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-ocean-100 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-3 ${
                  msg.role === 'user' 
                    ? 'bg-slate-200 text-slate-800 rounded-br-none' 
                    : 'bg-ocean-50 text-ocean-900 border border-ocean-100 rounded-bl-none'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-[10px] opacity-60 mt-1 block">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-white border-t border-slate-200 md:rounded-b-2xl">
            <div className="flex items-center space-x-2 bg-slate-100 rounded-full p-1 pl-4">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Digite sua dúvida..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
              <button className="p-2 text-slate-500 hover:text-ocean-600">
                <Mic size={20} />
              </button>
              <button 
                onClick={handleSend}
                className="p-2 bg-ocean-600 text-white rounded-full hover:bg-ocean-700"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
