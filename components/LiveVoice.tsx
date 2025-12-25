
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Mic, MicOff, Loader2, Radio, XCircle, Info } from 'lucide-react';

const LiveVoice: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  // Safe manual encoding to prevent stack overflow on large buffers
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const s = atob(base64);
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  };

  const stopAudio = () => {
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const startSession = async () => {
    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(processor);
            processor.connect(ctx.destination);
          },
          onmessage: async (msg: any) => {
            // Handle Interruption: Stop current playback if model is interrupted
            if (msg.serverContent?.interrupted) {
              stopAudio();
            }

            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const buffer = await decodeAudioData(decode(audioData), ctx);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.outputTranscription) {
              setTranscript(prev => (prev + ' ' + msg.serverContent.outputTranscription.text).slice(-200));
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => {
            console.error("Live Error:", e);
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: 'You are Plabon AI. You are having a real-time voice conversation. Be extremely concise, helpful, and natural. Speak like a real human friend.'
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      setIsConnecting(false);
      alert("Microphone access error. Please check your settings.");
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    stopAudio();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setIsActive(false);
    setIsConnecting(false);
    setTranscript('');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-10">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
          <Radio size={12} className={isActive ? 'animate-pulse' : ''} /> Native Audio System
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
          {isActive ? "প্লাবন কথা বলছে..." : "লাইভ ভয়েস মোড"}
        </h2>
      </div>

      <div className={`relative w-56 h-56 rounded-full flex items-center justify-center transition-all duration-700 ${isActive ? 'bg-indigo-600/10 scale-105' : 'bg-slate-100 dark:bg-slate-800'}`}>
        {isActive && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-[ping_2s_infinite]" />
            <div className="absolute inset-4 rounded-full border-2 border-indigo-500/10 animate-[ping_3s_infinite]" />
          </>
        )}
        <div className="z-10 bg-white dark:bg-slate-900 p-10 rounded-full shadow-2xl border border-slate-100 dark:border-slate-800">
          {isConnecting ? <Loader2 className="animate-spin text-indigo-500" size={56} /> : isActive ? <div className="flex gap-1 items-end h-10">
            {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: `${i*0.1}s`, height: `${Math.random()*100}%`}} />)}
          </div> : <Mic className="text-slate-300" size={56} />}
        </div>
      </div>

      {transcript && (
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-2">
          <p className="text-xs font-black text-slate-400 uppercase mb-2 flex items-center gap-2"><Info size={12}/> AI Transcription</p>
          <p className="text-sm font-medium italic text-slate-600 dark:text-slate-300">"{transcript}..."</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <button 
          onClick={isActive ? stopSession : startSession}
          disabled={isConnecting}
          className={`group px-12 py-5 rounded-[2rem] font-black text-white shadow-2xl transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 ${isActive ? 'bg-red-500 shadow-red-500/30' : 'bg-indigo-600 shadow-indigo-500/30'}`}
        >
          {isActive ? <><XCircle /> Stop Session</> : <><Mic /> Start Talking</>}
        </button>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Low Latency Native Bridge v2.0</p>
      </div>
    </div>
  );
};

export default LiveVoice;
