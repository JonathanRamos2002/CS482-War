import React, { useEffect, useState, useRef } from 'react';
import { getFirestore, doc, setDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import '../Chat.css';

const Chat = ({ currentUser, friend, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const db = getFirestore();
  const messageContainerRef = useRef(null); // Ref for the message container

  console.log('Current User UID:', currentUser.uid);
  console.log('Friend UID:', friend.uid);

  useEffect(() => {
    const chatId = [currentUser.uid, friend.uid].sort().join('_');
    console.log('Generated chatId:', chatId);

    const chatDocRef = doc(db, 'chats', chatId);

    const unsubscribe = onSnapshot(chatDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMessages(data.messages || []);
        console.log('Fetched messages:', data.messages);
      } else {
        console.log('No chat document exists, initializing...');
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser.uid, friend.uid, db]);

  useEffect(() => {
    // Scroll to the bottom whenever messages are updated
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
      // Manually update local messages state for instant UI response
      setMessages((prevMessages) => [...prevMessages, messageData]);

      // Add message to Firestore
      await setDoc(
        chatDocRef,
        { messages: arrayUnion(messageData) },
        { merge: true }
      );

      console.log('Message sent:', newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">Chat with {friend.name}</div>
      <div className="message-container" ref={messageContainerRef}>
        {[...messages].reverse().map((msg, index) => (
          <p key={index} className={`message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`}>
            <strong>{msg.senderId === currentUser.uid ? 'You' : friend.name}: </strong>{msg.text}
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
