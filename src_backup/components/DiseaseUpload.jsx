import React, {useState} from "react";

const API = (import.meta.env && import.meta.env.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/$/,"") : "http://localhost:4000/v1");

export default function DiseaseUpload(){
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState(null);
  const [progress,setProgress]=useState(0);
  const [result,setResult]=useState(null);
  const [status,setStatus]=useState("");

  function onFileChange(e){
    const f = e.target.files[0];
    if(!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setResult(null);
    setStatus("");
  }

  async function upload(){
    if(!file) return setStatus("Choose an image first");
    setStatus("Uploading...");
    setProgress(10);
    // simulate incremental progress for demo; replace with real fetch+progress
    await new Promise(r=>setTimeout(r,400)); setProgress(45);
    await new Promise(r=>setTimeout(r,400)); setProgress(75);

    try{
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(API + "/detect", { method:"POST", body:fd });
      if(!res.ok){
        // simulate fallback demo result if backend not ready
        const demo = { disease: "Leaf Rust (simulated)", confidence: 0.86, treatment: "Apply recommended fungicide; remove badly infected leaves." };
        setResult(demo); setStatus("Demo result (backend returned " + res.status + ")"); setProgress(100); return;
      }
      const j = await res.json();
      setResult(j); setStatus("Result ready"); setProgress(100);
    }catch(e){
      console.error(e);
      const demo = { disease: "Leaf Blight (demo)", confidence: 0.79, treatment: "Isolate affected plants; use copper-based spray." };
      setResult(demo); setStatus("Demo result (network)"); setProgress(100);
    }
  }

  return (
    <div>
      <div className="upload-drop card" style={{padding:12}}>
        <input type="file" accept="image/*" onChange={onFileChange} />
        <div className="small" style={{marginTop:8}}>Upload a clear photo of the affected leaf or plant (close-up works best).</div>
        {preview && <img src={preview} alt="preview" className="preview" />}
      </div>

      <div style={{display:"flex",gap:8,marginTop:10}}>
        <button className="btn" onClick={upload}>Analyze</button>
        <button className="btn secondary" onClick={()=>{ setFile(null); setPreview(null); setResult(null); setProgress(0); setStatus(""); }}>Reset</button>
      </div>

      {status && <div className="small" style={{marginTop:8}}>{status}</div>}
      {progress>0 && <div style={{height:8,background:"#eef2ff",borderRadius:6,overflow:"hidden",marginTop:8}}><div style={{height:"100%",width:progress+"%",background:"linear-gradient(90deg,#34d399,#06b6d4)"}}></div></div>}

      {result && (
        <div className="card" style={{marginTop:10}}>
          <div><strong>Prediction:</strong> {result.disease || result.label || "Unknown"}</div>
          <div className="small">Confidence: {(result.confidence||result.score||0).toString()}</div>
          <div style={{marginTop:8}}><strong>Treatment suggestion:</strong></div>
          <div>{result.treatment || result.advice || "See official guidance."}</div>
        </div>
      )}
    </div>
  );
}
