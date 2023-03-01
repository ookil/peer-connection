import { Box } from "@mui/system";
import React from "react";
import { Lobby } from "./views/lobby";
import { Room } from "./views/room";

function App() {
  return (
    <Box width="100vw" height="100vh">
      <Lobby />
      {/* <Room /> */}
    </Box>
  );
}

export default App;
