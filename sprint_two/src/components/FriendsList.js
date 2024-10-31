import React, { useState } from 'react';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Chat from './Chat';

const FriendsList = ({ currentUser }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const db = getFirestore();


  const fetchFriends = async () => {
    setLoading(true);
  
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnapshot = await getDoc(userRef);

      if(userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const friendIDs = userData.friends || []; // if no friends then empty array
        const friendsData = [];
        
        for (const friendID of friendIDs) {
          const friendRef = doc(db, 'users', friendID);
          const friendSnapshot = await getDoc(friendRef);
          if(friendSnapshot.exists()) {
            friendsData.push(friendSnapshot.data());
          }
        
        }
    
        setFriends(friendsData);
      } else {
        console.log('user not found');
      }

    } catch(error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (friend) => {
    setSelectedFriend(friend);
  };

  const closeChat = () => {
    setSelectedFriend(null);
  };

  
  const getDocumentNameByEmail = async (email) => {
    const db = getFirestore();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));

   try {
     const querySnapshot = await getDocs(q);
     if(!querySnapshot.empty) {
       const userDoc = querySnapshot.docs[0];
       //console.log(`Document Name for Email ${email} is ${userDoc.id}`);
       return userDoc.id;
     } else {
       console.log('no user found with this email');
       return null;
     }
   } catch (error) {
     console.error(error);
     return null;
   }
  };

  
  const handleRemoveFriend = async (friendEmailToRemove) => {
    try {
      const friendIDToRemove = await getDocumentNameByEmail(friendEmailToRemove);
      if (!friendIDToRemove) {
        console.log('friend ID not found');
        return;
      }

      //console.log(friendIDToRemove);
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnapshot = await getDoc(userRef);
 
      if(userSnapshot.exists()) {
        const userData = userSnapshot.data();

        if(Array.isArray(userData.friends)){
          const updatedFriends = userData.friends.filter((friendID) => friendID !== friendIDToRemove);
          console.log('updated friends list:', updatedFriends);

          await updateDoc(userRef, {
            friends: updatedFriends
          });
          
          console.log('friend removed successfully');
          fetchFriends();
        } else {
          console.log('No friends list found in user document');
        }
      } else {
        console.log('User not found');
      }    
    } catch (error) {
      console.error('error removing friend:', error);
    }
  };

  return (
    <div className="friends-list">
      <h2>Your Friends</h2>
      <button onClick={fetchFriends} className="edit-profile-button">View Friends</button>
      {loading && <p>Loading...</p>}
      <ul>
        {friends.map((friend) => (
          <li key={friend.email} className="friend-item">
            <img
              src={friend.avatar || process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg'}
              alt={friend.username}
              className="friend-avatar"
            />
            <h3>{friend.username}</h3>
            <div className="friend-actions">
            <button className="message-friend-button" onClick={() => openChat(friend)}>
                Message Friend
              </button>
              <button className="remove-friend-button" onClick={() => handleRemoveFriend(friend.email)}>
                Remove Friend
              </button>
            </div>
          </li>
        ))}
      </ul>

      {selectedFriend && (
        <Chat
          currentUser={currentUser}
          friend={selectedFriend}
          onClose={closeChat}
        />
      )}
    </div>
  );
};

export default FriendsList;