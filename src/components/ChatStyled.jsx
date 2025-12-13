import React, { useEffect, useRef, useState } from "react";

/**
 * ChatStyled.jsx
 * - Polished chat UI with avatars, timestamp, quick replies and typing indicator.
 * - Placeholder send() function; replace with your backend /v1/chat call.
 */

const AVATAR_USER = "🧑"; // simple emoji avatar (replace with images if you want)
const AVATAR_BOT = "🌾";

function timeNow() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatStyled({ onSend }) {
  const [messages, setMessages] = useState([
    { id: "sys-1", role: "system", text: "AgriBot ready — ask about schemes, crops or upload images." }
  ]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  function scrollToBottom() {
    try {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } catch (e) {}
  }

  async function sendMessage(payloadText) {
    if (!payloadText || !payloadText.trim()) return;
    const user = { id: "u-" + Date.now(), role: "user", text: payloadText.trim(), t: timeNow() };
    setMessages((m) => [...m, user]);
    setText("");
    setSending(true);
    setTyping(true);

    // If parent supplied onSend, call it (allows integrating backend)
    try {
      if (onSend) {
        // allow parent to handle async streaming; expect onSend to return an assistant message or messages array
        const resp = await onSend(payloadText);
        if (resp) {
          // if resp is array, append them; if object, append single
          if (Array.isArray(resp)) {
            setMessages((m) => [...m, ...resp.map(r => ({ id: "a-" + Date.now() + Math.random(), role: "assistant", text: r.text || String(r), t: timeNow() }))]);
          } else {
            setMessages((m) => [...m, { id: "a-" + Date.now(), role: "assistant", text: resp.text || String(resp), t: timeNow() }]);
          }
        } else {
          // fallback small reply
          setMessages((m) => [...m, { id: "a-" + Date.now(), role: "assistant", text: `I heard: "${payloadText}". (Model not yet wired)`, t: timeNow() }]);
        }
      } else {
        // demo fallback: pretend we queried backend and found schemes
        await new Promise(r => setTimeout(r, 700));
        setMessages((m) => [...m, { id: "a-" + Date.now(), role: "assistant", text: `I found some schemes related to "${payloadText}". Click a scheme card to view details.`, t: timeNow() }]);
      }
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { id: "a-" + Date.now(), role: "assistant", text: "Sorry, something went wrong while sending your message.", t: timeNow() }]);
    } finally {
      setTyping(false);
      setSending(false);
    }
  }

  function handleSendClick() {
    if (sending) return;
    sendMessage(text);
  }

  function quick(title) { sendMessage(title); }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>AgriBot</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Live chat — click quick replies to try</div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)" }}>Status: <span style={{ fontWeight: 700, color: "#10B981", marginLeft:6 }}>online</span></div>
      </div>

      <div ref={scrollRef} className="chat-messages" style={{ padding: 12 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", marginBottom: 10, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: "85%" }}>
              {m.role !== "user" && <div style={{ width:36, height:36, borderRadius:10, display:"grid", placeItems:"center", fontSize:18 }}>{AVATAR_BOT}</div>}
              <div className={"msg " + (m.role === "user" ? "user" : (m.role === "assistant" ? "assistant" : "system"))} style={{ borderRadius: 12 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>{m.text}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, textAlign: m.role === "user" ? "right" : "left" }}>{m.t || ""}</div>
              </div>
              {m.role === "user" && <div style={{ width:36, height:36, borderRadius:10, display:"grid", placeItems:"center", fontSize:18 }}>{AVATAR_USER}</div>}
            </div>
          </div>
        ))}

        {typing && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <div style={{ width:36, height:36, borderRadius:10, display:"grid", placeItems:"center", fontSize:18 }}>{AVATAR_BOT}</div>
            <div className="msg assistant" style={{ padding: 8 }}>
              <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>AgriBot is typing</div>
                <div style={{ display: "inline-flex", gap: 6 }}>
                  <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button className="btn secondary" onClick={() => quick("Show ongoing schemes")}>Show ongoing</button>
          <button className="btn secondary" onClick={() => quick("How to apply for PM-KISAN")}>How to apply for PM-KISAN</button>
          <button className="btn secondary" onClick={() => quick("Nearest mandi prices")}>Commodity prices</button>
        </div>

        <div className="chat-input" style={{ alignItems: "center" }}>
          <input className="input" placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSendClick(); }} />
          <button className="btn" onClick={handleSendClick} disabled={sending}>{sending ? "Sending..." : "Send"}</button>
        </div>
      </div>
    </div>
  );
}
