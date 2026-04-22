const fs = require('fs');
const path = require('path');

const files = {
'public/strato-sync.js': `const StratoSync=(()=>{'use strict';const CONFIG={CHUNK_SIZE:16384,DB_NAME:'stratovault',DB_STORE:'games',CODE_LENGTH:6,MAX_BACKPRESSURE:1048576,ICE_SERVERS:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};let pc=null,dataChannel=null,ws=null,role=null,syncCode=null,receiveBuffer=[],cancelled=false;const $=s=>document.querySelector(s);function connectSignaling(){const proto=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(\`\${proto}//\${location.host}/sync\`);ws.onmessage=e=>{try{handleSignalMessage(JSON.parse(e.data))}catch(err){}};ws.onclose=()=>{if(!cancelled)cleanup()}}function send(msg){if(ws&&ws.readyState===1)ws.send(JSON.stringify(msg))}function handleSignalMessage(msg){switch(msg.type){case'registered':syncCode=msg.code;const d=$('#sync-code-display');if(d){d.textContent=syncCode;d.classList.add('sync-code-visible')}break;case'offer':handleOffer(msg.sdp);break;case'answer':handleAnswer(msg.sdp);break;case'ice-candidate':handleRemoteICE(msg.candidate);break}}function createPC(){pc=new RTCPeerConnection({iceServers:CONFIG.ICE_SERVERS});pc.onicecandidate=e=>{if(e.candidate)send({type:'ice-candidate',code:syncCode,candidate:e.candidate.toJSON()})};pc.ondatachannel=e=>{dataChannel=e.channel;wireChannel(dataChannel)}}function wireChannel(ch){ch.binaryType='arraybuffer';ch.onopen=()=>{if(role==='host')sendSaveData()};ch.onmessage=e=>handleIncoming(e.data)}async function host(){role='host';cancelled=false;createPC();dataChannel=pc.createDataChannel('strato-sync',{ordered:true});wireChannel(dataChannel);const offer=await pc.createOffer();await pc.setLocalDescription(offer);connectSignaling();const check=setInterval(()=>{if(ws&&ws.readyState===1){clearInterval(check);send({type:'host',sdp:pc.localDescription.toJSON()})}},50)}function handleIncoming(raw){if(typeof raw==='string'){try{const m=JSON.parse(raw);if(m.__sync_done__){finalizeReceive(m.total);return}}catch(e){}}if(raw instanceof ArrayBuffer)receiveBuffer.push(raw)}function cleanup(){if(dataChannel)dataChannel.close();if(pc)pc.close();if(ws)ws.close()}return{init(){$('#sync-generate-btn')?.addEventListener('click',()=>{cleanup();host()});$('#sync-join-btn')?.addEventListener('click',()=>{const c=$('#sync-code-input')?.value;if(c?.length===6)join(c)})},cancel(){cancelled=true;cleanup()}}})();StratoSync.init();`,
'src/index.js': fs.readFileSync('src/index.js', 'utf8').replace(/import { authPage } from ".\\/auth.js";[\\s\\S]*?app\\.listen\\(PORT, \\(\\) => console\\.log\\(\`Server running on port \${PORT}\`\\)\\);/, \`import { authPage } from "./auth.js";
import { WebSocketServer } from "ws";
const syncSessions = new Map();
const wss = new WebSocketServer({ noServer: true });
const server = createServer(app);
server.on("upgrade", (req, socket, head) => {
  if (req.url === "/sync") {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  }
});
wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.type === "host") {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      syncSessions.set(code, { host: ws, offer: msg.sdp });
      ws.send(JSON.stringify({ type: "registered", code }));
    } else if (msg.type === "join") {
      const s = syncSessions.get(msg.code);
      if (s) { s.joiner = ws; ws.send(JSON.stringify({ type: "offer", sdp: s.offer })); }
    }
  });
});
server.listen(PORT, () => console.log("◆ STRATO Server Online"));\`),
'public/index.html': fs.readFileSync('public/index.html', 'utf8').replace('</body>', '<script src="strato-sync.js"></script></body>')
};

Object.entries(files).forEach(([p, c]) => fs.writeFileSync(p, c));
