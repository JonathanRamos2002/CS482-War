import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameTableMultiplayer from './GameTableMultiplayer';
import { getFirestore, doc, getDoc, updateDoc, onSnapshot, collection, query, where, Firestore } from 'firebase/firestore';
import { storage } from '../firebase.js';
import { ref, getDownloadURL } from 'firebase/storage';
import { BrowserRouter } from 'react-router-dom';

// Mock CSS
jest.mock('./GameTableMultiplayer.css', () => ({}));

// Mock firebase
jest.mock('../firebase', () => ({
    storage: {},
    Firestore: "mock-Firestore"
  }));

// Mock Firebase functions
jest.mock('firebase/firestore', () => ({
    getFirestore: jest.fn(() => 'mock-db'),
    doc: jest.fn(),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
    onSnapshot: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
}));


jest.mock('firebase/storage', () => ({
    storage: jest.fn(),
    ref: jest.fn(),
    getDownloadURL: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
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
        // Mock shuffle
        this.cards.reverse();
      }
    };
  });

describe('GameTableMultiplayer Component', () => {
    const user1 = { uid: 'user1-uid', email: 'user1@example.com' };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.PUBLIC_URL = '';
        console.error = jest.fn();
        console.log = jest.fn();
        updateDoc.mockResolvedValue(undefined);
    });

    test('renders GameTableMultiplayer component', () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        // Check for initial elements and text in the component
        expect(screen.getByText("Click 'Deal Cards' to start the game.")).toBeInTheDocument();
        expect(screen.getByText(/Go Back to Profile/i)).toBeInTheDocument();
    });

    test('loads user profile images from Firebase storage', async () => {
        const mockImageURL = 'https://example.com/user1.jpg';
        getDownloadURL.mockResolvedValueOnce(mockImageURL);

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await waitFor(() => {
            const user1Image = screen.getByAltText('Player 1 Avatar');
            expect(user1Image).toHaveAttribute('src', mockImageURL);
        });
    });

    test('fetches usernames for both players from Firebase', async () => {
        const mockUserDoc = { exists: () => true, data: () => ({ username: 'User One' }) };
        getDoc.mockResolvedValueOnce(mockUserDoc);

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/User One : 0/i)).toBeInTheDocument();
        });
    });

    test('begins the game and deals cards', async () => {
        const mockTableDoc = { exists: () => true, data: () => ({ players: [{ id: user1.uid, score: 0 }], status: 'waiting' }) };
        getDoc.mockResolvedValueOnce(mockTableDoc);

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        // Simulate clicking the "Deal Cards" button
        fireEvent.click(screen.getByText(/Deal Cards/i));

        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalled();
            expect(screen.getByText(/Game Started!/i)).toBeInTheDocument();
        });
    });


    test('updates score and cards correctly for each player after playRound is called', async () => {
        // Simulate initial database data
        const mockTableDoc = {
            exists: () => true,
            data: () => ({
                players: [
                    { currentCard : { suit: 'H', value: '7' }, deck: [{ suit: 'H', value: '7' }, { suit: 'C', value: '3' }], id: user1.uid, name: 'user1', score: 2,  },
                    { currentCard : { suit: 'D', value: '5' }, deck: [{ suit: 'D', value: '5' }, { suit: 'S', value: '7' }], id: 'user2-uid', name: 'user2', score: 2,  }
                ],
                status: 'game-started'
            }),
        };
        console.log(mockTableDoc);
        getDoc.mockResolvedValueOnce(mockTableDoc);

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        // Simulate "Play Round" button click
        fireEvent.click(screen.getByText(/Play Round/i));
        fireEvent.click(screen.getByText(/Play Round/i));

        await waitFor(() => {
            // Check that the score and card updates in Firebase
            expect(updateDoc).toHaveBeenCalled();
            expect(screen.getByText(/user1 : 3/i)).toBeInTheDocument(); // assuming points increased by 1
        });
    });

    test('navigates back to profile on "Go Back to Profile" button click', () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByText(/Go Back to Profile/i));
        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });


    test('deals cards and updates game state', async () => {
        const mockTableDoc = {
            exists: () => true,
            data: () => ({ players: [{ id: user1.uid, score: 0 }], status: 'waiting' }),
        };
        getDoc.mockResolvedValueOnce(mockTableDoc);
    
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );
    
        // Simulate clicking "Deal Cards"
        fireEvent.click(screen.getByText(/Deal Cards/i));
    
        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalled();
            expect(screen.getByText(/Game Started!/i)).toBeInTheDocument();
        });
    });
    
});
