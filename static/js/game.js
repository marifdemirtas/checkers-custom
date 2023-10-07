document.addEventListener("DOMContentLoaded", () => {
    const board = document.querySelector('.board');
    let selectedPiece = null;
    let currentPlayer = 'white'; // Player 1 starts

    // Function to determine if the movement is valid

    function getSquareCoordinates(square) {
        return square.dataset.position.split('-').map(Number);
    }

    function isValidMove(oldSquare, newSquare) {
        const [oldX, oldY] = getSquareCoordinates(oldSquare);
        const [newX, newY] = getSquareCoordinates(newSquare);
        const dx = newX - oldX;
        const dy = newY - oldY;
        const midX = (oldX + newX) / 2;
        const midY = (oldY + newY) / 2;
        const midSquare = document.querySelector(`[data-position="${midX}-${midY}"]`);
        
        // Rule for adjacent moves
        if ((Math.abs(dx) === 1 && Math.abs(dy) === 0) || (Math.abs(dx) === 0 && Math.abs(dy) === 1)) {
            // Ensure pieces move away from their corner
            if ((selectedPiece.dataset.player === 'black' && (dx === 1 || dy === 1)) ||
                (selectedPiece.dataset.player === 'white' && (dx === -1 || dy === -1))) {
                return !newSquare.firstChild; // Ensure the new square is empty
            }
        }

        // Rule for skipping
        if ((Math.abs(dx) === 2 && Math.abs(dy) === 0) || (Math.abs(dx) === 0 && Math.abs(dy) === 2)) {
            // Ensure pieces move away from their corner
            if ((selectedPiece.dataset.player === 'black' && (dx === 2 || dy === 2)) ||
                (selectedPiece.dataset.player === 'white' && (dx === -2 || dy === -2))) {
                return midSquare.firstChild && !newSquare.firstChild; // Ensure there's a piece to skip over and the destination is empty
            }
        }

        return false;
    }

    let skipRequired = false;

    function canSkipFromSquare(square) {
        const [x, y] = getSquareCoordinates(square);
        const possibleDirections = selectedPiece.dataset.player === 'black' ? [[2, 2], [2, -2]] : [[-2, -2], [-2, 2]];
    
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
        const possibleDirections = selectedPiece.dataset.player === 'black' ? [[0, 1], [1, 0], [2, 0], [0, 2]] : [[0, -1], [-1, 0], [-2, 0], [2, 0]];
    
        console.log(possibleDirections);
        for (let [dx, dy] of possibleDirections) {
            const newX = x + dx;
            const newY = y + dy;
            const targetSquare = document.querySelector(`[data-position="${newX}-${newY}"]`);

            if (targetSquare && isValidMove(square, targetSquare)) {
                targetSquare.classList.add('highlight');
                console.log(targetSquare);
            }
        }
    }
    
    function clearHighlights() {
        const highlightedSquares = document.querySelectorAll('.highlight');
        highlightedSquares.forEach(square => square.classList.remove('highlight'));
    }
    

    // Create board squares and pieces
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = document.createElement('div');
            square.classList.add('square');
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

    board.addEventListener('click', (e) => {
        const target = e.target;
        clearHighlights(); // Clear previous highlights

        // Select a piece
        if (target.classList.contains('piece') && target.dataset.player === currentPlayer) {
            selectedPiece = target;
            selectedPiece.classList.add('selected');
            highlightValidMoves(selectedPiece.parentElement); // Highlight possible moves
            return;
        }
    

        // Move to a new square
        if (target.classList.contains('square') && selectedPiece) {
            if (isValidMove(selectedPiece.parentElement, target)) {
                const [oldX, oldY] = getSquareCoordinates(selectedPiece.parentElement);
                const [newX, newY] = getSquareCoordinates(target);

                target.appendChild(selectedPiece);
                selectedPiece.classList.remove('selected');

                // Check if it was a skip
                if (Math.abs(newX - oldX) === 2 && Math.abs(newY - oldY) === 2) {
                    // It was a skip, check if further skips are possible
                    if (canSkipFromSquare(target)) {
                        selectedPiece = target.firstChild;
                        selectedPiece.classList.add('selected');
                        skipRequired = true;
                        return; // retain the turn
                    } else {
                        skipRequired = false; // reset skip requirement
                    }
                } else {
                    if (skipRequired) {
                        // If a skip was required but a regular move was attempted, disallow the move
                        selectedPiece.parentElement.appendChild(selectedPiece);
                        selectedPiece.classList.remove('selected');
                        selectedPiece = null;
                        return;
                    }
                }
    
                // Switch player
                currentPlayer = (currentPlayer === 'white') ? 'black' : 'white'; 
                selectedPiece = null;
            }
        }

    });
});
