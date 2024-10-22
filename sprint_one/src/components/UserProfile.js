import React, { useState } from 'react';
import {storage} from '../firebase';
import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {getFirestore, doc, updateDoc} from 'firebase/firestore';

function UserProfile({user, setUser, onLogout}) {
  const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg'
  const [selectedImage, setSelectedImage] = useState(placeholder);
  const [uploading, setUploading] = useState(false);
  const [imageFetched, setImageFetched] = useState(false);
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
          <span>Username: {user.username}</span>
        </div>
      </div>

      <p>You are now logged into your Cosmic Radiance profile.</p>
     
      <div className="upload-section">
        <h2>Upload a New Picture</h2>
        <input type ="file" accept="image/*" onChange={handleImageUpload} />
        {uploading && <p>Uploading...</p>}
      </div>

      <button className="edit-profile-button" onClick={onLogout}>
        Log Out
      </button>
    </div>
  );

}


export default UserProfile;
