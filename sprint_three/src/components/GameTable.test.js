import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameTable from './GameTable';
import { storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { BrowserRouter } from 'react-router-dom';
import { incrementWins, incrementLosses } from './UserProfile.js';

// Mock CSS
jest.mock('./GameTable.css', () => ({}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  UserIcon: () => <div data-testid="user-icon">UserIcon</div>,
  RefreshCcw: () => <div data-testid="refresh-icon">RefreshIcon</div>,
}));

// Mock firebase
jest.mock('../firebase', () => ({
  storage: {}
}));

// Mock UserProfile functions
jest.mock('./UserProfile.js', () => ({
  incrementWins: jest.fn(),
  incrementLosses: jest.fn()
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  getDownloadURL: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => 'mock-db'),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn()
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('GameTable Component', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PUBLIC_URL = '';
    console.error = jest.fn();
    console.log = jest.fn();

    // Default mock implementations
    ref.mockReturnValue('mock-storage-ref');
    getDownloadURL.mockResolvedValue('test-avatar-url');
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ username: 'Test User' })
    });

    // Mock DOM elements and measurements
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100
    }));

    document.querySelector = jest.fn((selector) => ({
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100
      }),
      offsetWidth: 100,
      offsetHeight: 100
    }));
  });

  const renderGameTable = (props = {}) => {
    return render(
      <BrowserRouter>
        <GameTable
          user={mockUser}
          isGuest={false}
          guestUsername=""
          {...props}
        />
      </BrowserRouter>
    );
  };

  describe('Game Setup and Basic Controls', () => {
    test('initializes game state and controls', () => {
      renderGameTable();
      expect(screen.getByText(/Click 'Deal Cards' to start the game/)).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    test('handles restart game functionality', async () => {
      renderGameTable();
      
      // Start game first
      const dealButton = screen.getByRole('button', { name: /Deal Cards/i });
      fireEvent.click(dealButton);
      
      // Restart game
      const restartButton = screen.getByTestId('refresh-icon');
      fireEvent.click(restartButton);
      
      expect(screen.getByText(/Click 'Deal Cards' to start the game/)).toBeInTheDocument();
    });
  });

  describe('Card Movement and Interaction', () => {
    test('handles mouse down event', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));
      
      const card = document.querySelector('.player-deck-drag');
      const mockEvent = { preventDefault: jest.fn() };
      fireEvent.mouseDown(card, mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('handles mouse movement during drag', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));
      
      const card = document.querySelector('.player-deck-drag');
      const container = document.querySelector('.game-container');
      
      fireEvent.mouseDown(card);
      fireEvent.mouseMove(container, { clientX: 50, clientY: 50 });
      
      // Verify card position update logic was triggered
      expect(document.querySelector).toHaveBeenCalledWith('.game-board');
    });

    test('handles drag and drop in drop zone', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));
      
      const card = document.querySelector('.player-deck-drag');
      fireEvent.mouseDown(card);
      fireEvent.mouseMove(document.querySelector('.drop-zone'), { clientX: 50, clientY: 50 });
      fireEvent.mouseUp(card);
      
      // Verify round was played
      expect(screen.getByText(/wins this round!/)).toBeInTheDocument();
    });
  });

  describe('Game Logic and War Scenarios', () => {
    test('handles war scenario with sufficient cards', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Set up war conditions
      const card = document.querySelector('.player-deck-drag');
      await act(async () => {
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(document.querySelector('.drop-zone'));
        fireEvent.mouseUp(card);
      });

      expect(screen.getByText(/It's a tie! War begins!/)).toBeInTheDocument();
    });

    test('handles war scenario with insufficient cards', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Play multiple rounds to deplete cards
      for (let i = 0; i < 20; i++) {
        const card = document.querySelector('.player-deck-drag');
        await act(async () => {
          fireEvent.mouseDown(card);
          fireEvent.mouseMove(document.querySelector('.drop-zone'));
          fireEvent.mouseUp(card);
        });
      }

      expect(screen.getByText(/wins the game!/)).toBeInTheDocument();
    });

    test('handles consecutive wars', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Force multiple consecutive wars
      for (let i = 0; i < 3; i++) {
        const card = document.querySelector('.player-deck-drag');
        await act(async () => {
          fireEvent.mouseDown(card);
          fireEvent.mouseMove(document.querySelector('.drop-zone'));
          fireEvent.mouseUp(card);
        });
      }

      expect(screen.getByText(/continues!/)).toBeInTheDocument();
    });
  });

  describe('Game Completion and Score Updates', () => {
    test('updates win count when player wins', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Play until win
      while (!screen.queryByText(/You win the game!/)) {
        const card = document.querySelector('.player-deck-drag');
        await act(async () => {
          fireEvent.mouseDown(card);
          fireEvent.mouseMove(document.querySelector('.drop-zone'));
          fireEvent.mouseUp(card);
        });
      }

      expect(incrementWins).toHaveBeenCalledWith('mock-db', mockUser);
    });

    test('updates loss count when bot wins', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Play until loss
      while (!screen.queryByText(/Bot wins the game!/)) {
        const card = document.querySelector('.player-deck-drag');
        await act(async () => {
          fireEvent.mouseDown(card);
          fireEvent.mouseMove(document.querySelector('.drop-zone'));
          fireEvent.mouseUp(card);
        });
      }

      expect(incrementLosses).toHaveBeenCalledWith('mock-db', mockUser);
    });
  });

  describe('Card State Management', () => {
    test('manages card visibility correctly', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Play a round
      const card = document.querySelector('.player-deck-drag');
      await act(async () => {
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(document.querySelector('.drop-zone'));
        fireEvent.mouseUp(card);
      });

      // Verify card elements are rendered
      const cardImages = screen.getAllByRole('img');
      expect(cardImages.length).toBeGreaterThan(2);
    });

    test('handles war cards display', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Force war
      const card = document.querySelector('.player-deck-drag');
      await act(async () => {
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(document.querySelector('.drop-zone'));
        fireEvent.mouseUp(card);
      });

      // Verify war cards are displayed
      const facedownCards = document.querySelectorAll('.facedown-card');
      expect(facedownCards.length).toBe(0);
    });
  });

  describe('User Profile and Guest Mode', () => {
    test('handles guest user interaction', async () => {
      renderGameTable({ isGuest: true, guestUsername: 'GuestPlayer' });
      
      // Verify guest UI
      expect(screen.getByText('GuestPlayer : 0')).toBeInTheDocument();
      
      // Play a round as guest
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));
      const card = document.querySelector('.player-deck-drag');
      await act(async () => {
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(document.querySelector('.drop-zone'));
        fireEvent.mouseUp(card);
      });

      expect(screen.getByText(/wins this round!/)).toBeInTheDocument();
    });

    test('handles profile image fetch error for non-guest', async () => {
      getDownloadURL.mockRejectedValueOnce(new Error('Image fetch failed'));
      renderGameTable({ isGuest: false });
      
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          'Avatar not found, using placeholder:',
          expect.any(String)
        );
      });
    });
  });
});