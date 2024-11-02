import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, PlusCircle, Users } from 'lucide-react';
import { getFirestore, collection, addDoc, onSnapshot,doc,updateDoc, deleteDoc, query,orderBy} from 'firebase/firestore';
import './Lobby.css';

const Lobby = ({ user, isGuest, guestUsername }) => {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const db = getFirestore();


  return (
    <div className="lobby-container">
      <h2>Welcome to the Lobby!</h2>
    </div>
  );
};

export default Lobby;