import React, {act} from 'react';
import { render, screen, fireEvent, waitFor} from '@testing-library/react';
import AddFriend from '../components/AddFriend';
import { getFirestore, getDocs, query, collection, where, getDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import '@testing-library/jest-dom';


jest.mock('firebase/firestore', () => {
  return {
    getFirestore: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    getDoc: jest.fn(),
    doc: jest.fn(),
    updateDoc: jest.fn(),
    arrayUnion: jest.fn(),
  };
});



describe('AddFriend Component', () => {
  const mockCurrentUser = {uid: 'currentUserID'};
  const mockUser = {id: 'friend-user-id', email: 'friend@example.com', username: 'Friend' };

  beforeEach(() => {
    render(<AddFriend currentUser={mockCurrentUser} />);
  });

  
  test('renders AddFriend component correctly', () => {
    expect(screen.getByText('Add Friend')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Email')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

 
  test('successfully adds a friend', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (callback) => {
        callback({ id: mockUser.id, data: () => mockUser });
      },
    });

    // Mock the current user data
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: [] }),
    });

    // Mock the updateDoc function
    updateDoc.mockResolvedValueOnce();

    // Fill in the email input and click the search button
    fireEvent.change(screen.getByPlaceholderText('Enter Email'), { target: { value: 'friend@example.com' } });
    fireEvent.click(screen.getByText('Search'));

    // Wait for the friend to be found
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return content.startsWith('Found:') && content.includes('friend@example.com');
      })).toBeInTheDocument();
    });

    // Click the Add Friend button
    const addButton = screen.getByRole('button', {name: 'Add Friend' });
    fireEvent.click(addButton);

  });


});

