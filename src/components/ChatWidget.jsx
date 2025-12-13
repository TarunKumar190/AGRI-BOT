import React, {useEffect, useRef, useState} from "react";

export default function ChatWidget(){
  const [messages,setMessages] = useState([{role:"system",text:"Welcome to AgriBotAI — ask about schemes or upload a crop image."}]);
  const [q,setQ] = useState("");
  const [sending,setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);

  useEffect(()=>{ scrollToBottom(); }, [messages]);

  function scrollToBottom(){ try{ if(listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }catch(e){} }

  async function send(){
    if(!q.trim()) return;
    const userMsg = {role:"user", text:q.trim(), id:Date.now()};
    setMessages(prev => [...prev, userMsg]);
    setQ(""); setSending(true); setTyping(true);

    // simulate network/model latency for demo
    await new Promise(r=>setTimeout(r,600));
    // fake assistant reply (placeholder) — your backend will replace this
    const reply = {role:"assistant", text:`I found some schemes related to \"${userMsg.text}\". Click a scheme on the left to view details.`, id:Date.now()+1};

    // simulate streaming typing then push
    await new Promise(r=>setTimeout(r,700));
    setTyping(false);
    setMessages(prev => [...prev, reply]);
    setSending(false);
  }

  function quickAsk(text){
    setQ(text);
    setTimeout(()=>send(),80);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div ref={listRef} className="chat-messages" role="log" aria-live="polite">
        {messages.map((m,i)=>(
          <div key={m.id || i} style={{display:"flex",justifyContent: m.role==="user" ? "flex-end":"flex-start"}}>
            <div className={"msg " + (m.role==="user" ? "user" : (m.role==="assistant" ? "assistant" : "system"))}>
              <div style={{fontSize:12,opacity:0.85,marginBottom:6}}>{m.role==="user" ? "You" : (m.role==="assistant" ? "AgriBot":"System")}</div>
              <div style={{whiteSpace:"pre-wrap"}}>{m.text}</div>
            </div>
          </div>
        ))}

        {typing && (
          <div style={{display:"flex",justifyContent:"flex-start"}}>
            <div className="msg assistant">
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <span style={{fontSize:12,color:"var(--muted)"}}>AgriBot is typing</span>
                <div style={{height:6}}></div>
                <div style={{display:"inline-flex",gap:6,alignItems:"center"}}>
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask about schemes, e.g. 'PM-KISAN' or 'income support'..." onKeyDown={e=>{ if(e.key==='Enter'){ send(); } }} />
        <button className="btn" onClick={send} disabled={sending}>Send</button>
        <button className="btn secondary" onClick={()=>quickAsk("Show ongoing schemes")}>Show ongoing</button>
      </div>
    </div>
  );
}
