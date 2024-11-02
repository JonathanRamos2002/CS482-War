import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Chat from './Chat';
import './FriendsList.css'; 

const FriendsList = ({ currentUser }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const db = getFirestore();
  
  const fetchFriends = useCallback(async () => {
    setLoading(true);
  
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnapshot = await getDoc(userRef);
  
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const friendIDs = userData.friends || []; 
        const friendsData = [];
  
        for (const friendID of friendIDs) {
          const friendRef = doc(db, 'users', friendID);
          const friendSnapshot = await getDoc(friendRef);
          if (friendSnapshot.exists()) {
            const friendData = friendSnapshot.data();
            friendsData.push({
              uid: friendID, // Explicitly set the uid to the document ID
              ...friendData,
            });
          }
        }
  
        setFriends(friendsData);
      } else {
        console.log('User not found');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [db, currentUser.uid]); // adding dependencies to dependency array
  

  const openChat = (friend) => {
    console.log("Opening chat with friend:", friend);  // Debug log
    if (friend && friend.uid) {
      setSelectedFriend({
        uid: friend.uid,
        username: friend.username,
      });
    } else {
      console.warn("Friend UID is missing or undefined.");
    }
  };

  const closeChat = () => {
    setSelectedFriend(null);
  };

  const getDocumentNameByEmail = async (email) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      } else {
        console.log('No user found with this email');
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
      if (!friendIDToRemove) return;

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        if (Array.isArray(userData.friends)) {
          const updatedFriends = userData.friends.filter((friendID) => friendID !== friendIDToRemove);
          await updateDoc(userRef, { friends: updatedFriends });
          fetchFriends();
        }
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Automatically fetch friends when component mounts
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return (
    <div className="friends-list">
      <h2>Your Friends</h2>
      <button onClick={fetchFriends} className="edit-profile-button">View Friends</button>
      {loading && <p>Loading...</p>}
      <ul>
        {friends.map((friend) => (
          <li key={friend.uid} className="friend-item">
            <img
              src={friend.avatar || process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg'}
              alt={friend.username}
              className="friend-avatar"
            />
            <h3 className="friend-info">{friend.username}</h3>
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
