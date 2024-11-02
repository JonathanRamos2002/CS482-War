import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, PlusCircle, Users } from 'lucide-react';
import { getFirestore, collection, addDoc, onSnapshot,doc,updateDoc, deleteDoc, query,orderBy} from 'firebase/firestore';
import './Lobby.css';


const Lobby = ({ user, isGuest, guestUsername }) => {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const db = getFirestore();
  
  const getCurrentUserId = () => {
    if (isGuest) {

      return `guest-${guestUsername}`; // gets guest name
    }
    return user?.uid;
  };

  const getCurrentUsername = () => { // gets user name
    if (isGuest) {
      return guestUsername;
    }
    return user?.email;
  };

  return (
    <div className="lobby-container">
      <div className="lobby-header"></div>  
      <h2>Welcome to the Lobby!</h2>
      <button onClick={() => navigate('/profile')} className="profile-button">
          <UserIcon className="profile-icon" />
        </button>

    </div>
  );
};

export default Lobby;