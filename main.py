from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret'
socketio = SocketIO(app, cors_allowed_origins="*")  # allow any origin to connect

users = []  # to keep track of players
user_color = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print(len(users))
    if len(users) < 2:
        users.append(request.sid)
        color = "BEYAZ" if "SİYAH" in user_color.values() else "SİYAH"
        user_color[request.sid] = color
        print(color)
        emit('assign_color', color, to=request.sid)
    else:
        # Refuse the connection if there are already two players
        return False

@socketio.on('sync_board')
def handle_sync(data):
    # Broadcast the updated board to the other player
    socketio.emit('update_board', data, include_self=False)

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in users:
        users.remove(request.sid)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=8888)
