import React, { useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const FriendsList = ({ currentUser }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="friends-list">
      <h2>Your Friends</h2>
      <button onClick={fetchFriends}>View Friends</button>
      {loading && <p>Loading...</p>}
      <ul>
        {friends.map((friend) => (
          <li key={friend.id} className="friend-item">
            <img 
               src={friend.avatar || process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg'} 
               alt={friend.username}
               className="friend-avatar"
             />
            {friend.username} [{friend.email}]
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FriendsList;

