import React, { useState, useEffect } from 'react';
import {storage} from '../firebase.js';
import {ref, getDownloadURL} from 'firebase/storage';
import { getFirestore, doc, getDoc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
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

 
    // Game state
    const [gameMessage, setGameMessage] = useState("Click 'Deal Cards' to start the game.");

    // Get the game document data
    const [gameDocuments, setGameDocuments] = useState(null);
    useEffect(() => {
        if(!user1) {
            console.log("not logged in!")
            return;
        }
        // Reference to the 'tables' collection
        const tablesRef = collection(db, 'tables');
        // Query to find documents where playerIDs array contains the current UID
        const q = query(tablesRef, where('playerIDs', 'array-contains', user1.uid));

        // Real-time listener for query results
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tablesData = [];
            querySnapshot.forEach((doc) => {
                tablesData.push({ id: doc.id, ...doc.data() });
            });
            setGameDocuments(tablesData); // Update state with all matching documents
        }, (error) => {
            console.error("Error fetching documents: ", error);
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, [db, user1]);

    // Get Users profile pictures 
    useEffect(() => {
        const fetchProfileImage = async (userUID, setImage, setFetched) => {
            const storageRef = ref(storage, `avatars/${userUID}`);
            try {
                const url = await getDownloadURL(storageRef);
                setImage(url);
                setFetched(true);
            } catch (error) {
                console.error('Avatar not found, using placeholder:', error.message);
            }
        };

        if (!imageFetched1) {
            fetchProfileImage(user1.uid, setSelectedImage1, setImageFetched1);
        }

        if (!imageFetched2 && gameDocuments) {
            const playerids = gameDocuments[0].playerIDs
            setCreatorUID(gameDocuments[0].createdBy.id);
            const user2UID = playerids[0] === user1.uid ? playerids[1] : playerids[0];
            if(user2UID !== undefined){
                fetchProfileImage(user2UID, setSelectedImage2, setImageFetched2);
            }
        }
    }, [user1, gameDocuments, imageFetched1, imageFetched2]);

    // Get Users usernames
    useEffect(() => {
        const getUsername = async (userUID, setUsername) => {
            try {
                const userRef = doc(db, 'users', userUID);
                const userSnapshot = await getDoc(userRef);
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.data();
                    setUsername(userData.username);
                }
            } catch (error) {
                    console.error("error getting username of", userUID, error);
            }
         };

         if(user1) {
            getUsername(user1.uid, setUsername1);
        }

         if(gameDocuments) {
            const playerids = gameDocuments[0].playerIDs
            const user2UID = playerids[0] === user1.uid ? playerids[1] : playerids[0];
            if(user2UID !== undefined){
                getUsername(user2UID, setUsername2);
            }
         }

     }, [db, user1, gameDocuments]);


    // set values from db
    useEffect(() => {
        const setData = async () => {
            if(gameDocuments){
                const tableID = gameDocuments[0].id;
                const tablesRef = doc(db, 'tables', tableID);
                try {
                    const tableDoc = await getDoc(tablesRef);
                    if (tableDoc.exists()) {
                        const tableData = tableDoc.data();
                        console.log(tableData);
                        tableData.players[0].id === user1.uid ? setPoints1(tableData.players[0].score) : setPoints1(tableData.players[1].score);
                        tableData.players[0].id === user1.uid ? setPoints2(tableData.players[1].score) : setPoints2(tableData.players[0].score);

                        tableData.players[0].id === user1.uid ? setCard1(tableData.players[0].currentCard) : setCard1(tableData.players[1].currentCard);
                        tableData.players[0].id === user1.uid ? setCard2(tableData.players[1].currentCard) : setCard2(tableData.players[0].currentCard);

                        tableData.players[0].id === user1.uid ? setDeck1(tableData.players[0].deck) : setDeck1(tableData.players[1].deck);
                        tableData.players[0].id === user1.uid ? setDeck2(tableData.players[1].deck) : setDeck2(tableData.players[0].deck);

                        console.log("points1:", points1);
                        console.log("points2:", points2);

                        console.log("card1:", card1);
                        console.log("card2:", card2);

                        console.log("deck1:", deck1);
                        console.log("deck2:", deck2);

                    }
                } catch (error) {
                    console.error("error getting data from db", error);
                }
            }
        };

        
        setData();
        
    }, [db, gameDocuments, points1, points2, user1, card1, card2, deck1, deck2]);


    const beginGame = async () => {
        if (!db || !gameDocuments || !gameDocuments[0] || !user1) {
            console.error("Database, game documents, or user data is missing");
            return;
        }
    
        const tableID = gameDocuments[0].id;
        const tablesRef = doc(db, 'tables', tableID);
    
        try {
            const tableDoc = await getDoc(tablesRef);
            if (tableDoc.exists()) {
                const tableData = tableDoc.data();
                const deck = new Deck();
                deck.shuffle();
                const half = Math.ceil(deck.cards.length / 2);
                const half1 = deck.cards.slice(0, half);
                const half2 = deck.cards.slice(half);

                const updatedPlayerDeck1 = half1.map(card => ({
                    suit: card.suit,
                    value: card.value
                }));

                const updatedPlayerDeck2 = half2.map(card => ({
                    suit: card.suit,
                    value: card.value
                }));
    
                // Get the updated deck states directly
                const updatedPlayers = tableData.players.map(player => {
                    const isUser1 = player.id === user1.uid;
                    const currentCard = isUser1 ? 
                        (updatedPlayerDeck1.length > 0 ? { 
                            suit: updatedPlayerDeck1[0].suit , 
                            value: updatedPlayerDeck1[0].value 
                        } : null) : 
                        (updatedPlayerDeck2.length > 0 ? { 
                            suit: updatedPlayerDeck2[0].suit, 
                            value: updatedPlayerDeck2[0].value 
                        } : null);
    
                    return {
                        ...player,
                        currentCard: currentCard,
                        deck: isUser1 ? updatedPlayerDeck1 : updatedPlayerDeck2,
                        score: isUser1 ? updatedPlayerDeck1.length : updatedPlayerDeck2.length,
                    };
                });
                //console.log("Updated Players:", updatedPlayers);
                await updateDoc(tablesRef, { players: updatedPlayers, status: "game started" });
                //console.log("Updated player fields");
                setGameMessage("Game Started!");
            } else {
                console.error("Table document not found");
            }
        } catch (error) {
            console.error("Error updating player fields:", error);
        }
    };
    
    
    return (
        <div className='game-container'>
            <div className="players-info">
                <img src={selectedImage2} alt="Player 2 avatar" className="profile-picture" />
                <p className='username'>{username2} : {points2}</p>
            </div>


            <div className="game-board">
                {/* Show the 'stack' of cards at the beginning of the game in the center of the gameboard*/}
                { (deck1 === undefined || deck2 === undefined || deck1.length === 0 || deck2.length === 0) && (
                    <img
                        src={`${process.env.PUBLIC_URL}/images/Cards/cardBack_blue5.png`}
                        alt="Backside of a Card"
                        className="card-backside"
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
                { creatorUID === user1.uid && <button className='lobby-button' onClick={beginGame} >Deal Cards</button>}
                <button className='lobby-button'>Play Round</button>
                <button className='lobby-button'>Restart</button>
            </div>
        </div>
    );

}

export default GameTableMultiplayer;