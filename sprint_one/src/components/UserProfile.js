import React, { useState } from 'react';
import {storage} from '../firebase';
import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';


function UserProfile({user, setUser, onLogout}) {
  const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg'
  const [selectedImage, setSelectedImage] = useState(placeholder);
  const [uploading, setUploading] = useState(false);
  const [imageFetched, setImageFetched] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false)

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
      } catch (error) {
        console.error('error uploading image:', error.message);
      } finally {
        setUploading(false); // Uploading failed completely
      }

    }
  }

  const handleUsernameChange = () => {
    console.log('implement username updating here')
  }


  // onLogout functionality is handled in App.js
  // The function is received from App.js to UserProfile.js

  return (
    <div className="profile-container">
      <h1>Welcome, {user.username || 'User'} !</h1>
      <div className="user-info">
        <img src={selectedImage} alt="User Avatar" className="avatar" />
        <div className="user-details">
          <span>Email: {user.email}</span>
          <span>Username: {user.username || 'N/A'}</span>
        </div>
      </div>

      <p>You are now logged into your Cosmic Radiance profile.</p>
     
      <div className="upload-section">
        <h2>Upload a New Picture</h2>
        <input type ="file" accept="image/*" onChange={handleImageUpload} />
        {uploading && <p>Uploading...</p>}
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
        <button onClick={onLogout} className="confirm-logout-button">Yes, Log Out</button>
        <button onClick={() => setIsConfirming(false)} className="cancel-logout-button">Cancel</button>
      </div>
    ) : (
      <button className="edit-profile-button" onClick={() => setIsConfirming(true)}>
        Log Out
      </button>
    )}
    </div>
  );

}


export default UserProfile;
