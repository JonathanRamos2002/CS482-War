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

  useEffect(() => {
    const tablesRef = collection(db, 'tables');
    const tablesQuery = query(tablesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(tablesQuery, (snapshot) => {
      const updatedTables = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTables(updatedTables);
    });
    
    const createNewTable = async () => {
        if (tables.length >= 6) return;
        
        try {
          const tablesRef = collection(db, 'tables');
          const newTable = {
            players: [{  // creator gets added (needs to add host functionality later)
              id: getCurrentUserId(),
              name: getCurrentUsername(),
              joinedAt: new Date().toISOString()
            }],
            maxPlayers: 2,
            status: 'waiting',
            createdAt: new Date().toISOString(),
            createdBy: {
              id: getCurrentUserId(),
              name: getCurrentUsername()
            }
          };
    
          await addDoc(tablesRef, newTable);
          navigate('/table');  
        } catch (error) {
          console.error('Error creating table:', error);
          alert('Failed to create table. Please try again.');
        }
      };


    return () => unsubscribe();
  }, [db]);



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