import React from "react";
import { Grid, Typography } from "@mui/material";
import { Video } from "../../components/video";
import { Box } from "@mui/system";

type RoomProps = {
  roomId: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
};

export const Room = ({ roomId, localStream, remoteStream }: RoomProps) => {
  return (
    <Box>
      <Typography sx={{height: '50px'}} >{roomId}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Video
            srcObject={localStream}
            style={{ background: "black" }}
            autoPlay
            playsInline
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Video
            srcObject={remoteStream}
            style={{ background: "black" }}
            autoPlay
            playsInline
          />
        </Grid>
      </Grid>
    </Box>
  );
};
