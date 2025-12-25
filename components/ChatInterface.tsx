
import React, { useState, useEffect, useRef } from 'react';
import { Message, UserProfile } from '../types';
import { generateAIResponse, generateImage } from '../services/gemini';
import { GoogleGenAI, Modality } from "@google/genai";
import { QUICK_PROMPTS } from '../constants';
import { 
  Send, Mic, MicOff, Copy, Share2, Loader2, Sparkles, 
  Image as ImageIcon, X, Globe, Volume2, VolumeX, 
  Wand2, Download, MessageSquarePlus 
} from 'lucide-react';

interface ChatInterfaceProps {
  user: UserProfile | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (customPrompt?: string, mode: 'chat' | 'image' = 'chat') => {
    const prompt = (customPrompt || input).trim();
    if (!prompt && mode === 'chat' && !selectedImage) return;

    if (mode === 'image') {
      setIsGeneratingImage(true);
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: `ছবি এঁকে দাও: ${prompt}`, timestamp: Date.now() };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      
      try {
        const imgData = await generateImage(prompt);
        setMessages(prev => [...prev, { 
          id: (Date.now()+1).toString(), 
          role: 'assistant', 
          content: "আপনার জন্য ছবিটি তৈরি করেছি!", 
          timestamp: Date.now(), 
          generatedImage: imgData 
        }]);
      } catch (e) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "দুঃখিত, ছবি তৈরি করতে সমস্যা হয়েছে।", timestamp: Date.now() }]);
      } finally {
        setIsGeneratingImage(false);
      }
      return;
    }

    setIsLoading(true);
    const currentImage = selectedImage;
    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: prompt || (currentImage ? "Analyze this image" : ""), 
      timestamp: Date.now(),
      image: currentImage || undefined
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user' as any, parts: [{ text: m.content }] }));
      const { text, sources } = await generateAIResponse(prompt || "Explain this image", history, user?.preferences, currentImage || undefined);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: text, timestamp: Date.now(), sources }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const speakMessage = async (text: string, id: string) => {
    if (isSpeaking === id) { setIsSpeaking(null); return; }
    setIsSpeaking(id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const ctx = audioContextRef.current;
        const decode = (b: string) => {
          const s = atob(b);
          const bytes = new Uint8Array(s.length);
          for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
          return bytes;
        };
        const data = decode(base64Audio);
        const dataInt16 = new Int16Array(data.buffer);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(null);
        source.start();
      }
    } catch (e) { setIsSpeaking(null); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in zoom-in duration-500 py-10">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 relative">
               <Sparkles size={48} className="text-indigo-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-indigo-600">প্লাবন অ্যাসিস্ট্যান্ট</h2>
              <p className="text-slate-400 text-sm font-medium">আপনার ডিজিটাল কাজের সহযাত্রী।</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm px-4">
              {QUICK_PROMPTS.map((qp, i) => (
                <button key={i} onClick={() => handleSend(qp.prompt)} className="p-4 text-left bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl hover:border-indigo-500 transition-all group active:scale-95 shadow-sm">
                  <MessageSquarePlus size={16} className="text-indigo-500 mb-2" />
                  <span className="text-[11px] font-bold block leading-tight">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] rounded-[1.8rem] p-4 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-bl-none'}`}>
              {msg.image && <img src={msg.image} className="w-full rounded-2xl mb-3 shadow-md" alt="User upload" />}
              <p className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
              {msg.generatedImage && (
                <div className="mt-3 relative group">
                  <img src={msg.generatedImage} className="rounded-2xl w-full shadow-lg border border-slate-200 dark:border-slate-700" alt="Generated" />
                  <a href={msg.generatedImage} download="plabon-ai.png" className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download size={16} />
                  </a>
                </div>
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                   {msg.sources.map((s, i) => (
                     <a key={i} href={s.uri} target="_blank" className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 flex items-center gap-1 text-indigo-600 font-bold">
                       <Globe size={10} /> {s.title}
                     </a>
                   ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(msg.content)} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg"><Copy size={14} /></button>
                  {msg.role === 'assistant' && (
                    <button onClick={() => speakMessage(msg.content, msg.id)} className={`p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg ${isSpeaking === msg.id ? 'text-indigo-400' : ''}`}>
                      {isSpeaking === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  )}
                </div>
                <span className="text-[10px] font-bold opacity-40">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        ))}
        {(isLoading || isGeneratingImage) && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-indigo-500" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{isGeneratingImage ? "Painting..." : "Thinking..."}</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800">
        {selectedImage && (
          <div className="mb-3 relative inline-block animate-in zoom-in duration-200">
            <img src={selectedImage} className="h-20 w-20 object-cover rounded-2xl border-2 border-indigo-500 shadow-xl" alt="Preview" />
            <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"><X size={12} /></button>
          </div>
        )}
        <div className="max-w-4xl mx-auto flex gap-2">
           <input type="file" ref={fileInputRef} onChange={(e) => {
             const f = e.target.files?.[0];
             if (f) {
               const r = new FileReader();
               r.onloadend = () => setSelectedImage(r.result as string);
               r.readAsDataURL(f);
             }
           }} className="hidden" accept="image/*" />
           <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors">
              <ImageIcon size={20} />
           </button>
           <div className="flex-1 relative">
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message Plabon..." 
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 pl-5 pr-12 focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <button onClick={() => handleSend(input, 'image')} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl">
                 <Wand2 size={20} />
              </button>
           </div>
           <button onClick={() => handleSend()} disabled={isLoading || isGeneratingImage} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-90 transition-all">
              <Send size={20} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
