import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameTableMultiplayer from './GameTableMultiplayer';
import { getFirestore, doc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { storage } from '../firebase.js';
import { ref, getDownloadURL } from 'firebase/storage';
import { BrowserRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    UserIcon: () => <div data-testid="user-icon">UserIcon</div>,
    Rocket: () => <div data-testid="rocket-icon">Rocket</div>
}));

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
    getDocs: jest.fn(),
    updateDoc: jest.fn(),
    onSnapshot: jest.fn(() => jest.fn()),
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
            return this.cards;
        }
    };
});

describe('GameTableMultiplayer Component', () => {
    const user1 = { uid: 'user1-uid', email: 'user1@example.com' };

    const mockGameDoc = {
        id: 'game-1',
        playerIDs: ['user1-uid', 'user2-uid'],
        createdBy: { id: 'user1-uid' },
        players: [
            {
                id: 'user1-uid',
                score: 26,
                deck: [{ suit: 'H', value: 'K' }, { suit: 'D', value: '2' }],
                currentCard: { suit: 'H', value: 'K' }
            },
            {
                id: 'user2-uid',
                score: 26,
                deck: [{ suit: 'C', value: '2' }, { suit: 'S', value: '3' }],
                currentCard: { suit: 'C', value: '2' }
            }
        ],
        status: 'waiting'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.PUBLIC_URL = '';
        console.error = jest.fn();
        console.log = jest.fn();
        
        // Setup default mocks
        const mockQuerySnapshot = {
            empty: false,
            docs: [{
                id: 'table1',
                data: () => mockGameDoc
            }]
        };

        getDocs.mockResolvedValue(mockQuerySnapshot);
        onSnapshot.mockImplementation((query, callback) => {
            callback({
                exists: () => true,
                data: () => mockGameDoc
            });
            return () => {};
        });

        getDownloadURL.mockResolvedValue('mock-avatar-url');
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ username: 'TestUser', ...mockGameDoc })
        });
        updateDoc.mockResolvedValue(undefined);
    });

    // Basic Rendering Tests
    test('renders initial game state correctly', () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );
        expect(screen.getByTestId('user-icon')).toBeInTheDocument();
        expect(screen.getByTestId('rocket-icon')).toBeInTheDocument();
    });

    // Navigation Tests
    test('navigates to profile when profile button clicked', () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );
        fireEvent.click(screen.getByTestId('user-icon'));
        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    test('navigates to lobby when rocket button clicked', () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );
        fireEvent.click(screen.getByTestId('rocket-icon'));
        expect(mockNavigate).toHaveBeenCalledWith('/lobby');
    });

    // Card Dragging Tests
    test('handles card dragging', async () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        const card = document.querySelector('.player-deck-drag');
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(card, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(card);
        
        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalled();
        });
    });

    // Game State Tests
    test('begins game when host clicks deal', async () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        const dealButton = screen.getByRole('button', { name: /Deal Cards/i });
        await act(async () => {
            fireEvent.click(dealButton);
        });

        expect(updateDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                status: 'game started'
            })
        );
    });

    test('handles player card setting', async () => {
        const mockTableDoc = {
            exists: () => true,
            data: () => ({
                players: [
                    { id: user1.uid, deck: [{ suit: 'H', value: 'K' }], currentCard: null },
                    { id: 'user2-uid', deck: [{ suit: 'C', value: '2' }], currentCard: null }
                ]
            })
        };

        getDoc.mockResolvedValueOnce(mockTableDoc);

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        const card = document.querySelector('.player-deck-drag');
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(document.querySelector('.drop-zone'));
        fireEvent.mouseUp(card);

        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalled();
        });
    });

    // Error Handling Tests
    test('handles missing database reference', async () => {
        getFirestore.mockImplementationOnce(() => null);

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        const card = document.querySelector('.player-deck-drag');
        fireEvent.mouseDown(card);
        fireEvent.mouseMove(document.querySelector('.drop-zone'));
        fireEvent.mouseUp(card);

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Database, game document, or user data is missing')
        );
    });

    test('handles empty query result', async () => {
        getDocs.mockResolvedValueOnce({ empty: true, docs: [] });

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(console.log).toHaveBeenCalledWith('No matching document found.');
        });
    });

    // Game Logic Tests
    test('handles player 1 winning round', async () => {
        const winningGameDoc = {
            ...mockGameDoc,
            players: [
                { ...mockGameDoc.players[0], currentCard: { suit: 'H', value: 'K' } },
                { ...mockGameDoc.players[1], currentCard: { suit: 'H', value: '2' } }
            ]
        };

        getDoc.mockResolvedValueOnce({
            exists: () => true,
            data: () => winningGameDoc
        });

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await act(async () => {
            mockGameDoc.status = "both ready";
            onSnapshot.mock.calls[0][1]({
                exists: () => true,
                data: () => ({ ...mockGameDoc, status: "both ready" })
            });
        });

        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    status: expect.stringContaining('host wins')
                })
            );
        });
    });

    test('handles game over condition', async () => {
        const gameOverDoc = {
            ...mockGameDoc,
            players: [
                { ...mockGameDoc.players[0], deck: [], currentCard: { suit: 'H', value: 'K' } },
                { ...mockGameDoc.players[1], currentCard: { suit: 'H', value: '2' } }
            ]
        };

        getDoc.mockResolvedValueOnce({
            exists: () => true,
            data: () => gameOverDoc
        });

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await act(async () => {
            mockGameDoc.status = "both ready";
            onSnapshot.mock.calls[0][1]({
                exists: () => true,
                data: () => ({ ...mockGameDoc, status: "both ready" })
            });
        });

        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    status: expect.stringContaining('game over')
                })
            );
        });
    });

    // Component Lifecycle Tests
    test('unsubscribes from Firebase listener on unmount', () => {
        const unsubscribe = jest.fn();
        onSnapshot.mockReturnValueOnce(unsubscribe);

        const { unmount } = render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        unmount();
        expect(unsubscribe).toHaveBeenCalled();
    });

    // Profile Picture Handling Tests
    test('handles profile picture updates', async () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await waitFor(() => {
            const profilePics = screen.getAllByAltText(/avatar/i);
            expect(profilePics[0]).toHaveAttribute('src', 'mock-avatar-url');
        });
    });

    test('handles profile picture fetch error gracefully', async () => {
        getDownloadURL.mockRejectedValueOnce(new Error('Failed to fetch avatar'));

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to fetch avatar for UID'),
                expect.any(Error.message)
            );
        });
    });

    // Card Animation Tests
    test('handles card removal animation', async () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await act(async () => {
            mockGameDoc.status = "both ready";
            onSnapshot.mock.calls[0][1]({
                exists: () => true,
                data: () => ({ ...mockGameDoc, status: "both ready" })
            });
        });

        await waitFor(() => {
            const cards = document.querySelectorAll('.removing');
            expect(cards.length).toBeGreaterThan(0);
        }, { timeout: 2000 });
    });
});