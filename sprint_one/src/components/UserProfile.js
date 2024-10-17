import React, { useState } from 'react';

function UserProfile({user, setUser, onLogout}) {
  // needed for testing
  const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg'

  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setUser((prevUser) => ({...prevUser, avatar: reader.result}));
      }
      reader.readAsDataURL(file)
    }
  }

  // onLogout functionality is handled in App.js
  // The function is received from App.js to UserProfile.js

  return (
    <div className="profile-container">
      <h1>Welcome,</h1>
      <div className="user-info">
        <img src={selectedImage || user.avatar} alt="User Avatar" className="avatar" />
        <span>{user.email}</span>
      </div>
      <p>You are now logged into your Cosmic Radiance profile.</p>
     
      <div className="input-and-button">
        <p>upload a new picture</p>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <button className="cosmic-button" onClick={onLogout}>
          Log Out
        </button>
      </div> 

    </div>
  );

}


export default UserProfile;
