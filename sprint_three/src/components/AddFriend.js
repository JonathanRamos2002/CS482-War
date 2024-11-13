import React, { useState } from 'react';
import { getFirestore, collection, query, where, getDocs, getDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import './AddFriend.css'; 

const AddFriend = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const db = getFirestore();

  const searchUser = async () => {
    setLoading(true);
    setError('');
    setFoundUser(null);

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', searchTerm));
    const querySnapshot = await getDocs(q);
    setLoading(false);

    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        setFoundUser({ id: doc.id, ...doc.data() });
        setError('');
      });
    } else {
      setFoundUser(null);
      setError('User not found');
    }
  };

  const addFriend = async () => {
    if (foundUser) {
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const currentUserSnap = await getDoc(currentUserRef);

      if(!currentUserSnap.exists()) {
        setError('User data not found');
        return;
      }

      const currentUserData = currentUserSnap.data();

      if(currentUser.uid === foundUser.id){
        setError('unable to add yourself as a friend!')
        return;
      }

      if(currentUserData.friends && currentUserData.friends.includes(foundUser.id)) {
        setError('this user is already your friend!');
        return;
      }

      await updateDoc(currentUserRef, {
        friends: arrayUnion(foundUser.id), // Add the friend's userId to the friends array
      });
      alert(`${foundUser.username} added as a friend!`);
      setFoundUser(null);
      setSearchTerm('');
      setError('');
    }
  };

  return (
    <div className="add-friend-container">
      <h2>Add Friend</h2>
      <input
        type="email"
        placeholder="Enter Email"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="email-input"
      />
      <button onClick={searchUser} disabled={loading} className="add-friend-button">
        {loading ? 'Searching...' : 'Search'}
      </button>

      {error && <p className="error-message">{error}</p>}
      {foundUser && (
        <div className="found-user">
          <p className="found-message">Found:  {foundUser.email}</p>
          {foundUser.profilePicture && (<img src={foundUser.profilePicture} alt="Profile" className="profile-picture" />)}

          <button onClick={addFriend} className="add-friend-button">Add Friend</button>
        </div>
      )}
    </div>
  );
};

export default AddFriend;

