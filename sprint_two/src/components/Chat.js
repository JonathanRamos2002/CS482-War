// Chat.js
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import '../Chat.css';

const Chat = ({ currentUser, friend, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const db = getFirestore();

  console.log('currentUser:', currentUser);
  console.log('friend:', friend);

  useEffect(() => {
    const chatId = [currentUser.uid, friend.uid].sort().join('_');
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [currentUser.uid, friend.uid, db]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const chatId = [currentUser.uid, friend.uid].sort().join('_');
    const messagesRef = collection(db, 'chats', chatId, 'messages');

    try {
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: newMessage,
        timestamp: new Date(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h2>Chat with {friend.username || 'Unknown User'}</h2>
        <button onClick={onClose} className="close-chat-button">Close Chat</button>
      </header>

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}
          >
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="chat-form">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
};

export default Chat;
