import './style.css'
import { Chess } from 'chess.js'

import movesound from './assets/move-self.mp3'
import checksound from './assets/move-check.mp3'
import capturesound from './assets/capture.mp3'
import castlesound from './assets/castle.mp3'
import promotesound from './assets/promote.mp3'
import winsound from './assets/win.mp3'
import losesound from './assets/lose.webm'



const boardElem = document.getElementById('chessboard')
const moveList = document.getElementById('move-list')

const piecesUnicode = {
    'K': '\u2654', 'Q': '\u2655', 'R': '\u2656', 'B': '\u2657', 'N': '\u2658', 'P': '\u2659',
    'k': '\u265A', 'q': '\u265B', 'r': '\u265C', 'b': '\u265D', 'n': '\u265E', 'p': '\u265F',
}

let chessGame = new Chess()

const moveSound = new Audio(movesound)
const checkSound = new Audio(checksound)
const captureSound = new Audio(capturesound)
const castleSound = new Audio(castlesound)
const promoteSound = new Audio(promotesound)
const winSound = new Audio(winsound)
const loseSound = new Audio(losesound)

function populateBoard() {
    for (let i = 8; i > 0; i--) {
        for (let j = 0; j < 8; j++) {
            const square = document.createElement('div')
            square.classList.add('square')
            square.dataset.square = String.fromCharCode('a'.charCodeAt(0) + j) + i // Calculating coordinates
            if (j % 2 == 0) {
                if (i % 2 == 0) square.classList.add('light')
                else square.classList.add('dark')
            } else {
                if (i % 2 == 0) square.classList.add('dark')
                else square.classList.add('light')
            }
            square.style.gridColumn = j + 1
            square.style.gridRow = 9 - i

            const pieceContainer = document.createElement('span')
            pieceContainer.classList.add('piece-container')
            pieceContainer.draggable = true
            pieceContainer.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.parentElement.dataset.square) // Keeping track of which square its being dragged from
            })

            square.append(pieceContainer)

            boardElem.append(square)
        }
    }
    boardElem.addEventListener('click', clicked)
    boardElem.addEventListener('contextmenu', highlight)
    boardElem.addEventListener('dragover', (e) => { e.preventDefault() }) // To allow piece to be dropped
    boardElem.addEventListener('drop', dropPiece)
}

// Promotions options element
const promo_options = document.createElement('div')
promo_options.classList.add('promotion')
for (let i = 0; i < 4; i++) {
    promo_options.append(document.createElement('div'))
}
let prom_square = null

function promote(e) {
    let prom_type
    if (e.target == promo_options.children[0]) prom_type = 'q'
    else if (e.target == promo_options.children[1]) prom_type = 'n'
    else if (e.target == promo_options.children[2]) prom_type = 'r'
    else if (e.target == promo_options.children[3]) prom_type = 'b'
    try {
        const move = chessGame.move({ from: selectedSquare.dataset.square, to: prom_square.dataset.square, promotion: prom_type })
        updateMoveList(move)
        promo_options.remove()
        let new_piece
        if (move.color == 'w') {
            materialCount += materialCounts[prom_type] - 1 // Losing a pawn so -1 
            new_piece = prom_type.toUpperCase()
        } else {
            materialCount -= (materialCounts[prom_type] - 1) // Losing a pawn so -1 
            new_piece = prom_type
        }
        updateMaterialCount()
        checkCapture(move) // Could be a capture promotion
        prom_square.children[0].textContent = piecesUnicode[new_piece]
        selectedSquare.children[0].textContent = ''
        selectedSquare.classList.remove('selected')
        selectedSquare = null
        prom_square = null
        promoteSound.play()

        if (mode.value == 'engine') engineMove()
    } catch (error) {
        console.log(error)
    }
}

let selectedSquare
let cur_move = 0

let whiteCapturedPieces = []
let blackCapturedPieces = []
const whitecaptures = document.getElementById('white-captures')
const blackcaptures = document.getElementById('black-captures')
let materialCount = 0
const materialCounts = { 'q': 9, 'r': 5, 'b': 3, 'n': 3, 'p': 1 }

const mode = document.getElementById('mode-select')

function clicked(e) {
    if (chessGame.isGameOver()) return
    const clickedSq = e.target.closest('.square')

    if (selectedSquare) {
        if (selectedSquare == clickedSq) {
            selectedSquare = null
            clickedSq.classList.remove('selected')
        } else {
            makeMove(selectedSquare, clickedSq)
        }
    } else {
        // Only allow selection of a piece if its that side's turn to move
        let piece = chessGame.get(clickedSq.dataset.square)
        if (piece && (piece.color == chessGame.turn())) {
            selectedSquare = clickedSq
            selectedSquare.classList.add('selected')
        }
    }
}

function dropPiece(e) {
    const from_sq = document.querySelector(`[data-square=${e.dataTransfer.getData('text/plain')}]`)
    const to_sq = e.target.closest('.square')

    makeMove(from_sq, to_sq)
}

function makeMove(from_sq, to_sq) {
    if (prom_square) return // If promotion menu is open, let promote function handle clicks

    // Checking for promotion
    if (chessGame.get(from_sq.dataset.square).type == 'p') {
        if (((to_sq.dataset.square[1] == '8') && (chessGame.turn() == 'w')) || ((to_sq.dataset.square[1] == '1') && (chessGame.turn() == 'b'))) {
            try {
                // Trying promotion first and undoing to see if its legal, then setting up promotion menu
                chessGame.move({ from: from_sq.dataset.square, to: to_sq.dataset.square, promotion: 'q' })
                chessGame.undo()

                if (chessGame.turn() == 'w') {
                    promo_options.children[0].textContent = piecesUnicode['Q']
                    promo_options.children[1].textContent = piecesUnicode['N']
                    promo_options.children[2].textContent = piecesUnicode['R']
                    promo_options.children[3].textContent = piecesUnicode['B']
                } else {
                    promo_options.children[0].textContent = piecesUnicode['q']
                    promo_options.children[1].textContent = piecesUnicode['n']
                    promo_options.children[2].textContent = piecesUnicode['r']
                    promo_options.children[3].textContent = piecesUnicode['b']
                }

                prom_square = to_sq
                promo_options.addEventListener('click', promote)

                // If board is flipped and player is going down, the promotion menu doesn't go too far off the board
                if (to_sq.style.gridRow == 8) {
                    if (chessGame.turn() == 'w') document.querySelector(`[data-square="${to_sq.dataset.square[0] + '5'}"]`).append(promo_options)
                    else document.querySelector(`[data-square="${to_sq.dataset.square[0] + '4'}"]`).append(promo_options)
                }
                else prom_square.append(promo_options)
            } catch (error) {
                console.log(error)
                from_sq.classList.remove('selected')
                from_sq = null
            }

            return
        }
    }

    // Checking move is legal first
    try {
        // Regular move (not a promotion)
        const move = chessGame.move({ from: from_sq.dataset.square, to: to_sq.dataset.square })

        audiocues(move, false, true)

        // Checking if we're making a move in the past
        if (cur_move % 2 == 0) {
            if (moveList.children.length != cur_move / 2) {
                for (let i = moveList.children.length - 1; i >= cur_move / 2; i--) { // Removing all previously made moves
                    moveList.children[i].remove()
                }

            }
        } else {
            if (moveList.children.length != Math.ceil(cur_move / 2) || (moveList.lastElementChild.children.length != 1)) {
                for (let i = moveList.children.length - 1; i >= Math.ceil(cur_move / 2); i--) { // Removing all previously made moves
                    moveList.children[i].remove()
                }
                // Remove last black move
                moveList.lastElementChild.lastElementChild.remove()
            }
        }

        updateMoveList(move)

        dealWithSpecialMoves(move)

        checkCapture(move)

        to_sq.children[0].textContent = from_sq.children[0].textContent
        from_sq.children[0].textContent = ''

        if (mode.value == 'engine') engineMove()
    } catch (error) {
        console.log(error)
    }

    from_sq.classList.remove('selected')
    selectedSquare = null
}

function audiocues(move, undoMove = false, userMove=false) {
    if (chessGame.isCheckmate() && !userMove) loseSound.play()
    else if (chessGame.isCheckmate() && userMove) winSound.play()
    else if (move.isPromotion()) promoteSound.play()
    else if (!undoMove && chessGame.isAttacked(chessGame.findPiece({ type: 'k', color: chessGame.turn() }), move.color)) checkSound.play()
    else if (move.isKingsideCastle() || move.isQueensideCastle()) castleSound.play()
    else if (move.isCapture() || move.isEnPassant()) captureSound.play()
    else moveSound.play()
}


function updateMoveList(move) {
    if (cur_move != 0) moveList.lastElementChild.lastElementChild.classList.remove('current')

    const movetext = document.createElement('span')
    movetext.textContent = move.san
    if (move.color == 'w') {
        const listitem = document.createElement('li')
        listitem.append(movetext)
        moveList.append(listitem)
    } else {
        if (cur_move == 0) { // Only happens when loading fen and its black to move
            const listitem = document.createElement('li')
            listitem.append(movetext)
            moveList.append(listitem)
            cur_move++
        }
        moveList.lastElementChild.append(' ', movetext)
    }

    // Adding class to span tag after appending to moveList so mutation observer can notice and auto scroll
    movetext.classList.add('current')

    cur_move++
}

function dealWithSpecialMoves(move) {
    // Deal with special moves like en passant and castling
    if (move.isKingsideCastle()) {
        if (move.color == 'w') {
            document.querySelector(`[data-square="h1"]`).children[0].textContent = ''
            document.querySelector(`[data-square="f1"]`).children[0].textContent = piecesUnicode['R']
        } else {
            document.querySelector(`[data-square="h8"]`).children[0].textContent = ''
            document.querySelector(`[data-square="f8"]`).children[0].textContent = piecesUnicode['r']
        }
    } else if (move.isQueensideCastle()) {
        if (move.color == 'w') {
            document.querySelector(`[data-square="a1"]`).children[0].textContent = ''
            document.querySelector(`[data-square="d1"]`).children[0].textContent = piecesUnicode['R']
        } else {
            document.querySelector(`[data-square="a8"]`).children[0].textContent = ''
            document.querySelector(`[data-square="d8"]`).children[0].textContent = piecesUnicode['r']
        }
    }
}

function checkCapture(move) {
    if (move.isCapture()) {
        if (move.color == 'w') {
            whiteCapturedPieces.push(move.captured)
            materialCount += materialCounts[move.captured]
        } else {
            blackCapturedPieces.push(move.captured.toUpperCase())
            materialCount -= materialCounts[move.captured]
        }
        updateMaterialCount()
    } else if (move.isEnPassant()) { // En passant is not considered regular capture in chess.js
        if (move.color == 'w') {
            document.querySelector(`[data-square="${e.target.dataset.square[0] + '5'}"]`).children[0].textContent = ''
            whiteCapturedPieces.push('p')
            materialCount += 1
        }
        else {
            document.querySelector(`[data-square="${e.target.dataset.square[0] + '4'}"]`).children[0].textContent = ''
            blackCapturedPieces.push('P')
            materialCount -= 1
        }
        updateMaterialCount()
    }
}

function updateMaterialCount() {
    whitecaptures.textContent = 'White: '
    blackcaptures.textContent = 'Black: '

    whiteCapturedPieces.forEach((c) => { whitecaptures.textContent += piecesUnicode[c] })
    blackCapturedPieces.forEach((c) => { blackcaptures.textContent += piecesUnicode[c] })

    if (materialCount > 0) whitecaptures.textContent += ` +${materialCount}`
    else if (materialCount < 0) blackcaptures.textContent += ` +${Math.abs(materialCount)}`
}

function countItUp() {
    blackCapturedPieces = []
    whiteCapturedPieces = []
    materialCount = 0

    for (const piece in materialCounts) {
        const wlocs = chessGame.findPiece({ type: piece, color: 'w' })
        const blocs = chessGame.findPiece({ type: piece, color: 'b' })
        materialCount += materialCounts[piece] * wlocs.length
        materialCount -= materialCounts[piece] * blocs.length

        let pieceCount = 2
        if (piece == 'q') {
            pieceCount = 1
        } else if (piece == 'p') {
            pieceCount = 8
        }

        for (let i = 0; i < pieceCount - wlocs.length; i++) {
            blackCapturedPieces.push(piece.toUpperCase())
        }
        for (let i = 0; i < pieceCount - blocs.length; i++) {
            whiteCapturedPieces.push(piece)
        }
    }

    updateMaterialCount()
}

let highlightedsquares = []

function highlight(e) {
    e.preventDefault()
    if (e.target.classList.contains('highlighted')) {
        e.target.classList.remove('highlighted')
        highlightedsquares = highlightedsquares.filter(square => square !== e.target)
    } else {
        e.target.classList.add('highlighted')
        highlightedsquares.push(e.target)
    }
}

function clearHighlights() {
    highlightedsquares.forEach((sq) => sq.classList.remove('highlighted'))
}

boardElem.addEventListener('dblclick', clearHighlights)

populateBoard()

function clearBoard() {
    for (const square of boardElem.children) {
        square.children[0].textContent = ''
    }
}

function parseFEN(fen) {
    let rank = 8
    let file = 0
    for (const char of fen) {
        if (char == ' ') break // Only parsing visual position

        if (char == '/') {
            rank--
            file = 0
            continue
        }

        if (/^\d+$/.test(char)) { // testing if its a number
            file += Number(char)
            continue
        }

        // Must be a piece assuming valid FEN
        // Adding text inside the piece-container span tag so its draggable
        boardElem.children[(8 - rank) * 8 + file].children[0].textContent = piecesUnicode[char]
        file++
    }
}

parseFEN(chessGame.fen()) // Starting position

function undo() {
    if (cur_move == 0) return

    if (cur_move % 2 == 0) { // Highlighted move must be black move
        moveList.children[(cur_move / 2) - 1].lastElementChild.classList.remove('current')
        moveList.children[(cur_move / 2) - 1].firstElementChild.classList.add('current')
    } else { // Highlighted move must be white move
        moveList.children[Math.floor(cur_move / 2)].firstElementChild.classList.remove('current')
        if (cur_move > 1) moveList.children[Math.floor(cur_move / 2) - 1].lastElementChild.classList.add('current')
    }

    cur_move--

    const move = chessGame.undo()

    audiocues(move, true)

    clearBoard()
    parseFEN(chessGame.fen())
    countItUp()
}

function redo() {
    let span
    if (cur_move % 2 == 0) {
        if (moveList.children.length == cur_move / 2) return // Already caught up in present

        if (cur_move > 0) moveList.children[cur_move / 2 - 1].lastElementChild.classList.remove('current')
        span = moveList.children[cur_move / 2].firstElementChild
    } else {
        if (moveList.children.length == Math.ceil(cur_move / 2) && moveList.lastElementChild.children.length == 1) return // Already caught up in present

        moveList.children[Math.floor(cur_move / 2)].firstElementChild.classList.remove('current')
        span = moveList.children[Math.floor(cur_move / 2)].lastElementChild
    }

    const move = chessGame.move(span.textContent) // Should be legal as it was made before

    audiocues(move)

    clearBoard()
    parseFEN(chessGame.fen())
    countItUp()

    span.classList.add('current')
    cur_move++
}

function beginning() {
    if (cur_move == 0) return

    if (cur_move % 2 == 0) moveList.children[cur_move / 2 - 1].lastElementChild.classList.remove('current')
    else moveList.children[Math.floor(cur_move / 2)].firstElementChild.classList.remove('current')

    chessGame.reset()
    clearBoard()
    parseFEN(chessGame.fen())
    whiteCapturedPieces = []
    blackCapturedPieces = []
    materialCount = 0
    updateMaterialCount()
    cur_move = 0
}

function end() {
    let old_cur = cur_move
    redo()
    while (cur_move != old_cur) { // Keep redoing until caught up to present
        old_cur = cur_move
        redo()
    }
}

document.addEventListener('keydown', (event) => {
    if (event.metaKey) return // Allow cmd+v or cmd+a in textarea input when loading fens/pgns
    if (event.key === 'ArrowLeft') undo()
    else if (event.key === 'ArrowRight') redo()
    else if (event.key === 'ArrowUp') beginning()
    else if (event.key === 'ArrowDown') end()
    else if (event.key === 'd') document.body.classList.toggle('show-outlines') // For debugging css
})

const evalbar = document.getElementById('eval-bar-container')
const evalBarFill = document.getElementById('eval-bar-fill')
const evalDisp = document.getElementById('eval')
// const evals = []
document.getElementById('eval-bar-setting').addEventListener('change', () => {
    evalbar.classList.toggle('hidden')
    boardElem.classList.toggle('evalBarOn')
})

function flipBoard() {
    for (let i = 0; i < 4; i++) {
        for (let j = 1; j < 9; j++) {
            const square = document.querySelector(`[data-square=${String.fromCharCode('a'.charCodeAt(0) + i) + j}]`)
            let tempCol = square.style.gridColumn
            let tempRow = square.style.gridRow

            // Calculating flipped position of square
            const inverse = document.querySelector(`[data-square=${String.fromCharCode('h'.charCodeAt(0) - i) + (9 - j)}]`)

            square.style.gridColumn = inverse.style.gridColumn
            square.style.gridRow = inverse.style.gridRow
            inverse.style.gridColumn = tempCol
            inverse.style.gridRow = tempRow
        }
    }
}

function newGame() {
    cur_move = 0

    whiteCapturedPieces = []
    blackCapturedPieces = []
    materialCount = 0
    updateMaterialCount()

    chessGame.reset()
    moveList.replaceChildren()
    clearBoard()
    parseFEN(chessGame.fen())

    // Reset eval bar
    evalBarFill.style.height = '50%'
    evalDisp.classList.remove('black')
    evalDisp.textContent = 0.0
    // evals.length = 0

    engineWorker.postMessage({ type: 'NEWGAME' }) // Clearing TT and heuristics, etc.
}

async function copyfen() {
    try {
        await navigator.clipboard.writeText(chessGame.fen())
        console.log('Copied FEN to clipboard')
        document.getElementById('copyfensvg').classList.add('hidden')
        document.getElementById('copiedfensvg').classList.remove('hidden')
        setTimeout(() => {
            document.getElementById('copyfensvg').classList.remove('hidden')
            document.getElementById('copiedfensvg').classList.add('hidden')
        }, 1000)
    } catch (error) {
        console.warn('Failed to copy FEN to clipboard: ', error);
    }
}

async function copypgn() {
    try {
        await navigator.clipboard.writeText(chessGame.pgn())
        console.log('Copied PGN to clipboard')
        document.getElementById('copypgnsvg').classList.add('hidden')
        document.getElementById('copiedpgnsvg').classList.remove('hidden')
        setTimeout(() => {
            document.getElementById('copypgnsvg').classList.remove('hidden')
            document.getElementById('copiedpgnsvg').classList.add('hidden')
        }, 1000)
    } catch (error) {
        console.warn('Failed to copy PGN to clipboard: ', error);
    }
}

const loadmodal = document.getElementById('loadmodal')
const textinput = loadmodal.querySelector('textarea')
const allowinvalidfens = loadmodal.querySelector('#allowinvalid')
const cancelBtn = loadmodal.querySelector('#cancel')
const loadBtn = loadmodal.querySelector('#load')
cancelBtn.addEventListener('click', () => { loadmodal.close() })

function loadfen() {
    if (allowinvalidfens.checked) {
        try {
            chessGame.load(textinput.value, { skipValidation: true })
        } catch (error) {
            textinput.placeholder = error
            textinput.classList.add('invalid')
            console.error(error)
            return
        }
    } else {
        try {
            chessGame.load(textinput.value)
        } catch (error) {
            textinput.placeholder = 'Enter valid FEN'
            textinput.classList.add('invalid')
            console.error(error)
            return
        }
    }

    cur_move = 0

    moveList.replaceChildren()
    clearBoard()
    parseFEN(textinput.value)
    countItUp()

    loadmodal.close()
    loadBtn.removeEventListener('click', loadfen)
}

function loadfenmodal() {
    loadmodal.querySelector('h3').textContent = 'Load FEN'
    textinput.placeholder = 'Enter FEN'
    textinput.value = ''
    textinput.classList.remove('invalid')
    loadmodal.querySelector('#invalid-checkbox-container').classList.remove('hidden')
    loadBtn.addEventListener('click', loadfen)
    loadmodal.showModal()
}

function loadpgn() {
    try {
        chessGame.loadPgn(textinput.value)

        cur_move = 0

        // Loop through chessGame's history to populate our moveList
        const moveHistory = chessGame.history()
        console.log(moveHistory)
        moveList.replaceChildren()
        for (let i = 0; i < Math.ceil(moveHistory.length) / 2; i++) {
            const listitem = document.createElement('li')
            const spantag1 = document.createElement('span')
            moveList.append(listitem)
            spantag1.textContent = moveHistory[i * 2]
            listitem.append(spantag1)
            cur_move++

            if (i * 2 == moveHistory.length - 1) continue

            const spantag2 = document.createElement('span')
            spantag2.textContent = moveHistory[i * 2 + 1]
            listitem.append(' ', spantag2)
            cur_move++
        }
        moveList.lastElementChild.lastElementChild.classList.add('current')

        clearBoard()
        parseFEN(chessGame.fen())
        countItUp()

        loadmodal.close()
        loadBtn.removeEventListener('click', loadpgn)
    } catch (error) {
        textinput.placeholder = 'Enter valid PGN'
        textinput.classList.add('invalid')
        console.error(error)
    }
}

function loadpgnmodal() {
    loadmodal.querySelector('h3').textContent = 'Load PGN'
    textinput.placeholder = 'Enter PGN'
    textinput.value = ''
    textinput.classList.remove('invalid')
    loadmodal.querySelector('#invalid-checkbox-container').classList.add('hidden')
    loadBtn.addEventListener('click', loadpgn)
    loadmodal.showModal()
}

const engineWorker = new Worker(new URL('./engineworker.js', import.meta.url), { type: 'module' });
let isThinking = false
const movetime = document.getElementById('timepermove')
engineWorker.onmessage = (event) => {
    const { type, result } = event.data

    if (type == 'READY') {
        console.log('Engine is ready and initialized')
    } else if (type == 'ERROR') {
        console.error('Problem with engine')
    } else if (type == 'SEARCH_RESULT') {
        console.log('Got search result from engine ')

        const unsigned = result >>> 0;
        const bestMove = unsigned & 0xFFFF;
        const score = (unsigned | 0) >> 16;
        const fromSq = bestMove & 0x3F;        // Bits 0-5
        const toSq = (bestMove >> 6) & 0x3F;   // Bits 6-11
        const flags = bestMove >> 12;          // Bits 12-15
        const promotionPiece = (flags >= 8) ? ['n', 'b', 'r', 'q'][(flags - 8) % 4] : null;

        const fileChar = (sq) => String.fromCharCode('a'.charCodeAt(0) + (sq % 8));
        const rankChar = (sq) => String((sq >> 3) + 1);

        // No need for try catch block as move from engine should be legal
        const move = chessGame.move({
            from: fileChar(fromSq) + rankChar(fromSq),
            to: fileChar(toSq) + rankChar(toSq),
            promotion: promotionPiece
        });

        // Adjust eval bar
        // Check for mate
        if (score > 30000 || score < -30000) {
            let n = (score > 0) ? (32000 - score + 1) / 2     // we mate the opponent in n moves
                    : -(32000 + score) / 2;                   // we get mated in n moves
            evalDisp.textContent = `M${n}`
            if ((move.color == 'w' && score > 0) || (move.color == 'b' && score < 0)) {
                evalDisp.classList.remove('black')
                evalBarFill.style.height = '100%'
            } else {
                evalDisp.classList.add('black')
                evalBarFill.style.height = '0%'
            }
        } else if (((score >= 0) && (move.color == 'w')) || ((score <= 0) && (move.color == 'b'))) {
            evalDisp.classList.remove('black')
            evalDisp.textContent = `+${Math.abs(score) / 100}`
        } else {
            evalDisp.classList.add('black')
            evalDisp.textContent = `-${Math.abs(score) / 100}`
        }

        // Score is from side to move's perspective
        if (move.color == 'w') evalBarFill.style.height = `${(1 / (1 + Math.exp(-score / 400)))*100}%`
        else evalBarFill.style.height = `${100 - ((1 / (1 + Math.exp(-score / 400)))*100)}%`

        updateMoveList(move)
        checkCapture(move)
        clearBoard()
        parseFEN(chessGame.fen())

        audiocues(move)

        isThinking = false

        boardElem.addEventListener('click', clicked)
    }
}

function engineMove() {
    // // Making random moves for now
    // const moves = chessGame.moves({verbose: true})
    // const move = moves[Math.floor(Math.random() * moves.length)]
    // const madeMove = chessGame.move(move)
    // updateMoveList(madeMove)
    // if (move.isPromotion()) { // Promotion isn't dealt with in special moves as promote() deals with that for user moves
    //     if (move.color == 'w') materialCount += materialCounts[move.promotion] - 1
    //     else materialCount -= (materialCounts[move.promotion] - 1)
    //     updateMaterialCount()
    // }
    // checkCapture(move)
    // clearBoard()
    // parseFEN(chessGame.fen())
    if (isThinking) return

    boardElem.removeEventListener('click', clicked) // So user can't make moves while engine is thinking

    isThinking = true

    console.log('posting message to engine worker')

    engineWorker.postMessage({
        type: 'SEARCH',
        fen: chessGame.fen(),
        maxTime: movetime.value * 1000
    })
}

document.getElementById('flip').addEventListener('click', flipBoard)
document.getElementById('newgame').addEventListener('click', newGame)
document.getElementById('enginemove').addEventListener('click', engineMove)

document.getElementById('undo').addEventListener('click', undo)
document.getElementById('redo').addEventListener('click', redo)
document.getElementById('beginning').addEventListener('click', beginning)
document.getElementById('end').addEventListener('click', end)

document.getElementById('copyfen').addEventListener('click', copyfen)
document.getElementById('copypgn').addEventListener('click', copypgn)

document.getElementById('loadfen').addEventListener('click', loadfenmodal)
document.getElementById('loadpgn').addEventListener('click', loadpgnmodal)

// Adding auto scroll to the move list
let shouldAutoScroll = true
moveList.addEventListener('scroll', () => {
    // Allow a 5px buffer for sub-pixel rendering differences
    const isAtRightEdge = Math.abs(moveList.scrollWidth - moveList.clientWidth - moveList.scrollLeft) <= 5;
    shouldAutoScroll = isAtRightEdge;
})

// Watch ONLY for the "current" class moving to a different <li>
const observer = new MutationObserver((mutations) => {
    const currentItem = mutations.find(
        (m) => m.target.classList.contains("current")
    )?.target;

    if (!currentItem) return;

    const isLatestItem = currentItem === moveList.lastElementChild;

    // Scroll if the user is navigating history, OR if it's a new item and auto-scroll isn't paused
    if (!isLatestItem || shouldAutoScroll) {
        currentItem.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest"
        });
    }
});

observer.observe(moveList, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
});
