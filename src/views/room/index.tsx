import { Box, Button, Grid, Typography } from "@mui/material";
import {
  CollectionReference,
  DocumentData,
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { db } from "../../providers/firebase";

const collections = {
  rooms: "rooms",
  calleeCandidates: "calleeCandidates",
  callerCandidates: "callerCandidates",
};

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

type RoomProps = {
  roomId: string;
  isPeer: boolean;
};

export const Room = ({ roomId, isPeer }: RoomProps) => {
  const localStreamRef = useRef<HTMLVideoElement>(null);
  const remoteStreamRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [color, setColor] = useState("red");

  useEffect(() => {
    const setUpLocalStream = async () => {
      const localMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setLocalStream(localMediaStream);
      if (localStreamRef && localStreamRef.current) {
        localStreamRef.current.srcObject = localMediaStream;
      }
    };
    setUpLocalStream();
  }, [localStreamRef]);

  const handleIceCandidate =
    (collection: CollectionReference<DocumentData>) =>
    async (event: RTCPeerConnectionIceEvent) => {
      console.log("ice function");
      if (event.candidate) {
        console.log("Got ICE candidate: ", event.candidate);
        await addDoc(collection, event.candidate.toJSON());
      }
    };

  const callerCandidatesCollection = collection(
    db,
    `${collections.rooms}/${roomId}/${collections.callerCandidates}`
  );

  const peerCandidatesCollection = collection(
    db,
    `${collections.rooms}/${roomId}/${collections.calleeCandidates}`
  );

  const handleConnection = async () => {
    const peerConnection = new RTCPeerConnection(configuration);

    const roomRef = doc(db, "rooms", roomId);
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log({ state });
    };

    // adds a new media track to the set of tracks which will be transmitted to the other peer
    if (localStream) {
      localStream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, localStream));
    }

    // collecting local ICE and storing in collection
    const collection = isPeer
      ? peerCandidatesCollection
      : callerCandidatesCollection;
    peerConnection.onicecandidate = handleIceCandidate(collection);

    const roomSnap = await getDoc(roomRef);

    // listening for remote session description
    onSnapshot(roomRef, {
      next: async (snapshot) => {
        const data = snapshot.data();
        if (!peerConnection.currentRemoteDescription && data && data.answer) {
          console.log("Got remote description: ", data.answer);
          const rtcSessionDescription = new RTCSessionDescription(data.answer);
          await peerConnection.setRemoteDescription(rtcSessionDescription);
        }
      },
    });

    // create offer if caller
    if (!isPeer) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log({ localDes: peerConnection.localDescription });
      console.log("Created offer: ", offer);

      // update room with offer
      await updateDoc(roomRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });
    }

    // create answer
    if (isPeer && roomSnap.exists()) {
      const offer = roomSnap.data().offer;
      console.log("Got offer: ", offer);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      await updateDoc(roomRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });
    }

    // ADD REMOTE TRACK
    peerConnection.addEventListener("track", (event) => {
      console.log("Got remote track:", event.streams[0]);
      if (remoteStreamRef && remoteStreamRef?.current) {
        console.log("adding stream");
        remoteStreamRef.current.srcObject = event.streams[0];
      }
    });

    // listening for remote ICE
    const remoteIceCollection = isPeer
      ? callerCandidatesCollection
      : peerCandidatesCollection;

    onSnapshot(remoteIceCollection, {
      next: async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            let data = change.doc.data();
            console.log(
              `Got new remote ICE candidate: ${JSON.stringify(data)}`
            );
            await peerConnection.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      },
    });
  };

  return (
    <Box>
      <Typography sx={{ height: "50px" }}>{roomId}</Typography>
      <Button style={{ color }} onClick={handleConnection}>
        Handle Connection
      </Button>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <video
            ref={localStreamRef}
            style={{ background: "black" }}
            autoPlay
            playsInline
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <video
            ref={remoteStreamRef}
            style={{ background: "black" }}
            autoPlay
          />
        </Grid>
      </Grid>
    </Box>
  );
};
