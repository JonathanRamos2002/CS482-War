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
    return () => unsubscribe();
}, [db]);
    
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
      
      const joinTable = async (tableId) => {
        const tableRef = doc(db, 'tables', tableId);
        const table = tables.find(t => t.id === tableId);
        
        if (!table) return;
    
        if (table.players.length >= table.maxPlayers) {
          alert('This table is full!');
          return;
        }
    
        const userId = getCurrentUserId();
    
        if (table.players.some(p => p.id === userId)) { // checks if player is in table
          navigate('/table');
          return;
        }
    
        const currentPlayer = { // shows when the player joined table
          id: userId,
          name: getCurrentUsername(),
          joinedAt: new Date().toISOString()
        };
    
        try {
          const updatedPlayers = [...table.players, currentPlayer];
          await updateDoc(tableRef, {
            players: updatedPlayers,
            status: updatedPlayers.length >= table.maxPlayers ? 'full' : 'waiting' // status of table in lobby
          });
    
          navigate('/table');
        } catch (error) {
          console.error('Error joining table:', error);
          console.log('Current user:', { userId: getCurrentUserId(), username: getCurrentUsername(), isGuest });
          console.log('Table data:', table);
          alert('Failed to join table. Please try again.');
        }
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