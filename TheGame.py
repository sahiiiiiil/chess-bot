from flask import Flask, request, jsonify
import json
from flask_restful import Api, Resource
from flask_cors import CORS
import chess
from stockfish import Stockfish

app = Flask(__name__)
CORS(app)
api = Api(app)

# Load the configuration file
with open('./config.json') as config_file:
    config = json.load(config_file)

STOCKFISH_PATH = config['STOCKFISH_PATH']

# Path to the Stockfish engine executable
#STOCKFISH_PATH = '/opt/homebrew/bin/stockfish'  # Updated path to Stockfish

# Stockfish difficulty levels configuration
STOCKFISH_LEVELS = {
    'easy': 1,
    'medium': 5,
    'hard': 10
}

class ChessGame:
    def __init__(self, fen=None):
        self.stockfish = None
        try:
            if fen == 'start' or fen is None:
                self.board = chess.Board()
            else:
                self.board = chess.Board(fen)
            self.stockfish = Stockfish(STOCKFISH_PATH)
        except Exception as e:
            print(f"Error initializing ChessGame: {e}")

    def set_difficulty(self, level):
        self.stockfish.set_skill_level(STOCKFISH_LEVELS[level])

    def make_move(self, move):
        try:
            self.board.push_san(move)
            return True, ""
        except Exception as e:
            return False, str(e)

    def get_stockfish_move(self):
        try:
            self.stockfish.set_fen_position(self.board.fen())
            move = self.stockfish.get_best_move()
            self.board.push_san(move)
            return move
        except Exception as e:
            print(f"Error getting Stockfish move: {e}")
            return None

class NewGame(Resource):
    def post(self):
        try:
            data = request.get_json()
            difficulty = data['difficulty']
            color = data['color']
            game = ChessGame()
            game.set_difficulty(difficulty)
            return jsonify({"board_fen": game.board.fen(), "difficulty": difficulty})
        except Exception as e:
            print(f"Error in NewGame: {e}")
            return {"message": "Internal server error"}, 500

class MakeMove(Resource):
    def post(self):
        try:
            data = request.get_json()
            print(data)
            fen = data['fen']
            move = data['move']
            difficulty = data['difficulty']
            
            game = ChessGame(fen)
            game.set_difficulty(difficulty)
            
            success, error = game.make_move(move)
            if not success:
                return {"message": error}, 400
            
            stockfish_move = game.get_stockfish_move()
            if not stockfish_move:
                return {"message": "Error getting Stockfish move"}, 500

            return jsonify({"stockfish_move": stockfish_move, "board_fen": game.board.fen()})
        except Exception as e:
            print(f"Error in MakeMove: {e}")
            return {"message": "Internal server error"}, 500

api.add_resource(NewGame, '/new_game')
api.add_resource(MakeMove, '/make_move')

if __name__ == '__main__':
    app.run(debug=True, port=8080)
