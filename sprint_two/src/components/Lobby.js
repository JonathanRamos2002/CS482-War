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
            },
            playerIDs: [getCurrentUserId()]
          };
    
          await addDoc(tablesRef, newTable);
        
          
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
          navigate('/table-multi');
          return;
        }
    
        const currentPlayer = { // shows when the player joined table
          id: userId,
          name: getCurrentUsername(),
          joinedAt: new Date().toISOString()
        };
    
        try {
          const updatedPlayers = [...table.players, currentPlayer];
          const updatedPlayerIDs = [...table.playerIDs, userId];
          await updateDoc(tableRef, {
            playerIDs: updatedPlayerIDs,
            players: updatedPlayers,
            status: updatedPlayers.length >= table.maxPlayers ? 'full' : 'waiting' // status of table in lobby
          });
    
          navigate('/table-multi');
        } catch (error) {
          console.error('Error joining table:', error);
          console.log('Current user:', { userId: getCurrentUserId(), username: getCurrentUsername(), isGuest });
          console.log('Table data:', table);
          alert('Failed to join table. Please try again.');
        }
      };

      const cleanupTable = async (tableId) => { // deleting live table from lobby
        try {
          const table = tables.find(t => t.id === tableId);
          if (table?.createdBy?.id === getCurrentUserId()) {
            await deleteDoc(doc(db, 'tables', tableId));
          }
        } catch (error) {
          console.error('Error deleting table:', error);
        }
      };




  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h2 className="lobby-title">Welcome to the Lobby!</h2>
        <button onClick={() => navigate('/profile')} className="profile-button">
          <UserIcon className="profile-icon" />
        </button>
      </div>

      <div className="tables-grid">
        {tables.map((table) => (
          <div key={table.id} className="table-card">
            <div className="table-header">
              <h3 className="table-title">Table #{table.id.slice(0, 4)}</h3>
              <div className="players-count">
                <Users className="w-4 h-4" />
                <span>{table.players.length}/{table.maxPlayers}</span>
              </div>
            </div>
            
            <div className="table-content">
              <div className="table-status">
                Status: <span className="capitalize">{table.status}</span>
              </div>
              {table.players.length > 0 && (
                <div className="players-list">
                  <div className="players-title">Players:</div>
                  <div className="players-tags">
                    {table.players.map(player => (
                      <span key={player.id} className="player-tag">
                        {player.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
               <div className="creator-info">
                Created by: {table.createdBy?.name}
              </div>
            </div>

            <button
              onClick={() => joinTable(table.id)}
              disabled={table.status === 'full'}
              className="join-button"
            >
              {table.status === 'full' ? 'Table Full' : 'Join Game'}
            </button>

            {table.createdBy?.id === getCurrentUserId() && (
              <button
                onClick={() => cleanupTable(table.id)}
                className="delete-button"
              >
                Delete Table
              </button>
            )}
          </div>
        ))}
        {tables.length < 6 && (
          <button onClick={createNewTable} className="create-table-button">
            <PlusCircle className="create-icon" />
            <span className="create-text">Create New Table</span>
          </button>
        )}
      </div>

      {tables.length >= 6 && (
        <p className="max-tables-message">
          Maximum number of tables reached (6)
        </p>
      )}

    </div>
  );
};
export default Lobby;