import React, { useState, useEffect } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';

const AdminAds = () => {
  const [adImageURL, setAdImageURL] = useState('');
  const [adTargetURL, setAdTargetURL] = useState('');
  const [ads, setAds] = useState([]);

  // Function to handle adding a new ad
  const handleAddAd = async () => {
    if (!adImageURL || !adTargetURL) {
      alert('Please provide both Image URL and Target URL.');
      return;
    }

    const newAd = {
      imageURL: adImageURL,
      targetURL: adTargetURL,
      isActive: true,
    };

    const adRef = firebase.firestore().collection('ads').doc();
    await adRef.set(newAd);
    alert('Ad added successfully!');
    setAdImageURL('');
    setAdTargetURL('');
  };

  // Function to handle removing an ad
  const handleRemoveAd = async (adId) => {
    const adRef = firebase.firestore().collection('ads').doc(adId);
    await adRef.update({ isActive: false });
    alert('Ad removed successfully!');
  };

  // Fetch active ads from Firestore
  useEffect(() => {
    const fetchAds = async () => {
      const adsSnapshot = await firebase.firestore().collection('ads')
        .where('isActive', '==', true)
        .get();

      const adsList = adsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(adsList);
    };

    fetchAds();
  }, []);

  return (
    <div className="admin-ads-panel">
      <h2>Manage Advertisements</h2>

      <div className="ad-inputs">
        <input 
          type="text" 
          placeholder="Ad Image URL" 
          value={adImageURL} 
          onChange={(e) => setAdImageURL(e.target.value)} 
        />
        <input 
          type="text" 
          placeholder="Target URL" 
          value={adTargetURL} 
          onChange={(e) => setAdTargetURL(e.target.value)} 
        />
        <button onClick={handleAddAd}>Add Ad</button>
      </div>

      <div className="active-ads">
        <h3>Active Ads</h3>
        {ads.map((ad) => (
          <div key={ad.id} className="ad-item">
            <img src={ad.imageURL} alt="Ad" />
            <button onClick={() => handleRemoveAd(ad.id)}>Remove Ad</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAds;
