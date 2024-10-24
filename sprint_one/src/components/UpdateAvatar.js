import React, { useState } from 'react';
import {storage} from '../firebase';
import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {getFirestore, doc, updateDoc} from 'firebase/firestore';


function UpdateAvatar({user, setUser, selectedImage, setSelectedImage}) {
  const [uploading, setUploading] = useState(false);
  const db = getFirestore();

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
          avatar: selectedImage,
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

  return(
    <div className="upload-picture-container">
      <h2>Upload a New Picture</h2>
        <input type="file" accept="image/*" onChange={handleImageUpload} className="edit-profile-button" />
          {uploading && <p>Uploading...</p>}
    </div>
  );
}

export default UpdateAvatar;
