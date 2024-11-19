import React, { useState, useEffect, useRef } from 'react';
import {storage} from '../firebase.js';
import {ref, getDownloadURL} from 'firebase/storage';
import { getFirestore, doc, getDoc, getDocs, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import './GameTableMultiplayer.css'; 
import { useNavigate } from 'react-router-dom';
import Deck from "../deck.js"

const CARD_VALUE_MAP = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14
  }

const CARD_SUIT_MAP = { 
    "S": "Spades", 
    "C": "Clubs", 
    "H": "Hearts", 
    "D": "Diamonds" 
};

function GameTableMultiplayer({ user1 }) {
    const db = getFirestore();
    const navigate = useNavigate(); //hook for navigation
    const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg';

    const [creatorUID, setCreatorUID] = useState('');

    // User1 Info
    const [imageFetched1, setImageFetched1] = useState(false);
    const [selectedImage1, setSelectedImage1] = useState(placeholder);
    const [username1, setUsername1] = useState(user1.email || '');
    const [userUID, setUserUID] = useState(user1.uid);
    const [points1, setPoints1] = useState(0);
    const [card1, setCard1] = useState({});
    const [deck1, setDeck1] = useState([]);

    // User2 Info
    const [imageFetched2, setImageFetched2] = useState(false);
    const [selectedImage2, setSelectedImage2] = useState(placeholder);
    const [username2, setUsername2] = useState('');
    const [points2, setPoints2] = useState(0);
    const [card2, setCard2] = useState({});
    const [deck2, setDeck2] = useState([]);

    const [flip, setFlip] = useState(true);
    const [cardPosition, setCardPosition] = useState({ x: 0, y: 290 });
    const [isDragging, setIsDragging] = useState(false);
    const [isWar, setIsWar] = useState(false); // Track whether it's a war
 
    // Game state
    const [gameMessage, setGameMessage] = useState("Click 'Deal Cards' to start the game.");
    const [documentID, setDocumentID] = useState(null);
    const [gameDocument, setGameDocument] = useState(null);

    // get the table documentID (should only happen once)
    useEffect(() => {
        if (!user1) {
            console.log("User not logged in!");
            return;
        }
    
        // Reference to the 'tables' collection
        const tablesRef = collection(db, 'tables');
        // Query to find documents where playerIDs array contains the current UID
        const q = query(tablesRef, where('playerIDs', 'array-contains', user1.uid));
    
        // Fetch the document ID once
        const fetchDocumentId = async () => {
            try {
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const firstDoc = querySnapshot.docs[0]; // Get the first matching document
                    //console.log("DocumentID:", firstDoc.id);
                    setDocumentID(firstDoc.id); // Store the document ID in state
                } else {
                    console.log("No matching document found.");
                }
            } catch (error) {
                console.error("Error fetching document ID: ", error);
            }
        };
    
        fetchDocumentId();
    }, [user1, db]);

    useEffect(() => {
        if (!documentID) return; // Wait until documentId is available
    
        const docRef = doc(db, 'tables', documentID);
    
        const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                //console.log("Document data:", data);
                // Handle the data (e.g., update state)
                setGameDocument(data);
                data.status === "full" ? setGameMessage("game ready") : setGameMessage(data.status);
                const players = data.players || [];
                setDeck1(players[0]?.deck || []);
                setCard1(players[0]?.currentCard || null);
                setPoints1(players[0]?.score || 0); 

                setDeck2(players[1]?.deck || []);
                setCard2(players[1]?.currentCard || null);
                setPoints2(players[1]?.score || 0); 
                
            } else {
                console.log("Document does not exist!");
            }
        });
    
        return () => unsubscribe(); // Cleanup the listener on unmount
    }, [documentID, db]);

    // gameDocument will have the most up to date information for every player but it will read only when the status field is updated 

    const profilePicturesFetched = useRef(false);
    useEffect(() => {
        const fetchProfileImage = async (userUID, setImage) => {
            const storageRef = ref(storage, `avatars/${userUID}`);
            try {
                const url = await getDownloadURL(storageRef);
                setImage(url); // Set the profile image URL
            } catch (error) {
                console.error(`Failed to fetch avatar for UID: ${userUID}`, error.message);
            }
        };

        const fetchProfilePicturesOnce = () => {
            if (!gameDocument || profilePicturesFetched.current) return;

            const playerIDs = gameDocument.playerIDs;
            const user1UID = user1.uid;
            const user2UID = playerIDs.find((id) => id !== user1UID); // Find the other player’s UID

            if (user1UID) fetchProfileImage(user1UID, setSelectedImage1);
            if (user2UID) fetchProfileImage(user2UID, setSelectedImage2);

            setCreatorUID(gameDocument.createdBy?.id); // Set the creator UID
            profilePicturesFetched.current = selectedImage2 === placeholder ? false : true; // Mark as fetched
        };

        fetchProfilePicturesOnce();
    }, [user1, gameDocument]); // Only runs when 'gameDocument' is first set


    const usernamesFetched = useRef(false);

    useEffect(() => {
        const getUsername = async (userUID, setUsername) => {
            try {
                const userRef = doc(db, 'users', userUID);
                const userSnapshot = await getDoc(userRef);
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.data();
                    setUsername(userData.username); // Set the username
                }
            } catch (error) {
                console.error(`Error getting username for UID: ${userUID}`, error);
            }
        };

        const fetchUsernamesOnce = () => {
            if (!gameDocument || usernamesFetched.current) return;

            const playerIDs = gameDocument.playerIDs;
            const user1UID = user1.uid;
            const user2UID = playerIDs.find((id) => id !== user1UID); // Find the other player’s UID

            if (user1UID) getUsername(user1UID, setUsername1);
            if (user2UID) getUsername(user2UID, setUsername2);

            usernamesFetched.current = username2 === '' ? false : true; // Mark as fetched
        };

        fetchUsernamesOnce();
    }, [user1, gameDocument]); // Only runs when 'gameDocument' is first set


    /*  CHECK THIS OUT Jonathan, I would like to highlight this section of code because it establishes the foundation for the multiplayer game. 
        It creates the deck, shuffles the deck and then deals the cards evenly to each player. 
        When the cards are dealt, it is reflected in  our Database (Firebase/Firestore) which ensures the live gamestate is reflected for both players on the front-end. 
        Additionally, this code also handles errors appropriately 
    */
    const beginGame = async () => {
    if (!db || !gameDocument || !user1) {
        console.error("Database, game document, or user data is missing.");
        return;
    }
    
    const tablesRef = doc(db, 'tables', documentID);
    
    try {
        const tableDoc = await getDoc(tablesRef);

        if (!tableDoc.exists()) {
            console.error("Table document not found.");
            return;
        }

        const tableData = tableDoc.data();
        //console.log("tableDATA:", tableData);

        // Initialize and shuffle the deck
        const deck = new Deck();
        if (!deck.cards || deck.cards.length === 0) {
            console.error("Deck is not initialized correctly.");
            return;
        }
        deck.shuffle();

        // Divide the deck into two halves
        const half = Math.ceil(deck.cards.length / 2);
        const playerDeck1 = deck.cards.slice(0, half);
        const playerDeck2 = deck.cards.slice(half);

        // Prepare player data
        const updatedPlayers = tableData.players.map((player) => {
            const isCurrentPlayer = player.id === user1.uid;
            const assignedDeck = isCurrentPlayer ? playerDeck1 : playerDeck2;

            // Ensure cards are converted to plain objects (suit, value)
            const currentCard = assignedDeck.length > 0 ? {suit: assignedDeck[0].suit, value: assignedDeck[0].value} : null;

            // Only store the suit and value of each card
            const normalizedDeck = assignedDeck.map(card => ({
                suit: card.suit,
                value: card.value,
            }));

            return {
                ...player,
                currentCard,
                deck: normalizedDeck,
                score: assignedDeck.length,
            };
        });

        // Update Firestore with the new game state
        await updateDoc(tablesRef, {
            players: updatedPlayers,
            status: "game started",
        });

        } catch (error) {
            console.error("Error starting the game:", error);
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        e.preventDefault();
    };

    const handleMouseUpContainer = () => {
        setIsDragging(false);
    }

    const handleMouseUp = () => {
        setIsDragging(false);
        const deckElement = document.querySelector('.player-deck-drag');
        const dropZoneElement = document.querySelector('.drop-zone');

        if(deckElement && dropZoneElement) {
            const deckRect = deckElement.getBoundingClientRect();
            const dropZoneRect = dropZoneElement.getBoundingClientRect();

            const isInDropZone = (
                deckRect.left < dropZoneRect.right &&
                deckRect.right > dropZoneRect.left &&
                deckRect.top < dropZoneRect.bottom &&
                deckRect.bottom > dropZoneRect.top 
            );

            if (isInDropZone) {
                if (isWar) {
                    //playRound()
                    setCardPosition({ x: 0, y: 290 });
                } else {
                    setCardPosition({ x: 0, y: 290 });
                    //playRound()
                }
            }
        }
    };

    const handleDrag = (event) => {
        if (isDragging) {
            event.preventDefault();
            const container = document.querySelector('.game-board');
            const containerRect = container.getBoundingClientRect();

            const cardElement = document.querySelector('.player-deck-drag');
            const cardWidth = cardElement.offsetWidth;
            const cardHeight = cardElement.offsetHeight;

            const newPosition = {
                x: event.clientX - containerRect.left - cardWidth / 2,
                y: event.clientY - containerRect.top - cardHeight / 2,
            };
            setCardPosition(newPosition);
        }
    };
    
    
    return (
        <div className='game-container' onMouseMove={handleDrag} onMouseUp={handleMouseUpContainer}>
            <div className="players-info">
                <img src={selectedImage2} alt="Player 2 avatar" className="profile-picture" />
                <p className='username'>{username2} : {points2}</p>
            </div>


            <div className="game-board" onMouseMove={handleDrag}>
                

                { (deck1 && deck2) && (deck2.length > 0) && (
                    <img
                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                        alt="Backside of the player 2's Deck"
                        className="bot-deck"
                    />
                )}

                {/* Show the chosen cards */}
                <div className='drawn-cards-container'>
                    <div className='bot-zone'>
                        { (userUID === creatorUID) && ((deck2 && deck2.length > 0) && (deck1 && deck1.length > 0)) && card2 && (
                            <div className="card-wrapper-bot">
                                <span className="card-label">player2</span>
                                <img
                                    key={flip}
                                    src={`${process.env.PUBLIC_URL}/images/Cards/card${CARD_SUIT_MAP[card2.suit]}${card2.value}.png`}
                                    alt="player 2's Card"
                                    className='bot-card'
                                />
                            </div>
                        )}

                        { (userUID !== creatorUID) && ((deck1 && deck1.length > 0) && (deck2 && deck2.length > 0)) && card1 && (
                            <div className="card-wrapper-player">
                                <span className="card-label">player1</span>
                                <img
                                    key={flip}
                                    src={`${process.env.PUBLIC_URL}/images/Cards/card${CARD_SUIT_MAP[card1.suit]}${card1.value}.png`}
                                    alt="Player's Card"
                                    className='player-card'
                                />
                            </div>
                            
                        )}

                    </div>

                    <div className='drop-zone'>
                        {/* Show the 'stack' of cards at the beginning of the game in the center of the gameboard*/}
                        { (deck1 === undefined || deck2 === undefined || deck1.length === 0 || deck2.length === 0) && (
                                <div className="full-deck-container">
                                    <button onClick={beginGame}>
                                        <img
                                            src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                                            alt="Backside of a Card"
                                            className="full-deck"
                                        />    
                                    </button>
                                    <div className="full-deck-swap1"></div> {/* First animated card */}
                                    <div className="full-deck-swap2"></div> {/* Second animated card */}
                                </div>      
                            )}

                        { (userUID === creatorUID) && ((deck1 && deck1.length > 0) && (deck2 && deck2.length > 0)) && card1 && (
                            <div className="card-wrapper-player">
                                <span className="card-label">player1</span>
                                <img
                                    key={flip}
                                    src={`${process.env.PUBLIC_URL}/images/Cards/card${CARD_SUIT_MAP[card1.suit]}${card1.value}.png`}
                                    alt="Player's Card"
                                    className='player-card'
                                />
                            </div>
                            
                        )}

                        { (userUID !== creatorUID) && ((deck2 && deck2.length > 0) && (deck1 && deck1.length > 0)) && card2 && (
                            <div className="card-wrapper-bot">
                                <span className="card-label">player2</span>
                                <img
                                    key={flip}
                                    src={`${process.env.PUBLIC_URL}/images/Cards/card${CARD_SUIT_MAP[card2.suit]}${card2.value}.png`}
                                    alt="player 2's Card"
                                    className='bot-card'
                                />
                            </div>
                        )}
                
                    </div>
                </div>

                {/* Show the player's interactive card */}
                { (deck1 && deck2) && deck1.length > 0 && (
                    <img
                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                        alt="Backside of the player's Deck"
                        className="player-deck-drag"
                        style={{
                            top: `${cardPosition.y}px`,
                            left: `${cardPosition.x}px`,
                            position: 'absolute',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                    />
                )}

                {/* Show the player's deck */}
                { (deck1 && deck2) && deck1.length > 0 && (
                    <img
                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                        alt="Backside of the player 1's Deck"
                        className="player-deck"
                    />
                )}

            </div>


            <div className="players-info">
                <img src={selectedImage1} alt="Player 1 Avatar" className="profile-picture" />
                <p className='username'>{username1} : {points1}</p>
            </div>
            <div className="game-controls">
                <button className='lobby-button' onClick={() => navigate('/profile')}>Go Back to Profile</button>
                <p className="game-message">{gameMessage}</p>
                { creatorUID === user1.uid && <button className='lobby-button'>Deal Cards</button>}
                <button className='lobby-button'>Play Round</button>
                <button className='lobby-button'>Restart</button>
            </div>
        </div>
    );

}

export default GameTableMultiplayer;