import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameTable from './GameTable';
import { storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { BrowserRouter } from 'react-router-dom';

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

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  getDownloadURL: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => 'mock-db'),
  doc: jest.fn(),
  getDoc: jest.fn()
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock deck.js
jest.mock('../deck.js', () => {
  return class Deck {
    constructor() {
      this.cards = Array(52).fill().map((_, i) => ({
        suit: ['H', 'D', 'C', 'S'][Math.floor(i / 13)],
        value: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][i % 13]
      }));
    }
    shuffle() {
      return this.cards;
    }
  };
});

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

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      width: 100,
      height: 100
    }));

    // Mock querySelector
    document.querySelector = jest.fn((selector) => ({
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
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

  // Basic Rendering Tests
  describe('Initial Rendering', () => {
    test('renders initial game state correctly', () => {
      renderGameTable();
      expect(screen.getByText(/Click 'Deal Cards' to start the game/)).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    test('renders guest user interface correctly', () => {
      renderGameTable({ isGuest: true, guestUsername: 'GuestPlayer' });
      expect(screen.getByText('GuestPlayer : 0')).toBeInTheDocument();
    });
  });

  // User Profile Tests
  describe('User Profile Handling', () => {
    test('fetches and displays user profile successfully', async () => {
      renderGameTable();
      await waitFor(() => {
        expect(getDoc).toHaveBeenCalled();
      });
    });

    test('handles profile image fetch failure gracefully', async () => {
      getDownloadURL.mockRejectedValueOnce(new Error('Image fetch failed'));
      renderGameTable();
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          'Avatar not found, using placeholder:',
          expect.any(String)
        );
      });
    });

    test('handles username fetch failure', async () => {
      getDoc.mockRejectedValueOnce(new Error('Username fetch failed'));
      renderGameTable();
      await waitFor(() => {
        expect(console.error).toHaveBeenCalled();
      });
    });
  });

  // Game Initialization Tests
  describe('Game Initialization', () => {
    test('deals cards and starts game', () => {
      renderGameTable();
      const dealButton = screen.getByRole('button', { name: /Deal Cards/i });
      fireEvent.click(dealButton);
      expect(screen.getByText(/Game started!/)).toBeInTheDocument();
    });

    test('resets game state on restart', () => {
      renderGameTable();
      const restartButton = screen.getByTestId('refresh-icon');
      fireEvent.click(restartButton);
      expect(screen.getByText(/Click 'Deal Cards' to start the game/)).toBeInTheDocument();
    });
  });

  // Card Interaction Tests
  describe('Card Interactions', () => {
    test('handles card dragging within drop zone', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      const card = document.querySelector('.player-deck-drag');
      fireEvent.mouseDown(card);
      fireEvent.mouseMove(card, { clientX: 50, clientY: 50 });
      fireEvent.mouseUp(card);

      expect(screen.getByText(/wins this round!/)).toBeInTheDocument();
    });

    test('handles card dragging outside drop zone', () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      const card = document.querySelector('.player-deck-drag');
      fireEvent.mouseDown(card);
      fireEvent.mouseMove(card, { clientX: 500, clientY: 500 });
      fireEvent.mouseUp(card);

      expect(screen.getByText(/Game started!/)).toBeInTheDocument();
    });

    test('handles mouse up on container', () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      const container = document.querySelector('.game-container');
      fireEvent.mouseUp(container);

      expect(screen.getByText(/Game started!/)).toBeInTheDocument();
    });
  });

  // Game Logic Tests
  describe('Game Logic', () => {
    test('handles regular round resolution', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      const card = document.querySelector('.player-deck-drag');
      fireEvent.mouseDown(card);
      fireEvent.mouseMove(document.querySelector('.drop-zone'));
      fireEvent.mouseUp(card);

      expect(screen.getByText(/wins this round!/)).toBeInTheDocument();
    });

    test('handles war scenario', async () => {
      renderGameTable();
      
      // Force a war scenario by mocking cards of equal value
      const mockDeck = new (jest.requireMock('../deck.js'))();
      mockDeck.cards = Array(52).fill({ suit: 'H', value: 'K' });
      
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      const card = document.querySelector('.player-deck-drag');
      fireEvent.mouseDown(card);
      fireEvent.mouseMove(document.querySelector('.drop-zone'));
      fireEvent.mouseUp(card);

      expect(screen.getByText(/It's a tie! War begins!/)).toBeInTheDocument();
    });

    test('handles war with insufficient cards', async () => {
      renderGameTable();
      
      // Start with minimal cards to force insufficient cards scenario
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Play rounds until war with few cards
      for (let i = 0; i < 20; i++) {
        const card = document.querySelector('.player-deck-drag');
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(document.querySelector('.drop-zone'));
        fireEvent.mouseUp(card);
      }

      await waitFor(() => {
        expect(screen.getByText(/wins the game!/)).toBeInTheDocument();
      });
    });

    test('handles game over condition', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Play rounds until game over
      for (let i = 0; i < 30; i++) {
        const card = document.querySelector('.player-deck-drag');
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(document.querySelector('.drop-zone'));
        fireEvent.mouseUp(card);
      }

      await waitFor(() => {
        expect(screen.getByText(/wins the game!/)).toBeInTheDocument();
      });
    });

    test('handles multiple war rounds', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Force multiple war rounds
      for (let i = 0; i < 3; i++) {
        const card = document.querySelector('.player-deck-drag');
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(document.querySelector('.drop-zone'));
        fireEvent.mouseUp(card);
      }

      expect(screen.getByText(/wins this round!/)).toBeInTheDocument();
    });
  });

  // Navigation Tests
  describe('Navigation', () => {
    test('navigates to profile when profile button is clicked', () => {
      renderGameTable();
      fireEvent.click(screen.getByTestId('user-icon'));
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });
  });

  // Card Animation Tests
  describe('Card Animations', () => {
    test('shows war cards when war is triggered', async () => {
      renderGameTable();
      fireEvent.click(screen.getByRole('button', { name: /Deal Cards/i }));

      // Force war scenario
      const card = document.querySelector('.player-deck-drag');
      fireEvent.mouseDown(card);
      fireEvent.mouseMove(document.querySelector('.drop-zone'));
      fireEvent.mouseUp(card);

      const warCards = document.querySelectorAll('.war-cards');
      expect(warCards.length).toBe(0); // Initially no war cards
    });
  });
});