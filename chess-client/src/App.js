import React, { useState, useEffect} from 'react';
import { Chessboard } from 'react-chessboard';
import axios from 'axios';
import { Chess } from 'chess.js';
import './App.css';
import chessIcon from './images/glowing.jpeg'

const ChessBoard = () => {
  const [position, setPosition] = useState('start');
  const [difficulty, setDifficulty] = useState('easy');
  const [chess, setChess] = useState(new Chess());
  const [gameStatus, setGameStatus] = useState('Select the difficulty level and start a New Game');
  const [history, setHistory] = useState([{ position: 'start', move: '', evaluation: 0 }]); // Track the history of moves with evaluation scores  const [currentMoveIndex, setCurrentMoveIndex] = useState(0); // Track the current move index for navigation
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0); // Track the current move index for navigation
  const [movesAllowed, setMovesAllowed] = useState(false); // Track if moves are allowed
  const [isGameActive, setIsGameActive] = useState(false);
  const [bestMove, setBestMove] = useState(''); // Store the best move suggestion
  const [displayBestMove, setDisplayBestMove] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setChess(new Chess());
    setHistory([{ position: 'start', move: '', evaluation: 0 }]);
    setCurrentMoveIndex(0);
  }, []);

  useEffect(() => {
    setCurrentMoveIndex(history.length);
  }, [history]);

  const updateGameStatus = (chess, setGameStatus) => {
    if (chess.isCheckmate()) {
      setGameStatus('Checkmate! ' + (chess.turn() === 'w' ? 'Black' : 'White') + ' wins.');
      setMovesAllowed(false);
    } else if (chess.isStalemate()) {
      setGameStatus('Stalemate! It\'s a draw.');
      setMovesAllowed(false);
    } else if (chess.isInsufficientMaterial()) {
      setGameStatus('Draw! Insufficient material.');
      setMovesAllowed(false);
    } else if (chess.isThreefoldRepetition()) {
      setGameStatus('Draw! Threefold repetition.');
      setMovesAllowed(false);
    } else if (chess.isDraw()) {
      setGameStatus('Draw! Fifty-move rule.');
      setMovesAllowed(false);
    } else {
      // setGameStatus('Game in progress.');
    }
  };

  const startNewGame = async (color, difficulty) => {
    try {
      const response = await axios.post('http://localhost:8080/new_game', { color, difficulty });
      const newChess = new Chess(response.data.board_fen);
      setPosition(response.data.board_fen);
      setChess(newChess);
      setCurrentMoveIndex(0);
      updateGameStatus(newChess, setGameStatus('You are White! Make a move now'));
      setDifficulty(difficulty);
      setMovesAllowed(true); // Allow moves in a new game
      setIsGameActive(true); // Set the game as active
      setHistory([]); // Clear the move history
      setErrorMessage('');
    } catch (error) {
      console.log('Error starting new game:', error);
    }
  };

  const endGame = () => {
    setPosition('start');
    setChess(new Chess());
    setGameStatus('Select the difficulty level and start a New Game');
    setHistory([]); // Clear the move history
    setErrorMessage('');
    setDisplayBestMove('');
    setIsGameActive(false); // Set the game as inactive
  };

  const makeMove = async (fen, move, difficulty) => {
    try {
      const response = await axios.post('http://localhost:8080/make_move', { fen, move, difficulty });
      chess.move(response.data.stockfish_move);
      console.log(response.data);
      setBestMove(response.data.best_move);
      const newPosition = chess.fen();
      setPosition(newPosition);
      setGameStatus('Game in Progress...');
      setHistory((prevHistory) => [...prevHistory, { position: newPosition, move: response.data.stockfish_move, evaluation: response.data.evaluation }]);      console.log(history.length);
      setCurrentMoveIndex(history.length);
      updateGameStatus(chess, setGameStatus);
      setMovesAllowed(true); // Allow moves after Stockfish move
    } catch (error) {
      console.log('Error making move:', error);
      setErrorMessage('Error making move. Please try again.');
    }
  };

  const onDrop = async (sourceSquare, targetSquare) => {
    if (!movesAllowed) return false; // Prevent moves if not allowed
    let move_string = `${sourceSquare}${targetSquare}`;
    const oldPosition = position;
    const piece = chess.get(sourceSquare);
    if (piece && piece.color !== 'w') {
      setErrorMessage('You can only move white pieces.');
      return false;
    }
    try{
      const promotionPiece = 'q'; // Default to queen for simplicity, you can modify this to allow user selection  
      if (piece.type === 'p' && ((sourceSquare[1] === '7' && targetSquare[1] === '8') || (sourceSquare[1] === '2' && targetSquare[1] === '1'))) {
        move_string += promotionPiece; // Append the promotion piece to the move string
      }

    const moveResult = chess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: promotionPiece, // Promote to a queen if applicable
    });

    if (moveResult === null) {
      throw new Error('Illegal move');
    }
    const newPosition = chess.fen();
    setPosition(newPosition); // Updates the move on board
    setHistory((prevHistory) => [...prevHistory, { position: newPosition, move: move_string, evaluation: null }]);
    setCurrentMoveIndex(history.length);
    setDisplayBestMove('');
    await makeMove(oldPosition, move_string, difficulty);
    updateGameStatus(chess, setGameStatus);
    setErrorMessage('');
    } catch {
      setErrorMessage('Illegal move. Please try again.');
      return false;
    }
  };

  const goToMove = (index) => {
    if(index < 0){
      setPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      chess.load(position);
    }
    else{
    const historyItem = history[index];
    setPosition(historyItem.position);
    chess.load(historyItem.position);
    }
    setCurrentMoveIndex(index);
    updateGameStatus(chess, setGameStatus);
    setMovesAllowed(index === history.length - 1); // Disable moves if not at the latest position
  };

  const HandledisplayBestMove = () => {
    setDisplayBestMove(bestMove);
  }

  const renderMoveList = () => {
    return history.map((item, index) => (
      <li key={index} onClick={() => goToMove(index)}>
        {index + 1}. {item.move}
      </li>
    ));
  };

  return (
    <div className="App">
      <div className="container">
        <div className="left-column" >
          <div>
          {!isGameActive ? (
              <>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <button onClick={() => startNewGame('white', difficulty)}>Start New Game</button>
              </>
            ) : (
              <button onClick={endGame}>End Game</button>
            )}
          </div>

          <div className="game-stats">
            <p>Moves: {history.length}</p>
          </div>
          <div className="suggest-move">
              {isGameActive && (
                <>
                  <button onClick={HandledisplayBestMove}>Suggest Best Move</button>
                  {displayBestMove && <p>Best Move: {displayBestMove}</p>}
                </>
              )}
            </div>
            <img src={chessIcon} alt="Chess Icon" className="chess-icon" />
        </div>
        <div className="middle-column">
        <div className="game-status-container">
            {!errorMessage && gameStatus && <div className="game-status">{gameStatus}</div>}
            {errorMessage && <div className="error-message">{errorMessage}</div>}
        </div>
        <div className='chessboard-container'>
            <Chessboard 
            position={position} 
            onPieceDrop={onDrop} 
            boardWidth={620} 
            /> 

            {isGameActive && (
              <div className="controls">
                <button onClick={() => goToMove(currentMoveIndex - 1)} disabled={currentMoveIndex < 0 || history.length === 0}>&lt;</button>
                <button onClick={() => goToMove(history.length - 1)} disabled={currentMoveIndex >= history.length-1}>▶️</button>
                <button onClick={() => goToMove(currentMoveIndex + 1)} disabled={currentMoveIndex >= history.length-1}>&gt;</button>
              </div>
            )}
        </div>
        </div>
        <div className="right-column">
          {isGameActive && (
            <div><h2> Game History </h2>
            <div className="move-list">
              <ul>
                {renderMoveList()}
              </ul>
            </div>
            </div>
          )}
        </div>
    </div>
    </div>
  );
};

export default ChessBoard;






