import React from "react";
import { LobbyCard } from "./components/LobbyCard";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { db } from "../../providers/firebase";

type LobbyProps = {
  setRoomId: (value: string) => void;
  setIsPeer: (value: boolean) => void;
};

export const Lobby = ({ setRoomId, setIsPeer }: LobbyProps) => {
  const handleCreateRoom = async () => {
    const roomsRef = collection(db, "rooms");
    const roomRef = await addDoc(roomsRef, {});
    setRoomId(roomRef.id);
  };

  const handleJoinRoom = async (connectToRoomId: string) => {
    const roomRef = doc(db, "rooms", connectToRoomId);
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      setRoomId(connectToRoomId);
      setIsPeer(true);
    }
  };
  return (
    <LobbyCard
      handleCreateRoom={handleCreateRoom}
      handleJoinRoom={handleJoinRoom}
    />
  );
};
