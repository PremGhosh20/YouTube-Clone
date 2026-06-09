import { io } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
const ROOM = `room-test-${Date.now()}`;
const SAME_USER = "mongo-user-123";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function connect() {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { transports: ["websocket", "polling"] });
    const t = setTimeout(() => reject(new Error("connect timeout")), 8000);
    socket.on("connect", () => {
      clearTimeout(t);
      resolve(socket);
    });
    socket.on("connect_error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

const alice = await connect();
const bob = await connect();

let bobSawAlice = false;
let offerRelay = false;
let sameAccountTwoClients = false;

bob.on("room-peers", (d) => {
  bobSawAlice = d.peers?.length === 1;
  console.log("Bob peers:", d.peers?.length);
});

bob.on("offer", () => {
  offerRelay = true;
  console.log("Bob got offer relay");
});

alice.emit("join-room", {
  roomId: ROOM,
  clientId: "client-alice",
  userId: SAME_USER,
  userName: "Prem",
});
await delay(400);

bob.emit("join-room", {
  roomId: ROOM,
  clientId: "client-bob",
  userId: SAME_USER,
  userName: "Prem",
});
await delay(400);

sameAccountTwoClients = bobSawAlice;

alice.emit("offer", {
  roomId: ROOM,
  targetClientId: "client-bob",
  offer: { type: "offer", sdp: "v=0" },
});
await delay(500);

console.log("sameAccountTwoClients:", sameAccountTwoClients);
console.log("bobSawAlice:", bobSawAlice);
console.log("offerRelay:", offerRelay);

alice.disconnect();
bob.disconnect();

if (!bobSawAlice || !sameAccountTwoClients) {
  console.error("FAIL");
  process.exit(1);
}
if (!offerRelay) {
  console.error("FAIL: offer not relayed");
  process.exit(1);
}
console.log("PASS");
process.exit(0);
