import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import './AdminMessage.css';

const AdminMessage = ({ user }) => {
  const [message, setMessage] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const db = getFirestore();

  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setIsAdmin(userSnap.data().isAdmin === true);
          console.log("Admin status:", userSnap.data().isAdmin); // THIS HIP TOO
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };

    checkAdminStatus();
  }, [user, db]);

  useEffect(() => {
    const messagesRef = collection(db, 'adminMessages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentMessage(snapshot.docs[0].data().text);
        console.log("Current message:", snapshot.docs[0].data().text); 
      }
    });

    return () => unsubscribe();
  }, [db]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      await addDoc(collection(db, 'adminMessages'), {
        text: message,
        timestamp: new Date(),
        sentBy: user.email || user.username
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="admin-message-container">
  
      {currentMessage && (
        <div className="message-display">
          <div className="message-text">{currentMessage}</div>
        </div>
      )}

      {isAdmin && (
        <div className="admin-input">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter admin message..."
            className="message-input"
          />
          <button onClick={sendMessage} className="send-button">
            Send
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminMessage;