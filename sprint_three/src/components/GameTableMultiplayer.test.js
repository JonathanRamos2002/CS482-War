import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameTableMultiplayer from './GameTableMultiplayer';
import { getFirestore, doc, getDoc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
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
        onSnapshot.mockImplementation((query, callback) => {
            callback({
                forEach: (fn) => fn({
                    id: mockGameDoc.id,
                    data: () => mockGameDoc
                })
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

    test('handles missing user data', () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={null} />
            </BrowserRouter>
        );
        expect(console.log).toHaveBeenCalledWith('not logged in!');
    });

    test('handles database query error', async () => {
        onSnapshot.mockImplementationOnce((query, callback, errorCallback) => {
            errorCallback(new Error('Database error'));
            return () => {};
        });

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith('Error fetching documents: ', expect.any(Error));
        });
    });

    test('handles profile image fetch error', async () => {
        getDownloadURL.mockRejectedValueOnce(new Error('Image fetch failed'));

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith('Avatar not found, using placeholder:', expect.any(String));
        });
    });

    test('handles WAR scenario', async () => {
        const warGameDoc = {
            ...mockGameDoc,
            players: [
                {
                    id: 'user1-uid',
                    score: 26,
                    deck: Array(10).fill({ suit: 'H', value: 'K' }),
                    currentCard: { suit: 'H', value: 'K' }
                },
                {
                    id: 'user2-uid',
                    score: 26,
                    deck: Array(10).fill({ suit: 'D', value: 'K' }),
                    currentCard: { suit: 'D', value: 'K' }
                }
            ]
        };

        onSnapshot.mockImplementationOnce((query, callback) => {
            callback({
                forEach: (fn) => fn({
                    id: warGameDoc.id,
                    data: () => warGameDoc
                })
            });
            return () => {};
        });

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByText(/Play Round/i));

        await waitFor(() => {
            expect(screen.getByText(/WAR!/i)).toBeInTheDocument();
        });
    });

    test('handles WAR with insufficient cards', async () => {
        const shortDeckGameDoc = {
            ...mockGameDoc,
            players: [
                {
                    id: 'user1-uid',
                    score: 2,
                    deck: [{ suit: 'H', value: 'K' }, { suit: 'D', value: 'K' }],
                    currentCard: { suit: 'H', value: 'K' }
                },
                {
                    id: 'user2-uid',
                    score: 26,
                    deck: Array(10).fill({ suit: 'D', value: 'K' }),
                    currentCard: { suit: 'D', value: 'K' }
                }
            ]
        };

        onSnapshot.mockImplementationOnce((query, callback) => {
            callback({
                forEach: (fn) => fn({
                    id: shortDeckGameDoc.id,
                    data: () => shortDeckGameDoc
                })
            });
            return () => {};
        });

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByText(/Play Round/i));

        await waitFor(() => {
            expect(screen.getByText(/ran out cards during war/i)).toBeInTheDocument();
        });
    });

    test('handles empty deck game over', async () => {
        const emptyDeckGameDoc = {
            ...mockGameDoc,
            players: [
                {
                    id: 'user1-uid',
                    score: 0,
                    deck: [],
                    currentCard: null
                },
                {
                    id: 'user2-uid',
                    score: 52,
                    deck: [{ suit: 'H', value: 'K' }],
                    currentCard: { suit: 'H', value: 'K' }
                }
            ]
        };

        onSnapshot.mockImplementationOnce((query, callback) => {
            callback({
                forEach: (fn) => fn({
                    id: emptyDeckGameDoc.id,
                    data: () => emptyDeckGameDoc
                })
            });
            return () => {};
        });

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByText(/Play Round/i));

        await waitFor(() => {
            expect(screen.getByText(/Game over!/i)).toBeInTheDocument();
        });
    });

    test('handles non-existent table document', async () => {
        getDoc.mockImplementationOnce(() => Promise.resolve({
            exists: () => false
        }));

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        const dealButton = screen.getByText('Deal Cards');
        fireEvent.click(dealButton);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith('Table document not found');
        });
    });

    test('handles database update error', async () => {
        updateDoc.mockRejectedValueOnce(new Error('Update failed'));

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByText(/Play Round/i));

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith('Error updating game data in Firestore:', expect.any(Error));
        });
    });

    test('handles username fetch error', async () => {
        getDoc.mockRejectedValueOnce(new Error('Username fetch failed'));

        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith('error getting username of', expect.any(String), expect.any(Error));
        });
    });

    test('renders without error', () => {
        render(
            <BrowserRouter>
                <GameTableMultiplayer user1={user1} />
            </BrowserRouter>
        );
        expect(screen.getByText(/Waiting for opponent/i)).toBeInTheDocument();
        expect(screen.getByText(/Deal Cards/i)).toBeInTheDocument();
        expect(screen.getByText(/Play Round/i)).toBeInTheDocument(); 
    });

    test('starts new game when Deal Cards clicked', async () => {
      render(
          <BrowserRouter>
              <GameTableMultiplayer user1={user1} />
          </BrowserRouter>
      );
      
      fireEvent.click(screen.getByText(/Deal Cards/i));

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalled();
      })
    })
});