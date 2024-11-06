import React, { useState, useEffect } from 'react';
import {storage} from '../firebase.js';
import {ref, getDownloadURL} from 'firebase/storage';
import { getFirestore, doc, getDoc} from 'firebase/firestore';
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

function GameTableMultiplayer({user1}) {
    const db = getFirestore();
    const navigate = useNavigate(); //hook for navigation
    const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg';

     // User1 Info
     const [imageFetched1, setImageFetched1] = useState(false);
     const [selectedImage1, setSelectedImage1] = useState(placeholder);
     const [username1, setUsername1] = useState(user1.email || '');

     // User2 Info
     const [imageFetched2, setImageFetched2] = useState(false);
     const [selectedImage2, setSelectedImage2] = useState(placeholder);
     const [username2, setUsername2] = useState('');
 
     // Game state
     const [playerDeck1, setPlayerDeck1] = useState(null);
     const [playerCard1, setPlayerCard1] = useState(null);

     const [playerDeck2, setPlayerDeck2] = useState(null);
     const [playerCard2, setPlayerCard2] = useState(null);

     const [gameMessage, setGameMessage] = useState("Click 'Deal Cards' to start the game.");
 

     // Get User profile pictures and usernames 
     useEffect(() => {
        const fetchProfileImage = async (user, setImage, setFetched) => {
            const storageRef = ref(storage, `avatars/${user.uid}`);
            try {
                const url = await getDownloadURL(storageRef);
                setImage(url);
                setFetched(true);
            } catch (error) {
                console.log('Avatar not found, using placeholder:', error.message);
            }
        };

        if (!imageFetched1) {
            fetchProfileImage(user1, setSelectedImage1, setImageFetched1);
        }
        if (!imageFetched2) {
            fetchProfileImage(user2, setSelectedImage2, setImageFetched2);
        }
 
         const getUsername = async (user, setUsername) => {
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
         };

         getUsername(user1, setUsername1);
         getUsername(user2, setUsername2);

     }, [db, user1, user2, imageFetched1, imageFetched2]);

    const restartGame = () => {  // Only host should be able to restart the game
        setPlayerDeck1(null);
        setPlayerDeck2(null);
        setPlayerCard1(null);
        setPlayerCard2(null);
        setBotCard(null);
        setGameMessage("Click 'Deal Cards' to start the game.");
    }
 
    // Deal Cards (initialize decks for both players)
    const dealCards = () => {
        const deck = new Deck();
        deck.shuffle();
        const half = Math.ceil(deck.cards.length / 2);
        setPlayerDeck1(deck.cards.slice(0, half));
        setPlayerDeck2(deck.cards.slice(half));
        setGameMessage("Game started! Click to play a round.");
    };
 
     // Play a single round
     const playRound = () => {
        if (!playerDeck1 || !playerDeck2) {
            setGameMessage("Game has not started!");
            return;
        }

        if (playerDeck1.length === 0 || playerDeck2.length === 0) {
            setGameMessage(playerDeck1.length > 0 ? `${username1} wins the game! ${username2} ran out of cards :)` : `${username2} wins the game! ${username1} ran out of cards :(`);
            return;
        }
 
        // Each player will draw a card, then set each player's current card to the one drawn 
        const playerCardDrawn1 = playerDeck1.shift();
        const playerCardDrawn2 = playerDeck2.shift();
        setPlayerCard1(playerCardDrawn1);
        setPlayerCard2(playerCardDrawn2);
 
        // Determine the integer value of the card using the CARD_VALUE_MAP
        const playerCardValue1 = CARD_VALUE_MAP[playerCardDrawn1.value];
        const playerCardValue2 = CARD_VALUE_MAP[playerCardDrawn2.value];
 
        let roundMessage = "";
        if (playerCardValue1 > playerCardValue2) {
            setPlayerDeck1((prevDeck) => [...prevDeck, playerCardDrawn1, playerCardDrawn2]);
            roundMessage = "${username1} wins this round!";
         } else if (playerCardValue1 < playerCardValue2) {
            setBotDeck((prevDeck) => [...prevDeck, playerCardDrawn2, playerCardDrawn1]);
            roundMessage = "${username2} wins this round!";
         } else {
            roundMessage = "It's a tie! War!";
             // add the currently drawn cards to the war deck
            const warCards = [playerCardDrawn1, playerCardDrawn2];
            // draw at most 3 cards from each player
            for (let i = 0; i < 3; i++){
                if (playerDeck1.length > 0) warCards.push(playerDeck1.shift());
                if (playerDeck2.length > 0) warCards.push(playerDeck2.shift());
            }

            // check if a player has run out of cards
            if (playerDeck1.length === 0) {
                setGameMessage("${username2} Wins the Game! ${username1} ran out of cards during war :(");
                return;
            } else if (playerDeck2.length === 0) {
                setGameMessage("${username1} Wins the Game! ${username2} ran out of cards during war :)");
                return;
            }

            // draw the fourth card and compare 
            const playerWarCard1 = playerDeck1.shift();
            const playerWarCard2 = playerDeck2.shift();
            warCards.push(playerWarCard1, playerWarCard2);

            const playerWarCardValue1 = CARD_VALUE_MAP[playerWarCard1.value];
            const playerWarCardValue2 = CARD_VALUE_MAP[playerWarCard2.value];

            if (playerWarCardValue > botWarCardValue) {
                setPlayerDeck1((prevDeck) => [...prevDeck, ...warCards]);
                roundMessage = "${username1} wins the war!";
            } else if (playerWarCardValue < botWarCardValue) {
                setPlayerDeck2((prevDeck) => [...prevDeck, ...warCards]);
                roundMessage = "${username2} wins the war!";
            } else {
                // Recursive call to handle a tie in war
                roundMessage = "Another tie in war! War continues!";
                setPlayerDeck1((prevDeck) => [...prevDeck, playerWarCard1]);
                setPlayerDeck2((prevDeck) => [...prevDeck, playerWarCard2]);
            }
         }

        setGameMessage(roundMessage);
    }; 
    
    return (
        <div className='game-container'>
            <div className="players-info">
                <img src={selectedImage2} alt="Player 2 avatar" className="profile-picture" />
                <p className='username'>{username2} : {!playerDeck2 ? 0 : playerDeck2.length}</p>
            </div>
      
            <div className="game-board">
                {/* Show the 'stack' of cards at the beginning of the game in the center of the gameboard*/}
                { ( (playerDeck1 && playerDeck2) && (playerDeck1.length === 0 && playerDeck2.length === 0) ) && (
                    <img
                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                        alt="Backside of a Card"
                        className="card-backside"
                    />
                )}

                {/* Show player 2's deck */}
                { (playerDeck1 && playerDeck2) && (playerDeck2.length > 0) && (
                    <img
                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                        alt="Backside of the player 2's Deck"
                        className="bot-deck"
                    />
                )}

                {/* Show the chosen cards */}
                <div className='drawn-cards-container'>
                    { ((playerDeck2 && playerDeck2.length > 0) && (playerDeck1 && playerDeck1.length > 0)) && playerCard2 && (
                        <div className="card-wrapper">
                            <span className="card-label">{username2}</span>
                            <img
                                src={`${process.env.PUBLIC_URL}/images/Cards/card${CARD_SUIT_MAP[playerCard2.suit]}${playerCard2.value}.png`}
                                alt="Player 2's Card"
                                className="bot-card"
                            />
                        </div>
                    )}
                
                    { ((playerDeck1 && playerDeck1.length > 0) && (playerDeck2 && playerDeck2.length > 0)) && playerCard1 && (
                        <div className="card-wrapper">
                            <span className="card-label">{username1}</span>
                            <img
                                src={`${process.env.PUBLIC_URL}/images/Cards/card${CARD_SUIT_MAP[playerCard1.suit]}${playerCard1.value}.png`}
                                alt="Player 1's Card"
                                className="player-card"
                            />
                        </div>
                    )}
                
                </div>

                {/* Show the player's deck */}
                { (playerDeck1 && playerDeck2) && playerDeck1.length > 0 && (
                    <img
                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                        alt="Backside of the player's Deck"
                        className="player-deck"
                    />
                )}

            </div>
      
            <div className="players-info">
                <img src={selectedImage1} alt="Player 1 Avatar" className="profile-picture" />
                <p className='username'>{username1} : {!playerDeck1 ? 0 : playerDeck1.length}</p>
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

export default GameTableMultiplayer;