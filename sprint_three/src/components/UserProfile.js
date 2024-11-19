import React, { useState } from 'react';
import { storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import './UserProfile.css';
import { increment } from 'firebase/firestore';

// Increment wins dynamically
export const incrementWins = async (db, currentUser) => {
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();

      // If the wins field does not exist, initialize it to 0 before incrementing
      if (userData.wins === undefined) {
        await updateDoc(userRef, { wins: 0 });
      }
      if (userData.losses === undefined) {
        await updateDoc(userRef, {losses: 0});
      }

      // Increment the wins field
      await updateDoc(userRef, {
        wins: increment(1),
      });
      console.log('Wins incremented by 1.');
    } else {
      console.error('User document does not exist.');
    }
  } catch (error) {
    console.error('Error incrementing wins:', error);
  }
};

// Increment losses dynamically
export const incrementLosses = async (db, currentUser) => {
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();

      // If the losses field does not exist, initialize it to 0 before incrementing
      if (userData.losses === undefined) {
        await updateDoc(userRef, { losses: 0 });
      }
      if (userData.wins === undefined) {
        await updateDoc(userRef, {wins: 0});
      }

      // Increment the losses field
      await updateDoc(userRef, {
        losses: increment(1),
      });
      console.log('Losses incremented by 1.');
    } else {
      console.error('User document does not exist.');
    }
  } catch (error) {
    console.error('Error incrementing losses:', error);
  }
};


function UserProfile({ user, setUser, selectedImage, setSelectedImage, onLogout }) {
  const [imageFetched, setImageFetched] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showStats, setShowStats] = useState(false); // State to control stats display
  const [wins, setWins] = useState(0); // State to store wins
  const [losses, setLosses] = useState(0); // State to store losses
  const [isAdmin, setIsAdmin] = useState(false);
  const [newUsername, setNewUsername] = useState(user.email || '');
  const [newEmail, setNewEmail] = useState(user.email || '');
  const db = getFirestore();

  const fetchProfileImage = async () => {
    if (!imageFetched) {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      try {
        const url = await getDownloadURL(storageRef);
        setSelectedImage(url);
        setImageFetched(true);
      } catch (error) {
        console.log('avatar not found, using placeholder:', error.message);
      }
    }
  };

  fetchProfileImage();

  const [username, setUsername] = useState(user.email || '');

  const getUsername = async () => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const myUsername = userData.username;
        setUsername(myUsername);
        setIsAdmin(userData.isAdmin || false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  getUsername();

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username: newUsername,
        email: newEmail,
      });
      setUser((prevUser) => ({
        ...prevUser,
        username: newUsername,
        email: newEmail,
      }));
      setIsEditing(false);
    } catch (error) {
      console.error('error updating profile:', error);
    }
  };

  const handleCancelEdit = () => {
    setNewUsername(user.username || '');
    setNewEmail(user.email || '');
    setIsEditing(false);
  };

  // Fetch stats from Firebase or create default if not present
  const getUserStats = async () => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        setWins(userData.wins || 0);
        setLosses(userData.losses || 0);
      } else {
        // If no document exists, create it with default values
        await setDoc(userRef, { wins: 0, losses: 0 }, { merge: true });
        setWins(0);
        setLosses(0);
        console.log("New stats document created for user.");
      }
    } catch (error) {
      console.error("Error fetching or creating user stats:", error);
    }
  };

  const toggleStats = () => {
    if (!showStats) {
      getUserStats(); // Fetch stats only when displaying for the first time
    }
    setShowStats(!showStats); // Toggle stats visibility
  };

  return (
    <div className="profile-container">
      <div className="user-info">
        <img src={selectedImage} alt="User Avatar" className="avatar" />
      </div>

      <h1>Welcome, {username} !</h1>

      <div className="profile-update-section">
        {!isEditing ? (
          <>
            <button 
              className="edit-profile-button"
              onClick={() => setIsEditing(true)}
            >
              Update Profile
            </button>
            <button
              className="display-stats-button" // New stats button
              onClick={toggleStats}
            >
              {showStats ? 'Hide Stats' : 'Display Stats'}
            </button>
            {isAdmin && (
              <button className="ads-button"
              onClick={() => window.location.href = '/admin-ads'}
              >Ads</button>
            )}
          </>
        ) : (
          <div className="edit-profile-form">
            <h2>Update Your Profile</h2>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label htmlFor="username"> Username:</label>
                <input
                  type="text"
                  id="username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                />
              </div>
              <div className="button-group">
                <button type="submit" className="save-button">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showStats && ( // Conditionally render stats section
        <div className="stats-section">
          <h3>Your Stats</h3>
          <p>Wins: {wins}</p>
          <p>Losses: {losses}</p>
        </div>
      )}

      {isConfirming ? (
        <div className="logout-confirmation">
          <p>Are you sure you want to log out?</p>
          <button onClick={onLogout} className="confirm-logout-button">
            Yes, Log Out
          </button>
          <button onClick={() => setIsConfirming(false)} className="cancel-logout-button">
            Cancel
          </button>
        </div>
      ) : (
        <button className="logout-button" onClick={() => setIsConfirming(true)}>
          Log Out
        </button>
      )}
    </div>
  );
}

export default UserProfile;
