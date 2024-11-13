import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chat from './Chat';
import { getFirestore, doc, setDoc, arrayUnion, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';

// Mock CSS
jest.mock('../Chat.css', () => ({}));

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => 'mock-db'),
  doc: jest.fn(),
  setDoc: jest.fn(),
  arrayUnion: jest.fn(data => data),
  onSnapshot: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn()
}));

describe('Chat Component', () => {
  const mockCurrentUser = {
    uid: 'user1',
    name: 'Current User'
  };

  const mockFriend = {
    uid: 'user2',
    name: 'Friend User'
  };

  const mockMessages = [
    {
      senderId: 'user1',
      text: 'Hello!',
      timestamp: new Date()
    },
    {
      senderId: 'user2',
      text: 'Hi there!',
      timestamp: new Date()
    }
  ];

  const mockOnClose = jest.fn();
  let unsubscribeMock;

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribeMock = jest.fn();
    console.error = jest.fn();

    // Mock chat document reference
    doc.mockReturnValue('mock-chat-doc');

    // Mock onSnapshot
    onSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        data: () => ({ messages: mockMessages })
      });
      return unsubscribeMock;
    });
  });

  const renderChat = () => {
    const utils = render(
      <Chat
        currentUser={mockCurrentUser}
        friend={mockFriend}
        onClose={mockOnClose}
      />
    );

    return {
      ...utils,
      messageInput: screen.getByPlaceholderText('Type your message...'),
      sendButton: screen.getByText('Send'),
      closeButton: screen.getByText('Close Chat')
    };
  };

  test('renders chat interface correctly', async () => {
    renderChat();

    expect(screen.getByText(`Chat with ${mockFriend.name}`)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByText('Close Chat')).toBeInTheDocument();
  });

  test('loads and displays messages', async () => {
    renderChat();

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
  });

  test('handles message input changes', () => {
    const { messageInput } = renderChat();

    fireEvent.change(messageInput, { target: { value: 'New message' } });
    expect(messageInput.value).toBe('New message');
  });

  test('sends message successfully', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true
    });

    const { messageInput, sendButton } = renderChat();

    fireEvent.change(messageInput, { target: { value: 'New message' } });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(updateDoc).toHaveBeenCalled();
    expect(messageInput.value).toBe('');
  });

  test('creates new chat document if not exists', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false
    });

    const { messageInput, sendButton } = renderChat();

    fireEvent.change(messageInput, { target: { value: 'First message' } });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(setDoc).toHaveBeenCalledWith('mock-chat-doc', { messages: [] });
    expect(updateDoc).toHaveBeenCalled();
  });

  test('handles empty message submission', async () => {
    const { sendButton } = renderChat();

    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(updateDoc).not.toHaveBeenCalled();
  });

  test('handles message send error', async () => {
    const error = new Error('Failed to send message');
    getDoc.mockRejectedValueOnce(error);

    const { messageInput, sendButton } = renderChat();

    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(console.error).toHaveBeenCalledWith('Error sending message:', error);
  });

  test('closes chat when close button clicked', () => {
    const { closeButton } = renderChat();

    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('handles non-existent chat document', async () => {
    onSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => false,
        data: () => null
      });
      return unsubscribeMock;
    });

    renderChat();

    await waitFor(() => {
      expect(screen.queryByText('Hello!')).not.toBeInTheDocument();
    });
  });

  test('unsubscribes from snapshot listener on unmount', async () => {
    const { unmount } = renderChat();

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  test('scrolls to bottom when new messages arrive', async () => {
    const scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = renderChat();

    // Simulate new message arrival
    const newMessages = [...mockMessages, {
      senderId: 'user1',
      text: 'New message',
      timestamp: new Date()
    }];

    onSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        data: () => ({ messages: newMessages })
      });
      return unsubscribeMock;
    });

    rerender(
      <Chat
        currentUser={mockCurrentUser}
        friend={mockFriend}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('New message')).toBeInTheDocument();
    });
  });

  test('handles message sorting correctly', async () => {
    const chronologicalMessages = [
      {
        senderId: 'user1',
        text: 'First message',
        timestamp: new Date(2023, 0, 1)
      },
      {
        senderId: 'user2',
        text: 'Second message',
        timestamp: new Date(2023, 0, 2)
      }
    ];

    onSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        data: () => ({ messages: chronologicalMessages })
      });
      return unsubscribeMock;
    });

    renderChat();

    const messages = await screen.findAllByText(/message/);
    expect(messages[0]).toHaveTextContent('Second message');
    expect(messages[1]).toHaveTextContent('First message');
  });

  test('handles message formatting correctly', async () => {
    renderChat();

    await waitFor(() => {
      const sentMessage = screen.getByText(/You:/);
      const receivedMessage = screen.getByText(new RegExp(`${mockFriend.name}:`));
      
      expect(sentMessage.parentElement).toHaveClass('sent');
      expect(receivedMessage.parentElement).toHaveClass('received');
    });
  });
});