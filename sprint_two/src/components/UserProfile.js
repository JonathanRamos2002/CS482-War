import React, { useState } from 'react';
import {storage} from '../firebase';
import {ref, getDownloadURL} from 'firebase/storage';
import {getFirestore, doc, getDoc, updateDoc} from 'firebase/firestore';

function UserProfile({user, setUser, selectedImage, setSelectedImage, onLogout}) {
  const [imageFetched, setImageFetched] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user.email || '');
  const [newEmail, setNewEmail] = useState(user.email || '');
  const db = getFirestore();

  const fetchProfileImage = async () => {
    if(!imageFetched) { 
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

  /**
   * Summary: Obtains the username of the account logged in
   * Purpose: Sets the username usestate to the username found in the firestore
   */
  const getUsername = async () => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userRef);
  
      if(userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const myUsername = userData.username;
        setUsername(myUsername);
      }
    } catch (error){
      console.error(error);
    }
  };

  getUsername();

  /**
 * Updates user profile information in Firestore and local state
 * @param {React.FormEvent} e 
 * @returns {Promise<void>}
 * @throws {FirebaseError} When database update fails
 * @example
 * handleProfileUpdate(event) 
 */
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    try {
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, { // Updated the document in Firestore
        username: newUsername,
        email: newEmail
      });

      setUser((prevUser) => ({  // Updated local state
        ...prevUser,
        username: newUsername,
        email: newEmail,
      }));

      setIsEditing(false);
    } catch (error) {
      console.error('error updating profile:', error);
    }
  };
  /**
 * Resets form fields to original values 
 * @returns {void}
 * @example
 * handleCancelEdit() 
 */
  const handleCancelEdit = () => {
    setNewUsername(user.username || '');
    setNewEmail(user.email || '');
    setIsEditing(false);
  };
  // onLogout functionality is handled in App.js
  // The function is received from App.js to UserProfile.js

  return (
    <div className="profile-container">
      <div className="user-info">
        <img src={selectedImage} alt="User Avatar" className="avatar" />
      </div>

      <h1>Welcome, {username} !</h1>

      {/* TODO : Ayo update profile functionality */}
      <div className="profile-update-section">
        {!isEditing ? (
          <button 
            className="edit-profile-button"
            onClick={() => setIsEditing(true)}
          >
            Update Profile
          </button>
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

      {/* TODO : Ayo logout functionality */}
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
