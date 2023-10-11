let selectedPiece = null;
let currentPlayer = 'white'; // Player 1 starts
let yourPlayer = 'TBD';
let skipRequired = false;
document.addEventListener("DOMContentLoaded", () => {
    function gameId() {
        return window.location.href.split('/').pop();
    }
    const socket = io.connect(location.origin);

    socket.on('connect', function() {
        console.log('Connected to server');
        socket.emit('join_game', {game_id: gameId()});
    });

    const board = document.querySelector('.board');
    const statusElement = document.querySelector('.status');
    const winModal = document.getElementById("winModal");
    const closeModal = document.getElementById("closeModal");
    const winMessage = document.getElementById("winMessage");
    const resetFromModal = document.getElementById("resetFromModal");

    function playPlaceSound() {
        let soundEffect = document.getElementById('placeSound');
        soundEffect.play();
    }
    
    function showWinModal(winner) {
        winMessage.innerHTML = `${winner} kazandı!`;
        winModal.style.display = "block";
    }
    
    // When the user clicks on <span> (x), close the modal
    closeModal.onclick = function() {
        winModal.style.display = "none";
    }
    
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target === winModal) {
            winModal.style.display = "none";
        }
    }
    
    // Reset the game when "Reset" button in modal is clicked
    resetFromModal.onclick = function() {
        resetGame();
        winModal.style.display = "none";
    }

    function resetGame() {
        // Remove all pieces from the board
        const allPieces = document.querySelectorAll('.piece, .dot, .ghost-piece');
        allPieces.forEach(piece => piece.remove());
    
        // Add the initial black pieces (top-left 3x3)
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const square = document.querySelector(`[data-position="${i}-${j}"]`);
                const piece = document.createElement('div');
                piece.classList.add('piece', 'black-piece');
                square.appendChild(piece);
            }
        }
    
        // Add the initial white pieces (bottom-right 3x3)
        for (let i = 5; i < 8; i++) {
            for (let j = 5; j < 8; j++) {
                const square = document.querySelector(`[data-position="${i}-${j}"]`);
                const piece = document.createElement('div');
                piece.classList.add('piece', 'white-piece');
                square.appendChild(piece);
            }
        }
    
        // Reset game state variables
        currentPlayer = 'white';
        selectedPiece = null;
        skipRequired = false;
        clearHighlights();
    
        // Update the display for the turn
        updateTurnDisplay();
    }

    function updatePlayerDisplay(data) {
        const currentTurnElement = document.getElementById('player-color');

        if (data === 'black') {
            currentTurnElement.textContent = "Siyah ⚫";
        } else if (data === 'white') {
            currentTurnElement.textContent = "Beyaz ⚪ ";
        } else {
            currentTurnElement.textContent = "İZLEYİCİ";
        }
    }
    function updateTurnDisplay() {
        const currentTurnElement = document.getElementById('current-turn');
        checkWinCondition();
        
        if (currentPlayer === yourPlayer) {
            currentTurnElement.textContent = "Sıra senin. 🟢";
        } else if (currentPlayer === 'white' && yourPlayer == 'black') {
            currentTurnElement.textContent = "Sıra beyazda. ⏳";
        } else if (currentPlayer === 'black' && yourPlayer == 'white') {
            currentTurnElement.textContent = "Sıra siyahta. ⏳";
        }
}
    
    // Function to determine if the movement is valid

    function getSquareCoordinates(square) {
        return square.dataset.position.split('-').map(Number);
    }

    function isValidSimpleMove(oldSquare, newSquare) {
        const [oldX, oldY] = getSquareCoordinates(oldSquare);
        const [newX, newY] = getSquareCoordinates(newSquare);
        const dx = newX - oldX;
        const dy = newY - oldY;
    
        if ((Math.abs(dx) === 0 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 0)) {
            // Ensure pieces move away from their corner
            if ((selectedPiece.dataset.player === 'black' && (dx === 1 || dy === 1)) ||
                (selectedPiece.dataset.player === 'white' && (dx === -1 || dy === -1))) {
                return !newSquare.firstChild; // Ensure the new square is empty
            }
        }
        return false;
    }
    
    function isValidSkip(oldSquare, newSquare) {
        const [oldX, oldY] = getSquareCoordinates(oldSquare);
        const [newX, newY] = getSquareCoordinates(newSquare);
        const dx = newX - oldX;
        const dy = newY - oldY;
        const midX = (oldX + newX) / 2;
        const midY = (oldY + newY) / 2;
        const midSquare = document.querySelector(`[data-position="${midX}-${midY}"]`);
    
        // Check for valid skip conditions
        if ((Math.abs(dx) === 0 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 0)) {
            // Ensure pieces move away from their corner
            if ((selectedPiece.dataset.player === 'black' && (dx === 2 || dy === 2)) ||
                (selectedPiece.dataset.player === 'white' && (dx === -2 || dy === -2))) {
                return midSquare.firstChild && !newSquare.firstChild; // Ensure there's a piece to skip over and the destination is empty
            }
        }
        return false;
    }
    
    function isValidMove(oldSquare, newSquare) {
        return isValidSimpleMove(oldSquare, newSquare) || isValidSkip(oldSquare, newSquare);
    }
    

    function handleSkip(startSquare, targetSquare) {
        // Create a 'ghost' piece at the original position
        const ghostPiece = document.createElement('div');
        ghostPiece.classList.add('piece', selectedPiece.dataset.player + '-piece', 'ghost-piece'); // Using a hypothetical 'ghost-piece' CSS class
        startSquare.appendChild(ghostPiece);
    
        // Create a 'dot' at the target position
        const dot = document.createElement('div');
        dot.dataset.player = currentPlayer;
        dot.classList.add('dot'); // Using a hypothetical 'dot' CSS class
        targetSquare.appendChild(dot);
    
        // Remove the original piece (it's now represented by the ghost piece)
        selectedPiece.remove();
   
        // Check if further skips are possible from the new position
        if (!canSkipFromSquare(targetSquare)) {
            // If no further skips, convert dot into regular piece
            dot.classList.remove('dot');
            dot.classList.add('piece', selectedPiece.dataset.player + '-piece');
            document.querySelectorAll('.ghost-piece').forEach(ghost => ghost.remove());
        } else {
            selectedPiece = dot; // The dot becomes the new "selectedPiece"
        }
    }
    

    function canSkipFromSquare(square) {
        const [x, y] = getSquareCoordinates(square);
        const possibleDirections = selectedPiece.dataset.player === 'black' ? [[0, 2], [2, 0]] : [[0, -2], [-2, 0]];
    
        for (let [dx, dy] of possibleDirections) {
            const newX = x + dx;
            const newY = y + dy;
            const midX = (x + newX) / 2;
            const midY = (y + newY) / 2;
    
            const targetSquare = document.querySelector(`[data-position="${newX}-${newY}"]`);
            const midSquare = document.querySelector(`[data-position="${midX}-${midY}"]`);
            
            if (targetSquare && midSquare && !targetSquare.firstChild && midSquare.firstChild) {
                return true;
            }
        }
        return false;
    }
    
    function highlightValidMoves(square) {
        const [x, y] = getSquareCoordinates(square);
        const possibleDirections = selectedPiece.dataset.player === 'black' ? [[0, 1], [1, 0], [2, 0], [0, 2]] : [[0, -1], [-1, 0], [-2, 0], [0, -2]];
    
        for (let [dx, dy] of possibleDirections) {
            const newX = x + dx;
            const newY = y + dy;
            const targetSquare = document.querySelector(`[data-position="${newX}-${newY}"]`);

            if (targetSquare && isValidMove(square, targetSquare)) {
                targetSquare.classList.add('highlight');
            }
        }
    }
    
    function clearHighlights() {
        const highlightedSquares = document.querySelectorAll('.highlight');
        highlightedSquares.forEach(square => square.classList.remove('highlight'));
    }

    // Calculate tile size based on the board's height
    var tileSize = board.clientHeight / 8;
    
    // Set the line-height for rank numbers
    var rankNumbers = document.querySelectorAll('.rankNumber');
    rankNumbers.forEach(function(rankNumber) {
        rankNumber.style.lineHeight = tileSize + 'px';
    });
    
    // Set the width for file letters based on the board's width
    var fileLetters = document.querySelectorAll('#file > .fileLetter');
    fileLetters.forEach(function(fileLetter) {
        fileLetter.style.width = board.clientWidth / 8 + 'px';
    });
    

    // Create board squares and pieces
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = document.createElement('div');
            square.classList.add('square', ((i-j)%2==0) ? 'dark-square' : 'light-square');
            square.dataset.position = `${i}-${j}`;
            board.appendChild(square);

            if ((i < 3 && j < 3)) {
                const piece = document.createElement('div');
                piece.classList.add('piece', 'black-piece');
                piece.dataset.player = 'black';
                square.appendChild(piece);
            }
            if ((i > 4 && j > 4)) {
                const piece = document.createElement('div');
                piece.classList.add('piece', 'white-piece');
                piece.dataset.player = 'white';
                square.appendChild(piece);
            }
        }
    }




    function checkWinCondition() {
        const blackWinCondition = Array.from(document.querySelectorAll('.square'))
                                      .filter(square => {
                                        const [x, y] = getSquareCoordinates(square);
                                        return x > 4 && y > 4;
                                      })
                                      .every(square => square.firstChild && square.firstChild.classList.contains('black-piece'));
    
        const whiteWinCondition = Array.from(document.querySelectorAll('.square'))
                                      .filter(square => {
                                        const [x, y] = getSquareCoordinates(square);
                                        return x < 3 && y < 3;
                                      })
                                      .every(square => square.firstChild && square.firstChild.classList.contains('white-piece'));
    
        if (blackWinCondition) {
            showWinModal("Siyah");
        }
    
        if (whiteWinCondition) {
            showWinModal("Beyaz");
        }
    
    }

    socket.on('start_game', () => {
        console.log("hey")
        updateTurnDisplay();
        board.addEventListener('click', (e) => {
            if (currentPlayer != yourPlayer){
                return;
            }

            const target = e.target;
            clearHighlights(); // Clear previous highlights
        
            // If player clicks on a piece
            if (target.classList.contains('piece') && target.dataset.player === currentPlayer && !skipRequired) {
                if (selectedPiece) {
                    selectedPiece.classList.remove('selected'); // Deselect previously selected piece
                }
                selectedPiece = target;
                selectedPiece.classList.add('selected');
                highlightValidMoves(selectedPiece.parentElement); // Highlight possible moves
                syncServer();
                return;
            }
        
            if (target.dataset.position){
                // Handle simple move
                if (selectedPiece && isValidSimpleMove(selectedPiece.parentElement, target)) {
                    target.appendChild(selectedPiece);
                    selectedPiece.classList.remove('selected');
                    selectedPiece = null;
                    currentPlayer = (currentPlayer === 'white') ? 'black' : 'white'; // Switch player
                    playPlaceSound();
                    updateTurnDisplay(); // Call this function to update the turn display
                    syncServer();
                    return;
                }

                // Handle skips
                if (selectedPiece && isValidSkip(selectedPiece.parentElement, target)) {
                    handleSkip(selectedPiece.parentElement, target);
                    if (canSkipFromSquare(target)) {
                        selectedPiece = target.firstChild; // The dot becomes the new "selectedPiece"
                    } else {
                        selectedPiece = null;
                        currentPlayer = (currentPlayer === 'white') ? 'black' : 'white'; // Switch player
                        updateTurnDisplay(); // Call this function to update the turn display
                    }
                    playPlaceSound();
                    syncServer();
                    return;
                }
            }
        
            // Handle case where player clicks on the dot (to confirm end of skips)
            if (target === selectedPiece && target.classList.contains('dot')) {
                // Convert dot to regular piece and remove ghost pieces
                target.classList.remove('dot');
                target.classList.add('piece');
                target.classList.add((currentPlayer === 'white') ? 'white-piece' : 'black-piece');
                target.dataset.player = currentPlayer;
                document.querySelectorAll('.ghost-piece').forEach(ghost => ghost.remove());
                currentPlayer = (currentPlayer === 'white') ? 'black' : 'white'; // Switch player
                updateTurnDisplay(); // Call this function to update the turn display
                selectedPiece = null;
                playPlaceSound();
                syncServer();
                return;
            }
        
        });
    }) 
    
    socket.on('update_board', function(data) {
        console.log(data);
        document.getElementsByClassName('board')[0].innerHTML = data['board'];
        // Toggle the current player after the board is updated
        currentPlayer = data['player'];
        updateTurnDisplay();
    });
    socket.on('assign_color', function(data) {
        console.log("assigned color", data);
        updatePlayerDisplay(data);
        yourPlayer = data;
    });
    socket.on('game_terminated', function(data) {
        alert(data);
    });

    function syncServer() {
        console.log("Syncing board");
        // Get the current state of the board
        const boardHTML = document.getElementsByClassName('board')[0].innerHTML;

        // Emit this state to the server
        socket.emit('sync_board', {'board': boardHTML, 'player': currentPlayer, 'game_id': gameId()});
    }

});
