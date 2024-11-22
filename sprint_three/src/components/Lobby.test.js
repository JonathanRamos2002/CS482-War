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

// Mock AdminMessage component
jest.mock('./AdminMessage', () => ({
  __esModule: true,
  default: () => <div data-testid="admin-message">Admin Message</div>
}));

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
      createdBy: { id: 'player1', name: 'Player 1' },
      stakes: 100,
      playerIDs: ['player1']
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

  // Basic Rendering Tests
  describe('Rendering', () => {
    test('renders lobby title and elements', () => {
      renderLobby();
      expect(screen.getByText('Welcome to the Lobby!')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByTestId('admin-message')).toBeInTheDocument();
      expect(screen.getByText(/Table #/)).toBeInTheDocument();
    });

    test('renders stakes input with default value', () => {
      renderLobby();
      const stakesInput = screen.getByLabelText(/Table Stakes/);
      expect(stakesInput).toHaveValue(100);
    });

    test('renders table information correctly', () => {
      renderLobby();
      expect(screen.getByText('Stakes: 100 coins')).toBeInTheDocument();
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Created by: Player 1')).toBeInTheDocument();
    });
  });

  // Navigation Tests
  describe('Navigation', () => {
    test('navigates to profile when profile button is clicked', () => {
      renderLobby();
      const profileButton = screen.getByRole('button', { name: /UserIcon/i });
      fireEvent.click(profileButton);
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    test('navigates to table when joining existing game', async () => {
      mockUpdateDoc.mockResolvedValueOnce({});
      renderLobby();
      const joinButton = screen.getByRole('button', { name: /join game/i });
      await act(async () => {
        fireEvent.click(joinButton);
      });
      expect(mockNavigate).toHaveBeenCalledWith('/table-multi');
    });
  });

  // Table Creation Tests
  describe('Table Creation', () => {
    test('creates new table with custom stakes', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-table' });
      renderLobby();
      
      const stakesInput = screen.getByLabelText(/Table Stakes/);
      fireEvent.change(stakesInput, { target: { value: '200' } });
      
      const createButton = screen.getByRole('button', { name: /create new table/i });
      await act(async () => {
        fireEvent.click(createButton);
      });
      
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stakes: 200,
          maxPlayers: 2,
          status: 'waiting'
        })
      );
    });

    test('prevents invalid stake amounts', () => {
      renderLobby();
      const stakesInput = screen.getByLabelText(/Table Stakes/);
      fireEvent.change(stakesInput, { target: { value: '-50' } });
      expect(stakesInput).toHaveValue(1);
    });

    test('handles empty stake input', () => {
      renderLobby();
      const stakesInput = screen.getByLabelText(/Table Stakes/);
      fireEvent.change(stakesInput, { target: { value: '' } });
      expect(stakesInput).toHaveValue(0);
    });

    test('prevents table creation when maximum tables reached', async () => {
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
      expect(screen.getByText('Maximum number of tables reached (6)')).toBeInTheDocument();
    });
  });

  // Table Joining Tests
  describe('Table Joining', () => {
    test('handles joining a non-existent table', async () => {
      const nonExistentTableId = 'non-existent';
      mockUpdateDoc.mockResolvedValueOnce({});
      
      renderLobby();
      await act(async () => {
        await joinTable(nonExistentTableId);
      });
      
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    test('prevents joining when table is full', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const fullTable = {
        ...mockTables[0],
        players: [{ id: 'player1' }, { id: 'player2' }],
        maxPlayers: 2,
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
      await act(async () => {
        fireEvent.click(joinButton);
      });
      
      expect(alertMock).toHaveBeenCalledWith('This table is full!');
      alertMock.mockRestore();
    });

    test('handles player already in table', async () => {
      const tableWithCurrentUser = {
        ...mockTables[0],
        players: [{ id: mockUser.uid, name: mockUser.email }],
        playerIDs: [mockUser.uid]
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

      expect(mockNavigate).toHaveBeenCalledWith('/table-multi');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  // Table Deletion Tests
  describe('Table Deletion', () => {
    test('allows creator to delete table', async () => {
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

      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    test('handles delete error gracefully', async () => {
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

      expect(consoleSpy).toHaveBeenCalledWith('Error deleting table:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // Guest User Tests
  describe('Guest User Functionality', () => {
    test('handles guest user table creation correctly', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-table' });
      
      renderLobby({ isGuest: true, guestUsername: 'GuestUser' });
      
      const createButton = screen.getByRole('button', { name: /create new table/i });
      await act(async () => {
        fireEvent.click(createButton);
      });
      
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          createdBy: {
            id: 'guest-GuestUser',
            name: 'GuestUser'
          },
          players: expect.arrayContaining([
            expect.objectContaining({
              id: 'guest-GuestUser',
              name: 'GuestUser'
            })
          ])
        })
      );
    });

    test('handles guest user joining table', async () => {
      mockUpdateDoc.mockResolvedValueOnce({});
      
      renderLobby({ isGuest: true, guestUsername: 'GuestUser' });
      
      const joinButton = screen.getByRole('button', { name: /join game/i });
      await act(async () => {
        fireEvent.click(joinButton);
      });
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({
              id: 'guest-GuestUser',
              name: 'GuestUser'
            })
          ])
        })
      );
    });
  });

  // Subscription Tests
  describe('Firebase Subscriptions', () => {
    test('unsubscribes from table updates on unmount', () => {
      const unsubscribeMock = jest.fn();
      mockOnSnapshot.mockImplementationOnce(() => unsubscribeMock);
      
      const { unmount } = renderLobby();
      unmount();
      
      expect(unsubscribeMock).toHaveBeenCalled();
    });

    test('handles table updates correctly', async () => {
      renderLobby();
      
      await act(async () => {
        mockOnSnapshot.mock.calls[0][1]({
          docs: [{
            id: 'table1',
            data: () => ({
              ...mockTables[0],
              status: 'full',
              players: [{ id: 'player1' }, { id: 'player2' }]
            })
          }]
        });
      });

      expect(screen.getByText('full')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /table full/i })).toBeDisabled();
    });
  });
});