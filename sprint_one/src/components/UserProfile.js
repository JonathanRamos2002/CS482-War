import React, { useState } from 'react';
import {storage} from '../firebase';
import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {getFirestore, doc, updateDoc} from 'firebase/firestore';

function UserProfile({user, setUser, onLogout}) {
  const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg'
  const [selectedImage, setSelectedImage] = useState(placeholder);
  const [uploading, setUploading] = useState(false);
  const [imageFetched, setImageFetched] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username || '');
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

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploading(true);
      const storageRef = ref(storage, `avatars/${user.uid}`);
      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        setSelectedImage(downloadURL);
        setUser((prevUser) => ({
          ...prevUser, 
          avatar: downloadURL,
        }));

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          avatar: downloadURL
        });

      } catch (error) {
        console.error('error uploading image:', error.message);
      } finally {
        setUploading(false); // Uploading failed completely
      }

    }
  }
  
 
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

  const handleCancelEdit = () => {
    setNewUsername(user.username || '');
    setNewEmail(user.email || '');
    setIsEditing(false);
  };
  // onLogout functionality is handled in App.js
  // The function is received from App.js to UserProfile.js

  return (
    <div className="profile-container">
      <h1>Welcome, {user.username || 'User'} !</h1>
      <div className="user-info">
        <img src={selectedImage} alt="User Avatar" className="avatar" />
        <div className="user-details">
          <span>Email: {user.email}</span>
          <span>Username: {user.username}</span>
        </div>
      </div>

      <p>You are now logged into your Cosmic Radiance profile.</p>
     
      <div className="upload-section">
        <h2>Upload a New Picture</h2>
        <input type ="file" accept="image/*" onChange={handleImageUpload} />
        {uploading && <p>Uploading...</p>}
      </div>
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


      <div className="friends-section">
      <h2>Your Friends</h2>
        <button className="view-friends-button">View Friends</button>
        {/* Render friends list here if needed */}
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
