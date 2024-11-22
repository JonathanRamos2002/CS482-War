import React, { useState, useEffect } from 'react';
import {storage} from '../firebase';
import {ref, getDownloadURL} from 'firebase/storage';
import { getFirestore, doc, getDoc, updateDoc} from 'firebase/firestore';
import './GameTable.css'; 
import { useNavigate } from 'react-router-dom';
import Deck from "../deck.js"
import { UserIcon, RefreshCcw } from 'lucide-react';
import { incrementWins, incrementLosses} from "./UserProfile.js"

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

     // War state
    const [isWar, setIsWar] = useState(false); // Track whether it's a war
    const [oldWar, setOldWar] = useState(null); // Track previous war pile 

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
                if (isWar) {
                    playRound()
                    setCardPosition({ x: 0, y: 290 });
                } else {
                    setCardPosition({ x: 0, y: 290 });
                    playRound()
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
 
    // THIS IS HIP TOO - Jonathan : this updated game logic handles back-to-back war in the case that two players happen to tie again after a tie
    const playRound = () => {
        if (!playerDeck || !botDeck || playerDeck.length === 0 || botDeck.length === 0) {
            if (playerDeck.length > 0) {
                setGameMessage("You win the game!");
                incrementWins(db, user);
            } else {
                setGameMessage("Bot wins the game!");
                incrementLosses(db, user);
            }
            return;
        }
    
        if (isWar) {
            // War scenario: both players draw three cards face down and one face up
            const playerWarCards = playerDeck.splice(0, Math.min(4, playerDeck.length));
            const botWarCards = botDeck.splice(0, Math.min(4, botDeck.length));
    
            if (playerWarCards.length < 4 || botWarCards.length < 4) {
                if (playerDeck.length > botDeck.length) {
                    setGameMessage("You win the game!");
                    incrementWins(db, user);
                } else {
                    setGameMessage("Bot wins the game!");
                    incrementLosses(db, user);
                }
                return;
            }
    
            const playerWarCard = playerWarCards.pop();
            const botWarCard = botWarCards.pop();
            
            playerWarCards.push(playerCard); // add playerCard to playerWarCards
            botWarCards.push(botCard); // add botCard to botWarCards
    
            setPlayerCard(playerWarCard);
            setBotCard(botWarCard);
    
            const playerValue = playerWarCard ? CARD_VALUE_MAP[playerWarCard.value] : CARD_VALUE_MAP[playerCard.value];
            const botValue = botWarCard ? CARD_VALUE_MAP[botWarCard.value] : CARD_VALUE_MAP[botCard.value];
    
            if (playerValue > botValue) {
                if (oldWar) {
                    setPlayerDeck((prev) => [...prev, ...oldWar]);
                } 
                setPlayerDeck((prev) => [...prev, ...playerWarCards, ...botWarCards, playerWarCard, botWarCard]);
                setGameMessage("You win the war!");
                setIsWar(false);
            } else if (playerValue < botValue) {
                if (oldWar) {
                    setBotDeck((prev) => [...prev, ...oldWar]);
                }
                setBotDeck((prev) => [...prev, ...botWarCards, ...playerWarCards, botWarCard, playerWarCard]);
                setGameMessage("Bot wins the war!");
                setIsWar(false);
            } else {
                setGameMessage("Another tie! Continue the war!");
                setOldWar([...playerWarCards, ...botWarCards]);
            }
            setFlip(!flip);
        } else {
            // Regular round logic
            const playerCardDrawn = playerDeck.shift();
            const botCardDrawn = botDeck.shift();
            setPlayerCard(playerCardDrawn);
            setBotCard(botCardDrawn);
    
            const playerValue = playerCardDrawn ? CARD_VALUE_MAP[playerCardDrawn.value] : CARD_VALUE_MAP[playerCard.value];
            const botValue = botCardDrawn ? CARD_VALUE_MAP[botCardDrawn.value] : CARD_VALUE_MAP[botCard.value];
    
            if (playerValue > botValue) {
                setPlayerDeck((prev) => [...prev, playerCardDrawn, botCardDrawn]);
                setGameMessage("You win this round!");
            } else if (playerValue < botValue) {
                setBotDeck((prev) => [...prev, botCardDrawn, playerCardDrawn]);
                setGameMessage("Bot wins this round!");
            } else {
                setIsWar(true);
                setOldWar(null);
                setGameMessage("It's a tie! War begins!");
            }
            setFlip(!flip);
        }
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
                    <div className='bot-zone'>
                        { ((botDeck && botDeck.length > 0) && (playerDeck && playerDeck.length > 0)) && botCard && (
                            <div className="card-wrapper-bot">
                                <span className="card-label">Bot</span>
                                <img
                                    key={flip}
                                    src={`${process.env.PUBLIC_URL}/images/Cards/card${CARD_SUIT_MAP[botCard.suit]}${botCard.value}.png`}
                                    alt="Bot's Card"
                                    className='bot-card'
                                />

                                {isWar && (
                                    <div className="war-cards">
                                        {[...Array(3)].map((_, index) => (
                                            <img
                                                key={index}
                                                src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                                                alt={`War facedown card ${index + 1}`}
                                                className={`facedown-card facedown-card-${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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

                                {isWar && (
                                    <div className="war-cards">
                                        {[...Array(3)].map((_, index) => (
                                            <img
                                                key={index}
                                                src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                                                alt={`War facedown card ${index + 1}`}
                                                className={`facedown-card facedown-card-${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                

                        {/* Show the 'stack' of cards at the beginning of the game in the center of the gameboard*/}
                        { (!playerDeck && !botDeck) && (
                            <div className="full-deck-container">
                                <button onClick={dealCards}>
                                    <img
                                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                                        alt="Backside of the entire Deck"
                                        className="full-deck"
                                    />
                                </button>
                                <div className="full-deck-swap1"></div> {/* First animated card */}
                                <div className="full-deck-swap2"></div> {/* Second animated card */}
                            </div>
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

                <button onClick={() => navigate('/profile')} className="profile-button">
                    <UserIcon className="profile-icon" />
                </button>

                <h2 className="game-message">{gameMessage}</h2>

                <button className='profile-button' onClick={restartGame}>
                    <RefreshCcw className='profile-icon'/>
                </button>
                
            </div>

        </div>
    );

}

export default GameTable;