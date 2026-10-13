import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const storePath = path.join(__dirname, "store.json");
const PORT = Number(process.env.PORT || 8787);
const STARTING_BALANCE = 10000;
const SB = 25;
const BB = 50;
const MAX_SEATS = 8;

const clients = new Map();
const rooms = new Map();
let store = { players: {}, rooms: {} };
try { store = JSON.parse(fs.readFileSync(storePath, "utf8")); } catch {}

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const rankValue = Object.fromEntries(ranks.map((r, i) => [r, i + 2]));

function save() { fs.writeFileSync(storePath, JSON.stringify(store, null, 2)); }
function id(prefix = "id") { return `${prefix}_${Math.random().toString(36).slice(2, 9)}`; }
function cleanName(value) { return String(value || "Player").trim().slice(0, 18) || "Player"; }
function newDeck() { return suits.flatMap((s) => ranks.map((r) => ({ rank: r, suit: s }))).sort(() => Math.random() - 0.5); }
function roomSnapshot(room) {
  return {
    id: room.id, name: room.name, isPrivate: room.isPrivate, code: room.code,
    status: room.status, phase: room.phase, pot: room.pot, community: room.community,
    currentBet: room.currentBet, turn: room.turn, dealer: room.dealer,
    players: room.players.map((p) => ({ id: p.id, name: p.name, seat: p.seat, balance: p.balance, chips: p.chips, bet: p.bet, totalBet: p.totalBet, folded: p.folded, allIn: p.allIn, connected: p.connected, cards: p.id === room.viewerId ? p.cards : p.cards?.map(() => ({ hidden: true })) })),
    viewerId: room.viewerId,
    handNumber: room.handNumber,
    minRaise: room.minRaise,
    winners: room.winners || [],
    winMessage: room.winMessage || "",
  };
}
function broadcast(room) {
  for (const [socket, meta] of clients) if (meta.roomId === room.id && socket.readyState === 1) {
    room.viewerId = meta.playerId; socket.send(JSON.stringify({ type: "room", room: roomSnapshot(room) }));
  }
}
function lobby() { return [...rooms.values()].map((r) => ({ id: r.id, name: r.name, isPrivate: r.isPrivate, players: r.players.length, status: r.status, stakes: `${SB}/${BB}` })); }
function send(socket, type, data) { if (socket.readyState === 1) socket.send(JSON.stringify({ type, ...data })); }

function makeRoom({ name = "الغرفة الزرقاء", isPrivate = false, code = "" } = {}) {
  const room = { id: id("room"), name: cleanName(name), isPrivate: !!isPrivate, code: String(code || "").slice(0, 8), status: "waiting", phase: "waiting", pot: 0, community: [], currentBet: 0, turn: null, dealer: 0, handNumber: 0, minRaise: BB, players: [] };
  rooms.set(room.id, room); store.rooms[room.id] = { id: room.id, name: room.name, isPrivate: room.isPrivate, createdAt: Date.now() }; save(); return room;
}
function hydrateRooms() { for (const r of Object.values(store.rooms || {})) rooms.set(r.id, makeRoom({ name: r.name, isPrivate: r.isPrivate })); }
hydrateRooms();
if (!rooms.size) makeRoom({ name: "الطاولة الملكية" });

function startHand(room) {
  const active = room.players.filter((p) => p.connected && p.balance >= BB);
  if (active.length < 2) return false;
  room.handNumber++; room.status = "playing"; room.phase = "preflop"; room.deck = newDeck(); room.community = []; room.pot = 0; room.currentBet = BB; room.minRaise = BB;
  room.dealer = (room.dealer + 1) % room.players.length;
  for (const p of room.players) { p.cards = []; p.bet = 0; p.totalBet = 0; p.folded = false; p.allIn = false; p.chips = Math.min(p.balance, 5000); }
  for (let i = 0; i < 2; i++) for (const p of room.players) if (p.connected && p.chips > 0) p.cards.push(room.deck.pop());
  const eligible = room.players.map((p) => p.connected && p.chips > 0 ? p : null).filter(Boolean);
  const dealerIndex = eligible.findIndex((p) => p.seat === room.players[room.dealer]?.seat);
  const sb = eligible[(dealerIndex + 1) % eligible.length]; const bb = eligible[(dealerIndex + 2) % eligible.length];
  commitBet(room, sb, Math.min(SB, sb.chips)); commitBet(room, bb, Math.min(BB, bb.chips));
  room.turn = eligible[(dealerIndex + 3) % eligible.length].id;
  broadcast(room); return true;
}
function commitBet(room, player, amount) { const paid = Math.max(0, Math.min(amount, player.chips)); player.chips -= paid; player.bet += paid; player.totalBet += paid; room.pot += paid; room.currentBet = Math.max(room.currentBet, player.bet); if (player.chips === 0) player.allIn = true; }
function nextActive(room, fromId) { const list = room.players.filter((p) => p.connected && !p.folded && !p.allIn && p.chips >= 0); const idx = list.findIndex((p) => p.id === fromId); return list[(idx + 1) % list.length]?.id || null; }
function everyoneMatched(room) { const active = room.players.filter((p) => p.connected && !p.folded && !p.allIn); return active.length <= 1 || active.every((p) => p.bet === room.currentBet || p.allIn); }
function resetStreetBets(room) { for (const p of room.players) p.bet = 0; room.currentBet = 0; room.minRaise = BB; }
function advanceStreet(room) {
  const active = room.players.filter((p) => p.connected && !p.folded && (p.chips > 0 || p.allIn));
  if (active.length <= 1) return finishHand(room);
  if (room.phase === "preflop") { room.community.push(room.deck.pop(), room.deck.pop(), room.deck.pop()); room.phase = "flop"; }
  else if (room.phase === "flop") { room.community.push(room.deck.pop()); room.phase = "turn"; }
  else if (room.phase === "turn") { room.community.push(room.deck.pop()); room.phase = "river"; }
  else return finishHand(room);
  resetStreetBets(room); room.turn = active[0].id; broadcast(room);
}
function maybeAdvance(room) { if (everyoneMatched(room)) advanceStreet(room); else room.turn = nextActive(room, room.turn); broadcast(room); }

function combinations(arr, k) { if (k === 0) return [[]]; if (!arr.length) return []; const [head, ...tail] = arr; return combinations(tail, k - 1).map((x) => [head, ...x]).concat(combinations(tail, k)); }
function scoreFive(cards) {
  const vals = cards.map((c) => rankValue[c.rank]).sort((a, b) => b - a); const counts = Object.entries(cards.reduce((a, c) => (a[c.rank] = (a[c.rank] || 0) + 1, a), {})).map(([r, n]) => [n, rankValue[r]]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const flush = cards.every((c) => c.suit === cards[0].suit); const uniq = [...new Set(vals)]; let straight = 0;
  if (uniq.length === 5 && uniq[0] - uniq[4] === 4) straight = uniq[0]; else if (uniq.join(",") === "14,5,4,3,2") straight = 5;
  if (straight && flush) return [8, straight]; if (counts[0][0] === 4) return [7, counts[0][1], counts[1][1]]; if (counts[0][0] === 3 && counts[1][0] === 2) return [6, counts[0][1], counts[1][1]]; if (flush) return [5, ...vals]; if (straight) return [4, straight]; if (counts[0][0] === 3) return [3, counts[0][1], ...counts.slice(1).map((x) => x[1]).sort((a,b)=>b-a)]; if (counts[0][0] === 2 && counts[1][0] === 2) return [2, Math.max(counts[0][1], counts[1][1]), Math.min(counts[0][1], counts[1][1]), counts[2][1]]; if (counts[0][0] === 2) return [1, counts[0][1], ...counts.slice(1).map((x) => x[1]).sort((a,b)=>b-a)]; return [0, ...vals];
}
function bestScore(cards) { return combinations(cards, 5).map(scoreFive).sort((a,b) => { for (let i=0;i<Math.max(a.length,b.length);i++) if ((b[i]||0)!==(a[i]||0)) return (b[i]||0)-(a[i]||0); return 0; })[0]; }
const handNames = ["بطاقة عالية", "زوج", "زوجان", "ثلاثة من نوع", "سلم", "لون", "فل هاوس", "أربعة من نوع", "ستريت فلش"];
function finishHand(room) {
  const contenders = room.players.filter((p) => p.connected && !p.folded); let winners = [];
  if (contenders.length === 1) winners = contenders;
  else { const scored = contenders.map((p) => ({ p, score: bestScore([...p.cards, ...room.community]) })); const top = scored.sort((a,b) => { for (let i=0;i<a.score.length;i++) if (a.score[i] !== b.score[i]) return b.score[i] - a.score[i]; return 0; })[0].score; winners = scored.filter((x) => JSON.stringify(x.score) === JSON.stringify(top)).map((x) => x.p); }
  const share = Math.floor(room.pot / winners.length); for (const p of winners) { p.balance += share; p.wins = (p.wins || 0) + 1; p.lastResult = `فاز بـ ${share.toLocaleString("ar-EG")} رقاقة`; } for (const p of room.players) { p.hands = (p.hands || 0) + 1; p.balance = Math.max(0, p.balance); }
  for (const p of room.players) store.players[p.id] = { ...store.players[p.id], balance: p.balance, hands: p.hands, wins: p.wins };
  room.status = "showdown"; room.phase = "showdown"; room.turn = null; room.winners = winners.map((p) => p.id); room.winMessage = winners.length === 1 ? `${winners[0].name} يفوز — ${share.toLocaleString("ar-EG")} رقاقة` : `تعادل بين ${winners.map((p) => p.name).join(" و ")}`; save(); broadcast(room);
  setTimeout(() => { if (room.status === "showdown") { room.status = "waiting"; room.phase = "waiting"; room.community = []; room.pot = 0; room.winners = []; broadcast(room); } }, 6500);
}

function joinRoom(socket, payload) {
  const room = rooms.get(payload.roomId); if (!room) return send(socket, "error", { message: "الغرفة غير موجودة" }); if (room.isPrivate && room.code !== String(payload.code || "")) return send(socket, "error", { message: "رمز الغرفة غير صحيح" }); if (room.players.length >= MAX_SEATS) return send(socket, "error", { message: "الطاولة ممتلئة" });
  const playerId = payload.playerId || id("player"); let player = store.players[playerId]; if (!player) { player = { id: playerId, name: cleanName(payload.name), balance: STARTING_BALANCE, hands: 0, wins: 0 }; store.players[playerId] = player; save(); } else player.name = cleanName(payload.name || player.name);
  const existing = room.players.find((p) => p.id === playerId); if (existing) existing.connected = true; else room.players.push({ ...player, seat: room.players.length, chips: 0, bet: 0, totalBet: 0, folded: false, allIn: false, connected: true, cards: [] });
  clients.set(socket, { roomId: room.id, playerId }); if (room.status === "waiting" && room.players.filter((p) => p.connected).length >= 2) startHand(room); broadcast(room); send(socket, "joined", { playerId, roomId: room.id });
}
function handleAction(socket, payload) {
  const meta = clients.get(socket); const room = rooms.get(meta?.roomId); const p = room?.players.find((x) => x.id === meta.playerId); if (!room || !p || room.status !== "playing") return; if (room.turn !== p.id) return send(socket, "error", { message: "ليس دورك الآن" });
  if (payload.action === "fold") p.folded = true;
  else if (payload.action === "call") commitBet(room, p, room.currentBet - p.bet);
  else if (payload.action === "raise") { const target = Math.max(room.currentBet + room.minRaise, Number(payload.amount) || room.currentBet + room.minRaise); const raiseBy = target - room.currentBet; commitBet(room, p, target - p.bet); room.minRaise = Math.max(room.minRaise, raiseBy); }
  else if (payload.action === "allin") { const before = room.currentBet; commitBet(room, p, p.chips); if (p.bet - before > 0) room.minRaise = Math.max(room.minRaise, p.bet - before); }
  maybeAdvance(room);
}

const server = http.createServer((req, res) => { if (req.url === "/api/health") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: true, rooms: rooms.size })); } if (req.url === "/api/lobby") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(lobby())); } const file = req.url === "/" ? "/dist/index.html" : req.url; const target = path.join(root, file); if (!target.startsWith(root) || !fs.existsSync(target)) { res.writeHead(404); return res.end("Not found"); } const ext = path.extname(target); const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" }; res.writeHead(200, { "content-type": types[ext] || "application/octet-stream" }); fs.createReadStream(target).pipe(res); });
const wss = new WebSocketServer({ server });
wss.on("connection", (socket) => { socket.on("message", (raw) => { try { const msg = JSON.parse(raw); if (msg.type === "lobby") send(socket, "lobby", { rooms: lobby() }); if (msg.type === "join") joinRoom(socket, msg); if (msg.type === "create") { const r = makeRoom(msg); joinRoom(socket, { ...msg, roomId: r.id }); } if (msg.type === "action") handleAction(socket, msg); } catch { send(socket, "error", { message: "طلب غير صالح" }); } }); socket.on("close", () => { const meta = clients.get(socket); if (meta) { const room = rooms.get(meta.roomId); const p = room?.players.find((x) => x.id === meta.playerId); if (p) p.connected = false; clients.delete(socket); if (room) broadcast(room); } }); });
server.listen(PORT, "0.0.0.0", () => console.log(`Crazy Poker server listening on ${PORT}`));
