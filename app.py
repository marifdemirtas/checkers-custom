from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")  # allow any origin to connect

users = []  # to keep track of players

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    if len(users) < 2:
        users.append(request.sid)
        color = "BLACK" if len(users) == 1 else "WHITE"
        emit('assign_color', color, to=request.sid)
    else:
        # Refuse the connection if there are already two players
        return False

@socketio.on('sync_board')
def handle_sync(data):
    # Broadcast the updated board to the other player
    socketio.emit('update_board', data, broadcast=True, include_self=False)

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in users:
        users.remove(request.sid)

if __name__ == '__main__':
    socketio.run(app, debug=True)
