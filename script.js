// GLOBALS

whitePromoteSquare = 14;
blackPromoteSquare = 9;

selectedSqIndex = -1;

boardState = [];
turn = "";

// indices 6, 7, 8 respectively
whitePawnsMoved = [false, false, false];
// indices 15, 16, 17 respectively
blackPawnsMoved = [false, false, false];

whiteKingMoved = false;
whiteRookMoved = false;
blackKingMoved = false;
blackRookMoved = false;

promoting = false;

// HELPER FUNCTIONS

// convert board state index to square number string
function sqIndToSq(index) {
    return "sq" + (index+1);
}

// convert square number string to board state index
function sqToSqInd(square) {
    return square.substring(2)-1;
}


// DOM LOGIC
function playAudio(audio) {
    var audioElt = document.getElementById(audio + "Audio");
    audioElt.play();
}

// Note: these are the only places where boardState indices are converted to square numbers
function updateUI() {
    updateTurnDisplay();
    updateBoardDisplay();
}

function updateTurnDisplay() {
    var src = document.getElementById("colorTurnText");
    src.innerText = turn;
    if (turn == "white") {
        src.style.color = "white";
    } else {
        src.style.color = "black";
    }
}

function updateBoardDisplay() {
    // loop through board state
    for (i = 0; i < boardState.length; i++) {
        var src = document.getElementById(sqIndToSq(i));

        // remove previosly displayed piece
        if (src.lastChild) src.removeChild(src.lastChild);

        piece = boardState[i];

        // no piece in square; display empty
        if (!piece) continue;

        color = piece.startsWith("w") ? "white" : "black";
        var img = document.createElement("img");
        img.src = "graphics/" + color + "/" + piece + ".svg";
        
        src.appendChild(img);
    }
}

function selectDisplaySquare(sqIndex) {
    document.getElementById(sqIndToSq(sqIndex)).style.border = "10px solid transparent";
}

function deselectDisplaySquare(sqIndex) {
    document.getElementById(sqIndToSq(sqIndex)).style.border = "0px";
}

function showPromotionOptions(color) {        
    var textSrc = document.getElementById("promotionText");
    textSrc.style.display = "block";

    if (color == "w") {
        document.getElementById("whitePromotionImgs").style.display = "block";
        textSrc.style.color = "white";
    } else {
        document.getElementById("blackPromotionImgs").style.display = "block";
        textSrc.style.color = "black";
    }
}

function hidePromotionOptions() {            
    document.getElementById("promotionText").style.display = "none";

    document.getElementById("whitePromotionImgs").style.display = "none";
    document.getElementById("blackPromotionImgs").style.display = "none";
}


// EVENT LISTENERS
function selectSquare(id) {
    if (promoting) return;
    
    var sqInd = sqToSqInd(id);

    // castling and queen switch ignore selection rules
    if (isCastleOrQueenSwitch(sqInd)) {
        console.log("castle or queen switch");
        deselectDisplaySquare(selectedSqIndex);
        selectedSqIndex = -1;
        nextTurn();
    }
    // illegal selection
    else if (!isLegalSelection(sqInd)) {
        if (selectedSqIndex != -1) {
            deselectDisplaySquare(selectedSqIndex);
            selectedSqIndex = -1;
        }
    } 
    // legal selection
    else if (selectedSqIndex == -1) {
        selectDisplaySquare(sqInd);
        selectedSqIndex = sqInd;
    } 
    // legal move
    else {
        // attempt to move
        if (tryMove(selectedSqIndex, sqInd)) {
            deselectDisplaySquare(selectedSqIndex);
            selectedSqIndex = -1;
            
            nextTurn();
        }
        // legal selection but illegal move; do nothing
    }
}


// GAME LOGIC

function isCastleOrQueenSwitch(sqIndex) {
    // cannot be castle or queen switch unless two pieces are selected
    if (selectedSqIndex == -1) return false;

    // cannot queen switch with same queen
    if (sqIndex == selectedSqIndex) return false;

    var firstColor = boardState[selectedSqIndex].substring(0,1);
    var firstPiece = boardState[selectedSqIndex].substring(1);
    
    var secondColor = boardState[sqIndex].substring(0,1);
    var secondPiece = boardState[sqIndex].substring(1);

    if (firstColor != secondColor) return false;

    if (firstPiece == "K" && secondPiece == "R") {
        return tryCastle(firstColor);
    } else if (firstPiece == "Q" && (secondPiece == "N" || secondPiece == "B" || secondPiece == "R")) {
        return tryQueenSwitch(selectedSqIndex, sqIndex);
    }

    return false;
}

// white cannot select black pieces or capture white pieces, and vice versa
function isLegalSelection(sqIndex) {
    // 0 for selecting, 1 for moving
    var isMoving = selectedSqIndex > -1;

    var isWhite = boardState[sqIndex].startsWith("w");
    var isBlack = boardState[sqIndex].startsWith("b");

    return ( (turn == "white" && isMoving != isWhite) || (turn == "black" && isMoving != isBlack) );
}

function isJump(fromSquare, toSquare) {
    // check forwards and backwards
    // could get funky behavior on board edge
    for (i = fromSquare+1; i < toSquare; i++) {
        if (boardState[i]) return true;
    }
    for (i = toSquare+1; i < fromSquare; i++) {
        if (boardState[i]) return true;
    }
    return false;
}

function isSameColorUnobstructed(fromSquare, toSquare) {
    // check forwards and backwards
    for (i = fromSquare+2; i < toSquare; i+=2) {
        if (boardState[i]) return false;
    }
    for (i = toSquare+2; i < fromSquare; i+=2) {
        if (boardState[i]) return false;
    }
    return true;
}

function tryMove(fromSquare, toSquare) {
    var color = boardState[fromSquare].substring(0,1);
    var piece = boardState[fromSquare].substring(1,2);

    // 1 if white, -1 if black
    var direction = (color == "w" ? 1 : -1);

    if (piece == "P") {
        var moved = false; 
        
        // basic pawn move: 1 square forward
        if (toSquare == fromSquare + (direction*1)) {
            movePiece(fromSquare, toSquare);
            moved = true;
        }

        // first pawn move: 2 squares forward
        if (toSquare == fromSquare + (direction*2) && !isJump(fromSquare, toSquare)) {
            if (color == "w" && (fromSquare-6 >= 0 && fromSquare-6 <=2) && !whitePawnsMoved[fromSquare-6]) {
                whitePawnsMoved[fromSquare-6] = true;
                movePiece(fromSquare, toSquare);
                moved = true;
            }
            else if (color == "b" && (fromSquare-15 >= 0 && fromSquare-15 <=2) &&!blackPawnsMoved[fromSquare-15]) {
                blackPawnsMoved[fromSquare-15] = true;
                movePiece(fromSquare, toSquare);
                moved = true;
            }
        }
        
        console.log("color: " + color + ", toSquare: " + toSquare);
        if (color == "w" && toSquare == whitePromoteSquare) {
            showPromotionOptions("w");
            promoting = true;
        } else if (color == "b" && toSquare == blackPromoteSquare) {
            showPromotionOptions("b"); 
            promoting = true;
        } else if (moved) {
            return true;
        }
    }

    if (piece == "N") {
        // basic knight move: 2 squares either direction
        if (Math.abs(fromSquare - toSquare) == 2) {
            movePiece(fromSquare, toSquare);
            return true;
        }

        // jump knight move: 3 squares either direction
        if (Math.abs(fromSquare - toSquare) == 3 && isJump(fromSquare, toSquare)) {
            movePiece(fromSquare, toSquare);
            return true;
        }
    }

    if (piece == "B") {
        // bishop move: same color, cannot jump over pieces on that color
        if ((Math.abs(fromSquare - toSquare) % 2 == 0) && isSameColorUnobstructed(fromSquare, toSquare)) {
            movePiece(fromSquare, toSquare);
            return true;
        }
    }

    if (piece == "R") {
        // rook move: cannot jump
        if (!isJump(fromSquare, toSquare)) {
            movePiece(fromSquare, toSquare);
            if (color == "w") whiteRookMoved = true;
            else blackRookMoved = true;
            return true;
        }
    }

    if (piece == "Q") {
        // basic queen move: up to 3 squares with optional jump
        if (Math.abs(fromSquare - toSquare) <= 3) {
            movePiece(fromSquare, toSquare);
            return true;
        }
    }

    if (piece == "K") {
        // basic king move: 1 square
        if (Math.abs(fromSquare - toSquare) == 1) {
            movePiece(fromSquare, toSquare);
            if (color == "w") whiteKingMoved = true;
            else blackKingMoved = true;
            return true;
        }

        // jump king move: 2 squares
        if (Math.abs(fromSquare - toSquare) == 2 && isJump(fromSquare, toSquare)) {
            movePiece(fromSquare, toSquare);
            if (color == "w") whiteKingMoved = true;
            else blackKingMoved = true;
            return true;
        }
    }

    return false;
}

function tryCastle(color) {
    if (color == "w" && !whiteKingMoved && !whiteRookMoved && !isJump(0,3)) {
        movePiece(3, 1); // move white king
        movePiece(0, 2); // move white rook
        return true;
    }
    if (color == "b" && !blackKingMoved && !blackRookMoved && !isJump(20,23)) {
        movePiece(20, 22); // move white king
        movePiece(23, 21); // move white rook
        return true;
    }
    return false;
}

function tryQueenSwitch(fromSquare, toSquare) {
    var firstPiece = boardState[fromSquare];
    var secondPiece = boardState[toSquare];

    if (firstPiece.substring(1) == "R") whiteRookMoved = true;
    if (secondPiece.substring(1) == "R") blackRookMoved = true;

    movePiece(fromSquare, toSquare); // move first piece
    createPiece(secondPiece, fromSquare); // move second piece

    return true;
}

function doPromotion(piece, sq) {
    var color = turn == "white" ? "w" : "b";
    var sq = turn == "white" ? whitePromoteSquare : blackPromoteSquare;
    createPiece(color + piece, sq);

    hidePromotionOptions();
    nextTurn();
    promoting = false;
}

function nextTurn() {
    turn = (turn == "white" ? "black" : "white");
    updateUI();
}

function createPiece(piece, square) {
    boardState[square] = piece;
    updateUI();
}

function removePiece(square) {
    boardState[square] = "";
    updateUI();
}

function movePiece(fromSquare, toSquare) {
    // toSquare is occupied by opposing piece
    if (boardState[toSquare] && boardState[fromSquare].substring(0,1) != boardState[toSquare].substring(0,1)) {
        capturePiece(toSquare);
        console.log("captured");

        // play capture audio
        playAudio("capture");
    } else {
        playAudio("move")
    }

    boardState[toSquare] = boardState[fromSquare];
    boardState[fromSquare] = "";
    updateUI();
}

function capturePiece(square) {
    removePiece(square);
}

function initializeGame() {
    boardState = new Array(24);
    boardState.fill("");

    // white pieces
    createPiece("wR", 0);
    createPiece("wQ", 1);
    createPiece("wB", 2);
    createPiece("wK", 3);
    createPiece("wN", 4);
    createPiece("wP", 5);
    createPiece("wN", 6);
    createPiece("wP", 7);
    createPiece("wP", 8);

    // black pieces
    createPiece("bP", 15);
    createPiece("bP", 16);
    createPiece("bN", 17);
    createPiece("bP", 18);
    createPiece("bN", 19);
    createPiece("bK", 20);
    createPiece("bB", 21);
    createPiece("bQ", 22);
    createPiece("bR", 23);

    turn = "";
    nextTurn();

    // reset
    selectedSqIndex = -1;
    whitePawnsMoved = [false, false, false];
    blackPawnsMoved = [false, false, false];
    whiteKingMoved = false;
    whiteRookMoved = false;
    blackKingMoved = false;
    blackRookMoved = false;
    promoting = false;

    playAudio("reset");
}


// ONLOAD

window.onload = (event) => {
    initializeGame();
};