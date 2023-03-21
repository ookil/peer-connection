import { Box, Grid, Typography } from "@mui/material";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Video } from "../../components/video";
import { db } from "../../providers/firebase";
import { LobbyCard } from "./components/LobbyCard";

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

type VideoType = HTMLVideoElement;

export const Lobby = () => {
  const [roomId, setRoomId] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const remoteStreamRef = useRef<VideoType | null>(null);
  const [isPeer, setIsPeer] = useState(false);

  useEffect(() => {
    const setUpLocalStream = async () => {
      const localMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setLocalStream(localMediaStream);
    };

    setUpLocalStream();
  }, []);

  const createRoom = async () => {
    try {
      const roomsRef = collection(db, "rooms");
      // create room
      const roomRef = await addDoc(roomsRef, {});

      const peerConnection = new RTCPeerConnection(configuration);
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

      const callerCandidatesCollection = collection(
        db,
        `${collections.rooms}/${roomRef.id}/${collections.callerCandidates}`
      );

      //collecting local ICE
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("Got ICE candidate: ", event.candidate);
          await addDoc(callerCandidatesCollection, event.candidate.toJSON());
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log("Created offer: ", offer);

      // update room with offer
      await updateDoc(roomRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      peerConnection.addEventListener("track", (event) => {
        console.log("Got remote track:", event.streams[0]);
        if (remoteStreamRef && remoteStreamRef?.current) {
          console.log("adding stream");
          remoteStreamRef.current.srcObject = event.streams[0];
        }
      });

      // listening for remote session description
      onSnapshot(roomRef, {
        next: async (snapshot) => {
          const data = snapshot.data();
          if (!peerConnection.currentRemoteDescription && data && data.answer) {
            console.log("Got remote description: ", data.answer);
            const rtcSessionDescription = new RTCSessionDescription(
              data.answer
            );
            await peerConnection.setRemoteDescription(rtcSessionDescription);
          }
        },
      });

      // listening for remote ICE
      const calleeCandidatesCollection = collection(
        db,
        `${collections.rooms}/${roomRef.id}/${collections.calleeCandidates}`
      );

      onSnapshot(calleeCandidatesCollection, {
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
      setRoomId(roomRef.id);
    } catch (error) {
      console.log({ error });
    }
  };

  const onJoinRoom = async (connectToRoomId: string) => {
    const roomRef = doc(db, "rooms", connectToRoomId);
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      setRoomId(connectToRoomId);
      setIsPeer(true);
    }
  };

  const joinedRoom = async (roomId: string) => {
    const roomRef = doc(db, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
      const peerConnection = new RTCPeerConnection(configuration);

      if (localStream) {
        localStream
          .getTracks()
          .forEach((track) => peerConnection.addTrack(track, localStream));
      }

      // collecting ICE
      const calleeCandidatesCollection = collection(
        db,
        `${collections.rooms}/${roomRef.id}/${collections.calleeCandidates}`
      );

      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("Got candidate: ", event.candidate);
          await addDoc(calleeCandidatesCollection, event.candidate.toJSON());
        }
        console.log("No ICE");
      };

      peerConnection.addEventListener("track", (event) => {
        console.log("Got remote track:", event.streams[0]);
        if (remoteStreamRef && remoteStreamRef?.current) {
          console.log("adding stream");
          remoteStreamRef.current.srcObject = event.streams[0];
          console.log({ when: "after", remoteStreamRef });
        }
      });

      // creating SDP answer
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

      //listening for remote ICE
      const callerCandidatesCollection = collection(
        db,
        `${collections.rooms}/${roomRef.id}/${collections.callerCandidates}`
      );

      onSnapshot(callerCandidatesCollection, {
        next: async (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              console.log(
                `Got new remote ICE candidate: ${JSON.stringify(data)}`
              );
              await peerConnection.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        },
      });

      peerConnection.onconnectionstatechange = () => {
        console.log(peerConnection.connectionState);
      };
    }
  };

  useEffect(() => {
    if (isPeer && roomId && remoteStreamRef && remoteStreamRef.current) {
      joinedRoom(roomId);
    }
  }, [roomId, remoteStreamRef, isPeer]);

  if (!roomId) {
    return (
      <LobbyCard handleCreateRoom={createRoom} handleJoinRoom={onJoinRoom} />
    );
  }

  return (
    <Box>
      <Typography sx={{ height: "50px" }}>{roomId}</Typography>
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
