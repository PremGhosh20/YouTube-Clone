const rooms = new Map();
 


function getRoom(roomId) {

  if (!rooms.has(roomId)) {

    rooms.set(roomId, new Map());

  }

  return rooms.get(roomId);

}



export function setupCallSignaling(io) {

  io.on("connection", (socket) => {

    socket.on("join-room", ({ roomId, clientId, userId, userName }) => {

      if (!roomId || !clientId) return;



      const room = getRoom(roomId);

      const peers = [...room.values()].filter((p) => p.clientId !== clientId);



      socket.join(roomId);

      socket.data.roomId = roomId;

      socket.data.clientId = clientId;

      socket.data.userId = userId || "guest";

      socket.data.userName = userName || "Guest";



      room.set(clientId, {

        socketId: socket.id,

        clientId,

        userId: socket.data.userId,

        userName: socket.data.userName,

      });



      socket.to(roomId).emit("user-joined", {

        clientId,

        userId: socket.data.userId,

        userName: socket.data.userName,

      });



      socket.emit("room-peers", {

        peers: peers.map((p) => ({

          clientId: p.clientId,

          userId: p.userId,

          userName: p.userName,

        })),

      });

    });



    socket.on("offer", ({ roomId, targetClientId, offer }) => {

      const room = getRoom(roomId);

      const target = room.get(targetClientId);

      if (target) {

        io.to(target.socketId).emit("offer", {

          fromClientId: socket.data.clientId,

          fromUserId: socket.data.userId,

          fromUserName: socket.data.userName,

          offer,

        });

      }

    });



    socket.on("answer", ({ roomId, targetClientId, answer }) => {

      const room = getRoom(roomId);

      const target = room.get(targetClientId);

      if (target) {

        io.to(target.socketId).emit("answer", {

          fromClientId: socket.data.clientId,

          answer,

        });

      }

    });



    socket.on("ice-candidate", ({ roomId, targetClientId, candidate }) => {

      const room = getRoom(roomId);

      const target = room.get(targetClientId);

      if (target) {

        io.to(target.socketId).emit("ice-candidate", {

          fromClientId: socket.data.clientId,

          candidate,

        });

      }

    });



    socket.on("screen-share", ({ roomId, active }) => {
      if (!roomId || !socket.data.clientId) return;
      socket.to(roomId).emit("peer-screen-share", {
        clientId: socket.data.clientId,
        userName: socket.data.userName,
        active: Boolean(active),
      });
    });

    socket.on("leave-room", () => {
      handleDisconnect(socket, io);
    });



    socket.on("disconnect", () => {

      handleDisconnect(socket, io);

    });

  });

}



function handleDisconnect(socket, io) {

  const { roomId, clientId } = socket.data;

  if (!roomId || !clientId) return;



  const room = rooms.get(roomId);

  if (room) {

    room.delete(clientId);

    if (room.size === 0) {

      rooms.delete(roomId);

    } else {

      io.to(roomId).emit("user-left", { clientId });

    }

  }

}

