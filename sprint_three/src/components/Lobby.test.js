import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import Lobby from './Lobby';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  UserIcon: () => <div data-testid="user-icon">UserIcon</div>,
  PlusCircle: () => <div data-testid="plus-circle">PlusCircle</div>,
  Users: () => <div data-testid="users-icon">Users</div>
}));

// Mock CSS
jest.mock('./Lobby.css', () => ({}));

// Mock Firebase
const mockOnSnapshot = jest.fn();
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockQuery = jest.fn();
const mockOrderBy = jest.fn();
const mockGetFirestore = jest.fn();

jest.mock('firebase/firestore', () => ({
  getFirestore: () => mockGetFirestore,
  collection: () => mockCollection,
  addDoc: (...args) => mockAddDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  doc: (...args) => mockDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  query: (...args) => mockQuery(...args),
  orderBy: (...args) => mockOrderBy(...args)
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Lobby Component', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com'
  };

  const mockTables = [
    {
      id: 'table1',
      players: [{ id: 'player1', name: 'Player 1' }],
      maxPlayers: 2,
      status: 'waiting',
      createdAt: '2024-01-01T00:00:00.000Z',
      createdBy: { id: 'player1', name: 'Player 1' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({
        docs: mockTables.map(table => ({
          id: table.id,
          data: () => table
        }))
      });
      return jest.fn(); // cleanup function
    });
  });

  const renderLobby = (props = {}) => {
    return render(
      <BrowserRouter>
        <Lobby user={mockUser} isGuest={false} {...props} />
      </BrowserRouter>
    );
  };

  test('renders lobby title and elements', async () => {
    renderLobby();
    
    expect(screen.getByText('Welcome to the Lobby!')).toBeInTheDocument();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    expect(screen.getByText(/Table #/)).toBeInTheDocument();
  });

  test('navigates to profile when profile button is clicked', async () => {
    renderLobby();
    
    const profileButton = screen.getByRole('button', { name: /profile/i });
    fireEvent.click(profileButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  test('creates new table when create button is clicked', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'new-table' });
    
    renderLobby();
    
    const createButton = screen.getByRole('button', { name: /create new table/i });
    await act(async () => {
      fireEvent.click(createButton);
    });
    
    expect(mockAddDoc).toHaveBeenCalled();
    const addDocCall = mockAddDoc.mock.calls[0][1];
    expect(addDocCall.maxPlayers).toBe(2);
    expect(addDocCall.status).toBe('waiting');
  });

  test('handles create table error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    mockAddDoc.mockRejectedValueOnce(new Error('Create failed'));

    renderLobby();
    
    const createButton = screen.getByRole('button', { name: /create new table/i });
    await act(async () => {
      fireEvent.click(createButton);
    });
    
    expect(alertSpy).toHaveBeenCalledWith('Failed to create table. Please try again.');
    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  test('joins existing table', async () => {
    mockUpdateDoc.mockResolvedValueOnce({});
    
    renderLobby();
    
    const joinButton = screen.getByRole('button', { name: /join game/i });
    await act(async () => {
      fireEvent.click(joinButton);
    });
    
    expect(mockUpdateDoc).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/table');
  });

  test('handles join table error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    mockUpdateDoc.mockRejectedValueOnce(new Error('Join failed'));

    renderLobby();
    
    const joinButton = screen.getByRole('button', { name: /join game/i });
    await act(async () => {
      fireEvent.click(joinButton);
    });
    
    expect(alertSpy).toHaveBeenCalledWith('Failed to join table. Please try again.');
    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  test('deletes table when creator clicks delete', async () => {
    const tablesWithCurrentUser = [{
      ...mockTables[0],
      createdBy: { id: mockUser.uid, name: mockUser.email }
    }];

    mockOnSnapshot.mockImplementationOnce((query, callback) => {
      callback({
        docs: tablesWithCurrentUser.map(table => ({
          id: table.id,
          data: () => table
        }))
      });
      return jest.fn();
    });

    renderLobby();
    
    const deleteButton = screen.getByRole('button', { name: /delete table/i });
    await act(async () => {
      fireEvent.click(deleteButton);
    });
    
    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  test('handles guest user', () => {
    renderLobby({ isGuest: true, guestUsername: 'GuestUser' });
    expect(screen.getByText('Welcome to the Lobby!')).toBeInTheDocument();
  });

  test('shows max tables message when limit reached', () => {
    const sixTables = Array(6).fill(mockTables[0]);
    mockOnSnapshot.mockImplementationOnce((query, callback) => {
      callback({
        docs: sixTables.map(table => ({
          id: table.id,
          data: () => table
        }))
      });
      return jest.fn();
    });

    renderLobby();
    
    expect(screen.getByText('Maximum number of tables reached (6)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create new table/i })).not.toBeInTheDocument();
  });

  test('prevents joining full tables', () => {
    const fullTable = {
      ...mockTables[0],
      players: [{ id: 'player1' }, { id: 'player2' }],
      status: 'full'
    };

    mockOnSnapshot.mockImplementationOnce((query, callback) => {
      callback({
        docs: [{
          id: fullTable.id,
          data: () => fullTable
        }]
      });
      return jest.fn();
    });

    renderLobby();
    
    const joinButton = screen.getByRole('button', { name: /table full/i });
    expect(joinButton).toBeDisabled();
  });
  // Add these tests to your existing test suite

describe('Lobby Component Edge Cases', () => {
    // ... (keep your existing beforeEach and mock setup)
  
    test('handles player already in table', async () => {
      const tableWithCurrentUser = {
        ...mockTables[0],
        players: [{ id: mockUser.uid, name: mockUser.email }]
      };
  
      mockOnSnapshot.mockImplementationOnce((query, callback) => {
        callback({
          docs: [{
            id: tableWithCurrentUser.id,
            data: () => tableWithCurrentUser
          }]
        });
        return jest.fn();
      });
  
      renderLobby();
      
      const joinButton = screen.getByRole('button', { name: /join game/i });
      await act(async () => {
        fireEvent.click(joinButton);
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/table');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  
    test('handles cleanup error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteDoc.mockRejectedValueOnce(new Error('Delete failed'));
  
      const tableWithCurrentUser = {
        ...mockTables[0],
        createdBy: { id: mockUser.uid, name: mockUser.email }
      };
  
      mockOnSnapshot.mockImplementationOnce((query, callback) => {
        callback({
          docs: [{
            id: tableWithCurrentUser.id,
            data: () => tableWithCurrentUser
          }]
        });
        return jest.fn();
      });
  
      renderLobby();
      
      const deleteButton = screen.getByRole('button', { name: /delete table/i });
      await act(async () => {
        fireEvent.click(deleteButton);
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  
    test('handles maxPlayers validation in create table', async () => {
      const sixTables = Array(6).fill(mockTables[0]);
      mockOnSnapshot.mockImplementationOnce((query, callback) => {
        callback({
          docs: sixTables.map(table => ({
            id: table.id,
            data: () => table
          }))
        });
        return jest.fn();
      });
  
      renderLobby();
      
      const createButton = screen.queryByRole('button', { name: /create new table/i });
      expect(createButton).not.toBeInTheDocument();
      expect(mockAddDoc).not.toHaveBeenCalled();
    });
  
    test('handles non-existent table join attempt', async () => {
      mockOnSnapshot.mockImplementationOnce((query, callback) => {
        callback({
          docs: []
        });
        return jest.fn();
      });
  
      renderLobby();
      expect(screen.queryByRole('button', { name: /join game/i })).not.toBeInTheDocument();
    });
  
    test('handles table state updates', async () => {
      renderLobby();
      
      // Simulate a table update
      await act(async () => {
        mockOnSnapshot.mock.calls[0][1]({
          docs: [{
            id: 'table1',
            data: () => ({
              ...mockTables[0],
              status: 'full'
            })
          }]
        });
      });
  
      expect(screen.getByText('full')).toBeInTheDocument();
    });
  
    test('cleanups subscription on unmount', async () => {
      const unsubscribeMock = jest.fn();
      mockOnSnapshot.mockImplementationOnce(() => unsubscribeMock);
  
      const { unmount } = renderLobby();
      unmount();
  
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  
    test('handles full table join attempt', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const fullTable = {
        ...mockTables[0],
        players: [{ id: 'player1' }, { id: 'player2' }],
        maxPlayers: 2
      };
  
      mockOnSnapshot.mockImplementationOnce((query, callback) => {
        callback({
          docs: [{
            id: fullTable.id,
            data: () => fullTable
          }]
        });
        return jest.fn();
      });
  
      renderLobby();
      
      const joinButton = screen.getByRole('button', { name: /table full/i });
      await act(async () => {
        fireEvent.click(joinButton);
      });
  
      expect(alertSpy).toHaveBeenCalledWith('This table is full!');
      alertSpy.mockRestore();
    });
  
    test('handles guest user table creation', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-table' });
      
      renderLobby({ isGuest: true, guestUsername: 'GuestUser' });
      
      const createButton = screen.getByRole('button', { name: /create new table/i });
      await act(async () => {
        fireEvent.click(createButton);
      });
      
      const addDocCall = mockAddDoc.mock.calls[0][1];
      expect(addDocCall.createdBy.id).toBe('guest-GuestUser');
      expect(addDocCall.players[0].id).toBe('guest-GuestUser');
    });
  });
});