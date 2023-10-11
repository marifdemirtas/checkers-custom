from flask import Flask, redirect, url_for, request, render_template
from flask_socketio import SocketIO, join_room, leave_room, emit
import string
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

games = {}

def generate_game_id(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

@app.route('/')
def index():
    game_id = generate_game_id()
    print("GAME_id: ", game_id)
    return redirect(url_for('game', game_id=game_id))

@app.route('/test')
def test():
    return games

@app.route('/<game_id>')
def game(game_id):
    # This is where you serve your HTML/CSS/JS game interface.
    # For now, just a placeholder
    return render_template('board.html')

@socketio.on('connect')
def handle_connect(data):
    pass

@socketio.on('join_game')
def handle_join_game(data):
    game_id = data['game_id']
    join_room(game_id)
    print("data", data)
    if game_id not in games:
        games[game_id] = {"white": None, "black": None, "gray": []}
        color_assigned = "white"
        games[game_id]["white"] = request.sid
        emit('assign_color', color_assigned, room=request.sid)
    elif not games[game_id]["black"]:
        color_assigned = "black"
        games[game_id]["black"] = request.sid
        emit('assign_color', color_assigned, room=request.sid)
        emit('start_game', room=game_id)
    else:
        color_assigned = "gray"
        games[game_id]["gray"].append(request.sid)
        emit('assign_color', color_assigned, room=request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    for game_id, players in games.items():
        if request.sid in [players['white'], players['black']] or request.sid in players['gray']:
            if players['white'] == request.sid or players['black'] == request.sid:
                # Notify other players about the game termination
                emit('game_terminated', 'A main player has disconnected. The game has ended.', room=game_id)
                
                # Remove the game from the games list
                del games[game_id]
                break
            else:
                players['gray'].remove(request.sid)


@socketio.on('sync_board')
def handle_sync_board(data):
    print("Handling sync board")
    game_id = data['game_id']
    emit('update_board', data, room=game_id, include_self=False)

@socketio.on('reset')
def handle_reset():
    game_id = request.args.get('game_id')
    games[game_id]["white"], games[game_id]["black"] = games[game_id]["black"], games[game_id]["white"]
    emit('assign_color', 'white', room=games[game_id]["white"])
    emit('assign_color', 'black', room=games[game_id]["black"])
    # No color assignment for GRAY

if __name__ == '__main__':
    socketio.run(app, debug=True, port=8888)
