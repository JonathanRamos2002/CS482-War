import React, { useState, useEffect } from 'react';
import {storage} from '../firebase';
import {ref, getDownloadURL} from 'firebase/storage';
import { getFirestore, doc, getDoc} from 'firebase/firestore';
import './GameTable.css'; 
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

function GameTable({user, isGuest, guestUsername}) {
    const db = getFirestore();
    const navigate = useNavigate(); //hook for navigation

     // User Info
     const [imageFetched, setImageFetched] = useState(false);
     const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg';
     const [selectedImage, setSelectedImage] = useState(placeholder);
     const [username, setUsername] = useState(user.email || '');
 
     // Game state
     const [playerDeck, setPlayerDeck] = useState(null);
     const [botDeck, setBotDeck] = useState(null);
     const [playerCard, setPlayerCard] = useState(null);
     const [botCard, setBotCard] = useState(null);
     const [gameMessage, setGameMessage] = useState("Click 'Deal Cards' to start the game.");

     // Card positions
    const [cardPosition, setCardPosition] = useState({ x: 0, y: 290 });
    const [isDragging, setIsDragging] = useState(false);

    const [flip, setFlip] = useState(true);

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
                setCardPosition({ x: 0, y: 300 });
                playRound()
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

 
     // Get User's profile picture and username 
     useEffect(() => {
         const fetchProfileImage = async () => {
             if (!imageFetched && !isGuest) {
                 const storageRef = ref(storage, `avatars/${user.uid}`);
                 try {
                     const url = await getDownloadURL(storageRef);
                     setSelectedImage(url);
                     setImageFetched(true);
                 } catch (error) {
                     console.log('Avatar not found, using placeholder:', error.message);
                 }
             }
         };
         fetchProfileImage();
 
         const getUsername = async () => {
            if(!isGuest){
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnapshot = await getDoc(userRef);
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.data();
                        setUsername(userData.username);
                    }
                } catch (error) {
                    console.error(error);
                }
            }
         };
         getUsername();
     }, [db, imageFetched, user, isGuest]);

    const restartGame = () => {
        setPlayerDeck(null);
        setBotDeck(null);
        setPlayerCard(null);
        setBotCard(null);
        setCardPosition({ x: 0, y: 290 });
        setGameMessage("Click 'Deal Cards' to start the game.");
    }
 
     // Deal Cards (initialize decks for both players)
    const dealCards = () => {
         const deck = new Deck();
         deck.shuffle();
         const half = Math.ceil(deck.cards.length / 2);
         setPlayerDeck(deck.cards.slice(0, half));
         setBotDeck(deck.cards.slice(half));
         setGameMessage("Game started! Click to play a round.");
    };
 
     // Play a single round
     const playRound = () => {
        if (!playerDeck || !botDeck) {
            setGameMessage("Game has not started!");
            return;
        }

        if (playerDeck.length === 0 || botDeck.length === 0) {
            setGameMessage(playerDeck.length > 0 ? "You win the game! Bot ran out of cards :) " : "Bot wins the game! You ran out of cards :(");
            return;
        }
 
        // Each player will draw a card, then set each player's current card to the one drawn 
        const playerCardDrawn = playerDeck.shift();
        const botCardDrawn = botDeck.shift();
        setPlayerCard(playerCardDrawn);
        setBotCard(botCardDrawn);
 
        // Determine the integer value of the card using the CARD_VALUE_MAP
        const playerCardValue = CARD_VALUE_MAP[playerCardDrawn.value];
        const botCardValue = CARD_VALUE_MAP[botCardDrawn.value];
 
        let roundMessage = "";
        if (playerCardValue > botCardValue) {
            setPlayerDeck((prevDeck) => [...prevDeck, playerCardDrawn, botCardDrawn]);
            roundMessage = "You win this round!";
         } else if (playerCardValue < botCardValue) {
            setBotDeck((prevDeck) => [...prevDeck, botCardDrawn, playerCardDrawn]);
            roundMessage = "Bot wins this round!";
         } else {
            roundMessage = "It's a tie! War!";
            //CURRENTLY JUST RETURNING CARDS BACK TO EACH PLAYER
            setPlayerDeck((prevDeck) => [...prevDeck, playerCardDrawn]);
            setBotDeck((prevDeck) => [...prevDeck, botCardDrawn]);
         }

        setFlip(!flip);
        setGameMessage(roundMessage);
    }; 
    
    return (
        <div className='game-container' onMouseMove={handleDrag} onMouseUp={handleMouseUpContainer}>
            <div className="players-info">
                <img src={placeholder} alt="Bot Avatar" className="profile-picture" />
                <p className='username'>Bot : {!botDeck ? 0 : botDeck.length}</p>
            </div>
      
            <div className="game-board" onMouseMove={handleDrag}>
                {/* Show the bot's deck */}
                { (playerDeck && botDeck) && (botDeck.length > 0) && (
                    <img
                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                        alt="Backside of the bot's Deck"
                        className="bot-deck"
                    />
                )}

                {/* Show the chosen cards */}
                <div className='drawn-cards-container'>
                    { ((botDeck && botDeck.length > 0) && (playerDeck && playerDeck.length > 0)) && botCard && (
                        <div className="card-wrapper-bot">
                            <span className="card-label">Bot</span>
                            <img
                                key={flip}
                                src={`${process.env.PUBLIC_URL}/images/Cards/card${CARD_SUIT_MAP[botCard.suit]}${botCard.value}.png`}
                                alt="Bot's Card"
                                className='bot-card'
                            />
                        </div>
                    )}

                    <div className='drop-zone'>
                        { ((playerDeck && playerDeck.length > 0) && (botDeck && botDeck.length > 0)) && playerCard && (
                            <div className="card-wrapper-player">
                                <span className="card-label">{isGuest ? guestUsername : username}</span>
                                <img
                                    key={flip}
                                    src={`${process.env.PUBLIC_URL}/images/Cards/card${CARD_SUIT_MAP[playerCard.suit]}${playerCard.value}.png`}
                                    alt="Player's Card"
                                    className='player-card'
                                />
                            </div>
                        )}

                        {/* Show the 'stack' of cards at the beginning of the game in the center of the gameboard*/}
                        { (!playerDeck && !botDeck) && (
                            <button onClick={dealCards}>
                                <img
                                    src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                                    alt="Backside of the entire Deck"
                                    className="full-deck"
                                />
                            </button>
                        )}
                    </div>
                </div>

                {/* Show the player's interactive card */}
                { (playerDeck && botDeck) && playerDeck.length > 0 && (
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
                { (playerDeck && botDeck) && playerDeck.length > 1 && (
                    <img
                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                        alt="Backside of the player's Deck"
                        className="player-deck"
                    />
                )}

            </div>
      
            <div className="players-info">
                <img src={selectedImage} alt="User Avatar" className="profile-picture" />
                <p className='username'>{isGuest ? guestUsername : username} : {!playerDeck ? 0 : playerDeck.length}</p>
            </div>
      
            <div className="game-controls">
                {/* Add controls for other actions */}
                <button className='lobby-button' onClick={() => navigate('/profile')}>Go Back to Profile</button>
                <p className="game-message">{gameMessage}</p>
                <button className='lobby-button' onClick={dealCards}>Deal Cards</button>
                <button className='lobby-button' onClick={playRound}>Play Round</button>
                <button className='lobby-button' onClick={restartGame}>Restart</button>
            </div>
        </div>
    );

}

export default GameTable;