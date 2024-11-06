import React, { useEffect, useState, useRef } from 'react';
import { getFirestore, doc, setDoc, arrayUnion, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import '../Chat.css';

const Chat = ({ currentUser, friend, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const db = getFirestore();
  const messageContainerRef = useRef(null);

  useEffect(() => {
    const sortedUids = [currentUser.uid, friend.uid].sort();
    console.log("Sorted UIDs:", sortedUids);
    const chatId = sortedUids.join('_');

    const chatDocRef = doc(db, 'chats', chatId);

    const unsubscribe = onSnapshot(chatDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log("Fetched messages:", data.messages);
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser.uid, friend.uid, db]);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const chatId = [currentUser.uid, friend.uid].sort().join('_');
    const chatDocRef = doc(db, 'chats', chatId);

    const messageData = {
      senderId: currentUser.uid,
      text: newMessage,
      timestamp: new Date(),
    };

    try {
      const chatDoc = await getDoc(chatDocRef);
      if (!chatDoc.exists()) {
        await setDoc(chatDocRef, { messages: [] });
      }

      await updateDoc(chatDocRef, {
        messages: arrayUnion(messageData),
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  return (
    <div className="chat-container">
      <div className="chat-header">
        Chat With {friend && friend.username ? friend.username : "Friend"}
        </div>
      <div className="message-container" ref={messageContainerRef}>
        {[...messages].map((msg, index) => (
          <p key={index} className={`message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`}>
            <strong>{msg.senderId === currentUser.uid ? 'You' : friend.username}: </strong>{msg.text}
          </p>
        ))}
      </div>
      <div className="chat-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="chat-input"
        />
        <button type="submit" className="send-button" onClick={handleSendMessage}>Send</button>
      </div>
      <button className="close-chat" onClick={onClose}>Close Chat</button>
    </div>
  );
};

export default Chat;
