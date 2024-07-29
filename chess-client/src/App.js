import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import axios from 'axios';
import { Chess } from 'chess.js';
import './App.css';

const ChessBoard = () => {
  const [position, setPosition] = useState('start');
  const [difficulty, setDifficulty] = useState('easy');
  const [chess, setChess] = useState(new Chess());
  const [gameStatus, setGameStatus] = useState('Game in progress.');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setChess(new Chess());
  }, []);

  const updateGameStatus = (chess, setGameStatus) => {
    if (chess.isCheckmate()) {
      setGameStatus('Checkmate! ' + (chess.turn() === 'w' ? 'Black' : 'White') + ' wins.');
    } else if (chess.isStalemate()) {
      setGameStatus('Stalemate! It\'s a draw.');
    } else if (chess.isInsufficientMaterial()) {
      setGameStatus('Draw! Insufficient material.');
    } else if (chess.isThreefoldRepetition()) {
      setGameStatus('Draw! Threefold repetition.');
    } else if (chess.isDraw()) {
      setGameStatus('Draw! Fifty-move rule.');
    } else {
      setGameStatus('Game in progress.');
    }
  };

  const startNewGame = async (color, difficulty) => {
    try {
      const response = await axios.post('http://18.216.178.59:8080/new_game', { color, difficulty });
      const newChess = new Chess(response.data.board_fen);
      setPosition(response.data.board_fen);
      setChess(newChess);
      updateGameStatus(newChess, setGameStatus);
      setDifficulty(difficulty);
      setErrorMessage('');
    } catch (error) {
      console.log('Error starting new game:', error);
    }
  };

  const makeMove = async (fen, move, difficulty) => {
    try {
      const response = await axios.post('http://18.216.178.59:8080/make_move', { fen, move, difficulty });
      chess.move(response.data.stockfish_move);
      setPosition(chess.fen());
      updateGameStatus(chess, setGameStatus);
    } catch (error) {
      console.log('Error making move:', error);
      setErrorMessage('Error making move. Please try again.');
    }
  };

  const onDrop = async (sourceSquare, targetSquare) => {
    let move_string = `${sourceSquare}${targetSquare}`;
    const oldPosition = position;
    const piece = chess.get(sourceSquare);
    if (piece && piece.color !== 'w') {
      setErrorMessage('You can only move white pieces.');
      return false;
    }
    console.log(position);
    try{

      const promotionPiece = 'q'; // Default to queen for simplicity, you can modify this to allow user selection
      //const piece = chess.get(sourceSquare).type;
  
      if (piece.type === 'p' && ((sourceSquare[1] === '7' && targetSquare[1] === '8') || (sourceSquare[1] === '2' && targetSquare[1] === '1'))) {
        move_string += promotionPiece; // Append the promotion piece to the move string
      }

    const moveResult = chess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: promotionPiece, // Promote to a queen if applicable
    });

    console.log(moveResult);
    if (moveResult === null) {
      throw new Error('Illegal move');
    }

    console.log('reaching here');
    const newPosition = chess.fen();
    setPosition(newPosition); // Updates the move on board
    await makeMove(oldPosition, move_string, difficulty);
    updateGameStatus(chess, setGameStatus);
    setErrorMessage('');
    } catch {
      setErrorMessage('Illegal move. Please try again.');
      console.error('Invalid move:', move_string);
      return false;
    }
  };

  const handleDifficultyChange = (event) => {
    setDifficulty(event.target.value);
  };

  return (
    <div className="App">
      <div className="controls">
        <select value={difficulty} onChange={handleDifficultyChange}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button onClick={() => startNewGame('white', difficulty)}>New Game</button>
      </div>
      <div className="chessboard-container">
        <Chessboard position={position} onPieceDrop={onDrop} boardWidth={600} />
      </div>
      {gameStatus && <div className="game-status">{gameStatus}</div>}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
};

export default ChessBoard;






