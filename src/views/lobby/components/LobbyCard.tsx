import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState } from "react";

type LobbyCardProps = {
  handleCreateRoom: VoidFunction;
  handleJoinRoom: (roomId: string) => void;
};

export const LobbyCard = ({
  handleCreateRoom,
  handleJoinRoom,
}: LobbyCardProps) => {
  const [roomId, setRoomId] = useState("");

  return (
    <Box
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Card sx={{ width: "500px" }}>
        <CardContent
          sx={{ gap: "16px", display: "flex", flexDirection: "column" }}
        >
          <Typography>Lobby</Typography>
          <Button variant="contained" onClick={handleCreateRoom}>
            Create Room
          </Button>
          <Divider />
          <Box display="flex" flexDirection="column" gap="16px">
            <TextField
              variant="outlined"
              label="Room ID"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
            />
            <Button variant="contained" onClick={() => handleJoinRoom(roomId)}>
              Join Room
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
