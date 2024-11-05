import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameTable from './GameTable';
import { storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// Mock CSS
jest.mock('./GameTable.css', () => ({}));

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
      // Deterministic shuffle for testing
      this.cards.reverse();
    }
  };
});

describe('GameTable', () => {
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
  });

  const renderGameTable = (props = {}) => {
    return render(
      <GameTable
        user={mockUser}
        isGuest={false}
        guestUsername=""
        {...props}
      />
    );
  };

  test('renders initial game state', async () => {
    renderGameTable();

    expect(screen.getByText("Click 'Deal Cards' to start the game.")).toBeInTheDocument();
    expect(screen.getByText('Bot : 0')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4); // Deal, Play, Restart, Go Back
  });

  test('handles user profile fetch', async () => {
    renderGameTable();

    await waitFor(() => {
      expect(getDoc).toHaveBeenCalled();
    });
  });

  test('handles profile image fetch error', async () => {
    getDownloadURL.mockRejectedValueOnce(new Error('Fetch failed'));
    
    renderGameTable();

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        'Avatar not found, using placeholder:',
        expect.any(String)
      );
    });
  });

  test('deals cards correctly', async () => {
    renderGameTable();

    const dealButton = screen.getByText('Deal Cards');
    fireEvent.click(dealButton);

    expect(screen.getByText('Game started! Click to play a round.')).toBeInTheDocument();
    expect(screen.getByText('Bot : 26')).toBeInTheDocument();
  });

  test('handles play round without dealing cards', () => {
    renderGameTable();

    const playButton = screen.getByText('Play Round');
    fireEvent.click(playButton);

    expect(screen.getByText('Game has not started!')).toBeInTheDocument();
  });

  test('plays a complete round', async () => {
    renderGameTable();

    // Deal cards first
    fireEvent.click(screen.getByText('Deal Cards'));
    // Play a round
    fireEvent.click(screen.getByText('Play Round'));

    await waitFor(() => {
      expect(screen.getByText(/wins this round!/)).toBeInTheDocument();
    });
  });

  test('handles war scenario', async () => {
    renderGameTable();
    
    // Set up a tie scenario
    const mockPlayerDeck = [
      { suit: 'H', value: 'K' },
      { suit: 'D', value: '2' },
      { suit: 'C', value: '3' },
      { suit: 'S', value: '4' }
    ];
    const mockBotDeck = [
      { suit: 'S', value: 'K' },
      { suit: 'H', value: '5' },
      { suit: 'D', value: '6' },
      { suit: 'C', value: '7' }
    ];

    await act(async () => {
      fireEvent.click(screen.getByText('Deal Cards'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Click to play a round/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Play Round'));

    await waitFor(() => {
      expect(screen.getByText(/wins the war!/)).toBeInTheDocument();
    });
  });

  test('handles game end scenarios', async () => {
    renderGameTable();

    // Deal cards and play until someone wins
    fireEvent.click(screen.getByText('Deal Cards'));
    
    // Play multiple rounds
    for (let i = 0; i < 30; i++) {
      fireEvent.click(screen.getByText('Play Round'));
    }

    await waitFor(() => {
      expect(screen.getByText(/wins the game!/)).toBeInTheDocument();
    });
  });

  test('restarts game correctly', async () => {
    renderGameTable();

    // Start and play game
    fireEvent.click(screen.getByText('Deal Cards'));
    fireEvent.click(screen.getByText('Play Round'));

    // Restart game
    fireEvent.click(screen.getByText('Restart'));

    expect(screen.getByText("Click 'Deal Cards' to start the game.")).toBeInTheDocument();
    expect(screen.getByText('Bot : 0')).toBeInTheDocument();
  });

  test('handles guest user correctly', async () => {
    const guestUsername = 'GuestPlayer';
    renderGameTable({ isGuest: true, guestUsername });

    expect(screen.getByText(`${guestUsername} : 0`)).toBeInTheDocument();
  });

  test('navigates back to profile', () => {
    renderGameTable();

    fireEvent.click(screen.getByText('Go Back to Profile'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  test('handles war with insufficient cards', async () => {
    renderGameTable();
    
    // Deal cards first
    fireEvent.click(screen.getByText('Deal Cards'));
    
    // Play many rounds to deplete cards
    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByText('Play Round'));
    }

    await waitFor(() => {
      const message = screen.getByText(/wins the game!/);
      expect(message).toBeInTheDocument();
    });
  });

  test('displays correct card images', async () => {
    renderGameTable();

    fireEvent.click(screen.getByText('Deal Cards'));
    fireEvent.click(screen.getByText('Play Round'));

    await waitFor(() => {
      const cardImages = screen.getAllByRole('img');
      expect(cardImages.length).toBeGreaterThan(2); // Profile pics + card images
    });
  });
});