/**
 * Automated signaling test: two clients join same room, offer/answer flow.
 * Run: node scripts/test-signaling.mjs (server must be on :5000)
 */
import { io } from "socket.io-client";

const URL = process.env.API_URL || "http://127.0.0.1:5000";
const ROOM = "room-test-" + Date.now();

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function connectClient(name) {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { transports: ["websocket", "polling"] });
    const timeout = setTimeout(() => reject(new Error(`${name} connect timeout`)), 8000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      resolve({ socket, name });
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function main() {
  console.log("Testing Socket.IO signaling at", URL);

  const alice = await connectClient("Alice");
  const bob = await connectClient("Bob");

  let bobGotPeers = false;
  let offerReceived = false;

  bob.socket.on("room-peers", (data) => {
    bobGotPeers = data.peers?.length === 1;
    console.log("Bob room-peers:", data.peers?.length, "peer(s)");
  });

  bob.socket.on("offer", () => {
    offerReceived = true;
    console.log("Bob received offer");
  });

  alice.socket.emit("join-room", {
    roomId: ROOM,
    clientId: "client-alice",
    userId: "user-same",
    userName: "Alice",
  });

  await delay(300);

  bob.socket.emit("join-room", {
    roomId: ROOM,
    clientId: "client-bob",
    userId: "user-same",
    userName: "Bob",
  });

  await delay(500);

  const fakeOffer = { type: "offer", sdp: "v=0\r\n" };
  alice.socket.emit("offer", {
    roomId: ROOM,
    targetClientId: "client-bob",
    offer: fakeOffer,
  });

  await delay(800);

  console.log("\n--- Results ---");
  console.log("Bob saw peer (same userId, different clientId):", bobGotPeers);
  console.log("Signaling relay:", offerReceived ? "offer OK" : "offer MISSING");

  alice.socket.disconnect();
  bob.socket.disconnect();

  if (!bobGotPeers) {
    console.error("FAIL: Bob did not receive room-peers with Alice");
    process.exit(1);
  }
  if (!offerReceived) {
    console.error("FAIL: offer not relayed");
    process.exit(1);
  }
  console.log("PASS: Signaling room join works");
  process.exit(0);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
