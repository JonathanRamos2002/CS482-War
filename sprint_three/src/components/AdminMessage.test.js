import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminMessage from './AdminMessage';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock CSS
jest.mock('./AdminMessage.css', () => ({}));

describe('AdminMessage Component', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    username: 'testuser'
  };

  const mockDb = 'mock-db';

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.log = jest.fn();

    // Default mock implementations
    getFirestore.mockReturnValue(mockDb);
    collection.mockReturnValue('mock-collection');
    query.mockReturnValue('mock-query');
    orderBy.mockReturnValue('mock-order');
    limit.mockReturnValue('mock-limit');
    doc.mockReturnValue('mock-doc');
    onSnapshot.mockImplementation(() => () => {}); // Returns cleanup function
  });

  // Basic Rendering Tests
  describe('Initial Rendering', () => {
    test('renders without user (no admin check)', () => {
      render(<AdminMessage user={null} />);
      expect(screen.queryByPlaceholderText(/Enter admin message/)).not.toBeInTheDocument();
    });

    test('renders with non-admin user', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ isAdmin: false })
      });

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Enter admin message/)).not.toBeInTheDocument();
      });
    });

    test('renders with admin user', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ isAdmin: true })
      });

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter admin message/)).toBeInTheDocument();
      });
    });
  });

  // Admin Status Tests
  describe('Admin Status Checks', () => {
    test('handles admin check error gracefully', async () => {
      getDoc.mockRejectedValueOnce(new Error('Admin check failed'));

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Error checking admin status:',
          expect.any(Error)
        );
      });
    });

    test('handles non-existent user document', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => null
      });

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Enter admin message/)).not.toBeInTheDocument();
      });
    });
  });

  // Message Display Tests
  describe('Message Display', () => {
    test('displays current message from Firestore', async () => {
      const mockMessage = 'Test admin message';
      onSnapshot.mockImplementation((query, callback) => {
        callback({
          empty: false,
          docs: [{
            data: () => ({
              text: mockMessage,
              timestamp: new Date(),
              sentBy: 'admin'
            })
          }]
        });
        return () => {};
      });

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(mockMessage)).toBeInTheDocument();
      });
    });

    test('handles empty message collection', async () => {
      onSnapshot.mockImplementation((query, callback) => {
        callback({
          empty: true,
          docs: []
        });
        return () => {};
      });

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        expect(screen.queryByTestId('message-display')).not.toBeInTheDocument();
      });
    });
  });

  // Message Input and Sending Tests
  describe('Message Input and Sending', () => {
    beforeEach(async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ isAdmin: true })
      });
    });

    test('handles message input change', async () => {
      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter admin message/);
        fireEvent.change(input, { target: { value: 'New message' } });
        expect(input.value).toBe('New message');
      });
    });

    test('sends message successfully', async () => {
      addDoc.mockResolvedValueOnce({ id: 'new-message-id' });

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter admin message/);
        fireEvent.change(input, { target: { value: 'New message' } });
      });

      const sendButton = screen.getByText('Send');
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          text: 'New message',
          sentBy: mockUser.email
        })
      );
    });

    test('prevents empty message submission', async () => {
      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        const sendButton = screen.getByText('Send');
        fireEvent.click(sendButton);
      });

      expect(addDoc).not.toHaveBeenCalled();
    });

    test('handles message send error', async () => {
      addDoc.mockRejectedValueOnce(new Error('Send failed'));

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter admin message/);
        fireEvent.change(input, { target: { value: 'New message' } });
      });

      const sendButton = screen.getByText('Send');
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(console.error).toHaveBeenCalledWith(
        'Error sending message:',
        expect.any(Error)
      );
    });

    test('clears input after successful send', async () => {
      addDoc.mockResolvedValueOnce({ id: 'new-message-id' });

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter admin message/);
        fireEvent.change(input, { target: { value: 'New message' } });
      });

      const sendButton = screen.getByText('Send');
      await act(async () => {
        fireEvent.click(sendButton);
      });

      const input = screen.getByPlaceholderText(/Enter admin message/);
      expect(input.value).toBe('');
    });
  });

  // Cleanup Tests
  describe('Cleanup', () => {
    test('unsubscribes from snapshot listener on unmount', async () => {
      const unsubscribeMock = jest.fn();
      onSnapshot.mockImplementation(() => unsubscribeMock);

      const { unmount } = render(<AdminMessage user={mockUser} />);
      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    test('handles undefined user email', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ isAdmin: true })
      });

      const userWithoutEmail = { ...mockUser, email: undefined };
      render(<AdminMessage user={userWithoutEmail} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter admin message/);
        fireEvent.change(input, { target: { value: 'New message' } });
      });

      const sendButton = screen.getByText('Send');
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          sentBy: userWithoutEmail.username
        })
      );
    });

    test('handles message with only whitespace', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ isAdmin: true })
      });

      render(<AdminMessage user={mockUser} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Enter admin message/);
        fireEvent.change(input, { target: { value: '   ' } });
      });

      const sendButton = screen.getByText('Send');
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(addDoc).not.toHaveBeenCalled();
    });
  });
});