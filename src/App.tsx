import { Box } from "@mui/system";
import React, { useState } from "react";
import { Lobby } from "./views/lobby/index-new";
import { Room } from "./views/room";

function App() {
  const [roomId, setRoomId] = useState("");
  const [isPeer, setIsPeer] = useState(false);
  return (
    <Box width="100vw" height="100vh">
      {roomId ? (
        <Room roomId={roomId} isPeer={isPeer} />
      ) : (
        <Lobby setIsPeer={setIsPeer} setRoomId={setRoomId} />
      )}
    </Box>
  );
}

export default App;
