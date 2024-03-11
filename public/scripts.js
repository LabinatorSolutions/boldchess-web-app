var START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var _engine, _curmoves = [];
var _history = [[START]],
    _history2 = null,
    _historyindex = 0;
var _flip = false,
    _edit = false,
    _info = false,
    _play = null;
var _arrow = false,
    _menu = false;
var _dragElement = null,
    _dragActive = false,
    _startX, _startY, _dragCtrl, _dragLMB, _clickFrom, _clickFromElem;
var _tooltipState = false,
    _wantUpdateInfo = true;;
var _wname = "White",
    _bname = "Black",
    _color = 0,
    _bodyScale = 1;
var _nncache = null;
var _gameMode = 1;
var _isPlayerWhite = true;

document.addEventListener("DOMContentLoaded", function(e)
{
    var url = new URL(document.URL);
    var search_params = new URLSearchParams(url.search);

    if(search_params.has('mode') == true)
    {
        var mode = search_params.get('mode');

        if(mode == "play")
        {
            menuPlayEngineWhite();
        }
    }
});

function setElemText(elem, value)
{
    while(elem.firstChild) elem.removeChild(elem.firstChild);
    elem.appendChild(document.createTextNode(value));
}

function getElemText(elem)
{
    return elem.innerText || elem.textContent;
}

function setCurFEN(fen)
{
    setElemText(document.getElementById('fen'), fen);
}

function getCurFEN()
{
    return getElemText(document.getElementById('fen'));
}

// Opening
var _open = [
    ["B00", "King's Pawn", "1.e4", 53, 4964],
    ["A40", "Queen's Pawn Game", "1.d4", 55, 3246],
    ["B20", "Sicilian Defence", "1.e4 c5", 51, 2055],
    ["A45", "Queen's Pawn: Indian", "1.d4 Nf6", 54, 1808],
    ["B27", "Sicilian: 2.Nf3", "1.e4 c5 2.Nf3", 52, 1550],
    ["A50", "Indian: 2.c4", "1.d4 Nf6 2.c4", 54, 1212],
    ["C20", "Open Game", "1.e4 e5", 56, 1180],
    ["C40", "Open Game", "1.e4 e5 2.Nf3", 56, 1008],
    ["D00", "Queen's Pawn Game", "1.d4 d5", 57, 905],
    ["A04", "Reti", "1.Nf3", 56, 847],
    ["C44", "Open Game", "1.e4 e5 2.Nf3 Nc6", 56, 845],
    ["A10", "English", "1.c4", 55, 689],
    ["C00", "French", "1.e4 e6", 54, 656],
    ["B50", "Sicilian: 2.Nf3 d6", "1.e4 c5 2.Nf3 d6", 52, 625],
    ["D06", "Queen's Gambit", "1.d4 d5 2.c4", 58, 612],
    ["E00", "Queen's Pawn: Neo-Indian", "1.d4 Nf6 2.c4 e6", 54, 548],
    ["A46", "Indian: 2.Nf3", "1.d4 Nf6 2.Nf3", 53, 497],
    ["B30", "Sicilian: 2...Nc6", "1.e4 c5 2.Nf3 Nc6", 52, 484],
    ["E60", "King's Indian", "1.d4 Nf6 2.c4 g6", 55, 454],
    ["B56", "Sicilian: Open, 2...d6, 5.Nc3", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3", 52, 451],
    ["B54", "Sicilian: Open, 2...d6", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4", 52, 449],
    ["C60", "Spanish (Ruy Lopez)", "1.e4 e5 2.Nf3 Nc6 3.Bb5", 56, 441],
    ["E61", "King's Indian: 3.Nc3", "1.d4 Nf6 2.c4 g6 3.Nc3", 55, 390],
    ["A05", "Reti: 1...Nf6", "1.Nf3 Nf6", 56, 386],
    ["B40", "Sicilian: 2...e6", "1.e4 c5 2.Nf3 e6", 51, 371],
    ["B10", "Caro-Kann", "1.e4 c6", 54, 355],
    ["B32", "Sicilian: 2...Nc6 3.d4", "1.e4 c5 2.Nf3 Nc6 3.d4", 51, 323],
    ["E10", "Neo-Indian: 3.Nf3", "1.d4 Nf6 2.c4 e6 3.Nf3", 55, 306],
    ["D02", "Queen's Pawn: 2.Nf3", "1.d4 d5 2.Nf3", 55, 291],
    ["B12", "Caro-Kann: 2.d4", "1.e4 c6 2.d4", 54, 286],
    ["D30", "Queen's Gambit Declined (QGD)", "1.d4 d5 2.c4 e6", 58, 268],
    ["C70", "Spanish: 4.Ba4", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4", 56, 264],
    ["B90", "Sicilian: Najdorf", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6", 51, 261],
    ["D10", "Slav Defence", "1.d4 d5 2.c4 c6", 58, 260],
    ["E70", "King's Indian: 4.e4", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4", 56, 243],
    ["C10", "French: 3.Nc3", "1.e4 e6 2.d4 d5 3.Nc3", 56, 236],
    ["C77", "Spanish: Morphy Defence", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6", 56, 227],
    ["A06", "Reti: 1...d5", "1.Nf3 d5", 56, 223],
    ["B23", "Sicilian: Closed", "1.e4 c5 2.Nc3", 49, 220],
    ["A15", "English: Anglo-Indian", "1.c4 Nf6", 56, 216],
    ["E20", "Nimzo-Indian Defence", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4", 52, 215],
    ["A48", "Neo-King's Indian", "1.d4 Nf6 2.Nf3 g6", 53, 211],
    ["C50", "Italian Game", "1.e4 e5 2.Nf3 Nc6 3.Bc4", 55, 205],
    ["D31", "QGD: 3.Nc3", "1.d4 d5 2.c4 e6 3.Nc3", 58, 202],
    ["C78", "Spanish: 5.O-O", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O", 56, 190],
    ["B01", "Scandinavian (Centre Counter)", "1.e4 d5", 55, 179],
    ["E91", "King's Indian: 6.Be2", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2", 56, 169],
    ["D37", "QGD: 4.Nf3", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3", 58, 168],
    ["B33", "Sicilian: Open, 2...Nc6", "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6", 51, 167],
    ["B07", "Pirc", "1.e4 d6 2.d4 Nf6 3.Nc3", 55, 161],
    ["C03", "French: Tarrasch", "1.e4 e6 2.d4 d5 3.Nd2", 57, 161],
    ["B22", "Sicilian: Alapin", "1.e4 c5 2.c3", 51, 160],
    ["D11", "Slav: 3.Nf3", "1.d4 d5 2.c4 c6 3.Nf3", 59, 158],
    ["A20", "English: King's (1...e5)", "1.c4 e5", 54, 155],
    ["D35", "QGD: 3.Nc3 Nf6", "1.d4 d5 2.c4 e6 3.Nc3 Nf6", 60, 153],
    ["D15", "Slav: 4.Nc3", "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3", 58, 152],
    ["A56", "Benoni: 2...c5", "1.d4 Nf6 2.c4 c5", 53, 152],
    ["B06", "Modern", "1.e4 g6", 51, 150],
    ["A16", "English: Anglo-Indian, 2.Nc3", "1.c4 Nf6 2.Nc3", 56, 140],
    ["E12", "Queen's Indian", "1.d4 Nf6 2.c4 e6 3.Nf3 b6", 54, 136],
    ["C84", "Spanish: Closed System", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7", 56, 127],
    ["E90", "King's Indian: 5.Nf3", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3", 57, 126],
    ["E92", "King's Indian: 6.Be2 e5", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5", 57, 121],
    ["D80", "Gruenfeld Defence", "1.d4 Nf6 2.c4 g6 3.Nc3 d5", 54, 119],
    ["B02", "Alekhine Defence", "1.e4 Nf6", 52, 117],
    ["C15", "French: Winawer", "1.e4 e6 2.d4 d5 3.Nc3 Bb4", 55, 116],
    ["B41", "Sicilian: Kan (Paulsen)", "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6", 49, 115],
    ["C88", "Spanish: Closed", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3", 56, 114],
    ["A80", "Dutch", "1.d4 f5", 55, 113],
    ["A21", "English: King's, 2.Nc3", "1.c4 e5 2.Nc3", 53, 112],
    ["C42", "Russian Game (Petroff Defence)", "1.e4 e5 2.Nf3 Nf6", 58, 110],
    ["D43", "Semi-Slav", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c6", 57, 109],
    ["B70", "Sicilian: Dragon", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6", 54, 101],
    ["B44", "Sicilian: Taimanov", "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6", 51, 92],
    ["A41", "Neo-Old Indian", "1.d4 d6", 53, 89],
    ["C11", "French: 3.Nc3 Nf6", "1.e4 e6 2.d4 d5 3.Nc3 Nf6", 55, 89],
    ["D45", "Semi-Slav: 5.e3", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c6 5.e3", 57, 88],
    ["C02", "French: Advance", "1.e4 e6 2.d4 d5 3.e5", 50, 87],
    ["A13", "English: 1...e6", "1.c4 e6", 55, 87],
    ["B15", "Caro-Kann: 3.Nc3", "1.e4 c6 2.d4 d5 3.Nc3", 54, 87],
    ["A07", "Reti: KIA", "1.Nf3 d5 2.g3", 56, 87],
    ["B45", "Sicilian: Taimanov, 5.Nc3", "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3", 53, 85],
    ["E40", "Nimzo-Indian: Rubinstein", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3", 53, 83],
    ["C16", "French: Winawer, Advance Variation", "1.e4 e6 2.d4 d5 3.Nc3 Bb4 4.e5", 56, 83],
    ["C55", "Two Knights Defence", "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6", 54, 82],
    ["A30", "English: Symmetrical", "1.c4 c5", 56, 81],
    ["C45", "Scotch: 4.Nxd4", "1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4", 55, 79],
    ["B13", "Caro-Kann: Exchange Variation", "1.e4 c6 2.d4 d5 3.exd5", 53, 76],
    ["E94", "King's Indian: 7.O-O", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O", 58, 74],
    ["C46", "Three Knights Game", "1.e4 e5 2.Nf3 Nc6 3.Nc3", 52, 74],
    ["C90", "Spanish: Closed, 8...d6", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6", 56, 72],
    ["D20", "Queen's Gambit Accepted (QGA)", "1.d4 d5 2.c4 dxc4", 58, 72],
    ["D50", "QGD: 4.Bg5", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5", 59, 72],
    ["A00", "Benko Opening", "1.g3", 55, 72],
    ["E15", "Queen's Indian: 4.g3", "1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3", 55, 71],
    ["A22", "English: King's, 2.Nc3 Nf6", "1.c4 e5 2.Nc3 Nf6", 54, 71],
    ["E32", "Nimzo-Indian: Classical Variation", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2", 53, 71],
    ["E80", "King's Indian: Saemisch Variation", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3", 57, 70],
    ["C01", "French: Exchange", "1.e4 e6 2.d4 d5 3.exd5", 46, 66],
    ["B34", "Sicilian: Accelerated Fianchetto", "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6", 51, 66],
    ["C05", "French: Tarrasch, Closed", "1.e4 e6 2.d4 d5 3.Nd2 Nf6", 58, 66],
    ["C92", "Spanish: Closed, 9.h3", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 9.h3", 56, 66],
    ["A57", "Benko Gambit", "1.d4 Nf6 2.c4 c5 3.d5 b5", 53, 64],
    ["B03", "Alekhine: 3.d4", "1.e4 Nf6 2.e5 Nd5 3.d4", 56, 63],
    ["B80", "Sicilian: Scheveningen", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6", 52, 63],
    ["B51", "Sicilian: Moscow", "1.e4 c5 2.Nf3 d6 3.Bb5+", 51, 63],
    ["B24", "Sicilian: Closed, 3.g3", "1.e4 c5 2.Nc3 Nc6 3.g3", 47, 63],
    ["E81", "King's Indian: Saemisch, 5...O-O", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O", 56, 62],
    ["B72", "Sicilian: Dragon, 6.Be3", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3", 57, 61],
    ["B18", "Caro-Kann: Classical", "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5", 54, 60],
    ["A02", "Bird", "1.f4", 47, 59],
    ["B60", "Sicilian: Richter-Rauzer", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5", 54, 59],
    ["C65", "Spanish: Berlin Defence", "1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6", 57, 58],
    ["E11", "Bogo-Indian", "1.d4 Nf6 2.c4 e6 3.Nf3 Bb4+", 56, 58],
    ["C17", "French: Winawer, Advance, 4...c5", "1.e4 e6 2.d4 d5 3.Nc3 Bb4 4.e5 c5", 56, 58],
    ["B47", "Sicilian: Taimanov, Bastrikov Variation", "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Qc7", 51, 57],
    ["B94", "Sicilian: Najdorf, 6.Bg5", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5", 51, 56],
    ["B92", "Sicilian: Najdorf, 6.Be2", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2", 50, 56],
    ["D85", "Gruenfeld: Exchange Variation", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5", 54, 55],
    ["B43", "Sicilian: Kan, 5.Nc3", "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Nc3", 48, 55],
    ["B75", "Sicilian: Dragon, Yugoslav Attack", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3", 58, 55],
    ["E73", "King's Indian: 5.Be2", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Be2", 58, 55],
    ["E97", "King's Indian: Mar del Plata", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6", 58, 53],
    ["A09", "Reti: 2.c4", "1.Nf3 d5 2.c4", 57, 53],
    ["C25", "Vienna Game", "1.e4 e5 2.Nc3", 56, 52],
    ["B95", "Sicilian: Najdorf, 6...e6", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6", 51, 49],
    ["A43", "Old Benoni", "1.d4 c5", 53, 48],
    ["B62", "Sicilian: Richter-Rauzer, 6...e6", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6", 54, 47],
    ["C30", "King's Gambit", "1.e4 e5 2.f4", 57, 47],
    ["B42", "Sicilian: Kan, 5.Bd3", "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3", 54, 47],
    ["A11", "English: Caro-Kann Defence", "1.c4 c6", 56, 47],
    ["C41", "Philidor Defence", "1.e4 e5 2.Nf3 d6", 59, 47],
    ["D16", "Slav: Alapin", "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4", 57, 46],
    ["C23", "Bishop's Opening", "1.e4 e5 2.Bc4", 56, 46],
    ["C07", "French: Tarrasch, Open", "1.e4 e6 2.d4 d5 3.Nd2 c5", 56, 46],
    ["C53", "Giuoco Piano: 4.c3", "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3", 57, 46],
    ["B31", "Sicilian: Rossolimo, 3...g6", "1.e4 c5 2.Nf3 Nc6 3.Bb5 g6", 58, 44],
    ["A53", "Old Indian", "1.d4 Nf6 2.c4 d6", 55, 43],
    ["B63", "Sicilian: Richter-Rauzer, Rauzer Attack (7.Qd2)", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2", 54, 43],
    ["D23", "QGA: 3.Nf3 Nf6", "1.d4 d5 2.c4 dxc4 3.Nf3 Nf6", 57, 43],
    ["D53", "QGD: 4.Bg5 Be7", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7", 60, 42],
    ["A01", "Nimzowitsch-Larsen Attack", "1.b3", 51, 42],
    ["C68", "Spanish: Exchange Variation", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6", 53, 41],
    ["D55", "QGD: 6.Nf3", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3", 59, 41],
    ["C18", "French: Winawer, 5...Bxc3+ 6.bxc3", "1.e4 e6 2.d4 d5 3.Nc3 Bb4 4.e5 c5 5.a3 Bxc3+ 6.bxc3", 57, 40],
    ["A49", "Neo-King's Indian: Fianchetto System", "1.d4 Nf6 2.Nf3 g6 3.g3", 52, 40],
    ["D90", "Gruenfeld: Three Knights Variation", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3", 54, 40],
    ["B96", "Sicilian: Najdorf, 7.f4", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4", 52, 39],
    ["B25", "Sicilian: Closed, 3.g3, 5.d3 d6", "1.e4 c5 2.Nc3 Nc6 3.g3 g6 4.Bg2 Bg7 5.d3 d6", 46, 39],
    ["E46", "Nimzo-Indian: 4.e3 O-O", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O", 51, 39],
    ["A42", "Modern: Averbakh", "1.d4 d6 2.c4 g6 3.Nc3 Bg7 4.e4", 55, 38],
    ["C26", "Vienna: 2...Nf6", "1.e4 e5 2.Nc3 Nf6", 54, 38],
    ["D17", "Slav: Czech Defence", "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4 Bf5", 57, 37],
    ["B04", "Alekhine: Modern Variation", "1.e4 Nf6 2.e5 Nd5 3.d4 d6 4.Nf3", 57, 37],
    ["B52", "Sicilian: Moscow 3...Bd7", "1.e4 c5 2.Nf3 d6 3.Bb5+ Bd7", 53, 37],
    ["D21", "QGA: 3.Nf3", "1.d4 d5 2.c4 dxc4 3.Nf3", 57, 37],
    ["A34", "English: Symmetrical", "1.c4 c5 2.Nc3", 53, 36],
    ["A28", "English: Four Knights", "1.c4 e5 2.Nc3 Nc6 3.Nf3 Nf6", 55, 36],
    ["A17", "English: Anglo-Indian, 2.Nc3 e6", "1.c4 Nf6 2.Nc3 e6", 58, 36],
    ["D46", "Semi-Slav: 6.Bd3", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c6 5.e3 Nbd7 6.Bd3", 56, 35],
    ["A25", "English: Closed", "1.c4 e5 2.Nc3 Nc6", 54, 34],
    ["A81", "Dutch: 2.g3", "1.d4 f5 2.g3", 59, 34],
    ["C48", "Four Knights: Spanish Variation", "1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bb5", 54, 34],
    ["A60", "Benoni: 3.d5 e6", "1.d4 Nf6 2.c4 c5 3.d5 e6", 55, 34],
    ["B76", "Sicilian: Dragon, Yugoslav, 7.f3 O-O", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O", 58, 34],
    ["B57", "Sicilian: Sozin", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bc4", 50, 33],
    ["D04", "Queen's Pawn: Colle", "1.d4 d5 2.Nf3 Nf6 3.e3", 51, 33],
    ["C19", "French: Winawer, 6...Ne7", "1.e4 e6 2.d4 d5 3.Nc3 Bb4 4.e5 c5 5.a3 Bxc3+ 6.bxc3 Ne7", 55, 33],
    ["C24", "Bishop's Opening: Berlin Defence", "1.e4 e5 2.Bc4 Nf6", 55, 32],
    ["B36", "Sicilian: Maroczy Bind", "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.c4", 58, 32],
    ["B17", "Caro-Kann: Steinitz Variation", "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7", 56, 32],
    ["E06", "Catalan: Closed, 5.Nf3", "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 5.Nf3", 62, 31],
    ["D25", "QGA: 4.e3", "1.d4 d5 2.c4 dxc4 3.Nf3 Nf6 4.e3", 58, 30],
    ["B08", "Pirc: Classical", "1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.Nf3", 52, 29],
    ["B77", "Sicilian: Dragon, Yugoslav, 9.Bc4", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4", 57, 29],
    ["D60", "QGD: Orthodox Defence", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7", 60, 29],
    ["A84", "Dutch: 2.c4", "1.d4 f5 2.c4", 50, 29],
    ["A03", "Bird: 1...d5", "1.f4 d5", 47, 29],
    ["B66", "Sicilian: Richter-Rauzer, 7...a6", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 a6", 53, 28],
    ["C69", "Spanish: Exchange Variation 5.O-O", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6 5.O-O", 55, 28],
    ["B84", "Sicilian: Scheveningen, Classical", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 6.Be2 a6", 50, 28],
    ["A51", "Budapest", "1.d4 Nf6 2.c4 e5", 57, 28],
    ["C96", "Spanish: Closed, Chigorin", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 9.h3 Na5 10.Bc2", 57, 28],
    ["B09", "Pirc: Austrian Attack", "1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.f4", 57, 28],
    ["A61", "Benoni: 6.Nf3 g6", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.Nf3 g6", 56, 27],
    ["B58", "Sicilian: Classical", "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 d6 6.Be2", 45, 26],
    ["B14", "Caro-Kann: Panov-Botvinnik, 5...e6", "1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6", 56, 26],
    ["B37", "Sicilian: Maroczy Bind, 5...Bg7", "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.c4 Bg7", 59, 26],
    ["B35", "Sicilian: Accelerated Fianchetto, Modern, 7.Bc4", "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.Nc3 Bg7 6.Be3 Nf6 7.Bc4", 53, 26],
    ["B19", "Caro-Kann: Classical, 7.Nf3 Nd7", "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7", 55, 26],
    ["A65", "Benoni: 6.e4", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4", 55, 25],
    ["D47", "Semi-Slav: 7.Bxc4", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c6 5.e3 Nbd7 6.Bd3 dxc4 7.Bxc4", 54, 25],
    ["D38", "QGD: Ragozin", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 Bb4", 56, 25],
    ["C47", "Four Knights Game", "1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.d4", 55, 25],
    ["C33", "King's Gambit Accepted (KGA)", "1.e4 e5 2.f4 exf4", 54, 25],
    ["E47", "Nimzo-Indian: 4.e3 O-O 5.Bd3", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Bd3", 52, 25],
    ["A00", "Van Geet (Dunst) Opening", "1.Nc3", 51, 25],
    ["A31", "English: Symmetrical, Two Knights", "1.c4 c5 2.Nf3 Nf6 3.d4", 50, 24],
    ["E41", "Nimzo-Indian: 4.e3 c5", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 c5", 54, 24],
    ["C06", "French: Tarrasch, Closed, Main Line", "1.e4 e6 2.d4 d5 3.Nd2 Nf6 4.e5 Nfd7 5.Bd3 c5 6.c3 Nc6 7.Ne2 cxd4 8.cxd4", 57, 24],
    ["C67", "Spanish: Open Berlin", "1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4", 54, 24],
    ["B38", "Sicilian: Maroczy Bind, 6.Be3", "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.c4 Bg7 6.Be3", 59, 24],
    ["B28", "Sicilian: O'Kelly Variation", "1.e4 c5 2.Nf3 a6", 50, 24],
    ["E17", "Queen's Indian: 5.Bg2 Be7", "1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Bb7 5.Bg2 Be7", 57, 23],
    ["A58", "Benko Gambit: 5.bxa6", "1.d4 Nf6 2.c4 c5 3.d5 b5 4.cxb5 a6 5.bxa6", 53, 23],
    ["C71", "Spanish: Modern Steinitz Defence", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6", 56, 23],
    ["E68", "King's Indian: Fianchetto, Classical, 8.e4", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.Nf3 d6 5.g3 O-O 6.Bg2 Nbd7 7.O-O e5 8.e4", 59, 23],
    ["B53", "Sicilian, Chekhover Variation", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Qxd4", 53, 23],
    ["D01", "Richter-Veresov Attack", "1.d4 d5 2.Nc3 Nf6 3.Bg5", 50, 23],
    ["B46", "Sicilian: Taimanov, 5...a6", "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 a6", 54, 23],
    ["B21", "Sicilian: Grand Prix Attack", "1.e4 c5 2.f4", 47, 22],
    ["D27", "QGA: Classical, 6...a6", "1.d4 d5 2.c4 dxc4 3.Nf3 Nf6 4.e3 e6 5.Bxc4 c5 6.O-O a6", 56, 22],
    ["B48", "Sicilian: Taimanov, 6.Be3", "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Qc7 6.Be3", 51, 22],
    ["C13", "French: Classical", "1.e4 e6 2.d4 d5 3.Nc3 Nf6 4.Bg5 Be7", 59, 22],
    ["C57", "Two Knights: 4.Ng5", "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5", 56, 22],
    ["A14", "English: Neo-Catalan Declined", "1.c4 e6 2.Nf3 d5 3.g3 Nf6 4.Bg2 Be7 5.O-O", 58, 22],
    ["A37", "English: Symmetrical, 5.Nf3", "1.c4 c5 2.Nc3 Nc6 3.g3 g6 4.Bg2 Bg7 5.Nf3", 48, 22],
    ["C80", "Spanish: Open", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4", 56, 21],
    ["E76", "King's Indian: Four Pawns Attack", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f4", 57, 21],
    ["D52", "QGD: 4.Bg5 Nbd7 5.e3 c6 6.Nf3", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.e3 c6 6.Nf3", 56, 21],
    ["D26", "QGA: 4.e3 e6", "1.d4 d5 2.c4 dxc4 3.Nf3 Nf6 4.e3 e6", 58, 21],
    ["E18", "Queen's Indian: 7.Nc3", "1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Bb7 5.Bg2 Be7 6.O-O O-O 7.Nc3", 56, 21],
    ["D32", "QGD Tarrasch", "1.d4 d5 2.c4 e6 3.Nc3 c5", 56, 21],
    ["E21", "Nimzo-Indian: Three Knights", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Nf3", 53, 21],
    ["D51", "QGD: 4.Bg5 Nbd7", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7", 57, 20],
    ["D58", "QGD: Tartakower System", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 h6 7.Bh4 b6", 54, 20],
    ["A52", "Budapest: 3...Ng4", "1.d4 Nf6 2.c4 e5 3.dxe5 Ng4", 60, 20],
    ["D12", "Slav: 4.e3 Bf5", "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.e3 Bf5", 55, 20],
    ["B26", "Sicilian: Closed, 6.Be3", "1.e4 c5 2.Nc3 Nc6 3.g3 g6 4.Bg2 Bg7 5.d3 d6 6.Be3", 46, 20],
    ["D13", "Slav: Exchange", "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.cxd5 cxd5", 52, 20],
    ["D18", "Slav: Dutch Variation", "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4 Bf5 6.e3", 55, 20],
    ["E67", "King's Indian: Fianchetto with 6...Nd7", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.Nf3 d6 5.g3 O-O 6.Bg2 Nbd7", 57, 19],
    ["E63", "King's Indian: Fianchetto, Panno Variation", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.Nf3 d6 5.g3 O-O 6.Bg2 Nc6 7.O-O a6", 56, 19],
    ["A35", "English: Symmetrical", "1.c4 c5 2.Nc3 Nc6", 55, 19],
    ["C34", "KGA: King's Knight Gambit", "1.e4 e5 2.f4 exf4 3.Nf3", 54, 19],
    ["E38", "Nimzo-Indian: Classical, 4...c5", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 c5", 53, 19],
    ["E98", "King's Indian: Mar del Plata, 9.Ne1", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 9.Ne1", 57, 19],
    ["A00", "Polish (Sokolsky; Orang-Utan)", "1.b4", 46, 19],
    ["B83", "Sicilian: Scheveningen, 6.Be2", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 6.Be2", 49, 19],
    ["D86", "Gruenfeld: Classical Exchange", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 7.Bc4", 53, 19],
    ["C21", "Centre Game", "1.e4 e5 2.d4 exd4", 56, 19],
    ["C97", "Spanish: Closed, Chigorin, 11.d4 Qc7", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 9.h3 Na5 10.Bc2 c5 11.d4 Qc7", 57, 18],
    ["D05", "Colle: 3...e6", "1.d4 d5 2.Nf3 Nf6 3.e3 e6", 56, 18],
    ["E01", "Catalan: 4.Bg2", "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2", 57, 18],
    ["C63", "Spanish: Schliemann (Jaenisch)", "1.e4 e5 2.Nf3 Nc6 3.Bb5 f5", 54, 18],
    ["B88", "Sicilian: Sozin-Scheveningen", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 6.Bc4 Nc6", 51, 18],
    ["B78", "Sicilian: Dragon, Yugoslav, 10.O-O-O", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 Bd7 10.O-O-O", 56, 17],
    ["D03", "Torre Attack (Tartakower)", "1.d4 d5 2.Nf3 Nf6 3.Bg5", 54, 17],
    ["E53", "Nimzo-Indian: Main Line, 6...c5", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3 d5 6.Bd3 c5", 52, 17],
    ["B93", "Sicilian: Najdorf, 6.f4", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.f4", 54, 17],
    ["B05", "Alekhine: Modern, 4...Bg4", "1.e4 Nf6 2.e5 Nd5 3.d4 d6 4.Nf3 Bg4", 58, 17],
    ["C62", "Spanish: Old Steinitz", "1.e4 e5 2.Nf3 Nc6 3.Bb5 d6", 66, 17],
    ["C64", "Spanish: Classical Defence", "1.e4 e5 2.Nf3 Nc6 3.Bb5 Bc5", 57, 17],
    ["D07", "QGD: Chigorin Defence", "1.d4 d5 2.c4 Nc6", 58, 17],
    ["E04", "Catalan: Open, 5.Nf3", "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dxc4 5.Nf3", 55, 17],
    ["E48", "Nimzo-Indian: 4.e3 O-O 5.Bd3 d5", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Bd3 d5", 52, 16],
    ["A29", "English: Four Knights, 4.g3", "1.c4 e5 2.Nc3 Nc6 3.Nf3 Nf6 4.g3", 56, 16],
    ["D19", "Slav: Dutch, 8.O-O", "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4 Bf5 6.e3 e6 7.Bxc4 Bb4 8.O-O", 54, 16],
    ["A90", "Dutch: 2.c4 Nf6 3.g3 e6 4.Bg2", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2", 59, 16],
    ["B98", "Sicilian: Najdorf, 7...Be7", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Be7", 56, 16],
    ["C43", "Russian Game: Modern (Steinitz) Attack", "1.e4 e5 2.Nf3 Nf6 3.d4", 62, 15],
    ["E85", "King's Indian: Saemisch, Orthodox Variation", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Be3 e5", 58, 15],
    ["E43", "Nimzo-Indian: Nimzowitsch (Fischer) Variation", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 b6", 52, 15],
    ["C54", "Giuoco Piano: 4.c3 Nf6 5.d4 exd4 6.cxd4", "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4", 54, 15],
    ["C12", "French: MacCutcheon", "1.e4 e6 2.d4 d5 3.Nc3 Nf6 4.Bg5 Bb4", 53, 15],
    ["B67", "Sicilian: Richter-Rauzer, 7...a6 8.O-O-O Bd7", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 a6 8.O-O-O Bd7", 53, 15],
    ["A85", "Dutch: 2.c4 Nf6 3.Nc3", "1.d4 f5 2.c4 Nf6 3.Nc3", 47, 14],
    ["D77", "Neo-Gruenfeld, 6.O-O", "1.d4 Nf6 2.c4 g6 3.g3 d5 4.Bg2 Bg7 5.Nf3 O-O 6.O-O", 56, 14],
    ["B29", "Sicilian: Nimzowitsch", "1.e4 c5 2.Nf3 Nf6", 54, 14],
    ["D40", "QGD: Semi-Tarrasch", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c5", 59, 14],
    ["D63", "QGD: Orthodox, 7.Rc1", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Rc1", 62, 14],
    ["D78", "Neo-Gruenfeld, 6.O-O c6", "1.d4 Nf6 2.c4 g6 3.g3 d5 4.Bg2 Bg7 5.Nf3 O-O 6.O-O c6", 59, 14],
    ["C08", "French: Tarrasch, Open, 4.exd5 exd5", "1.e4 e6 2.d4 d5 3.Nd2 c5 4.exd5 exd5", 56, 14],
    ["A47", "Neo-Queen's Indian", "1.d4 Nf6 2.Nf3 b6", 52, 14],
    ["A70", "Benoni: Classical", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3", 53, 14],
    ["D91", "Gruenfeld: 5.Bg5", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Bg5", 53, 13],
    ["C49", "Four Knights: 4.Bb5 Bb4", "1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bb5 Bb4", 54, 13],
    ["A18", "English: Mikenas", "1.c4 Nf6 2.Nc3 e6 3.e4", 61, 13],
    ["C94", "Spanish: Closed, Breyer Defence", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 9.h3 Nb8", 55, 13],
    ["D14", "Slav: Exchange, 6.Bf4 Bf5", "1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.cxd5 cxd5 5.Nc3 Nc6 6.Bf4 Bf5", 51, 13],
    ["B11", "Caro-Kann: Two Knights, 3...Bg4", "1.e4 c6 2.Nc3 d5 3.Nf3 Bg4", 53, 13],
    ["A27", "English: Three Knights", "1.c4 e5 2.Nc3 Nc6 3.Nf3", 55, 13],
    ["B81", "Sicilian: Scheveningen, Keres Attack", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 6.g4", 60, 13],
    ["E69", "King's Indian: Fianchetto, Classical, 9.h3", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.Nf3 d6 5.g3 O-O 6.Bg2 Nbd7 7.O-O e5 8.e4 c6 9.h3", 62, 13],
    ["A36", "English: Symmetrical, 3.g3", "1.c4 c5 2.Nc3 Nc6 3.g3", 55, 13],
    ["D96", "Gruenfeld: Russian Variation", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Qb3", 56, 13],
    ["D33", "QGD Tarrasch: 6.g3 (Schlecter/Rubinstein)", "1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.g3", 59, 13],
    ["B89", "Sicilian: Sozin, 7.Be3", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 6.Bc4 Nc6 7.Be3", 53, 12],
    ["D34", "QGD Tarrasch: 7.Bg2 Be7", "1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.g3 Nf6 7.Bg2 Be7", 59, 12],
    ["D94", "Gruenfeld: 5.e3", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.e3", 47, 12],
    ["A44", "Old Benoni: Czech", "1.d4 c5 2.d5 e5", 59, 12],
    ["A55", "Old Indian: 5.e4", "1.d4 Nf6 2.c4 d6 3.Nc3 e5 4.Nf3 Nbd7 5.e4", 58, 12],
    ["E71", "King's Indian: Makagonov System", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.h3", 61, 12],
    ["A38", "English: Symmetrical, Main Line", "1.c4 c5 2.Nc3 Nc6 3.g3 g6 4.Bg2 Bg7 5.Nf3 Nf6", 58, 12],
    ["C95", "Spanish: Closed, Breyer, 10.d4", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 9.h3 Nb8 10.d4", 54, 12],
    ["E34", "Nimzo-Indian: Classical, Noa Variation", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 d5", 55, 12],
    ["C14", "French: Classical, 6.Bxe7 Qxe7", "1.e4 e6 2.d4 d5 3.Nc3 Nf6 4.Bg5 Be7 5.e5 Nfd7 6.Bxe7 Qxe7", 59, 11],
    ["C91", "Spanish: Closed, 9.d4", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 9.d4", 57, 11],
    ["B16", "Caro-Kann: Bronstein-Larsen", "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Nxf6+ gxf6", 54, 11],
    ["E14", "Queen's Indian: 4.e3", "1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.e3", 53, 11],
    ["D82", "Gruenfeld: 4.Bf4", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Bf4", 54, 11],
    ["E83", "King's Indian: Saemisch, 6...Nc6", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Be3 Nc6", 52, 11],
    ["C51", "Evans Gambit", "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4", 57, 11],
    ["C58", "Two Knights: Morphy Variation (5...Na5)", "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Na5", 53, 11],
    ["D44", "Semi-Slav: Botvinnik Accepted", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c6 5.Bg5 dxc4", 53, 11],
    ["D08", "QGD: Albin Countergambit", "1.d4 d5 2.c4 e5", 58, 11],
    ["D97", "Gruenfeld: Russian, 7.e4", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Qb3 dxc4 6.Qxc4 O-O 7.e4", 55, 10],
    ["C28", "Vienna: 3.Bc4 Nc6", "1.e4 e5 2.Nc3 Nf6 3.Bc4 Nc6", 54, 10],
    ["A08", "Reti: KIA, 2...c5 3.Bg2", "1.Nf3 d5 2.g3 c5 3.Bg2", 56, 10],
    ["A33", "English: Symmetrical, Two Knights, 5.Nc3 Nc6", "1.c4 c5 2.Nf3 Nf6 3.d4 cxd4 4.Nxd4 e6 5.Nc3 Nc6", 55, 10],
    ["A62", "Benoni: Fianchetto, 8.Bg2 O-O", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.Nf3 g6 7.g3 Bg7 8.Bg2 O-O", 51, 10],
    ["B87", "Sicilian: Sozin-Najdorf, 7.Bb3 b5", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 6.Bc4 a6 7.Bb3 b5", 48, 10],
    ["E30", "Nimzo-Indian: Leningrad", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Bg5", 47, 10],
    ["B91", "Sicilian: Najdorf, 6.g3", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.g3", 53, 10],
    ["D41", "QGD: Semi-Tarrasch, 5.cxd5", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c5 5.cxd5", 60, 10],
    ["B99", "Sicilian: Najdorf, Main Line", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Be7 8.Qf3 Qc7 9.O-O-O Nbd7", 57, 10],
    ["E87", "King's Indian: Saemisch, Orthodox, 7.d5", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Be3 e5 7.d5", 57, 10],
    ["A88", "Dutch: Leningrad, Main Line, 7.Nc3 c6", "1.d4 f5 2.c4 Nf6 3.g3 g6 4.Bg2 Bg7 5.Nf3 O-O 6.O-O d6 7.Nc3 c6", 54, 10],
    ["D24", "QGA: 4.Nc3", "1.d4 d5 2.c4 dxc4 3.Nf3 Nf6 4.Nc3", 56, 10],
    ["C89", "Spanish: Marshall Counterattack", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5", 49, 9],
    ["E24", "Nimzo-Indian: Saemisch", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.a3 Bxc3+ 5.bxc3", 47, 9],
    ["A39", "English: Symmetrical, Main Line 7.d4", "1.c4 c5 2.Nc3 Nc6 3.g3 g6 4.Bg2 Bg7 5.Nf3 Nf6 6.O-O O-O 7.d4", 59, 9],
    ["C22", "Centre Game", "1.e4 e5 2.d4 exd4 3.Qxd4 Nc6", 55, 9],
    ["A66", "Benoni: Four Pawns Attack", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.f4", 56, 9],
    ["A87", "Dutch: Leningrad, Main Line", "1.d4 f5 2.c4 Nf6 3.g3 g6 4.Bg2 Bg7 5.Nf3", 53, 9],
    ["D66", "QGD: Orthodox, Main Line", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Rc1 c6 8.Bd3", 63, 9],
    ["B97", "Sicilian: Najdorf, Poisoned Pawn", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Qb6", 49, 9],
    ["D48", "Semi-Slav: Meran, 8...a6", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c6 5.e3 Nbd7 6.Bd3 dxc4 7.Bxc4 b5 8.Bd3 a6", 54, 8],
    ["D87", "Gruenfeld: Classical Exchange, 8...c5", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 7.Bc4 O-O 8.Ne2 c5", 54, 8],
    ["D92", "Gruenfeld: 5.Bf4", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Bf4", 53, 8],
    ["A89", "Dutch: Leningrad, Main Line, 7.Nc3 Nc6", "1.d4 f5 2.c4 Nf6 3.g3 g6 4.Bg2 Bg7 5.Nf3 O-O 6.O-O d6 7.Nc3 Nc6", 52, 8],
    ["C74", "Spanish: Modern Steinitz, 5.c3", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.c3", 57, 8],
    ["C04", "French: Tarrasch, Guimard, 4.Ngf3 Nf6", "1.e4 e6 2.d4 d5 3.Nd2 Nc6 4.Ngf3 Nf6", 56, 8],
    ["E44", "Nimzo-Indian: Nimzowitsch, 5.Ne2", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 b6 5.Ne2", 54, 8],
    ["C29", "Vienna Gambit", "1.e4 e5 2.Nc3 Nf6 3.f4 d5", 50, 8],
    ["B39", "Sicilian: Maroczy Bind, Breyer Variation", "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.c4 Bg7 6.Be3 Nf6 7.Nc3 Ng4", 60, 8],
    ["C31", "KGD: Falkbeer Countergambit", "1.e4 e5 2.f4 d5", 54, 8],
    ["E56", "Nimzo-Indian: Main Line, 7...Nc6", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3 d5 6.Bd3 c5 7.O-O Nc6", 53, 8],
    ["E42", "Nimzo-Indian: 4.e3 c5 5.Ne2", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 c5 5.Ne2", 56, 8],
    ["C09", "French: Tarrasch, Open, 5.Ngf3 Nc6", "1.e4 e6 2.d4 d5 3.Nd2 c5 4.exd5 exd5 5.Ngf3 Nc6", 59, 8],
    ["A12", "English: Caro-Kann Defence, 3.b3", "1.c4 c6 2.Nf3 d5 3.b3", 53, 8],
    ["E16", "Queen's Indian: Capablanca Variation", "1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Bb7 5.Bg2 Bb4+", 58, 8],
    ["E74", "King's Indian: Averbakh, 6...c5", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Be2 O-O 6.Bg5 c5", 59, 8],
    ["D74", "Neo-Gruenfeld, 6.cxd5 Nxd5 7.O-O", "1.d4 Nf6 2.c4 g6 3.g3 d5 4.Bg2 Bg7 5.Nf3 O-O 6.cxd5 Nxd5 7.O-O", 59, 8],
    ["A54", "Old Indian: 3...e5", "1.d4 Nf6 2.c4 d6 3.Nc3 e5", 54, 8],
    ["E65", "King's Indian: Fianchetto, Yugoslav, 7.O-O", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.Nf3 d6 5.g3 O-O 6.Bg2 c5 7.O-O", 60, 8],
    ["C99", "Spanish: Closed, Chigorin, 12...cxd4 13.cxd4", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 9.h3 Na5 10.Bc2 c5 11.d4 Qc7 12.Nbd2 cxd4 13.cxd4", 57, 7],
    ["E95", "King's Indian: 7.O-O Nbd7 8.Re1", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nbd7 8.Re1", 55, 7],
    ["A82", "Dutch: Staunton Gambit", "1.d4 f5 2.e4", 51, 7],
    ["A00", "Van Kruijs", "1.e3", 43, 7],
    ["C72", "Spanish: Modern Steinitz, 5.O-O", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.O-O", 59, 7],
    ["C85", "Spanish: Closed, Exchange", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Bxc6", 55, 7],
    ["A96", "Dutch: Classical", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7 5.Nf3 O-O 6.O-O d6", 60, 7],
    ["B73", "Sicilian: Dragon, Classical, 8.O-O", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.Be2 Nc6 8.O-O", 46, 7],
    ["C61", "Spanish: Bird's Defence", "1.e4 e5 2.Nf3 Nc6 3.Bb5 Nd4", 61, 7],
    ["D79", "Neo-Gruenfeld, 6.O-O c6 7.cxd5 cxd5", "1.d4 Nf6 2.c4 g6 3.g3 d5 4.Bg2 Bg7 5.Nf3 O-O 6.O-O c6 7.cxd5 cxd5", 55, 7],
    ["C82", "Spanish: Open, 9.c3", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 9.c3", 54, 7],
    ["B59", "Sicilian: Boleslavsky, 7.Nb3", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Be2 e5 7.Nb3", 38, 7],
    ["E62", "King's Indian: Fianchetto Variation", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.Nf3 d6 5.g3", 58, 7],
    ["D61", "QGD: Orthodox, Rubinstein Variation", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Qc2", 62, 7],
    ["B49", "Sicilian: Taimanov, 6.Be3 a6 7.Be2", "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Qc7 6.Be3 a6 7.Be2", 47, 7],
    ["E07", "Catalan: Closed, 6...Nbd7", "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 5.Nf3 O-O 6.O-O Nbd7", 65, 7],
    ["E39", "Nimzo-Indian: Classical, Pirc Variation", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 c5 5.dxc5 O-O", 51, 6],
    ["A73", "Benoni: Classical, 9.O-O", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Be2 O-O 9.O-O", 51, 6],
    ["E84", "King's Indian: Saemisch, Panno Main Line", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Be3 Nc6 7.Nge2 a6 8.Qd2 Rb8", 55, 6],
    ["B74", "Sicilian: Dragon, Classical, 9.Nb3", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.Be2 Nc6 8.O-O O-O 9.Nb3", 48, 6],
    ["E19", "Queen's Indian: Old Main Line, 9.Qxc3", "1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Bb7 5.Bg2 Be7 6.O-O O-O 7.Nc3 Ne4 8.Qc2 Nxc3 9.Qxc3", 54, 6],
    ["E54", "Nimzo-Indian: Main Line, 7...dxc4", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3 d5 6.Bd3 c5 7.O-O dxc4 8.Bxc4", 53, 6],
    ["A67", "Benoni: Four Pawns, Taimanov (Alatortsev) Variation", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.f4 Bg7 8.Bb5+", 59, 6],
    ["E58", "Nimzo-Indian: Main Line, 8...Bxc3 9.bxc3", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3 d5 6.Bd3 c5 7.O-O Nc6 8.a3 Bxc3 9.bxc3", 52, 6],
    ["A86", "Dutch: 2.c4 Nf6 3.g3", "1.d4 f5 2.c4 Nf6 3.g3", 54, 6],
    ["B86", "Sicilian: Sozin-Scheveningen", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 6.Bc4", 48, 6],
    ["D22", "QGA: Alekhine Defence", "1.d4 d5 2.c4 dxc4 3.Nf3 a6", 52, 6],
    ["D56", "QGD: Lasker Defence", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 h6 7.Bh4 Ne4", 57, 6],
    ["A26", "English: Closed, 5.d3 d6", "1.c4 e5 2.Nc3 Nc6 3.g3 g6 4.Bg2 Bg7 5.d3 d6", 51, 6],
    ["A72", "Benoni: Classical, 8.Be2 O-O", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Be2 O-O", 50, 6],
    ["A00", "Mieses", "1.d3", 46, 6],
    ["C56", "Two Knights: Classical", "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d4 exd4 5.O-O Nxe4", 45, 5],
    ["A91", "Dutch: 2.c4 Nf6 3.g3 e6 4.Bg2 Be7", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7", 60, 5],
    ["D71", "Neo-Gruenfeld, 5.cxd5 Nxd5", "1.d4 Nf6 2.c4 g6 3.g3 d5 4.Bg2 Bg7 5.cxd5 Nxd5", 57, 5],
    ["C66", "Spanish: Closed Berlin", "1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O d6", 65, 5],
    ["A83", "Dutch: Staunton Gambit, Staunton Variation", "1.d4 f5 2.e4 fxe4 3.Nc3 Nf6 4.Bg5", 50, 5],
    ["D73", "Neo-Gruenfeld, 5.Nf3", "1.d4 Nf6 2.c4 g6 3.g3 d5 4.Bg2 Bg7 5.Nf3", 56, 5],
    ["C75", "Spanish: Modern Steinitz, 5.c3 Bd7", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.c3 Bd7", 55, 5],
    ["C79", "Spanish: Steinitz Deferred", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O d6", 61, 5],
    ["B64", "Sicilian: Richter-Rauzer, 7.Qd2 Be7, 9.f4", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 Be7 8.O-O-O O-O 9.f4", 56, 5],
    ["E09", "Catalan: Closed, Main Line", "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 5.Nf3 O-O 6.O-O Nbd7 7.Qc2 c6 8.Nbd2", 65, 5],
    ["A23", "English: Bremen, Keres System", "1.c4 e5 2.Nc3 Nf6 3.g3 c6", 54, 5],
    ["E51", "Nimzo-Indian: 4.e3 O-O 5.Nf3 d5", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3 d5", 53, 5],
    ["D36", "QGD: Exchange, 5.Bg5 c6 6.Qc2", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5 5.Bg5 c6 6.Qc2", 61, 5],
    ["B61", "Sicilian: Richter-Rauzer, Larsen, 7.Qd2", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 Bd7 7.Qd2", 55, 5],
    ["D67", "QGD: Orthodox, Main Line, Capablanca Freeing Manoevure", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Rc1 c6 8.Bd3 dxc4 9.Bxc4 Nd5", 61, 5],
    ["D93", "Gruenfeld: 5.Bf4 O-O 6.e3", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Bf4 O-O 6.e3", 49, 5],
    ["B82", "Sicilian: Scheveningen, 6.f4", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 6.f4", 58, 5],
    ["E08", "Catalan: Closed, 7.Qc2", "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 5.Nf3 O-O 6.O-O Nbd7 7.Qc2", 68, 5],
    ["C86", "Spanish: Worrall Attack", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Qe2", 57, 5],
    ["A92", "Dutch: 2.c4 Nf6 3.g3 e6 4.Bg2 Be7 5.Nf3 O-O", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7 5.Nf3 O-O", 59, 5],
    ["D28", "QGA: Classical, 7.Qe2", "1.d4 d5 2.c4 dxc4 3.Nf3 Nf6 4.e3 e6 5.Bxc4 c5 6.O-O a6 7.Qe2", 54, 4],
    ["E93", "King's Indian: Petrosian, Main Line", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.d5 Nbd7", 54, 4],
    ["D83", "Gruenfeld: Gruenfeld Gambit", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Bf4 Bg7 5.e3 O-O", 55, 4],
    ["C52", "Evans Gambit: 5...Ba5", "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5", 55, 4],
    ["A97", "Dutch: Ilyin-Zhenevsky Variation", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7 5.Nf3 O-O 6.O-O d6 7.Nc3 Qe8", 60, 4],
    ["A00", "Anderssen Opening", "1.a3", 49, 4],
    ["C59", "Two Knights: Morphy, 8.Be2 h6", "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Be2 h6", 50, 4],
    ["A77", "Benoni: Classical, Main Line, 10.Nd2", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Be2 O-O 9.O-O Re8 10.Nd2", 55, 4],
    ["D76", "Neo-Gruenfeld, 6.cxd5 Nxd5 7.O-O Nb6", "1.d4 Nf6 2.c4 g6 3.g3 d5 4.Bg2 Bg7 5.Nf3 O-O 6.cxd5 Nxd5 7.O-O Nb6", 57, 4],
    ["E25", "Nimzo-Indian: Saemisch, 5...c5 6.f3 d5 7.cxd5", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.a3 Bxc3+ 5.bxc3 c5 6.f3 d5 7.cxd5", 54, 4],
    ["D59", "QGD: Tartakower, 8.cxd5 Nxd5", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 h6 7.Bh4 b6 8.cxd5 Nxd5", 48, 4],
    ["E35", "Nimzo-Indian: Classical, Noa, Exchange", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 d5 5.cxd5 exd5", 56, 4],
    ["D09", "QGD: Albin, 5.g3", "1.d4 d5 2.c4 e5 3.dxe5 d4 4.Nf3 Nc6 5.g3", 62, 4],
    ["E33", "Nimzo-Indian: Classical, 4...Nc6", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 Nc6", 53, 4],
    ["B71", "Sicilian: Dragon, Levenfish Variation", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.f4", 57, 4],
    ["E88", "King's Indian: Saemisch, Orthodox, 7.d5 c6", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Be3 e5 7.d5 c6", 56, 4],
    ["E59", "Nimzo-Indian: Main Line, 9...dxc4 10.Bxc4", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3 d5 6.Bd3 c5 7.O-O Nc6 8.a3 Bxc3 9.bxc3 dxc4 10.Bxc4", 53, 4],
    ["A32", "English: Symmetrical, Two Knights, 4...e6", "1.c4 c5 2.Nf3 Nf6 3.d4 cxd4 4.Nxd4 e6", 49, 4],
    ["C73", "Spanish: Modern Steinitz, Richter Variation", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.Bxc6+ bxc6 6.d4", 54, 4],
    ["E64", "King's Indian: Fianchetto, Yugoslav System", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.Nf3 d6 5.g3 O-O 6.Bg2 c5", 59, 4],
    ["C87", "Spanish: Averbakh Variation", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 d6", 61, 4],
    ["E26", "Nimzo-Indian: Saemisch, 5...c5 6.e3", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.a3 Bxc3+ 5.bxc3 c5 6.e3", 49, 4],
    ["D88", "Gruenfeld: Classical Exchange, Main Line", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 7.Bc4 O-O 8.Ne2 c5 9.O-O Nc6 10.Be3 cxd4 11.cxd4", 56, 4],
    ["E66", "King's Indian: Fianchetto, Yugoslav Panno", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.Nf3 d6 5.g3 O-O 6.Bg2 c5 7.O-O Nc6 8.d5", 58, 4],
    ["A69", "Benoni: Four Pawns, Main Line", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.f4 Bg7 8.Nf3 O-O 9.Be2 Re8", 58, 3],
    ["C36", "KGA: Scandinavian (Abbazia) Variation", "1.e4 e5 2.f4 exf4 3.Nf3 d5", 52, 3],
    ["A64", "Benoni: Fianchetto, 11...Re8", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.Nf3 g6 7.g3 Bg7 8.Bg2 O-O 9.O-O Nbd7 10.Nd2 a6 11.a4 Re8", 46, 3],
    ["E36", "Nimzo-Indian: Classical, Noa, 5.a3", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 d5 5.a3", 55, 3],
    ["A76", "Benoni: Classical, Main Line", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Be2 O-O 9.O-O Re8", 50, 3],
    ["C93", "Spanish: Closed, Smyslov Defence", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 9.h3 h6", 56, 3],
    ["A19", "English: Mikenas, Sicilian Variation", "1.c4 Nf6 2.Nc3 e6 3.e4 c5", 54, 3],
    ["E45", "Nimzo-Indian: Nimzowitsch, 5.Ne2 Ba6", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 b6 5.Ne2 Ba6", 52, 3],
    ["E86", "King's Indian: Saemisch, Orthodox, 7.Nge2 c6", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Be3 e5 7.Nge2 c6", 59, 3],
    ["C83", "Spanish: Open, Classical Defence", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 9.c3 Be7", 56, 3],
    ["B68", "Sicilian: Richter-Rauzer, 7...a6, 9.f4 Be7", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 a6 8.O-O-O Bd7 9.f4 Be7", 55, 3],
    ["C98", "Spanish: Closed, Chigorin, 12...Nc6", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 9.h3 Na5 10.Bc2 c5 11.d4 Qc7 12.Nbd2 Nc6", 56, 3],
    ["E55", "Nimzo-Indian: Main Line, Bronstein Variation", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3 d5 6.Bd3 c5 7.O-O dxc4 8.Bxc4 Nbd7", 50, 3],
    ["E52", "Nimzo-Indian: Main Line, 6...b6", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3 d5 6.Bd3 b6", 52, 3],
    ["E50", "Nimzo-Indian: 4.e3 O-O 5.Nf3", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3", 51, 3],
    ["C39", "KGA: 3.Nf3 g5 4.h4", "1.e4 e5 2.f4 exf4 3.Nf3 g5 4.h4", 50, 3],
    ["D68", "QGD: Orthodox, Classical Variation", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Rc1 c6 8.Bd3 dxc4 9.Bxc4 Nd5 10.Bxe7 Qxe7 11.O-O Nxc3 12.Rxc3 e5", 60, 3],
    ["E22", "Nimzo-Indian: Spielmann Variation", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qb3", 52, 3],
    ["B65", "Sicilian: Richter-Rauzer, 7...Be7, 9.f4 Nxd4", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 Be7 8.O-O-O O-O 9.f4 Nxd4", 56, 3],
    ["D70", "Neo-Gruenfeld: 3.f3 d5", "1.d4 Nf6 2.c4 g6 3.f3 d5", 62, 2],
    ["C76", "Spanish: Modern Steinitz, Bronstein Variation", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.c3 Bd7 6.d4 g6", 56, 2],
    ["E82", "King's Indian: Saemisch, Fianchetto", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Be3 b6", 54, 2],
    ["D89", "Gruenfeld: Classical Exchange, Main Line, 13.Bd3", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 7.Bc4 O-O 8.Ne2 c5 9.O-O Nc6 10.Be3 cxd4 11.cxd4 Bg4 12.f3 Na5 13.Bd3 Be6", 52, 2],
    ["A00", "Grob", "1.g4", 46, 2],
    ["C81", "Spanish: Open, Keres Attack", "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 9.Qe2", 59, 2],
    ["D49", "Semi-Slav: Meran, Blumenfeld Variation", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c6 5.e3 Nbd7 6.Bd3 dxc4 7.Bxc4 b5 8.Bd3 a6 9.e4 c5 10.e5 cxd4 11.Nxb5", 58, 2],
    ["A00", "Saragossa", "1.c3", 47, 2],
    ["E99", "King's Indian: Mar del Plata, 10.f3 f5", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 9.Ne1 Nd7 10.f3 f5", 56, 2],
    ["C27", "Vienna: 3.Bc4 Nxe4", "1.e4 e5 2.Nc3 Nf6 3.Bc4 Nxe4", 48, 2],
    ["C35", "KGA: Cunningham Defence", "1.e4 e5 2.f4 exf4 3.Nf3 Be7", 53, 2],
    ["E77", "King's Indian: Four Pawns Attack, 6.Be2", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f4 O-O 6.Be2", 52, 2],
    ["D29", "QGA: Classical, 8...Bb7", "1.d4 d5 2.c4 dxc4 3.Nf3 Nf6 4.e3 e6 5.Bxc4 c5 6.O-O a6 7.Qe2 b5 8.Bb3 Bb7", 50, 2],
    ["D72", "Neo-Gruenfeld, 5.cxd5 Nxd5 6.e4 Nb6 7.Ne2", "1.d4 Nf6 2.c4 g6 3.g3 d5 4.Bg2 Bg7 5.cxd5 Nxd5 6.e4 Nb6 7.Ne2", 62, 2],
    ["A95", "Dutch: Stonewall, 7.Nc3 c6", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7 5.Nf3 O-O 6.O-O d5 7.Nc3 c6", 57, 2],
    ["B79", "Sicilian: Dragon, Yugoslav, Old Main Line, 12.h4", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 Bd7 10.O-O-O Qa5 11.Bb3 Rfc8 12.h4", 61, 2],
    ["E13", "Queen's Indian: 5.Bg5 h6 6.Bh4 Bb4", "1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.Nc3 Bb7 5.Bg5 h6 6.Bh4 Bb4", 52, 2],
    ["A68", "Benoni: Four Pawns, 8.Nf3 O-O", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.f4 Bg7 8.Nf3 O-O", 49, 2],
    ["D42", "QGD: Semi-Tarrasch, 6.e3 Nc6 7.Bd3", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c5 5.cxd5 Nxd5 6.e3 Nc6 7.Bd3", 60, 2],
    ["A78", "Benoni: Classical, Main Line, 10.Nd2 Na6", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Be2 O-O 9.O-O Re8 10.Nd2 Na6", 53, 2],
    ["D95", "Gruenfeld: 5.e3 O-O 6.Qb3", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.e3 O-O 6.Qb3", 55, 2],
    ["A59", "Benko Gambit: 7.e4", "1.d4 Nf6 2.c4 c5 3.d5 b5 4.cxb5 a6 5.bxa6 Bxa6 6.Nc3 d6 7.e4", 53, 2],
    ["D64", "QGD: Orthodox, Rubinstein Attack", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Rc1 c6 8.Qc2", 65, 2],
    ["D98", "Gruenfeld: Russian, Smyslov Variation", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Qb3 dxc4 6.Qxc4 O-O 7.e4 Bg4", 54, 2],
    ["E49", "Nimzo-Indian: Botvinnik System", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Bd3 d5 6.a3 Bxc3+ 7.bxc3", 52, 2],
    ["E29", "Nimzo-Indian: Saemisch, 5...O-O 6.e3 c5 7.Bd3 Nc6", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.a3 Bxc3+ 5.bxc3 O-O 6.e3 c5 7.Bd3 Nc6", 47, 2],
    ["E37", "Nimzo-Indian: Classical, Noa, Main Line, 7.Qc2", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 d5 5.a3 Bxc3+ 6.Qxc3 Ne4 7.Qc2", 58, 2],
    ["A71", "Benoni: Classical, 8.Bg5", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Bg5", 60, 2],
    ["E75", "King's Indian: Averbakh, 7.d5 e6", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Be2 O-O 6.Bg5 c5 7.d5 e6", 56, 2],
    ["D39", "QGD: Ragozin, Vienna Variation", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 Bb4 5.Bg5 dxc4", 49, 2],
    ["A74", "Benoni: Classical, 9.O-O a6 10.a4", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Be2 O-O 9.O-O a6 10.a4", 53, 2],
    ["A93", "Dutch: Stonewall, Botvinnik Variation", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7 5.Nf3 O-O 6.O-O d5 7.b3", 66, 2],
    ["E72", "King's Indian: 4.e4 d6 5.g3", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.g3", 55, 2],
    ["E02", "Catalan: Open, 5.Qa4+", "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dxc4 5.Qa4+", 51, 2],
    ["A24", "English: Bremen, 3...g6", "1.c4 e5 2.Nc3 Nf6 3.g3 g6", 57, 1],
    ["B55", "Sicilian: Prins, Venice Attack", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.f3 e5 6.Bb5+", 55, 1],
    ["D81", "Gruenfeld: Early Russian Variation", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Qb3", 56, 1],
    ["A75", "Benoni: Classical, 9.O-O a6 10.a4 Bg4", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Be2 O-O 9.O-O a6 10.a4 Bg4", 50, 1],
    ["D54", "QGD: Anti-Neo-Orthodox Variation", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Rc1", 64, 1],
    ["E31", "Nimzo-Indian: Leningrad, Main Line", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Bg5 h6 5.Bh4 c5 6.d5 d6", 48, 1],
    ["A99", "Dutch: Ilyin-Zhenevsky, 8.b3", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7 5.Nf3 O-O 6.O-O d6 7.Nc3 Qe8 8.b3", 67, 1],
    ["E05", "Catalan: Open, Classical", "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dxc4 5.Nf3 Be7", 65, 1],
    ["E27", "Nimzo-Indian: Saemisch, 5...O-O", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.a3 Bxc3+ 5.bxc3 O-O", 47, 1],
    ["E28", "Nimzo-Indian: Saemisch, 5...O-O 6.e3", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.a3 Bxc3+ 5.bxc3 O-O 6.e3", 50, 1],
    ["A94", "Dutch: Stonewall, Botvinnik, 8.Ba3", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7 5.Nf3 O-O 6.O-O d5 7.b3 c6 8.Ba3", 65, 1],
    ["C32", "KGD: Falkbeer, 5.dxe4", "1.e4 e5 2.f4 d5 3.exd5 e4 4.d3 Nf6 5.dxe4", 64, 1],
    ["A79", "Benoni: Classical, Main Line, 10.Nd2 Na6 11.f3", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.e4 g6 7.Nf3 Bg7 8.Be2 O-O 9.O-O Re8 10.Nd2 Na6 11.f3", 57, 1],
    ["B69", "Sicilian: Richter-Rauzer, 7...a6, 9.f4 Be7 10.Nf3 b5 11.Bxf6", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 a6 8.O-O-O Bd7 9.f4 Be7 10.Nf3 b5 11.Bxf6", 58, 1],
    ["E96", "King's Indian: 7.O-O Nbd7, Old Main Line", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nbd7 8.Re1 c6 9.Bf1 a5", 55, 1],
    ["D69", "QGD: Orthodox, Classical, 13.dxe5", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Rc1 c6 8.Bd3 dxc4 9.Bxc4 Nd5 10.Bxe7 Qxe7 11.O-O Nxc3 12.Rxc3 e5 13.dxe5 Nxe5 14.Nxe5 Qxe5", 57, 1],
    ["D57", "QGD: Lasker Defence, Main Line", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 h6 7.Bh4 Ne4 8.Bxe7 Qxe7 9.cxd5 Nxc3 10.bxc3", 57, 1],
    ["D62", "QGD: Orthodox, Rubinstein, 7.Qc2 c5 8.cxd5", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Qc2 c5 8.cxd5", 57, 1],
    ["A98", "Dutch: Ilyin-Zhenevsky, 8.Qc2", "1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7 5.Nf3 O-O 6.O-O d6 7.Nc3 Qe8 8.Qc2", 59, 1],
    ["D75", "Neo-Gruenfeld, 6.cxd5 Nxd5 7.O-O c5 8.Nc3", "1.d4 Nf6 2.c4 g6 3.g3 d5 4.Bg2 Bg7 5.Nf3 O-O 6.cxd5 Nxd5 7.O-O c5 8.Nc3", 54, 1],
    ["D84", "Gruenfeld: Gruenfeld Gambit Accepted", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Bf4 Bg7 5.e3 O-O 6.cxd5 Nxd5 7.Nxd5 Qxd5 8.Bxc7", 55, 1],
    ["C38", "KGA: 3.Nf3 g5 4.Bc4 Bg7", "1.e4 e5 2.f4 exf4 3.Nf3 g5 4.Bc4 Bg7", 46, 1],
    ["E78", "King's Indian: Four Pawns Attack, 7.Nf3", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f4 O-O 6.Be2 c5 7.Nf3", 58, 1],
    ["A63", "Benoni: Fianchetto, 9...Nbd7", "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6 6.Nf3 g6 7.g3 Bg7 8.Bg2 O-O 9.O-O Nbd7", 46, 1],
    ["E23", "Nimzo-Indian: Spielmann, 4...c5 5.dxc5 Nc6", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qb3 c5 5.dxc5 Nc6", 56, 1],
    ["E79", "King's Indian: Four Pawns Attack, Main Line", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f4 O-O 6.Be2 c5 7.Nf3 cxd4 8.Nxd4 Nc6 9.Be3", 59, 1],
    ["B85", "Sicilian: Scheveningen, Classical, 7…Qc7 8.f4 Nc6", "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 6.Be2 a6 7.O-O Qc7 8.f4 Nc6", 57, 1],
    ["E89", "King's Indian: Saemisch, Orthodox Main Line", "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Be3 e5 7.d5 c6 8.Nge2 cxd5", 53, 1],
    ["D99", "Gruenfeld: Russian, Smyslov, Main Line", "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Qb3 dxc4 6.Qxc4 O-O 7.e4 Bg4 8.Be3 Nfd7 9.Qb3", 57, 1],
    ["A00", "Clemenz Opening", "1.h3", 45, 1],
    ["A00", "Kadas Opening", "1.h4", 46, 1],
    ["A00", "Amar/Paris Opening", "1.Nh3", 43, 0],
    ["A00", "Barnes Opening", "1.f3", 43, 0],
    ["A00", "Ware Opening", "1.a4", 48, 0],
    ["E03", "Catalan: Open, Alekhine Variation", "1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dxc4 5.Qa4+ Nbd7 6.Qxc4 a6 7.Qc2", 54, 0],
    ["D65", "QGD: Orthodox, Rubinstein Attack, 9.cxd5", "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Rc1 c6 8.Qc2 a6 9.cxd5", 60, 0],
    ["C37", "KGA: Quaade Gambit", "1.e4 e5 2.f4 exf4 3.Nf3 g5 4.Nc3", 53, 0],
    ["E57", "Nimzo-Indian: Main Line, 8...dxc4 9.Bxc4 cxd4", "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Nf3 d5 6.Bd3 c5 7.O-O Nc6 8.a3 dxc4 9.Bxc4 cxd4", 71, 0],
    ["A00", "Durkin", "1.Na3", 54, 0]
]

_staticEvalData = (function()
{
    var data = [],
        curindex = null;
    data.push(
    {
        "name": "Main evaluation",
        "group": "",
        "text": "<b>$</b>. An evaluation function is used to heuristically determine the relative value of a positions used in general case when no specialized evaluation or tablebase evaluation is available. In Stockfish it is never applied for positions where king of either side is in check. Resulting value is computed by combining [[Middle game evaluation]] and [[End game evaluation]]. We use <a class=\"external\" href=\"https://www.chessprogramming.org/Tapered_Eval\">Tapered Eval</a>, a technique used in evaluation to make a smooth transition between the phases of the game. [[Phase]] is a coeficient of simple linear combination. Before using  [[End game evaluation]] in this formula we also scale it down using [[Scale factor]].",
        "code": "function $$(pos) {\n  var mg = $middle_game_evaluation(pos);\n  var eg = $end_game_evaluation(pos);\n  var p = $phase(pos), t = $tempo(pos);\n  eg = eg * $scale_factor(pos, eg) / 64;\n  return ((((mg * p + eg * (128 - p)) << 0) / 128) << 0) + t;\n}",
        "links": [
            ["https://www.chessprogramming.org/Evaluation", "Evaluation in cpw"],
            ["https://www.chessprogramming.org/Tapered_Eval", "Tapered Eval in cpw"],
            ["https://www.chessprogramming.org/Game_Phases", "Game Phases in cpw"],
            ["https://www.chessprogramming.org/Tempo", "Tempo in cpw"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false
    });
    data.push(
    {
        "name": "Isolated",
        "group": "Pawns",
        "text": "<b>$</b> checks if pawn is isolated. In chess, an isolated pawn is a pawn which has no friendly pawn on an adjacent file.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  for (var y = 0 ; y < 8; y++) {\n    if (board(pos, square.x - 1, y) == \"P\") return 0;\n    if (board(pos, square.x + 1, y) == \"P\") return 0;\n  }\n  return 1;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Isolated_pawn", "Isolated pawn"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "14.8",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a7b374d0ebc5902971a9a58"
        }
    });
    data.push(
    {
        "name": "Opposed",
        "group": "Pawns",
        "text": "<b>$</b> flag is set if there is opponent opposing pawn on the same file to prevent it from advancing.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  for (var y = 0; y < square.y; y++) {\n    if (board(pos, square.x, y) == \"p\") return 1;\n  }\n  return 0;\n}",
        "links": [
            ["https://www.chessprogramming.org/Evaluation", "Evaluation"],
            ["https://www.chessprogramming.org/Tapered_Eval", "Tapered Eval"],
            ["https://www.chessprogramming.org/Game_Phases", "Game Phases"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Rank",
        "group": "Helpers",
        "text": "<b>$</b> calculates rank of square.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  return 8 - square.y;\n}",
        "links": [],
        "eval": true,
        "squares": 2,
        "highlight": 0,
        "forwhite": true
    });
    data.push(
    {
        "name": "File",
        "group": "Helpers",
        "text": "<b>$</b> calculates file of square.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  return 1 + square.x;\n}",
        "links": [],
        "eval": true,
        "squares": 2,
        "highlight": 0,
        "forwhite": true
    });
    data.push(
    {
        "name": "Phalanx",
        "group": "Pawns",
        "text": "<b>$</b> flag is set if there is friendly pawn on adjacent file and same rank.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  if (board(pos, square.x - 1, square.y) == \"P\") return 1;\n  if (board(pos, square.x + 1, square.y) == \"P\") return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Supported",
        "group": "Pawns",
        "text": "<b>$</b> counts number of pawns supporting this pawn.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  return (board(pos, square.x - 1, square.y + 1) == \"P\" ? 1 : 0)\n       + (board(pos, square.x + 1, square.y + 1) == \"P\" ? 1 : 0);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Backward",
        "group": "Pawns",
        "text": "A pawn is <b>$</b> when it is behind all pawns of the same color on the adjacent files and cannot be safely advanced.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  for (var y = square.y; y < 8; y++) {\n    if (board(pos, square.x - 1, y) == \"P\"\n     || board(pos, square.x + 1, y) == \"P\") return 0;\n  }\n  if ($isolated(pos, square)) return 0;\n  if (board(pos, square.x - 1, square.y - 2) == \"p\"\n   || board(pos, square.x + 1, square.y - 2) == \"p\"\n   || board(pos, square.x    , square.y - 1) == \"p\") return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Doubled",
        "group": "Pawns",
        "text": "<b>$</b> checks if pawn is doubled. In chess, an doubled pawn is a pawn which has another friendly pawn on same file but in Stockfish we attach doubled pawn penalty only for pawn which has another friendly pawn on square directly behind that pawn and is not supported.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  if (board(pos, square.x, square.y + 1) != \"P\") return 0;\n  if (board(pos, square.x - 1, square.y + 1) == \"P\") return 0;\n  if (board(pos, square.x + 1, square.y + 1) == \"P\") return 0;\n  return 1;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Doubled_pawn", "Doubled pawn"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "2.25",
            "error": "2.9",
            "link": "http://tests.stockfishchess.org/tests/view/5acf80740ebc59547e5380fe"
        }
    });
    data.push(
    {
        "name": "Connected",
        "group": "Pawns",
        "text": "<b>$</b> checks if pawn is [[Supported]] or [[Phalanx]].",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($supported(pos, square) || $phalanx(pos, square)) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "29.34",
            "error": "4.4",
            "link": "http://tests.stockfishchess.org/tests/view/5a7a1ab60ebc5902971a99ed"
        }
    });
    data.push(
    {
        "name": "Middle game evaluation",
        "group": "",
        "text": "<b>$</b>. Evaluates position for the middlegame and the opening phases.",
        "code": "function $$(pos) {\n  var v = 0;\n  v += $piece_value_mg(pos) - $piece_value_mg(colorflip(pos));\n  v += $psqt_mg(pos) - $psqt_mg(colorflip(pos));\n  v += $imbalance_total(pos);\n  v += $pawns_mg(pos) - $pawns_mg(colorflip(pos));\n  v += $pieces_mg(pos) - $pieces_mg(colorflip(pos));\n  v += $mobility_mg(pos) - $mobility_mg(colorflip(pos));\n  v += $threats_mg(pos) - $threats_mg(colorflip(pos));\n  v += $passed_mg(pos) - $passed_mg(colorflip(pos));\n  v += $space(pos) - $space(colorflip(pos));\n  v += $king_mg(pos) - $king_mg(colorflip(pos));\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false
    });
    data.push(
    {
        "name": "End game evaluation",
        "group": "",
        "text": "<b>$</b>. Evaluates position for the endgame phase.",
        "code": "function $$(pos, noinitiative) {\n  var v = 0;\n  v += $piece_value_eg(pos) - $piece_value_eg(colorflip(pos));\n  v += $psqt_eg(pos) - $psqt_eg(colorflip(pos));\n  v += $imbalance_total(pos);\n  v += $pawns_eg(pos) - $pawns_eg(colorflip(pos));\n  v += $pieces_eg(pos) - $pieces_eg(colorflip(pos));\n  v += $mobility_eg(pos) - $mobility_eg(colorflip(pos));\n  v += $threats_eg(pos) - $threats_eg(colorflip(pos));\n  v += $passed_eg(pos) - $passed_eg(colorflip(pos));\n  v += $king_eg(pos) - $king_eg(colorflip(pos));\n  if (!noinitiative) v += $initiative_total(pos, v);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": false
    });
    data.push(
    {
        "name": "Scale factor",
        "group": "",
        "text": "<b>$</b>. The scale factors are used to scale the endgame evaluation score down.",
        "code": "function $$(pos, eg) {\n  if (eg == null) eg = $end_game_evaluation(pos);\n  var pos_w = eg > 0 ? pos : colorflip(pos);\n  var pos_b = eg > 0 ? colorflip(pos) : pos;\n  var sf = 64;\n  var pc_w = $pawn_count(pos_w);\n  var pc_b = $pawn_count(pos_b);\n  var npm_w = $non_pawn_material(pos_w);\n  var npm_b = $non_pawn_material(pos_b);\n  var bishopValueMg = 830, bishopValueEg = 918, rookValueMg = 1289;\n  if (pc_w == 0 && npm_w - npm_b <= bishopValueMg) sf = npm_w < rookValueMg ? 0 : npm_b <= bishopValueMg ? 4 : 14;\n  if (sf == 64) {\n    var ob = $opposite_bishops(pos);\n    if (ob && npm_w == bishopValueMg && npm_b == bishopValueMg) {\n      sf = 16 + 4 * ($candidate_passed(pos) + $candidate_passed(colorflip(pos)));\n    } else {\n      sf = Math.min(40 + (ob ? 2 : 7) * pc_w, sf);\n    }\n  }\n  return sf;\n}",
        "links": [
            ["https://www.chessprogramming.org/Bishops_of_Opposite_Colors", "Bishops of Opposite Colors in cpw"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Phase",
        "group": "",
        "text": "<b>$</b>. We define phase value for tapered eval based on the amount of non-pawn material on the board.",
        "code": "function $$(pos) {\n  var midgameLimit = 15258, endgameLimit  = 3915;\n  var npm = $non_pawn_material(pos) + $non_pawn_material(colorflip(pos));\n  npm = Math.max(endgameLimit, Math.min(npm, midgameLimit));\n  return (((npm - endgameLimit) * 128) / (midgameLimit - endgameLimit)) << 0;\n}",
        "links": [
            ["https://www.chessprogramming.org/Game_Phases", "Game Phases in cpw"],
            ["https://www.chessprogramming.org/Tapered_Eval", "Tapered Eval in cpw"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false
    });
    data.push(
    {
        "name": "Imbalance",
        "group": "Imbalance",
        "text": "<b>$</b> calculates the imbalance by comparing the piece count of each piece type for both colors. Evaluate the material imbalance. We use a place holder for the bishop pair \"extended piece\", which allows us to be more flexible in defining bishop pair bonuses.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var qo = [[0],[40,38],[32,255,-62],[0,104,4,0],[-26,-2,47,105,-208],[-189,24,117,133,-134,-6]];\n  var qt = [[0],[36,0],[9,63,0],[59,65,42,0],[46,39,24,-24,0],[97,100,-42,137,268,0]];\n  var j = \"XPNBRQxpnbrq\".indexOf(board(pos, square.x, square.y));\n  if (j < 0 || j > 5) return 0;\n  var bishop = [0, 0], v = 0;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      var i = \"XPNBRQxpnbrq\".indexOf(board(pos, x, y));\n      if (i < 0) continue;\n      if (i == 9) bishop[0]++;\n      if (i == 3) bishop[1]++;\n      if (i % 6 > j) continue;\n      if (i > 5) v += qt[j][i-6];\n            else v += qo[j][i];\n    }\n  }\n  if (bishop[0] > 1) v += qt[j][0];\n  if (bishop[1] > 1) v += qo[j][0];\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Bishop count",
        "group": "Helpers",
        "text": "<b>$</b> counts number of our bishops.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) == \"B\") return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true
    });
    data.push(
    {
        "name": "Bishop pair",
        "group": "Imbalance",
        "text": "<b>$</b>. The player with two bishops is said to have the bishop pair.",
        "code": "function $$(pos, square) {\n  if ($bishop_count(pos) < 2) return 0;\n  if (square == null) return 1438;\n  return board(pos, square.x, square.y) == \"B\" ? 1 : 0;\n}",
        "links": [
            ["https://www.chessprogramming.org/Bishop_Pair", "Bishop Pair on cpw"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Pinned direction",
        "group": "Attack",
        "text": "<b>$</b>. Helper function for detecting blockers for king. For our pinned pieces result is positive for enemy blockers negative and value encodes direction of pin. 1 - horizontal, 2 - topleft to bottomright, 3 - vertical, 4 - topright to bottomleft",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"PNBRQK\".indexOf(board(pos, square.x, square.y).toUpperCase()) < 0) return 0;\n  var color = 1;\n  if (\"PNBRQK\".indexOf(board(pos, square.x, square.y)) < 0) color = -1;\n  for (var i = 0; i < 8; i++) {\n    var ix = (i + (i > 3)) % 3 - 1;\n    var iy = (((i + (i > 3)) / 3) << 0) - 1;\n    var king = false;\n    for (var d = 1; d < 8; d++) {\n      var b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"K\") king = true;\n      if (b != \"-\") break;\n    }\n    if (king) {\n      for (var d = 1; d < 8; d++) {\n        var b = board(pos, square.x - d * ix, square.y - d * iy);\n        if (b == \"q\"\n         || b == \"b\" && ix * iy != 0\n         || b == \"r\" && ix * iy == 0) return Math.abs(ix + iy * 3) * color;\n        if (b != \"-\") break;\n      }\n    }\n  }\n  return 0;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Pin_(chess)", "Pin in wikipedia"],
            ["https://www.chessprogramming.org/Pin", "Pin in cpw"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Mobility",
        "group": "Mobility",
        "text": "<b>$</b>. Number of attacked squares in the [[Mobility area]]. For queen squares defended by opponent knight, bishop or rook are ignored. For minor pieces squares occupied by our  queen are ignored.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;  \n  var b = board(pos, square.x, square.y);\n  if (\"NBRQ\".indexOf(b) < 0) return 0;\n  for (var x = 0; x < 8; x++) {\n    for(var y = 0; y < 8; y++) {\n      var s2 = {x:x, y:y};\n      if (!$mobility_area(pos, s2)) continue;\n      if (b == \"N\" && $knight_attack(pos, s2, square) && board(pos, x, y) != 'Q') v++;\n      if (b == \"B\" && $bishop_xray_attack(pos, s2, square) && board(pos, x, y) != 'Q') v++;\n      if (b == \"R\" && $rook_xray_attack(pos, s2, square)) v++;\n      if (b == \"Q\" && $queen_attack(pos, s2, square)) v++;\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Mobility area",
        "group": "Mobility",
        "text": "<b>$</b>. Do not include in mobility area squares protected by enemy pawns, or occupied by our blocked pawns or king. Pawns blocked or on ranks 2 and 3 will be excluded from the mobility area.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) == \"K\") return 0;\n  if (board(pos, square.x, square.y) == \"Q\") return 0;\n  if (board(pos, square.x - 1, square.y - 1) == \"p\") return 0;\n  if (board(pos, square.x + 1, square.y - 1) == \"p\") return 0;\n  if (board(pos, square.x, square.y) == \"P\" &&\n     ($rank(pos, square) < 4 || board(pos, square.x, square.y - 1) != \"-\")) return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Mobility bonus",
        "group": "Mobility",
        "text": "<b>$</b> attach bonuses for middlegame and endgame by piece type and [[Mobility]].",
        "code": "function $$(pos, square, mg) {\n  if (square == null) return sum(pos, $$, mg);\n  var bonus = mg ? [\n    [-62,-53,-12,-4,3,13,22,28,33],\n    [-48,-20,16,26,38,51,55,63,63,68,81,81,91,98],\n    [-58,-27,-15,-10,-5,-2,9,16,30,29,32,38,46,48,58],\n    [-39,-21,3,3,14,22,28,41,43,48,56,60,60,66,67,70,71,73,79,88,88,99,102,102,106,109,113,116]\n  ] : [\n    [-81,-56,-30,-14,8,15,23,27,33],\n    [-59,-23,-3,13,24,42,54,57,65,73,78,86,88,97],\n    [-76,-18,28,55,69,82,112,118,132,142,155,165,166,169,171],\n    [-36,-15,8,18,34,54,61,73,79,92,94,104,113,120,123,126,133,136,140,143,148,166,170,175,184,191,206,212]\n  ];\n  var i = \"NBRQ\".indexOf(board(pos, square.x, square.y));\n  if (i < 0) return 0;\n  return bonus[i][$mobility(pos, square)];\n}",
        "links": [],
        "eval": false,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Knight attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by knight.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  for (var i = 0; i < 8; i++) {\n    var ix = ((i > 3) + 1) * (((i % 4) > 1) * 2 - 1);\n    var iy = (2 - (i > 3)) * ((i % 2 == 0) * 2 - 1);\n    var b = board(pos, square.x + ix, square.y + iy);\n    if (b == \"N\"\n    && (s2 == null || s2.x == square.x + ix && s2.y == square.y + iy)\n    && !$pinned(pos, {x:square.x + ix, y:square.y + iy})) v++;\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Bishop xray attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by bishop. Includes x-ray attack through queens.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  for (var i = 0; i < 4; i++) {\n    var ix = ((i > 1) * 2 - 1);\n    var iy = ((i % 2 == 0) * 2 - 1);\n    for (var d = 1; d < 8; d++) {\n      var b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"B\"\n      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {\n        var dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});\n        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;\n      }\n      if (b != \"-\" && b != \"Q\" && b != \"q\") break;\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Rook xray attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by rook. Includes x-ray attack through queens and our rook.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  for (var i = 0; i < 4; i++) {\n    var ix = (i == 0 ? -1 : i == 1 ? 1 : 0);\n    var iy = (i == 2 ? -1 : i == 3 ? 1 : 0);\n    for (var d = 1; d < 8; d++) {\n      var b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"R\"\n      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {\n        var dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});\n        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;\n      }\n      if (b != \"-\" && b != \"R\" && b != \"Q\" && b != \"q\") break;\n    }\n  }\n\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Queen attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by queen.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  for (var i = 0; i < 8; i++) {\n    var ix = (i + (i > 3)) % 3 - 1;\n    var iy = (((i + (i > 3)) / 3) << 0) - 1;\n    for (var d = 1; d < 8; d++) {\n      var b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"Q\"\n      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {\n        var dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});\n        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;\n      }\n      if (b != \"-\") break;\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Outpost",
        "group": "Pieces",
        "text": "<b>$</b>. Outpost for knight or bishop.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"N\"\n   && board(pos, square.x, square.y) != \"B\") return 0;\n  if (!$outpost_square(pos, square)) return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Outpost square",
        "group": "Pieces",
        "text": "<b>$</b>. Outpost squares for knight or bishop.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($rank(pos, square) < 4 || $rank(pos, square) > 6) return 0;\n  if (board(pos, square.x - 1, square.y + 1) != \"P\"\n   && board(pos, square.x + 1, square.y + 1) != \"P\") return 0;\n  for (var y = 0; y < square.y; y++) {\n    if (board(pos, square.x - 1, y) == \"p\") return 0;\n    if (board(pos, square.x + 1, y) == \"p\") return 0;\n  }\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Reachable outpost",
        "group": "Pieces",
        "text": "<b>$</b>. Knights and bishops which can reach an outpost square in one move.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"B\"\n   && board(pos, square.x, square.y) != \"N\") return 0;\n  var v = 0;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 2; y < 5; y++) {\n      if ((board(pos, square.x, square.y) == \"N\"\n        && \"PNBRQK\".indexOf(board(pos, x, y)) < 0\n        && $knight_attack(pos, {x:x,y:y}, square)\n        && $outpost_square(pos, {x:x,y:y}))\n       || (board(pos, square.x, square.y) == \"B\"\n        && \"PNBRQK\".indexOf(board(pos, x, y)) < 0\n        && $bishop_xray_attack(pos, {x:x,y:y}, square)\n        && $outpost_square(pos, {x:x,y:y}))) {\n        var support = board(pos, x - 1, y + 1) == \"P\" || board(pos, x + 1, y + 1) == \"P\" ? 2 : 1;\n        v = Math.max(v, support);\n      }\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Minor behind pawn",
        "group": "Pieces",
        "text": "<b>$</b>. Knight or bishop when behind a pawn.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"B\"\n   && board(pos, square.x, square.y) != \"N\") return 0;\n  if (board(pos, square.x, square.y - 1).toUpperCase() != \"P\") return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "-0.35",
            "error": "4.5",
            "link": "http://tests.stockfishchess.org/tests/view/5a723b850ebc590f2c86e9e5"
        }
    });
    data.push(
    {
        "name": "Bishop pawns",
        "group": "Pieces",
        "text": "<b>$</b>. Number of pawns on the same color square as the bishop multiplied by one plus the number of our blocked pawns in the center files C, D, E or F.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"B\") return 0;\n  var c = (square.x + square.y) % 2, v = 0;\n  var blocked = 0;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"P\" && c == (x + y) % 2) v++;\n      if (board(pos, x, y) == \"P\"\n       && x > 1 && x < 6\n       && board(pos, x, y - 1) != \"-\") blocked++;\n    }\n  }\n  return v * (blocked + 1);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "10.57",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a7262390ebc590f2c86e9fc"
        }
    });
    data.push(
    {
        "name": "Rook on pawn",
        "group": "Pieces",
        "text": "<b>$</b>. Rook aligned with enemy pawns on the same rank/file.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"R\") return 0;\n  if ($rank(pos, square) < 5) return 0;\n  var v = 0;  \n  for (var x = 0; x < 8; x++) {\n    if (board(pos, x, square.y) == \"p\") v++;\n  }\n  for (var y = 0; y < 8; y++) {\n    if (board(pos, square.x, y) == \"p\") v++;\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "2.61",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a73024b0ebc5902971a9658"
        }
    });
    data.push(
    {
        "name": "Rook on file",
        "group": "Pieces",
        "text": "<b>$</b>. Rook when on an open or semi-open file.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"R\") return 0;\n  var open = 1;\n  for (var y = 0; y < 8; y++) {\n    if (board(pos, square.x, y) == \"P\") return 0;\n    if (board(pos, square.x, y) == \"p\") open = 0;\n  }\n  return open + 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "13.59",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a78c23c0ebc5902971a991b"
        }
    });
    data.push(
    {
        "name": "Trapped rook",
        "group": "Pieces",
        "text": "<b>$</b>. Penalize rook when trapped by the king, even more if the king cannot castle.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"R\") return 0;\n  if ($rook_on_file(pos, square)) return 0;\n  if ($mobility(pos, square)> 3) return 0;\n  var kx = 0, ky = 0;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"K\") { kx = x; ky = y; }\n    }\n  }\n  if ((kx < 4) != (square.x < kx)) return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "2.92",
            "error": "3.7",
            "link": "http://tests.stockfishchess.org/tests/view/5a876e560ebc590297cc82d9"
        }
    });
    data.push(
    {
        "name": "Weak queen",
        "group": "Pieces",
        "text": "<b>$</b>. Penalty if any relative pin or discovered attack against the queen.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"Q\") return 0;\n  for (var i = 0; i < 8; i++) {\n    var ix = (i + (i > 3)) % 3 - 1;\n    var iy = (((i + (i > 3)) / 3) << 0) - 1;\n    var count = 0;\n    for (var d = 1; d < 8; d++) {\n      var b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"r\" && (ix == 0 || iy == 0) && count == 1) return 1;\n      if (b == \"b\" && (ix != 0 && iy != 0) && count == 1) return 1;\n      if (b != \"-\") count++;\n    }\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "6.36",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a73900b0ebc5902971a96a8"
        }
    });
    data.push(
    {
        "name": "Space area",
        "group": "Space",
        "text": "<b>$</b>. Number of safe squares available for minor pieces on the central four files on ranks 2 to 4. Safe squares one, two or three squares behind a friendly pawn are counted twice.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  var rank = $rank(pos, square);\n  var file = $file(pos, square);\n  if ((rank >= 2 && rank <= 4 && file >= 3 && file <= 6)\n   && (board(pos, square.x ,square.y) != \"P\")\n   && (board(pos, square.x - 1 ,square.y - 1) != \"p\")\n   && (board(pos, square.x + 1 ,square.y - 1) != \"p\")) {\n    v++;\n    if (board(pos, square.x, square.y - 1) == \"P\"\n     || board(pos, square.x, square.y - 2) == \"P\"\n     || board(pos, square.x, square.y - 3) == \"P\") v++;\n  }   \n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Pawn attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by pawn. Pins or en-passant attacks are not considered here.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  if (board(pos, square.x - 1, square.y + 1) == \"P\") v++;\n  if (board(pos, square.x + 1, square.y + 1) == \"P\") v++;\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "King attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  for (var i = 0; i < 8; i++) {\n    var ix = (i + (i > 3)) % 3 - 1;\n    var iy = (((i + (i > 3)) / 3) << 0) - 1;\n    if (board(pos, square.x + ix, square.y + iy) == \"K\") return 1;\n  }\n  \n \n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true
    });
    data.push(
    {
        "name": "Attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by all pieces. For bishop and rook x-ray attacks are included. For pawns pins or en-passant are ignored.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  v += $pawn_attack(pos, square);\n  v += $king_attack(pos, square);\n  v += $knight_attack(pos, square);\n  v += $bishop_xray_attack(pos, square);\n  v += $rook_xray_attack(pos, square);\n  v += $queen_attack(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true
    });
    data.push(
    {
        "name": "Non pawn material",
        "group": "Material",
        "text": "<b>$</b>. Middlegame value of non-pawn material.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var i = \"NBRQ\".indexOf(board(pos, square.x, square.y));\n  if (i >= 0) return $piece_value_bonus(pos, square, true);\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Safe pawn",
        "group": "Threats",
        "text": "<b>$</b>. Check if our pawn is not attacked or is defended.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  if ($attack(pos, square)) return 1;\n  if (!$attack(colorflip(pos), {x:square.x,y:7-square.y})) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true
    });
    data.push(
    {
        "name": "Threat safe pawn",
        "group": "Threats",
        "text": "<b>$</b>. Non-pawn enemies attacked by a [[Safe pawn]].",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"nbrq\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  if (!$pawn_attack(pos, square)) return 0;\n  if ($safe_pawn(pos, {x:square.x - 1, y:square.y + 1})\n   || $safe_pawn(pos, {x:square.x + 1, y:square.y + 1})) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": 14.95,
            "error": 4.6,
            "link": "http://tests.stockfishchess.org/tests/view/5a74bb6f0ebc5902971a9701"
        }
    });
    data.push(
    {
        "name": "Weak enemies",
        "group": "Threats",
        "text": "<b>$</b>. Enemies not defended by a pawn and under our attack.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"pnbrqk\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  if (board(pos, square.x - 1, square.y - 1) == \"p\") return 0;\n  if (board(pos, square.x + 1, square.y - 1) == \"p\") return 0;\n  if (!$attack(pos, square)) return 0;\n  if ($attack(pos, square) <= 1\n   && $attack(colorflip(pos),{x:square.x,y:7-square.y}) > 1) return 0\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Minor threat",
        "group": "Threats",
        "text": "<b>$</b>. Threat type for knight and bishop attacking pieces.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var type = \"pnbrqk\".indexOf(board(pos, square.x, square.y));\n  if (type < 0) return 0;\n  if (!$knight_attack(pos, square) && !$bishop_xray_attack(pos, square)) return 0;\n  if ((board(pos, square.x, square.y) == \"p\"\n       || !(board(pos, square.x - 1, square.y - 1) == \"p\"\n         || board(pos, square.x + 1, square.y - 1) == \"p\"\n         || ($attack(pos, square) <= 1 && $attack(colorflip(pos),{x:square.x,y:7-square.y}) > 1)))\n    && !$weak_enemies(pos, square)) return 0;\n  return type + 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true
    });
    data.push(
    {
        "name": "Rook threat",
        "group": "Threats",
        "text": "<b>$</b>. Threat type for attacked by rook pieces.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var type = \"pnbrqk\".indexOf(board(pos, square.x, square.y));\n  if (type < 0) return 0;\n  if (!$weak_enemies(pos, square)) return 0;\n  if (!$rook_xray_attack(pos, square)) return 0;\n  return type + 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "10.98",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a7a14000ebc5902971a99e6"
        }
    });
    data.push(
    {
        "name": "Hanging",
        "group": "Threats",
        "text": "<b>$</b>. [[Weak enemies]] not defended by opponent or non-pawn [[weak enemies]] attacked twice.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$weak_enemies(pos, square)) return 0;\n  if (board(pos, square.x, square.y) != \"p\" && $attack(pos, square) > 1) return 1;\n  if (!$attack(colorflip(pos), {x:square.x,y:7-square.y})) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "2.78",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a74c1ef0ebc5902971a9707"
        }
    });
    data.push(
    {
        "name": "King threat",
        "group": "Threats",
        "text": "<b>$</b>. Threat by king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"pnbrq\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  if (!$weak_enemies(pos, square)) return 0;\n  if (!$king_attack(pos, square)) return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "4.69",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a7a4dea0ebc5902971a99ff"
        }
    });
    data.push(
    {
        "name": "Pawn push threat",
        "group": "Threats",
        "text": "<b>$</b>. Bonus if some pawns can safely push and attack an enemy piece.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"pnbrqk\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  for (var ix = -1; ix <= 1; ix += 2) {\n    if (board(pos, square.x + ix, square.y + 2) == \"P\"\n     && board(pos, square.x + ix, square.y + 1) == \"-\"\n     && board(pos, square.x + ix - 1, square.y) != \"p\"\n     && board(pos, square.x + ix + 1, square.y) != \"p\"\n     && ($attack(pos, {x:square.x+ix,y:square.y+1})\n         || !$attack(colorflip(pos),{x:square.x+ix,y:6-square.y}))\n     ) return 1;\n\n    if (square.y == 3\n     && board(pos, square.x + ix, square.y + 3) == \"P\"\n     && board(pos, square.x + ix, square.y + 2) == \"-\"\n     && board(pos, square.x + ix, square.y + 1) == \"-\"\n     && board(pos, square.x + ix - 1, square.y) != \"p\"\n     && board(pos, square.x + ix + 1, square.y) != \"p\"\n     && ($attack(pos, {x:square.x+ix,y:square.y+1})\n         || !$attack(colorflip(pos),{x:square.x+ix,y:6-square.y}))\n     ) return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "7.89",
            "error": "4.5",
            "link": "http://tests.stockfishchess.org/tests/view/5a74f1300ebc5902971a9717"
        }
    });
    data.push(
    {
        "name": "Rank threat",
        "group": "Threats",
        "text": "<b>$</b>. Threat bonus depending on rank only applied if multiple threats from minors or rooks are present.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  return (($minor_threat(pos, square) > 1)\n        + ($rook_threat(pos, square) > 1)\n  ) * square.y;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "1.56",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a74bd040ebc5902971a9703"
        }
    });
    data.push(
    {
        "name": "Passed square",
        "group": "Passed pawns",
        "text": "<b>$</b> checks if you put own pawn on square it is passed. Pawn is passed if there are no opposing pawns in front of it on the same file nor on an adjacent file.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  for (var y = 0 ; y < square.y; y++) {\n    if (board(pos, square.x - 1, y) == \"p\") return 0;\n    if (board(pos, square.x    , y) == \"p\") return 0;\n    if (board(pos, square.x + 1, y) == \"p\") return 0;\n    if (board(pos, square.x    , y) == \"P\") return 0;\n  }\n  return 1;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Passed_pawn", "Passed pawn"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Candidate passed",
        "group": "Passed pawns",
        "text": "<b>$</b> checks if pawn is passed or candidate passer. Pawn is passed if there are no opposing pawns in front of it on the same file nor on an adjacent file. Include also not passed pawns which could become passed after one or two pawn pushes when are not attacked more times than defended.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  var ty1 = 8, ty2 = 8, oy = 8;\n  for (var y = square.y - 1; y >= 0; y--) {\n    if (board(pos, square.x    , y) == \"p\") ty1 = y;\n    if (board(pos, square.x - 1, y) == \"p\"\n     || board(pos, square.x + 1, y) == \"p\") ty2 = y;\n  }\n  if (ty1 == 8 && ty2 >= square.y - 1) return 1;\n  if (ty2 < square.y - 2 || ty1 < square.y - 1) return 0;\n  if (ty2 >= square.y && ty1 == square.y - 1 && square.y < 4) {\n    if (board(pos, square.x - 1, square.y + 1) == \"P\"\n     && board(pos, square.x - 1, square.y    ) != \"p\"\n     && board(pos, square.x - 2, square.y - 1) != \"p\") return 1;\n    if (board(pos, square.x + 1, square.y + 1) == \"P\"\n     && board(pos, square.x + 1, square.y    ) != \"p\"\n     && board(pos, square.x + 2, square.y - 1) != \"p\") return 1;\n  }\n  if (board(pos, square.x, square.y - 1) == \"p\") return 0;\n  var lever = (board(pos, square.x - 1, square.y - 1) == \"p\" ? 1 : 0)\n             + (board(pos, square.x + 1, square.y - 1) == \"p\" ? 1 : 0);\n  var leverpush = (board(pos, square.x - 1, square.y - 2) == \"p\" ? 1 : 0)\n                + (board(pos, square.x + 1, square.y - 2) == \"p\" ? 1 : 0);\n  var phalanx = (board(pos, square.x - 1, square.y) == \"P\" ? 1 : 0)\n              + (board(pos, square.x + 1, square.y) == \"P\" ? 1 : 0);\n  if (lever - $supported(pos, square) > 1) return 0;\n  if (leverpush - phalanx  > 0) return 0;\n  if (lever > 0 && leverpush > 0) return 0;\n  return 1;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Passed_pawn", "Passed pawn"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "King proximity",
        "group": "Passed pawns",
        "text": "<b>$</b> is endgame bonus based on the king's proximity. If block square is not the queening square then consider also a second push.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  var r = $rank(pos, square)-1;\n  var rr = r > 2 ? (r-2)*(r-2)+2 : 0;\n  var v = 0;\n  if (rr <= 0) return 0;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\") {\n        v += Math.min(Math.max(Math.abs(y - square.y + 1),\n                      Math.abs(x - square.x)),5) * 5 * rr;\n      }\n      if (board(pos, x, y) == \"K\") {\n        v -= Math.min(Math.max(Math.abs(y - square.y + 1),\n                      Math.abs(x - square.x)),5) * 2 * rr;\n        if (square.y > 1) {\n          v -= Math.min(Math.max(Math.abs(y - square.y + 2),\n                      Math.abs(x - square.x)),5) * rr;\n        }\n      }\n    }\n  }\n  return v;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Isolated_pawn", "Isolated pawn"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Passed block",
        "group": "Passed pawns",
        "text": "<b>$</b> adds bonus if passed pawn is free to advance. Bonus is adjusted based on attacked and defended status of block square and entire path in front of pawn.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  if ($rank(pos, square) < 4) return 0;\n  if (board(pos, square.x, square.y - 1) != \"-\") return 0;\n  var r = $rank(pos, square) - 1;\n  var rr = r > 2 ? (r-2)*(r-2)+2 : 0;\n  var pos2 = colorflip(pos);\n  var defended = 0, unsafe = 0, wunsafe = 0, defended1 = 0, unsafe1 = 0;\n  for (var y = square.y - 1; y >= 0; y--) {\n    if ($attack(pos, {x:square.x,y:y})) defended++;\n    if (\"pnbrqk\".indexOf(board(pos, square.x, y)) >= 0\n     || $attack(pos2, {x:square.x,y:7-y})) unsafe++;\n    if (\"pnbrqk\".indexOf(board(pos, square.x-1, y)) >= 0\n     || $attack(pos2, {x:square.x-1,y:7-y})) wunsafe++;\n    if (\"pnbrqk\".indexOf(board(pos, square.x+1, y)) >= 0\n     || $attack(pos2, {x:square.x+1,y:7-y})) wunsafe++;\n    if (y == square.y - 1) {\n      defended1 = defended;\n      unsafe1 = unsafe;\n    }\n  }\n  for (var y = square.y + 1; y < 8; y++) {\n    if (board(pos, square.x, y) == \"R\"\n     || board(pos, square.x, y) == \"Q\") defended1 = defended = square.y;\n    if (board(pos, square.x, y) == \"r\"\n     || board(pos, square.x, y) == \"q\") unsafe1 = unsafe = square.y;\n  }\n  var k = (unsafe == 0 && wunsafe == 0 ? 35 : unsafe == 0 ? 20 : unsafe1 == 0 ? 9 : 0)\n        + (defended1 != 0 ? 5 : 0);\n  return k * rr;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Isolated_pawn", "Isolated pawn"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Passed file",
        "group": "Passed pawns",
        "text": "<b>$</b> is a bonus according to the file of a passed pawn.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  var file = $file(pos, square);\n  return Math.min(file, 9 - file);\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Isolated_pawn", "Isolated pawn"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "4.08",
            "error": "4.1",
            "link": "http://tests.stockfishchess.org/tests/view/5a84ed040ebc590297cc8144"
        }
    });
    data.push(
    {
        "name": "Passed rank",
        "group": "Passed pawns",
        "text": "<b>$</b> is a bonus according to the rank of a passed pawn.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  return $rank(pos, square) - 1;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Isolated_pawn", "Isolated pawn"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "73.24",
            "error": "4.9",
            "link": "http://tests.stockfishchess.org/tests/view/5a84edbb0ebc590297cc8146"
        }
    });
    data.push(
    {
        "name": "Passed mg",
        "group": "Passed pawns",
        "text": "<b>$</b> middlegame bonuses for passed pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  var v = 0;\n  v += [0,5,12,10,57,163,271][$passed_rank(pos, square)];\n  v += $passed_block(pos, square);\n  if (!$passed_square(pos,{x:square.x,y:square.y-1})\n    || board(pos, square.x, square.y-1).toUpperCase() == \"P\") v = (v / 2) << 0;\n  v += [0,-1,0,-9,-30][$passed_file(pos, square)];\n  return v;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Isolated_pawn", "Isolated pawn"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Passed eg",
        "group": "Passed pawns",
        "text": "<b>$</b> endgame bonuses for passed pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  var v = 0;\n  v += $king_proximity(pos, square);\n  v += [0,18,23,31,62,167,250][$passed_rank(pos, square)];\n  v += $passed_block(pos, square);\n  if (!$passed_square(pos,{x:square.x,y:square.y-1})\n    || board(pos, square.x, square.y-1).toUpperCase() == \"P\") v = (v / 2) << 0;\n  v += [0,7,9,-8,-14][$passed_file(pos, square)];\n  return v;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Isolated_pawn", "Isolated pawn"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Pawnless flank",
        "group": "King",
        "text": "<b>$</b>. Penalty when our king is on a pawnless flank.",
        "code": "function $$(pos) {\n  var pawns=[0,0,0,0,0,0,0,0], kx = 0;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y).toUpperCase() == \"P\") pawns[x]++;\n      if (board(pos, x, y) == \"k\") kx = x;\n    }\n  }\n  var sum;\n  if (kx == 0) sum = pawns[0] + pawns[1] + pawns[2];\n  else if (kx < 3) sum = pawns[0] + pawns[1] + pawns[2] + pawns[3];\n  else if (kx < 5) sum = pawns[2] + pawns[3] + pawns[4] + pawns[5];\n  else if (kx < 7) sum = pawns[4] + pawns[5] + pawns[6] + pawns[7];\n  else  sum = pawns[5] + pawns[6] + pawns[7];\n  return sum == 0 ? 1 : 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "1.29",
            "error": "4.5",
            "link": "http://tests.stockfishchess.org/tests/view/5a73a7000ebc5902971a96b6"
        }
    });
    data.push(
    {
        "name": "Strength square",
        "group": "King",
        "text": "<b>$</b>. King shelter strength for each square on board.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var v = 5;\n  var kx = Math.min(6, Math.max(1, square.x));\n  var weakness =\n      [[-6,81,93,58,39,18,25],\n      [-43,61,35,-49,-29,-11,-63],\n      [-10,75,23,-2,32,3,-45],\n      [-39,-13,-29,-52,-48,-67,-166]];\n  for (var x = kx - 1; x <= kx +1; x++) {\n    var us = 0;\n    for (var y = 7; y >= square.y; y--) {\n      if (board(pos, x, y) == \"p\") us = y;\n    }\n    var f = Math.min(x, 7 - x);\n    v += weakness[f][us] || 0;\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Storm square",
        "group": "King",
        "text": "<b>$</b>. Enemy pawns storm for each square on board.",
        "code": "function $$(pos, square, eg) {\n  if (square == null) return sum(pos, $$);\n  var v = 0, ev = 0;\n  var kx = Math.min(6, Math.max(1, square.x));\n  var unblockedstorm = [\n    [89,107,123,93,57,45,51],\n    [44,-18,123,46,39,-7,23],\n    [4,52,162,37,7,-14,-2],\n    [-10,-14,90,15,2,-7,-16]];\n  for (var x = kx - 1; x <= kx +1; x++) {\n    var us = 0, them = 0;\n    for (var y = 7; y >= square.y; y--) {\n      if (board(pos, x, y) == \"p\") us = y;\n      if (board(pos, x, y) == \"P\") them = y;\n    }\n    var f = Math.min(x, 7 - x);\n    if (us > 0 && them == us + 1) {\n      v += 82 * (them == 2); ev += 82 * (them == 2);\n    }\n    else v += unblockedstorm[f][them];\n  }\n  if ((square.x == 0 || square.x == 7)\n   && (square.y == 0 || square.y == 1)\n   && board(pos, square.x, square.y + 1) == \"P\") v -= 369;\n  return eg ? ev : v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Shelter strength",
        "group": "King",
        "text": "<b>$</b>. King shelter bonus for king position. If we can castle use the penalty after the castling if ([[Shelter strength]] + [[Shelter storm]]) is smaller.",
        "code": "function $$(pos, square) {\n  var w = 0, s = 1024, tx = null;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\"\n       || pos.c[2] && x == 6 && y == 0\n       || pos.c[3] && x == 2 && y == 0) {\n        var w1 = $strength_square(pos, {x:x,y:y});\n        var s1 = $storm_square(pos, {x:x,y:y});\n        if (s1 - w1 < s - w) { w = w1; s = s1; tx=Math.max(1,Math.min(6,x)); }\n      }\n    }\n  }\n  if (square == null) return w;\n  if (tx != null && board(pos, square.x, square.y) == \"p\" && square.x >= tx-1 && square.x <= tx+1) {\n    for (var y = square.y-1; y >= 0; y--) if (board(pos, square.x, y) == \"p\") return 0;\n    return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Shelter storm",
        "group": "King",
        "text": "<b>$</b>. Shelter strom penalty for king position. If we can castle use the penalty after the castling if ([[Shelter weakness]] + [[Shelter storm]]) is smaller.",
        "code": "function $$(pos, square) {\n  var w = 0, s = 1024, tx = null;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\"\n       || pos.c[2] && x == 6 && y == 0\n       || pos.c[3] && x == 2 && y == 0) {\n        var w1 = $strength_square(pos, {x:x,y:y});\n        var s1 = $storm_square(pos, {x:x,y:y});\n        if (s1 - w1 < s - w) { w = w1; s = s1; tx=Math.max(1,Math.min(6,x)); }\n      }\n    }\n  }\n  if (square == null) return s;\n  if (tx != null && board(pos, square.x, square.y).toUpperCase() == \"P\" && square.x >= tx-1 && square.x <= tx+1) {\n    for (var y = square.y-1; y >= 0; y--) if (board(pos, square.x, y) == board(pos, square.x, square.y)) return 0;\n    return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "King danger",
        "group": "King",
        "text": "<b>$</b>. The initial value is based on the number and types of the enemy's attacking pieces, the number of attacked and undefended squares around our king and the quality of the pawn shelter.",
        "code": "function $$(pos) {\n  var count = $king_attackers_count(pos);\n  var weight = $king_attackers_weight(pos);\n  var kingattacks = $king_attacks(pos);\n  var weak = $weak_bonus(pos);\n  var pins_uchcks = $unsafe_checks(pos);\n  var tropism = $close_enemies(pos);\n  var noqueen = ($queen_count(pos) > 0 ? 0 : 1);\n  var v = count * weight\n        + 69 * kingattacks\n        + 185 * weak\n        - 100 * ($knight_defender(colorflip(pos)) > 0)\n        -  35 * ($bishop_defender(colorflip(pos)) > 0)\n        + 150 * pins_uchcks\n        + ((5 * tropism * tropism / 16) << 0)\n        - 873 * noqueen\n        - ((6 * ($shelter_strength(pos) - $shelter_storm(pos)) / 8) << 0)\n        + $mobility_mg(pos) - $mobility_mg(colorflip(pos))\n        - 7\n        + 780 * ($safe_check(pos, null, 3) > 0 ? 1 : 0)\n        + 1080 * ($safe_check(pos, null, 2) > 0 ? 1 : 0)\n        + 635 * ($safe_check(pos, null, 1) > 0 ? 1 : 0)\n        + 790 * ($safe_check(pos, null, 0) > 0 ? 1 : 0);\n  if (v > 100) return v;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "King pawn distance",
        "group": "King",
        "text": "<b>$</b>. Minimal distance of our king to our pawns.",
        "code": "function $$(pos, square) {\n  var v = 8, kx = 0, ky = 0, px = 0, py = 0;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"K\") {\n        kx = x;\n        ky = y;\n      }\n    }\n  }\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      var dist = Math.max(Math.abs(x-kx),Math.abs(y-ky));\n      if (board(pos, x, y) == \"P\" && dist < v) { px = x; py = y; v = dist; }\n    }\n  }\n  if (v < 8 && (square == null || square.x == px && square.y == py)) return v;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "3.71",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a7dacfd0ebc5902971a9bc3"
        }
    });
    data.push(
    {
        "name": "Close enemies",
        "group": "King",
        "text": "<b>$</b>. King tropism: firstly, find squares that opponent attacks in our king flank. Secondly, add the squares which are attacked twice in that flank.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (square.y > 4) return 0;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\") {\n        if (x == 0 && square.x > 2) return 0;\n        if (x < 3 && square.x > 3) return 0;\n        if (x >= 3 && x < 5 && (square.x < 2 || square.x > 5)) return 0;\n        if (x >= 5 && square.x < 4) return 0;\n        if (x == 7 && square.x < 5) return 0;\n      }\n    }\n  }\n  var a = $attack(pos, square);\n  if (!a) return 0;\n  return a > 1 ? 2 : 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "2.19",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a7399f10ebc5902971a96b3"
        }
    });
    data.push(
    {
        "name": "Check",
        "group": "King",
        "text": "<b>$</b>. Possible checks by knight, bishop, rook or queen. Defending queen is not considered as check blocker.",
        "code": "function $$(pos, square, type) {\n  if (square == null) return sum(pos, $$);\n  if ($rook_xray_attack(pos, square)\n  && (type == null || type == 2 || type == 4)\n   || $queen_attack(pos, square)\n  && (type == null || type == 3)) {\n    for (var i = 0; i < 4; i++) {\n      var ix = (i == 0 ? -1 : i == 1 ? 1 : 0);\n      var iy = (i == 2 ? -1 : i == 3 ? 1 : 0);\n      for (var d = 1; d < 8; d++) {\n        var b = board(pos, square.x + d * ix, square.y + d * iy);\n        if (b == \"k\") return 1;\n        if (b != \"-\" && b != \"q\") break;\n      }\n    }\n  }\n  if ($bishop_xray_attack(pos, square)\n  && (type == null || type == 1 || type == 4)\n   || $queen_attack(pos, square)\n  && (type == null || type == 3)) {\n    for (var i = 0; i < 4; i++) {\n      var ix = ((i > 1) * 2 - 1);\n      var iy = ((i % 2 == 0) * 2 - 1);\n      for (var d = 1; d < 8; d++) {\n        var b = board(pos, square.x + d * ix, square.y + d * iy);\n        if (b == \"k\") return 1;\n        if (b != \"-\" && b != \"q\") break;\n      }\n    }\n  }\n  if ($knight_attack(pos, square)\n  && (type == null || type == 0 || type == 4)) {\n    if (board(pos, square.x + 2, square.y + 1) == \"k\"\n     || board(pos, square.x + 2, square.y - 1) == \"k\"\n     || board(pos, square.x + 1, square.y + 2) == \"k\"\n     || board(pos, square.x + 1, square.y - 2) == \"k\"\n     || board(pos, square.x - 2, square.y + 1) == \"k\"\n     || board(pos, square.x - 2, square.y - 1) == \"k\"\n     || board(pos, square.x - 1, square.y + 2) == \"k\"\n     || board(pos, square.x - 1, square.y - 2) == \"k\") return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Safe check",
        "group": "King",
        "text": "<b>$</b>. Analyse the safe enemy's checks which are possible on next move. Enemy queen safe checks: we count them only if they are from squares from which we can't give a rook check, because rook checks are more valuable. Enemy bishops checks: we count them only if they are from squares from which we can't give a queen check, because queen checks are more valuable.",
        "code": "function $$(pos, square, type) {\n  if (square == null) return sum(pos, $$, type);\n  if (\"PNBRQK\".indexOf(board(pos, square.x, square.y)) >= 0) return 0;\n  if (!$check(pos, square, type)) return 0;\n  var pos2 = colorflip(pos);\n  if (type == 3 && $safe_check(pos, square, 2)) return 0;\n  if (type == 1 && $safe_check(pos, square, 3)) return 0;\n  if ((!$attack(pos2, {x:square.x,y:7-square.y})\n    || ($weak_squares(pos, square) && $attack(pos, square) > 1))\n    && (type != 3 || !$queen_attack(pos2, {x:square.x,y:7-square.y}))) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Queen count",
        "group": "Helpers",
        "text": "<b>$</b> counts number of our queens.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) == \"Q\") return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true
    });
    data.push(
    {
        "name": "King attackers count",
        "group": "King",
        "text": "<b>$</b> is the number of pieces of the given color which attack a square in the kingRing of the enemy king. For pawns we count number of attacked squares in kingRing.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"PNBRQ\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  if (board(pos, square.x, square.y) == \"P\") {\n    var v = 0;\n    for (var dir = -1; dir <= 1; dir += 2) {\n      var fr = board(pos, square.x + dir * 2, square.y) == \"P\";\n      if (square.x + dir >= 0 && square.x + dir <= 7\n       && $king_ring(pos, {x:square.x+dir,y:square.y-1}, true)) v = v + (fr ? 0.5 : 1);\n    }\n    return v;\n  }\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      var s2 = {x:x,y:y};\n      if ($king_ring(pos, s2)) {\n        if ($knight_attack(pos, s2, square)\n         || $bishop_xray_attack(pos, s2, square)\n         || $rook_xray_attack(pos, s2, square)\n         || $queen_attack(pos, s2, square)) return 1;\n      }\n    }\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "King attackers weight",
        "group": "King",
        "text": "<b>$</b> is the sum of the \"weights\" of the pieces of the given color which attack a square in the kingRing of the enemy king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($king_attackers_count(pos, square)) {\n    return [0,77,55,44,10][\"PNBRQ\".indexOf(board(pos, square.x, square.y))];\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "King attacks",
        "group": "King",
        "text": "<b>$</b> is the number of attacks by the given color to squares directly adjacent to the enemy king. Pieces which attack more than one square are counted multiple times. For instance, if there is a white knight on g5 and black's king is on g8, this white knight adds 2.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"NBRQ\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  if ($king_attackers_count(pos, square) == 0) return 0;\n  var kx = 0, ky = 0, v = 0;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\") { kx = x; ky = y; }\n    }\n  }\n  for (var x = kx - 1; x <= kx + 1; x++) {\n    for (var y = ky - 1; y <= ky + 1; y++) {\n      var s2 = {x:x,y:y};\n      if (x >= 0 && y >= 0 && x <= 7 && y <= 7 && (x != kx || y != ky)) {\n        v += $knight_attack(pos, s2, square);\n        v += $bishop_xray_attack(pos, s2, square);\n        v += $rook_xray_attack(pos, s2, square);\n        v += $queen_attack(pos, s2, square);\n      }\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Weak bonus",
        "group": "King",
        "text": "<b>$</b>. Weak squares in king ring.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$weak_squares(pos, square)) return 0;\n  if (!$king_ring(pos, square)) return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Weak squares",
        "group": "King",
        "text": "<b>$</b>. Attacked squares defended at most once by our queen or king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($attack(pos, square)) {\n    var pos2 = colorflip(pos);\n    var attack = $attack(pos2, {x:square.x,y:7-square.y});\n    if (attack >= 2) return 0;\n    if (attack == 0) return 1;\n    if ($king_attack(pos2, {x:square.x,y:7-square.y})\n     || $queen_attack(pos2, {x:square.x,y:7-square.y})) return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Initiative",
        "group": "Initiative",
        "text": "<b>$</b> computes the initiative correction value for the position, i.e., second order bonus/malus based on the known attacking/defending status of the players.",
        "code": "function $$(pos, square) {\n  if (square != null) return 0;\n  var pawns = 0, kx = [0, 0], ky = [0, 0], flanks = [0, 0];\n  for (var x = 0; x < 8; x++) {\n    var open = [0, 0];\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y).toUpperCase() == \"P\" ) {\n        open[board(pos, x, y) == \"P\" ? 0 : 1] = 1;\n        pawns++\n      }\n      if (board(pos, x, y).toUpperCase() == \"K\" ) {\n        kx[board(pos, x, y) == \"K\" ? 0 : 1] = x;\n        ky[board(pos, x, y) == \"K\" ? 0 : 1] = y;\n      }\n    }\n    if (open[0] + open[1] > 0) flanks[x < 4 ? 0 : 1] = 1;\n  }\n  var pos2 = colorflip(pos);\n  var passedCount = $candidate_passed(pos) + $candidate_passed(pos2);\n  var bothFlanks = flanks[0] && flanks[1] ? 1 : 0;\n  var kingDistance = Math.abs(kx[0] - kx[1]) - Math.abs(ky[0] - ky[1]);\n  var purePawn = ($non_pawn_material(pos) + $non_pawn_material(pos2)) == 0 ? 1 : 0;\n  return 9 * passedCount + 11 * pawns + 9 * kingDistance + 18 * bothFlanks + 49 * purePawn - 103;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Unsafe checks",
        "group": "King",
        "text": "<b>$</b>. Unsafe checks or pinned opponent pieces.\n",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($pinned_direction(colorflip(pos), {x:square.x,y:7-square.y})) return 1;\n  if (!$mobility_area(pos, square)) return 0;\n  if ($check(pos, square, 0) && $safe_check(pos, null, 0) == 0) return 1;\n  if ($check(pos, square, 1) && $safe_check(pos, null, 1) == 0) return 1;\n  if ($check(pos, square, 2) && $safe_check(pos, null, 2) == 0) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Tempo",
        "group": "",
        "text": "<b>$</b>. In chess, tempo refers to a \"turn\" or single move. When a player achieves a desired result in one fewer move, the player \"gains a tempo\"; and conversely when a player takes one more move than necessary, the player \"loses a tempo\". We add small bonus for having the right to move.",
        "code": "function $$(pos, square) {\n  if (square != null) return 0;\n  return 28 * (pos.w ? 1 : -1);\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Tempo_(chess)", "Tempo (chess) in wikipedia"],
            ["https://www.chessprogramming.org/Tempo", "Tempo in cpw"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Pawn count",
        "group": "Helpers",
        "text": "<b>$</b> counts number of our pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) == \"P\") return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true
    });
    data.push(
    {
        "name": "Connected bonus",
        "group": "Pawns",
        "text": "<b>$</b> is bonus for connected pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$connected(pos, square)) return 0;\n  var seed = [0, 7, 8, 12, 29, 48, 86];\n  var op = $opposed(pos, square);\n  var ph = $phalanx(pos, square);\n  var su = $supported(pos, square);\n  var r = $rank(pos, square);\n  if (r < 2 || r > 7) return 0;\n  return ((seed[r - 1] * (ph ? 3 : 2) / (op ? 2 : 1)) >> 0) + 17 * su;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Mobility mg",
        "group": "Mobility",
        "text": "<b>$</b>. [[Mobility bonus]] for middlegame.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  return $mobility_bonus(pos, square, true);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true
    });
    data.push(
    {
        "name": "Mobility eg",
        "group": "Mobility",
        "text": "<b>$</b>. [[Mobility bonus]] for endgame.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  return $mobility_bonus(pos, square, false);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true
    });
    data.push(
    {
        "name": "Piece value bonus",
        "group": "Material",
        "text": "<b>$</b>. Material values for middlegame and engame.",
        "code": "function $$(pos, square, mg) {\n  if (square == null) return sum(pos, $$);\n  var a = mg ? [128, 782, 830, 1289, 2529]\n             : [213, 865, 918, 1378, 2687];\n  var i = \"PNBRQ\".indexOf(board(pos, square.x, square.y));\n  if (i >= 0) return a[i];\n  return 0;\n}",
        "links": [],
        "eval": false,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Psqt bonus",
        "group": "Material",
        "text": "<b>$</b>. Piece square table bonuses. For each piece type on a given square a (middlegame, endgame) score pair is assigned.",
        "code": "function $$(pos, square, mg) {\n  if (square == null) return sum(pos, $$, mg);\n  var bonus = mg ? [\n    [[-169,-96,-80,-79],[-79,-39,-24,-9],[-64,-20,4,19],[-28,5,41,47],[-29,13,42,52],[-11,28,63,55],[-67,-21,6,37],[-200,-80,-53,-32]],\n    [[-44,-4,-11,-28],[-18,7,14,3],[-8,24,-3,15],[1,8,26,37],[-7,30,23,28],[-17,4,-1,8],[-21,-19,10,-6],[-48,-3,-12,-25]],\n    [[-24,-13,-7,2],[-18,-10,-5,9],[-21,-7,3,-1],[-13,-5,-4,-6],[-24,-12,-1,6],[-24,-4,4,10],[-8,6,10,12],[-22,-24,-6,4]],\n    [[3,-5,-5,4],[-3,5,8,12],[-3,6,13,7],[4,5,9,8],[0,14,12,5],[-4,10,6,8],[-5,6,10,8],[-2,-2,1,-2]],\n    [[272,325,273,190],[277,305,241,183],[198,253,168,120],[169,191,136,108],[145,176,112,69],[122,159,85,36],[87,120,64,25],[64,87,49,0]]\n  ] : [\n    [[-105,-74,-46,-18],[-70,-56,-15,6],[-38,-33,-5,27],[-36,0,13,34],[-41,-20,4,35],[-51,-38,-17,19],[-64,-45,-37,16],[-98,-89,-53,-16]],\n    [[-63,-30,-35,-8],[-38,-13,-14,0],[-18,0,-7,13],[-26,-3,1,16],[-24,-6,-10,17],[-26,2,1,16],[-34,-18,-7,9],[-51,-40,-39,-20]],\n    [[-2,-6,-3,-2],[-10,-7,1,0],[10,-4,2,-2],[-5,2,-8,8],[-8,5,4,-9],[3,-2,-10,7],[1,2,17,-8],[12,-6,13,7]],\n    [[-69,-57,-47,-26],[-55,-31,-22,-4],[-39,-18,-9,3],[-23,-3,13,24],[-29,-6,9,21],[-38,-18,-12,1],[-50,-27,-24,-8],[-75,-52,-43,-36]],\n    [[0,41,80,93],[57,98,138,131],[86,138,165,173],[103,152,168,169],[98,166,197,194],[87,164,174,189],[40,99,128,141],[5,60,75,75]]\n  ];\n  var pbonus = mg ? \n    [[0,0,0,0,0,0,0,0],[0,-5,10,13,21,17,6,-3],[-11,-10,15,22,26,28,4,-24],[-9,-18,8,22,33,25,-4,-16],\n     [6,-3,-10,1,12,6,-12,1],[-6,-8,5,11,-14,0,-12,-14],[-10,6,-5,-11,-2,-14,12,-1],[0,0,0,0,0,0,0,0]]:\n    [[0,0,0,0,0,0,0,0],[-10,-3,7,-1,7,6,1,-20],[-6,-6,-1,-1,-1,2,-2,-5],[4,-5,-4,-5,-6,-13,-3,-7],\n     [18,2,2,-9,-13,-8,11,9],[25,17,19,29,29,8,4,12],[-1,-6,18,22,22,17,2,9],[0,0,0,0,0,0,0,0]];\n  var i = \"PNBRQK\".indexOf(board(pos, square.x, square.y));\n  if (i < 0) return 0;\n  if (i == 0) return pbonus[7 - square.y][square.x];\n  else return bonus[i-1][7 - square.y][Math.min(square.x, 7 - square.x)];\n}",
        "links": [],
        "eval": false,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Piece value mg",
        "group": "Material",
        "text": "<b>$</b>. Material - middlegame.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  return $piece_value_bonus(pos, square, true);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true
    });
    data.push(
    {
        "name": "Piece value eg",
        "group": "Material",
        "text": "<b>$</b>. Material - endgame.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  return $piece_value_bonus(pos, square, false);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true
    });
    data.push(
    {
        "name": "Psqt mg",
        "group": "Material",
        "text": "<b>$</b>. Piece square table bonuses - middlegame.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  return $psqt_bonus(pos, square, true);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true
    });
    data.push(
    {
        "name": "Psqt eg",
        "group": "Material",
        "text": "<b>$</b>. Piece square table bonuses - endgame.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  return $psqt_bonus(pos, square, false);\n}\n\n",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true
    });
    data.push(
    {
        "name": "Initiative total",
        "group": "Initiative",
        "text": "<b>$</b>. No description available.",
        "code": "function $$(pos, v) {\n  if (v == null) v = $end_game_evaluation(pos, true);\n  return (v > 0 ? 1 : v < 0 ? -1 : 0)\n         * Math.max($initiative(pos), -Math.abs(v));\n}",
        "links": [],
        "eval": false,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": false
    });
    data.push(
    {
        "name": "King protector",
        "group": "Pieces",
        "text": "<b>$</b> add penalties and bonuses for pieces, depending on the distance from the own king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"N\"\n   && board(pos, square.x, square.y) != \"B\") return 0;\n  return $king_distance(pos, square);\n}",
        "links": [],
        "eval": false,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "5.82",
            "error": "4.1",
            "link": "http://tests.stockfishchess.org/tests/view/5a7af24e0ebc5902971a9a3c"
        }
    });
    data.push(
    {
        "name": "Knight count",
        "group": "Helpers",
        "text": "<b>$</b> counts number of our knights.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) == \"N\") return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Imbalance total",
        "group": "Imbalance",
        "text": "<b>$</b>. Second-degree polynomial material imbalance by Tord Romstad.",
        "code": "function $$(pos, square) {\n  var v = 0;\n  v += $imbalance(pos) - $imbalance(colorflip(pos));\n  v += $bishop_pair(pos) - $bishop_pair(colorflip(pos));\n  return (v / 16) << 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": false
    });
    data.push(
    {
        "name": "Weak unopposed pawn",
        "group": "Pawns",
        "text": "<b>$</b>. Check if our pawn is weak and unopposed.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($opposed(pos, square)) return 0;\n  var v = 0;\n  if ($isolated(pos, square)) v++;\n  if ($backward(pos, square)) v++;\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "1.25",
            "error": "4.5",
            "link": "http://tests.stockfishchess.org/tests/view/5a74e8d40ebc5902971a9715"
        }
    });
    data.push(
    {
        "name": "Rook count",
        "group": "Helpers",
        "text": "<b>$</b> counts number of our rooks.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) == \"R\") return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Opposite bishops",
        "group": "Helpers",
        "text": "<b>$</b> determines if we have bishops of opposite colors.",
        "code": "function $$(pos) {\n  if ($bishop_count(pos) != 1) return 0;\n  if ($bishop_count(colorflip(pos)) != 1) return 0;\n  var color = [0, 0];\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"B\") color[0] = (x + y) % 2;\n      if (board(pos, x, y) == \"b\") color[1] = (x + y) % 2;\n    }\n  }\n  return color[0] == color[1] ? 0 : 1;\n}",
        "links": [
            ["https://www.chessprogramming.org/Bishops_of_Opposite_Colors", "Bishops of Opposite Colors in cpw"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": false
    });
    data.push(
    {
        "name": "King distance",
        "group": "Helpers",
        "text": "<b>$</b> counts distance to our king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"K\") {\n        return Math.max(Math.abs(x - square.x), Math.abs(y - square.y));\n      }\n    }\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Long diagonal bishop",
        "group": "Pieces",
        "text": "<b>$</b>. Bonus for bishop on a long diagonal which can \"see\" both center squares.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"B\") return 0;\n  if (square.x - square.y != 0 && square.x - (7 - square.y) != 0) return 0;\n  var x1 = square.x, y1 = square.y;\n  if (Math.min(x1,7-x1) > 2) return 0;\n  for (var i = Math.min(x1,7-x1); i < 4; i++) {\n    if (board(pos, x1, y1) == \"p\") return 0;\n    if (board(pos, x1, y1) == \"P\") return 0;\n    if (x1 < 4) x1++; else x1--;\n    if (y1 < 4) y1++; else y1--;\n  }\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "-1.15",
            "error": "2.9",
            "link": "http://tests.stockfishchess.org/tests/view/5a75acec0ebc5902971a975f"
        }
    });
    data.push(
    {
        "name": "Queen attack diagonal",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by queen only with diagonal direction.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  for (var i = 0; i < 8; i++) {\n    var ix = (i + (i > 3)) % 3 - 1;\n    var iy = (((i + (i > 3)) / 3) << 0) - 1;\n    if (ix == 0 || iy == 0) continue;\n    for (var d = 1; d < 8; d++) {\n      var b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"Q\"\n      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {\n        var dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});\n        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;\n      }\n      if (b != \"-\") break;\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "Pinned",
        "group": "Attack",
        "text": "<b>$</b>. In chess, absolute pin is a situation brought on by a sliding attacking piece in which a defending piece cannot move because moving away the pinned piece would illegally expose the king to check.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"PNBRQK\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  return $pinned_direction(pos, square) > 0 ? 1 : 0;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Pin_(chess)", "Pin in wikipedia"],
            ["https://www.chessprogramming.org/Pin", "Pin in cpw"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push(
    {
        "name": "King ring",
        "group": "Helpers",
        "text": "<b>$</b> is square occupied by king and 8 squares around king. Squares defended by two pawns are removed from king ring.",
        "code": "function $$(pos, square, full) {\n  if (square == null) return sum(pos, $$);\n  if (!full\n   && board(pos, square.x + 1, square.y - 1) == \"p\"\n   && board(pos, square.x - 1, square.y - 1) == \"p\") return 0;\n  for (var ix = -2; ix <= 2; ix++) {\n    for (var iy = -2; iy <= 1; iy++) {\n      if (board(pos, square.x + ix, square.y + iy) == \"k\"\n      && (iy >= -1 || square.y + iy == 0)\n      && (ix >= -1 && ix <= 1 || square.x + ix == 0 || square.x + ix == 7)) return 1;\n    }\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Slider on queen",
        "group": "Threats",
        "text": "<b>$</b>. Add a bonus for safe slider attack threats on opponent queen.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var pos2 = colorflip(pos);\n  if ($queen_count(pos2) != 1) return 0;\n  if (board(pos, square.x - 1, square.y - 1) == \"p\") return 0;\n  if (board(pos, square.x + 1, square.y - 1) == \"p\") return 0;\n  if ($attack(pos, square) <= 1) return 0;\n  if (!$mobility_area(pos, square)) return 0;\n  var diagonal = $queen_attack_diagonal(pos2, {x:square.x, y:7-square.y});\n  if (diagonal && $bishop_xray_attack(pos, square)) return 1;\n  if (!diagonal\n   && $rook_xray_attack(pos, square)\n   && $queen_attack(pos2, {x:square.x, y:7-square.y})) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true
    });
    data.push(
    {
        "name": "Knight on queen",
        "group": "Threats",
        "text": "<b>$</b>. Add a bonus for safe knight attack threats on opponent queen.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var pos2 = colorflip(pos);\n  var qx = -1, qy = -1;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"q\") {\n        if (qx >= 0 || qy >= 0) return 0;\n        qx = x;\n        qy = y;\n      }\n    }\n  }\n  if ($queen_count(pos2) != 1) return 0;\n  if (board(pos, square.x - 1, square.y - 1) == \"p\") return 0;\n  if (board(pos, square.x + 1, square.y - 1) == \"p\") return 0;\n  if ($attack(pos, square) <= 1 && $attack(pos2, {x:square.x, y:7-square.y}) > 1) return 0;\n  if (!$mobility_area(pos, square)) return 0;\n  if (!$knight_attack(pos, square)) return 0;\n  if (Math.abs(qx-square.x) == 2 && Math.abs(qy-square.y) == 1) return 1;\n  if (Math.abs(qx-square.x) == 1 && Math.abs(qy-square.y) == 2) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true
    });
    data.push(
    {
        "name": "Outpost total",
        "group": "Pieces",
        "text": "<b>$</b>. Middlegame and endgame bonuses for knights and bishops outposts, bigger if outpost piece is supported by a pawn.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"N\"\n   && board(pos, square.x, square.y) != \"B\") return 0;\n  var knight = board(pos, square.x, square.y) == \"N\";\n  var reachable = 0;\n  if (!$outpost(pos, square)) {\n    reachable = $reachable_outpost(pos, square);\n    if (!reachable) return 0;\n  }\n  return (knight ? 2 : 1) / (reachable ? 2 : 1);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo":
        {
            "value": "12.05",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a774a8b0ebc5902971a9877"
        }
    });
    data.push(
    {
        "name": "Pieces mg",
        "group": "Pieces",
        "text": "<b>$</b>. Middlegame bonuses and penalties to the pieces of a given color and type. Mobility not included here.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"NBRQ\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  var v = 0;\n  v += 36 * $outpost_total(pos, square);\n  v += 18 * $minor_behind_pawn(pos, square);\n  v -= 3 * $bishop_pawns(pos, square);\n  v += 10 * $rook_on_pawn(pos, square);\n  v += [0,18,44][$rook_on_file(pos, square)];\n  v -= $trapped_rook(pos, square) * 47 * (pos.c[0] || pos.c[1] ? 1 : 2);\n  v -= 49 * $weak_queen(pos, square);\n  v -= 7 * $king_protector(pos, square);\n  v += 45 * $long_diagonal_bishop(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Pieces eg",
        "group": "Pieces",
        "text": "<b>$</b>. Endgame bonuses and penalties to the pieces of a given color and type. Mobility not included here.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"NBRQ\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  var v = 0;\n  v += 12 * $outpost_total(pos, square);\n  v += 3 * $minor_behind_pawn(pos, square);\n  v -= 7 * $bishop_pawns(pos, square);\n  v += 32 * $rook_on_pawn(pos, square);\n  v += [0,7,20][$rook_on_file(pos, square)];\n  v -= $trapped_rook(pos, square) * 4 * (pos.c[0] || pos.c[1] ? 1 : 2);\n  v -= 15 * $weak_queen(pos, square);\n  v -= 8 * $king_protector(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Restricted",
        "group": "Threats",
        "text": "<b>$</b>. Bonus for restricting their piece moves.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($attack(pos, square) == 0) return 0;\n  var pos2 = colorflip(pos);\n  if (!$attack(pos2, {x:square.x,y:7-square.y})) return 0;\n  if ($pawn_attack(pos2, {x:square.x,y:7-square.y}) > 0) return 0;\n  if ($attack(pos2, {x:square.x,y:7-square.y}) > 1 && $attack(pos, square) == 1) return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Threats mg",
        "group": "Threats",
        "text": "<b>$</b>. Middlegame threats bonus.",
        "code": "function $$(pos) {\n  var v = 0;\n  v += 69 * $hanging(pos);\n  v += $king_threat(pos) > 0 ? 24 : 0;\n  v += 48 * $pawn_push_threat(pos);\n  v += 13 * $rank_threat(pos);\n  v += 173 * $threat_safe_pawn(pos);\n  v += 59 * $slider_on_queen(pos);\n  v += 16 * $knight_on_queen(pos);\n  v += 7 * $restricted(pos);\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      var s = {x:x,y:y};\n      v += [0,0,39,57,68,62,0][$minor_threat(pos, s)];\n      v += [0,0,38,38,0,51,0][$rook_threat(pos, s)];\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Threats eg",
        "group": "Threats",
        "text": "<b>$</b>. Endgame threats bonus.",
        "code": "function $$(pos) {\n  var v = 0;\n  v += 36 * $hanging(pos);\n  v += $king_threat(pos) > 0 ? 89 : 0;\n  v += 39 * $pawn_push_threat(pos);\n  v += 94 * $threat_safe_pawn(pos);\n  v += 18 * $slider_on_queen(pos);\n  v += 12 * $knight_on_queen(pos);\n  v += 7 * $restricted(pos);\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      var s = {x:x,y:y};\n      v += [0,31,42,44,112,120,0][$minor_threat(pos, s)];\n      v += [0,24,71,61,38,38,0][$rook_threat(pos, s)];\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Knight defender",
        "group": "King",
        "text": "<b>$</b>. Squares defended by knight near our king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($knight_attack(pos, square) && $king_attack(pos, square)) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Bishop defender",
        "group": "King",
        "text": "<b>$</b>. Squares defended by bishop near our king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($bishop_xray_attack(pos, square) && $king_attack(pos, square)) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Endgame shelter",
        "group": "King",
        "text": "<b>$</b>. Add an endgame component to the blockedstorm penalty so that the penalty applies more uniformly through the game.",
        "code": "function $$(pos, square) {\n  var w = 0, s = 1024, tx = null;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\"\n       || pos.c[2] && x == 6 && y == 0\n       || pos.c[3] && x == 2 && y == 0) {\n        var w1 = $strength_square(pos, {x:x,y:y});\n        var s1 = $storm_square(pos, {x:x,y:y});\n        var e1 = $storm_square(pos, {x:x,y:y}, true);\n        if (s1 - w1 < s - w) { w = w1; s = s1; e = e1; }\n      }\n    }\n  }\n  if (square == null) return e;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "King mg",
        "group": "King",
        "text": "<b>$</b> assigns middlegame bonuses and penalties for attacks on enemy king.",
        "code": "function $$(pos) {\n  var v = 0;\n  var kd = $king_danger(pos);\n  v -= $shelter_strength(pos);\n  v += $shelter_storm(pos);\n  v += (kd * kd / 4096) << 0;\n  v += 8 * $close_enemies(pos);\n  v += 17 * $pawnless_flank(pos);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "King eg",
        "group": "King",
        "text": "<b>$</b> assigns endgame bonuses and penalties for attacks on enemy king.",
        "code": "function $$(pos) {\n  var v = 0;\n  v -= 16 * $king_pawn_distance(pos);\n  v += $endgame_shelter(pos);\n  v += 95 * $pawnless_flank(pos);\n  v += ($king_danger(pos) / 16) << 0;\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Attacks on space",
        "group": "Space",
        "text": "<b>$</b>. Every square in our space area that is attacked by enemy. Only safe squares one, two or three squares behind a friendly pawn are counted.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($space_area(pos, square) < 2) return 0;\n  if (!$attack(colorflip(pos), {x:square.x,y:7-square.y})) return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Space",
        "group": "Space",
        "text": "<b>$</b> computes the space evaluation for a given side. The [[Space area]] bonus is multiplied by a weight: number of our pieces minus two times number of open files. The aim is to improve play on game opening.",
        "code": "function $$(pos, square) {\n  if ($non_pawn_material(pos) + $non_pawn_material(colorflip(pos)) < 12222) return 0;\n  var weight = -1;\n  for (var x = 0; x < 8; x++) {\n    for (var y = 0; y < 8; y++) {\n      if (\"PNBRQK\".indexOf(board(pos, x, y)) >= 0) weight++;\n    }\n  }\n  return (($space_area(pos, square) * weight * weight / 16) << 0) - 4 * $attacks_on_space(pos, square);\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Double attacked pawn",
        "group": "Pawns",
        "text": "<b>$</b>. Bonus for double attacks on unsupported pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"p\") return 0;\n  if (board(pos, square.x - 1, square.y + 1) != \"P\") return 0;\n  if (board(pos, square.x + 1, square.y + 1) != \"P\") return 0;\n  if (board(pos, square.x - 1, square.y - 1) == \"p\") return 0;\n  if (board(pos, square.x + 1, square.y - 1) == \"p\") return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push(
    {
        "name": "Pawns mg",
        "group": "Pawns",
        "text": "<b>$</b> is middlegame evaluation for pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  v -= $isolated(pos, square) ? 5 : 0;\n  v -= $backward(pos, square) ? 9 : 0;\n  v -= $doubled(pos, square) ? 11 : 0;\n  v += $connected(pos, square) ?  $connected_bonus(pos, square) : 0;\n  v -= 13 * $weak_unopposed_pawn(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push(
    {
        "name": "Pawns eg",
        "group": "Pawns",
        "text": "<b>$</b> is endgame evaluation for pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  var v = 0;\n  v -= $isolated(pos, square) ? 15 : 0;\n  v -= $backward(pos, square) ? 24 : 0;\n  v -= $doubled(pos, square) ? 56 : 0;\n  v += $connected(pos, square) ?  $connected_bonus(pos, square) * ($rank(pos, square) - 3) / 4 << 0 : 0;\n  v -= 27 * $weak_unopposed_pawn(pos, square);\n  v += 20 * $double_attacked_pawn(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    for(var i = 0; i < data.length; i++) eval("$" + data[i].name.toLowerCase().replace(/ /g, "_") + " = " + data[i].code + ";");
    return data;
})();

// Input box and commands

function command(text)
{
    if(text == null || text.length == 0) return;
    var mvdivs = ['<div class="moves">', '<div class="tview2 tview2-column">', '<div class="extension-item Moves">'];
    for(var i = 0; i < mvdivs.length; i++)
    {
        if(text.indexOf(mvdivs[i]) >= 0)
        {
            var text2 = text,
                ntext = '';
            text2 = text2.replace(/<span class="user_link[^>]*>([^<]*)<\/span>/g, "<a class=\"user_link\">$1</a>");
            var nmt = '<a class="user_link';
            if(text2.indexOf(nmt) > 0)
            {
                text2 = text2.substr(text2.indexOf(nmt) + nmt.length);
                text2 = text2.substr(text2.indexOf(">") + 1);
                ntext += "[White \"" + text2.substr(0, text2.indexOf("</a>")).replace(/<span[^>]*>[^<]*<\/span>/g, "").replace(/&nbsp;/g, " ").trim() + "\"]\n";
                text2 = text2.substr(text2.indexOf("</a>") + 4);
            }
            if(text2.indexOf(nmt) > 0)
            {
                text2 = text2.substr(text2.indexOf(nmt) + nmt.length);
                text2 = text2.substr(text2.indexOf(">") + 1);
                ntext += "[Black \"" + text2.substr(0, text2.indexOf("</a>")).replace(/<span[^>]*>[^<]*<\/span>/g, "").replace(/&nbsp;/g, " ").trim() + "\"]\n";
                text2 = text2.substr(text2.indexOf("</a>") + 4);
            }
            text2 = text;
            nmt = '<div class="playerInfo';
            for(var j = 0; j < 2; j++)
                if(text2.indexOf(nmt) > 0)
                {
                    text2 = text2.substr(text2.indexOf(nmt));
                    var black = text2.indexOf("black") < text2.indexOf(">");
                    text2 = text2.substr(nmt.length);
                    var h = '<h2 class="name">';
                    var nm = "[" + (black ? "Black" : "White") + " \"" + text2.substring(text2.indexOf(h) + h.length, text2.indexOf('</h2>')).trim() + "\"]\n";
                    if(j == 1 && !black) ntext = nm + ntext;
                    else ntext += nm;
                }

            text = text.substring(text.indexOf(mvdivs[i]));
            if(i == 2) text = text.replace(/<div class="notationTableInlineElement((?!<\/div>).)*<\/div>/g, "");
            text = text.substring(mvdivs[i].length, text.indexOf('</div>'));
            if(i == 2)
            {
                text = text.replace(/<dt>\s*(<span[^>]*>)?\s*([^<\s]*)\s*(<\/span>)?\s*<\/dt>/g, "<index>$2</index>")
                    .replace(/<span class="move">\s*([^<\s]*)\s*<\/span>/g, "<move>$1</move>")
            }
            else
            {
                text = text.replace(/<interrupt>((?!<\/interrupt>).)*<\/interrupt>/g, "")
                    .replace(/<(move|m1|m2)[^<>"]*(("[^"]*")[^<>"]*)*>/g, "<move>").replace(/<\/(m1|m2)>/g, "</move>")
                    .replace(/<\/?san>|<eval>[^<]*<\/eval>|<glyph[^<]*<\/glyph>|<move>\.\.\.<\/move>/g, "")
                    .replace(/\?/g, "x");
            }
            text = ntext + text
                .replace(/{|}/g, "")
                .replace(/(<index[^>]*>)/g, "{").replace(/<\/index>/g, ".}")
                .replace(/<move>/g, "{").replace(/<\/move>/g, " }")
                .replace(/(^|})[^{]*($|{)/g, "");
        }
    }
    if(text.split("/").length == 8 && text.split(".").length == 1)
    {
        pos = parseFEN(text);
        setCurFEN(generateFEN(pos));
        _history = [
            [getCurFEN()]
        ];
        _historyindex = 0;
        historyMove(0);
    }
    else if(text.split(".").length > 1)
    {
        var whitename = null,
            blackname = null;
        var wi = text.indexOf("[White \""),
            bi = text.indexOf("[Black \"");
        if(wi >= 0 && bi > wi)
        {
            var wil = text.substr(wi + 8).indexOf("\"]"),
                bil = text.substr(bi + 8).indexOf("\"]");
            if(wil > 0 && wil < 128) whitename = text.substr(wi + 8, wil);
            if(bil > 0 && bil < 128) blackname = text.substr(bi + 8, bil);
        }

        text = text.replace(/\u2605/g, "").replace(/\u0445/g, "x");
        text = " " + text.replace(/\./g, " ").replace(/(\[FEN [^\]]+\])+?/g, function($0, $1)
        {
            return $1.replace(/\[|\]|"/g, "").replace(/\s/g, ".");
        });
        text = text.replace(/\[Event /g, "* [Event ").replace(/\s(\[[^\]]+\])+?/g, "").replace(/(\{[^\}]+\})+?/g, "");
        var r = /(\([^\(\)]+\))+?/g;
        while(r.test(text)) text = text.replace(r, "");
        text = text.replace(/0-0-0/g, "O-O-O").replace(/0-0/g, "O-O").replace(/(1\-0|0\-1|1\/2\-1\/2)/g, " * ")
            .replace(/\s\d+/g, " ").replace(/\$\d+/g, "").replace(/\?/g, "");
        var moves = text.replace(/\s/g, " ").replace(/ +/g, " ").trim().split(' ');
        var pos = parseFEN(START);
        var oldhistory = JSON.parse(JSON.stringify(_history));
        _history = [
            [START]
        ];
        _historyindex = 0;
        gm = 0;
        for(var i = 0; i < moves.length; i++)
        {
            if(moves[i].length == 0) continue;
            if("*".indexOf(moves[i][0]) == 0)
            {
                if(i < moves.length - 1)
                {
                    pos = parseFEN(START);
                    historyAdd(generateFEN(pos), oldhistory);
                    gm++;
                }
                continue;
            }
            else if(moves[i].indexOf("FEN.") == 0)
            {
                pos = parseFEN(moves[i].substring(4).replace(/\./g, " "));
                if(_history[_historyindex][0] == START) _historyindex--;
                historyAdd(generateFEN(pos), oldhistory);
                continue;
            }
            if(moves[i] == "--")
            {
                pos.w = !pos.w;
                historyAdd(generateFEN(pos), oldhistory);
                continue;
            }
            var move = parseMove(pos, moves[i]);
            if(move == null)
            {
                alert("incorrect move: " + moves[i] + " " + gm);
                break;
            }
            var san = sanMove(pos, move, genMoves(pos));
            pos = doMove(pos, move.from, move.to, move.p);
            historyAdd(generateFEN(pos), oldhistory, move, san);
        }
        setCurFEN(generateFEN(pos));
        historyKeep(whitename, blackname);
    }
    else if(text.toLowerCase() == "reset")
    {
        setCurFEN(START);
        _history = [
            [getCurFEN()]
        ];
        _historyindex = 0;
        historyKeep();
        _history2 = null;
        if(_nncache != null) _nncache.clear();
    }
    else if(text.toLowerCase() == "clear")
    {
        setCurFEN("8/8/8/8/8/8/8/8 w - - 0 0");
        showBoard();
        historySave();
    }
    else if(text.toLowerCase() == "colorflip")
    {
        setCurFEN(generateFEN(colorflip(parseFEN(getCurFEN()))));
        showBoard();
        historySave();
    }
    else if(text.toLowerCase() == "sidetomove")
    {
        setCurFEN(getCurFEN().replace(" w ", " ! ").replace(" b ", " w ").replace(" ! ", " b "));
        showBoard();
        historySave();
    }
    else if(text.toLowerCase().indexOf("depth ") == 0)
    {
        if(_engine != null && _engine.ready)
        {
            _engine.depth = Math.min(128, Math.max(0, parseInt(text.toLowerCase().replace("depth ", ""))));
            if(isNaN(_engine.depth)) _engine.depth = 15;
        }
        showBoard();
        historySave();
    }
    else if(text.toLowerCase() == "flip")
    {
        doFlip();
    }
    else if(text.toLowerCase() == "window")
    {

        var encoded = "";
        if(_history[0][0] == START)
        {
            var gi = "";
            for(var i = 1; i < _history.length; i++)
            {
                var pos = parseFEN(_history[i - 1][0]);
                var moves = genMoves(pos);
                var mindex = -1;
                for(var j = 0; j < moves.length; j++)
                {
                    var move = moves[j];
                    var pos2 = doMove(pos, move.from, move.to, move.p);
                    if(generateFEN(pos2) == _history[i][0]) mindex = j;
                }
                if(mindex < 0)
                {
                    gi = "";
                    break;
                }
                var symbols = (moves.length + 1).toString(2).length,
                    v = "";
                for(var j = 0; j < symbols; j++) v += "0";
                var n = (mindex + 1).toString(2);
                n = v.substr(n.length) + n;
                gi += n;
                if(i == _history.length - 1) gi += v;
            }
            var cur = "";
            for(var i = 0; i < gi.length; i++)
            {
                cur += gi[i];
                if(i == gi.length - 1)
                    while(cur.length < 6) cur += "0";
                if(cur.length == 6)
                {
                    encoded += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_" [parseInt(cur, 2)];
                    cur = "";
                }
            }
        }
        var wb = document.getElementById("wb").children;
        var lparams = [];
        for(var i = 0; i < wb.length; i++)
        {
            if(wb[i].tagName != 'DIV') continue;
            var winId = wb[i].id.substring(2);
            var elem = document.getElementById("w" + winId);
            if(elem.style.display == "none") continue;
            if(elem.style.position == "absolute" && !_mobile)
            {
                lparams.push((winId[0] + elem.style.width + "," + elem.style.height + "," + elem.style.left + "," + elem.style.top).replace(/px/g, ""));
            }
            else if((elem.style.width != elem.originalWidth || elem.style.height != elem.originalHeight) && !_mobile)
            {
                lparams.push((winId[0] + elem.style.width + "," + elem.style.height).replace(/(\.[0-9]+)?px/g, ""));
            }
            else lparams.push(winId[0]);
        }
        var lparamsstr = lparams.join(" ").toLowerCase();
        var url = [location.protocol, '//', location.host, location.pathname].join('');
        var params = [];
        if(_color > 0) params.push("col" + _color);
        if(_engine != null && _engine.ready && _engine.depth != 15) params.push("depth " + _engine.depth);
        if(lparamsstr != "c m h g") params.push("layout " + (lparamsstr.length == 0 ? "-" : lparamsstr));
        if(encoded.length > 0) params.push("~" + encoded);
        else if(getCurFEN() != START) params.push(getCurFEN());
        for(var i = 0; i < params.length; i++)
        {
            url += (i == 0 ? "?" : "&") + String.fromCharCode("a".charCodeAt(0) + i) + "=" + params[i];
        }
        window.open(url, "_blank");

    }
    else if(text[0] == "~")
    {
        var pos = parseFEN(START);
        var oldhistory = JSON.parse(JSON.stringify(_history));
        _history = [
            [START]
        ];
        _historyindex = 0;
        var gi = "";
        for(var i = 1; i < text.length; i++)
        {
            var n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".indexOf(text[i]).toString(2);
            gi += "000000".substr(n.length) + n;
        }
        var i = 0;
        while(i < gi.length)
        {
            var moves = genMoves(pos);
            var symbols = (moves.length + 1).toString(2).length,
                cur = "";
            for(var j = 0; j < symbols; j++)
            {
                cur += (i < gi.length ? gi[i] : "0");
                i++;
            }
            var n = parseInt(cur, 2);
            if(n == 0 || n >= moves.length + 1) break;
            var move = moves[n - 1],
                san = sanMove(pos, move, moves);
            pos = doMove(pos, move.from, move.to, move.p);
            historyAdd(generateFEN(pos), oldhistory, move, san);
        }
        setCurFEN(generateFEN(pos));
        historyKeep();
    }
    else if(text.toLowerCase() == "revert")
    {
        if(_history2 != null)
        {
            _historyindex = _history2[0];
            _history = _history2[1];
            _history2 = null;
            setCurFEN(_history[_historyindex][0]);
            refreshButtonRevert();
            historyMove(0);
        }
    }
    else if(text.toLowerCase() == "keep")
    {
        historyKeep(_wname, _bname);
    }
    else if(text.length == 4 && text.toLowerCase().indexOf("col") == 0)
    {
        setBoardColor(Math.max(0, text.charCodeAt(3) - "0".charCodeAt(0)));
    }
    else if(text.toLowerCase().indexOf("layout ") == 0)
    {
        var a = text.toUpperCase().split(" ");
        a.splice(0, 1);
        var wb = document.getElementById("wb").children;
        for(var i = 0; i < wb.length; i++)
        {
            if(wb[i].tagName != 'DIV') continue;
            var winId = wb[i].id.substring(2);
            var cur = a.find(function(x)
            {
                return x[0] == winId[0];
            });
            if(cur != null && !_mobile)
            {
                cur = cur.substring(1);
                var b = cur.length == 0 ? [] : cur.split(",");
                var elem = document.getElementById("w" + winId);
                if(elem.firstElementChild.ondblclick != null) elem.firstElementChild.ondblclick();
                if(b.length >= 2)
                {
                    elem.style.width = b[0] + "px";
                    elem.style.height = b[1] + "px";
                }
                if(b.length >= 4)
                {
                    elem.style.left = b[2] + "px";
                    elem.style.top = b[3] + "px";
                    elem.style.position = "absolute";
                }
                showHideWindow(winId, true);
            }
            else if(cur != null && _mobile) showHideWindow(winId, true);
            else if(!_mobile) showHideWindow(winId, false);
        }
    }
    else
    {
        for(var i = 0; i < _curmoves.length; i++)
            if(_curmoves[i].san == text)
            {
                doMoveHandler(_curmoves[i].move);
                break;
            }
    }
}

function dosearch()
{
    var text = document.getElementById('searchInput').value;
    document.getElementById('searchInput').value = getCurFEN();
    command(text);
    document.getElementById('searchInput').value = getCurFEN();
    document.getElementById('searchInput').blur();
}

function showHideButtonGo(state)
{
    if(!document.getElementById('searchInput').focus) state = false;
    if(state && document.getElementById('searchInput').value == getCurFEN()) state = false;
    document.getElementById("buttonGo").style.display = state ? "" : "none";
}

function setupInput()
{
    document.getElementById("buttonGo").onclick = function()
    {
        dosearch();
    };
    document.getElementById("buttonGo").onmousedown = function(event)
    {
        event.preventDefault();
    };
    var input = document.getElementById("searchInput");
    input.onmousedown = function()
    {
        this.focuswithmouse = 1;
    };
    input.onmouseup = function()
    {
        if(this.focuswithmouse == 2 && input.selectionStart == input.selectionEnd) this.select();
        this.focuswithmouse = 0;
    }
    input.onfocus = function()
    {
        if(this.focuswithmouse == 1) this.focuswithmouse = 2;
        else
        {
            input.select();
            this.focuswithmouse = 0;
        }
        showHideButtonGo(true);
        document.onkeydown = null;
    };
    input.onblur = function()
    {
        input.selectionStart = input.selectionEnd;
        showHideButtonGo(false);
        document.onkeydown = onKeyDown;
        this.focuswithmouse = 0;
    };
    input.onpaste = function()
    {
        window.setTimeout(function()
        {
            showHideButtonGo(true);
        }, 1);
    };
    input.onkeydown = function(e)
    {
        if(e.keyCode == 27) e.preventDefault();
        window.setTimeout(function()
        {
            showHideButtonGo(true);
        }, 1);
    };
    input.onkeyup = function(e)
    {
        if(e.keyCode == 27)
        {
            input.value = getCurFEN();
            this.select();
            showHideButtonGo(true);
        }
    };
    document.getElementById("simpleSearch").onsubmit = function()
    {
        dosearch();
        return false;
    };
}

// Tooltip

function getClientY(e)
{
    if(!_mobile) return e.clientY;
    var scrollOffset = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
    return (e.clientY + scrollOffset) * _bodyScale;
}

function updateTooltipPos(e)
{
    var tooltip = document.getElementById("tooltip");
    tooltip.style.left = (e.clientX * _bodyScale) + "px";
    tooltip.style.top = (getClientY(e) + 20) + "px";
}

function updateTooltip(text, answerpv, movenumber, cl, e)
{
    var state = text.length > 0;
    var tooltip = document.getElementById("tooltip");
    while(tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
    var span1 = document.createElement('span');
    setElemText(span1, state ? text : "")
    if(movenumber != null)
    {
        var span2 = document.createElement('span');
        span2.style.color = "#64c4db";
        setElemText(span2, movenumber + " ")
        tooltip.appendChild(span2);
    }
    if(cl != null && cl != "circle")
    {
        var span3 = document.createElement('span');
        span3.className = cl;
        tooltip.appendChild(span3);
        span1.style.paddingLeft = "12px";
    }
    tooltip.appendChild(span1);

    _tooltipState = state;
    tooltip.style.display = state ? "" : "none";
    if(e != null) updateTooltipPos(e);

    if(answerpv != null && answerpv.length > 0 && (answerpv[0].length == 4 || answerpv[0].length == 5))
    {
        for(var i = 0; i < Math.min(answerpv.length, _movesPv ? 5 : 1); i++)
        {
            var move = {
                from:
                {
                    x: "abcdefgh".indexOf(answerpv[i][0]),
                    y: "87654321".indexOf(answerpv[i][1])
                },
                to:
                {
                    x: "abcdefgh".indexOf(answerpv[i][2]),
                    y: "87654321".indexOf(answerpv[i][3])
                }
            };
            showArrow1(move, 1 - (i / 5));
        }
    }
    else setArrow(_arrow);
}

// Chessboard and arrows

function getEvalText(e, s)
{
    if(e == null) return s ? "" : "?";
    var matein = Math.abs(Math.abs(e) - 1000000);
    if(Math.abs(e) > 900000)
    {
        if(s) return (e > 0 ? "+M" : "-M") + matein;
        else return (e > 0 ? "white mate in " : "black mate in ") + matein;
    }
    return (e / 100).toFixed(2);
}

function showLegalMoves(from)
{
    setArrow(from == null);
    var pos = parseFEN(getCurFEN());
    var elem = document.getElementById('chessboard1');
    for(var i = 0; i < elem.children.length; i++)
    {
        var div = elem.children[i];
        if(div.tagName != 'DIV') continue;
        if(div.style.zIndex > 0) continue;
        var x = parseInt(div.style.left.replace("px", "")) / 40;
        var y = parseInt(div.style.top.replace("px", "")) / 40;
        if(_flip)
        {
            x = 7 - x;
            y = 7 - y;
        }
        var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
        if(div.className.indexOf(" h2") >= 0) c += " h2";
        div.className = c;
        div.onmouseover = null;
        setElemText(div, "");
        if(from == null || from.x < 0 || from.y < 0) continue;
        if(from.x == x && from.y == y)
        {
            div.className += " h0";
            _clickFromElem = div;
        }
        else if(isLegal(pos, from,
            {
                x: x,
                y: y
            }))
        {
            if(_curmoves.length == 0) continue;
            var text = "",
                san = "",
                answerpv = null,
                cl = null;
            for(var j = 0; j < _curmoves.length; j++)
            {
                if(_curmoves[j].move.from.x == from.x && _curmoves[j].move.from.y == from.y &&
                    _curmoves[j].move.to.x == x && _curmoves[j].move.to.y == y &&
                    (_curmoves[j].move.p == 'Q' || _curmoves[j].move.p == null))
                {
                    text = getEvalText(_curmoves[j].eval, true);
                    san = _curmoves[j].san;
                    answerpv = _curmoves[j].answerpv;
                    cl = getCircleClassName(j);
                    break;
                }
            }
            div.className += " h1";
            setElemText(div, text);
            div.tooltip = san + (text.length > 0 ? " " + text : "");
            div.answerpv = answerpv == null ? [] : answerpv;
            div.cl = cl == null ? "circle" : cl;
            div.onmouseover = function(e)
            {
                updateTooltip(this.tooltip, this.answerpv, null, this.cl, e);
            };
            div.onmouseout = function()
            {
                updateTooltip("");
            };
        }
        updateTooltip("");
    }

    elem = document.getElementById('editWrapper').children[0];
    for(var i = 0; i < elem.children.length; i++)
    {
        var div = elem.children[i];
        if(div.tagName != 'DIV') continue;
        if(div.style.zIndex > 0) continue;
        var x = -parseInt(div.style.left.replace("px", "")) / 40 - 1;
        var y = -parseInt(div.style.top.replace("px", "")) / 40 - 1;
        var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
        div.className = c;
        setElemText(div, "");
        if(from == null || from.x >= 0 || from.y >= 0) continue;
        if(from.x == x && from.y == y)
        {
            div.className += " h0";
            _clickFromElem = div;
        }
    }
    showArrow3(null);

    _clickFrom = from;
}

function updateLegalMoves()
{
    var pos = parseFEN(getCurFEN());
    var elem = document.getElementById('chessboard1');
    for(var i = 0; i < elem.children.length; i++)
    {
        var div = elem.children[i];
        if(div.tagName != 'DIV' || div.style.zIndex > 0 || div.className.indexOf(" h1") < 0 || div.cl != "circle") continue;
        var x = parseInt(div.style.left.replace("px", "")) / 40;
        var y = parseInt(div.style.top.replace("px", "")) / 40;
        if(_flip)
        {
            x = 7 - x;
            y = 7 - y;
        }
        var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
        if(div.className.indexOf(" h2") >= 0) c += " h2";
        for(var j = 0; j < _curmoves.length; j++)
        {
            if(div.tooltip == _curmoves[j].san)
            {
                var text = getEvalText(_curmoves[j].eval, true);
                var san = _curmoves[j].san;
                var answerpv = _curmoves[j].answerpv;
                var cl = getCircleClassName(j);
                setElemText(div, text);
                div.tooltip = san + (text.length > 0 ? " " + text : "");
                div.answerpv = answerpv == null ? [] : answerpv;
                div.cl = cl == null ? "circle" : cl;
                div.onmouseover = function(e)
                {
                    updateTooltip(this.tooltip, this.answerpv, null, this.cl, e);
                };
                div.onmouseout = function()
                {
                    updateTooltip("");
                };
                if(_tooltipState && getElemText(document.getElementById("tooltip").firstChild) == _curmoves[j].san) updateTooltip(div.tooltip, div.answerpv, null, div.cl, null);
                break;
            }
        }
    }
}

function setArrow(state)
{
    _arrow = state;
    if(_arrow && _curmoves.length > 0 && _curmoves[0].eval != null) showArrow1(_curmoves[0].move);
    else showArrow1();
}

function repaintLastMoveArrow()
{
    var lastmove = (getCurFEN() == _history[_historyindex][0] && _history[_historyindex].length > 2) ? _history[_historyindex][2] : null;
    if(lastmove != null)
    {
        var elem = document.getElementById("arrowWrapper2");
        if(elem.children[0].children != null)
            elem.children[0].children[0].children[0].children[0].style.fill = elem.children[0].children[1].style.stroke = getGraphPointColor(_historyindex);
    }
    showArrow2(lastmove);
}

function scrollReset(winId)
{
    var windowElem = document.getElementById("w" + winId);
    var scrollElem = document.getElementById(winId.toLowerCase());
    var oldDisplay = windowElem.style.display;
    windowElem.style.display = "";
    scrollElem.scrollTop = 0;
    windowElem.style.display = oldDisplay;
}

function showBoard(noeval, refreshhistory, keepcontent)
{
    var pos = parseFEN(getCurFEN());
    var dragElem = document.getElementById('dragPiece');
    while(dragElem.firstChild) dragElem.removeChild(dragElem.firstChild);
    var elem = document.getElementById('chessboard1');
    if(keepcontent && elem.children.length != 64) keepcontent = false;
    if(!keepcontent)
        while(elem.firstChild) elem.removeChild(elem.firstChild);
    var index = 0;
    for(var x = 0; x < 8; x++)
        for(var y = 0; y < 8; y++)
        {
            var div = keepcontent ? elem.children[index] : document.createElement('div');
            index++;
            div.style.left = (_flip ? 7 - x : x) * 40 + "px";
            div.style.top = (_flip ? 7 - y : y) * 40 + "px";
            div.className = ((x + y) % 2 ? "d" : "l");
            div.className += " " + pos.b[x][y];
            if(pos.b[x][y] == "K" && isWhiteCheck(pos) ||
                pos.b[x][y] == "k" && isWhiteCheck(colorflip(pos))) div.className += " h2";
            if(!keepcontent) elem.appendChild(div);
        }
    if(_clickFromElem != null && _clickFrom != null && _clickFrom.x >= 0 && _clickFrom.y >= 0) _clickFromElem = null;
    document.getElementById('searchInput').value = getCurFEN();

    if(!noeval)
    {
        refreshMoves();
        if(refreshhistory)
            for(var i = 0; i < _history.length; i++)
                if(_history[i].length > 1 && _history[i][1] != null) _history[i][1].depth = -1;
        scrollReset("Moves");
        scrollReset("Opening");
        scrollReset("Static");
        if(_engine && !_engine.kill) evalAll();

    }
    document.getElementById('buttonStm').className = pos.w ? "white" : "black";

    setArrow(true);
    repaintLastMoveArrow();
    showArrow3(null);

    if(_menu) reloadMenu();
    repaintGraph();
    repaintSidebars();
    updateInfo();
    repaintStatic();
    repaintLczero();
    updateTooltip("");
}

function findMoveIndexBySan(san)
{
    for(var i = 0; i < _curmoves.length; i++)
        if(san == _curmoves[i].san) return i;
    return null;
}

function highlightMove(index, state)
{
    setArrow(!state);
    if(_dragElement != null) return;
    var elem = document.getElementById('chessboard1');
    var x1 = _curmoves[index].move.from.x;
    var y1 = _curmoves[index].move.from.y;
    var x2 = _curmoves[index].move.to.x;
    var y2 = _curmoves[index].move.to.y;
    var text = getEvalText(_curmoves[index].eval, true);
    for(var i = 0; i < elem.children.length; i++)
    {
        var div = elem.children[i];
        if(div.tagName != 'DIV') continue;
        if(div.style.zIndex > 0) continue;
        var x = parseInt(div.style.left.replace("px", "")) / 40;
        var y = parseInt(div.style.top.replace("px", "")) / 40;
        if(_flip)
        {
            x = 7 - x;
            y = 7 - y;
        }
        var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
        setElemText(div, "");
        if(div.className.indexOf(" h2") >= 0) c += " h2";
        if(state && x1 == x && y1 == y) div.className = c + " h0";
        else if(state && x2 == x && y2 == y)
        {
            div.className = c + " h1";
            setElemText(div, text);
        }
        else div.className = c;
        div.onmouseover = null;
    }
    if(state) updateTooltip("", _curmoves[index].answerpv);
    else updateTooltip("");
}

function showArrowInternal(move, wrapperId, opacity = 1)
{
    var elem = document.getElementById(wrapperId);
    if(move == null)
    {
        elem.style.display = "none";
        return;
    }
    if(elem.children[0].children == null) return;
    var line = elem.children[0].children[1];
    line.setAttribute('x1', 20 + (_flip ? 7 - move.from.x : move.from.x) * 40);
    line.setAttribute('y1', 20 + (_flip ? 7 - move.from.y : move.from.y) * 40);
    line.setAttribute('x2', 20 + (_flip ? 7 - move.to.x : move.to.x) * 40);
    line.setAttribute('y2', 20 + (_flip ? 7 - move.to.y : move.to.y) * 40);
    line.style.opacity = opacity.toFixed(2);
    elem.style.display = "block";
}

function showArrow1(move, opacity)
{
    var elem = document.getElementById("arrowWrapper1");
    var elem0 = elem.children[0];
    if(opacity == null || opacity == 1)
        for(var i = elem0.children.length - 1; i >= 2; i--) elem0.removeChild(elem0.children[i]);
    else elem.children[0].appendChild(elem0.children[1].cloneNode(false));
    showArrowInternal(move, "arrowWrapper1", opacity);
}

function showArrow2(move)
{
    showArrowInternal(move, "arrowWrapper2");
}

function showArrow3(move)
{
    var elem0 = document.getElementById("arrowWrapper3").children[0];
    if(elem0.children == null) return;
    if(move == null)
    {
        for(var i = elem0.children.length - 1; i >= 2; i--) elem0.removeChild(elem0.children[i]);
    }
    else if(move.from.x == move.to.x && move.from.y == move.to.y || !bounds(move.from.x, move.from.y) || !bounds(move.to.x, move.to.y))
    {
        elem0.children[1].style.display = "none";
    }
    else
    {
        elem0.children[1].style.display = "";
    }
    showArrowInternal(move, "arrowWrapper3");
}

function finalArrow3()
{
    var elem = document.getElementById("arrowWrapper3");
    var list = elem.children[0].children,
        remElem = null;
    if(list == null) return;
    if(list[1].style.display == "none") return;
    for(var i = 2; i < list.length; i++)
    {
        if(list[i].getAttribute("x1") == list[1].getAttribute("x1") &&
            list[i].getAttribute("y1") == list[1].getAttribute("y1") &&
            list[i].getAttribute("x2") == list[1].getAttribute("x2") &&
            list[i].getAttribute("y2") == list[1].getAttribute("y2")) remElem = list[i];
    }
    if(remElem == null)
    {
        elem.children[0].appendChild(list[1].cloneNode(false));
    }
    else
    {
        elem.children[0].removeChild(remElem);
    }
    list[1].style.display = "none";
}

function updateInfo()
{
    var curfen = getCurFEN();
    var pos = parseFEN(curfen);
    var curpos = pos.m[1];
    var positionInfoText = "Position: " + (_historyindex + 1) + " of " + _history.length + " - Last Move: ";
    if(_history[_historyindex].length > 3 && _history[_historyindex][3] != null)
    {
        var pos2 = parseFEN(_history[_historyindex][0]);
        positionInfoText += (pos2.w ? (pos2.m[1] - 1) + "... " : pos2.m[1] + ". ") + _history[_historyindex][3];
    }
    else positionInfoText += "-";
    var movesInfoText = (pos.w ? "White" : "Black") + " To Play (" + _curmoves.length + " Legal Move" + (_curmoves.length == 1 ? "" : "s") + ")";
    setElemText(document.getElementById('positionInfo'), positionInfoText);
    setElemText(document.getElementById('movesInfo'), movesInfoText);

    // History window
    var elem = document.getElementById("history"),
        movesText = "";
    while(elem.firstChild) elem.removeChild(elem.firstChild);
    var div = document.createElement('div');
    var lastmn = null,
        mn = null;
    for(var i = 0; i < _history.length; i++)
    {
        if(mn != lastmn)
        {
            var span1 = document.createElement('span');
            setElemText(span1, mn + ". ");
            span1.style.color = "#64c4db";
            div.appendChild(span1);
            if(i <= _historyindex) movesText += mn + ".";
            lastmn = mn;
        }
        var mn = parseMoveNumber(_history[i][0]);
        var san = '\u2605';
        if(_history[i].length > 3 && _history[i][3] != null) san = _history[i][3];
        var span2 = document.createElement('span');
        setElemText(span2, san);
        span2.className = "movelink" + (i == _historyindex ? " selected" : "");
        span2.targetindex = i;
        var c = getGraphPointColor(i);
        if(c != "#008800") span2.style.borderBottomColor = c;
        span2.onclick = function()
        {
            var i = this.targetindex;
            if(i < _history.length && i >= 0 && i != _historyindex)
            {
                historyMove(i - _historyindex);
            }
        }
        div.appendChild(span2);
        div.appendChild(document.createTextNode(" "));
        if(i > 0 && i <= _historyindex) movesText += san + " ";
    }
    elem.appendChild(div);

    // Opening window
    elem = document.getElementById("opening");
    while(elem.firstChild) elem.removeChild(elem.firstChild);
    var list = [],
        lengthMatch = 0,
        indexMatch = -1;
    for(var i = 0; i < _open.length; i++)
    {
        if(movesText.indexOf(_open[i][2]) == 0 && _open[i][2].length > lengthMatch)
        {
            indexMatch = i;
            lengthMatch = _open[i][2].length;
        }
    }
    if(indexMatch >= 0)
    {
        list.push(
        {
            name: _open[indexMatch][0] + " " + _open[indexMatch][1],
            score: _open[indexMatch][3] + "%",
            popularity: (_open[indexMatch][4] / 100).toFixed(2) + "%",
            moves: _open[indexMatch][2]
        });
    }
    for(var i = 0; i < _open.length; i++)
    {
        if((movesText.length > 0 || _history[0][0] == START) && _open[i][2].indexOf(movesText) == 0 && list.length < 64)
        {
            list.push(
            {
                name: _open[i][0] + " " + _open[i][1],
                score: _open[i][3] + "%",
                popularity: (_open[i][4] / 100).toFixed(2) + "%",
                moves: _open[i][2]
            });
        }
    }
    for(var i = 0; i < list.length; i++)
    {
        var node1 = document.createElement("DIV");
        node1.className = "line";
        var node2 = document.createElement("SPAN");
        node2.className = "name";
        node2.appendChild(document.createTextNode(list[i].name));
        node2.title = list[i].name;
        var node3 = document.createElement("SPAN");
        node3.className = "score";
        node3.appendChild(document.createTextNode(list[i].score));
        var node4 = document.createElement("SPAN");
        node4.className = "popularity";
        node4.appendChild(document.createTextNode(list[i].popularity));
        var node5 = document.createElement("SPAN");
        node5.className = "moves";
        node5.appendChild(document.createTextNode(list[i].moves));
        node5.title = list[i].moves;
        node1.appendChild(node2);
        node1.appendChild(node3);
        node1.appendChild(node4);
        node1.appendChild(node5);
        if(indexMatch >= 0 && i == 0)
        {
            node1.style.color = "#64c4db";
            node1.targetindex = list[i].moves.split(" ").length;
            node1.onclick = function()
            {
                var i = this.targetindex;
                if(i < _history.length && i >= 0 && i != _historyindex) historyMove(i - _historyindex);
            }
        }
        else
        {
            node1.targetmoves = list[i].moves;
            node1.onclick = function()
            {
                var savedhistory = _history2 == null ? [_historyindex, JSON.parse(JSON.stringify(_history))] : _history2;
                command(this.targetmoves);
                _history2 = savedhistory;
                refreshButtonRevert();
            }
        }
        elem.appendChild(node1);
    }
}

var _staticSortByChange = false;

function repaintStatic()
{
    if(document.getElementById("wStatic").style.display == "none") return;

    var curfen = getCurFEN();
    var pos = parseFEN(curfen);

    // Static evaluation window
    window.setTimeout(function()
    {
        if(getCurFEN() != curfen) return;
        var elem = document.getElementById("static");
        var evalUnit = 213;
        while(elem.firstChild) elem.removeChild(elem.firstChild);
        var staticEvalListLast = _historyindex > 0 ? getStaticEvalList(parseFEN(_history[_historyindex - 1][0])) : null;
        var staticEvalList = getStaticEvalList(pos),
            total = 0,
            ci = 5;
        for(var i = 0; i < staticEvalList.length; i++)
        {
            if(i > 0 && staticEvalList[i - 1].group != staticEvalList[i].group) ci++;
            var c1 = 0,
                c2 = 0,
                c3 = 0;
            while(c1 + c2 + c3 == 0)
            {
                c1 = 22 + (ci % 2) * 216;
                c2 = 22 + (((ci / 2) << 0) % 3) * 108;
                c3 = 22 + ((((ci / 6) << 0)) % 2) * 216;
                if(c1 + c2 + c3 < 100)
                {
                    c1 = c2 = c3 = 0;
                    ci++;
                }
            }
            staticEvalList[i].bgcol = "rgb(" + c1 + "," + c2 + "," + c3 + ")";
            staticEvalList[i].rel = staticEvalList[i].item[2] - (staticEvalListLast == null ? 0 : staticEvalListLast[i].item[2]);
        }
        var sortArray = [];
        for(var i = 0; i < staticEvalList.length; i++) sortArray.push(
        {
            value: _staticSortByChange ? staticEvalList[i].rel : staticEvalList[i].item[2],
            index: i
        });
        sortArray.sort(function(a, b)
        {
            return (Math.abs(a.value) < Math.abs(b.value)) ? 1 : Math.abs(a.value) > Math.abs(b.value) ? -1 : 0;
        });
        for(var j = 0; j < sortArray.length; j++)
        {
            var i = sortArray[j].index;
            total += staticEvalList[i].item[2];
            var text = (staticEvalList[i].item[2] / evalUnit).toFixed(2);
            if(text == "-0.00") text = "0.00";
            var rel = (staticEvalList[i].rel / evalUnit).toFixed(2);
            if(rel == "-0.00") rel = "0.00";
            if(!_staticSortByChange && text == "0.00") continue;
            if(_staticSortByChange && rel == "0.00") continue;

            var node0 = document.createElement("SPAN");
            node0.className = "circle";
            node0.style.backgroundColor = staticEvalList[i].bgcol;

            var node1 = document.createElement("DIV");
            node1.className = "line";
            var node2 = document.createElement("SPAN");
            node2.className = "group";
            node2.appendChild(document.createTextNode(staticEvalList[i].group));
            var node6 = document.createElement("SPAN");
            node6.className = "name";
            node6.appendChild(document.createTextNode(staticEvalList[i].elem[0].toUpperCase() + staticEvalList[i].elem.replace(/\_/g, " ").substring(1)));

            var node3 = document.createElement("SPAN");
            node3.className = "eval";
            if(text.indexOf(".") >= 0)
            {
                var node4 = document.createElement("SPAN");
                node4.className = "numleft";
                node4.appendChild(document.createTextNode(text.substring(0, text.indexOf(".") + 1)));
                var node5 = document.createElement("SPAN");
                node5.className = "numright";
                node5.appendChild(document.createTextNode(text.substring(text.indexOf(".") + 1)));
                node3.appendChild(node4);
                node3.appendChild(node5);
            }
            else
            {
                node3.appendChild(document.createTextNode(text));
            }

            var node7 = document.createElement("SPAN");
            node7.className = "eval rel";
            if(rel.indexOf(".") >= 0)
            {
                var node8 = document.createElement("SPAN");
                node8.className = "numleft";
                node8.appendChild(document.createTextNode(rel.substring(0, rel.indexOf(".") + 1)));
                var node9 = document.createElement("SPAN");
                node9.className = "numright";
                node9.appendChild(document.createTextNode(rel.substring(rel.indexOf(".") + 1)));
                node7.appendChild(node8);
                node7.appendChild(node9);
            }
            else
            {
                node3.appendChild(document.createTextNode(rel));
            }
            node1.appendChild(node0);
            node1.appendChild(node2);
            node1.appendChild(node6);
            node1.appendChild(node3);
            node1.appendChild(node7);
            node1.name = staticEvalList[i].elem.toLowerCase().replace(/ /g, "_");;
            node1.onclick = function()
            {
                var data = _staticEvalData,
                    sei = null;
                for(var j = 0; j < data.length; j++)
                {
                    var n = data[j].name.toLowerCase().replace(/ /g, "_");
                    if(n == this.name) sei = data[j];
                }
                if(sei == null) return;
                var func = null,
                    n2 = this.name.toLowerCase().replace(/ /g, "_");
                try
                {
                    eval("func = $" + n2 + ";");
                }
                catch (e)
                {}
                var elem = document.getElementById('chessboard1');
                for(var i = 0; i < elem.children.length; i++)
                {
                    var div = elem.children[i];
                    if(div.tagName != 'DIV' || div.style.zIndex > 0) continue;
                    var x = parseInt(div.style.left.replace("px", "")) / 40;
                    var y = parseInt(div.style.top.replace("px", "")) / 40;
                    if(_flip)
                    {
                        x = 7 - x;
                        y = 7 - y;
                    }
                    var sqeval = 0;
                    if(n2 == "king_danger")
                    {
                        sqeval = $unsafe_checks(pos,
                        {
                            x: x,
                            y: y
                        });
                        if(sqeval == 0) sqeval = $unsafe_checks(colorflip(pos),
                        {
                            x: x,
                            y: 7 - y
                        });
                        if(sqeval == 0) sqeval = $weak_bonus(pos,
                        {
                            x: x,
                            y: y
                        });
                        if(sqeval == 0) sqeval = $weak_bonus(colorflip(pos),
                        {
                            x: x,
                            y: 7 - y
                        });
                        var showKDarrows = function(p, flipy)
                        {
                            for(var x2 = 0; x2 < 8; x2++)
                                for(var y2 = 0; y2 < 8; y2++)
                                {
                                    if("PNBRQ".indexOf(board(p, x, y)) < 0) continue;
                                    var s = {
                                            x: x,
                                            y: y
                                        },
                                        s2 = {
                                            x: x2,
                                            y: y2
                                        },
                                        a = false;
                                    if($king_ring(p, s2))
                                    {
                                        if($pawn_attack(p, s2) && Math.abs(x - x2) == 1 && y - y2 == flipy ? 1 : -1 ||
                                            $knight_attack(p, s2, s) ||
                                            $bishop_xray_attack(p, s2, s) ||
                                            $rook_xray_attack(p, s2, s) ||
                                            $queen_attack(p, s2, s)) a = false;
                                    }
                                    if(!a && $knight_attack(p, s2, s) && $safe_check(p, s2, 0) > 0) a = true;
                                    if(!a && $bishop_xray_attack(p, s2, s) && $safe_check(p, s2, 1) > 0) a = true;
                                    if(!a && $rook_xray_attack(p, s2, s) && $safe_check(p, s2, 2) > 0) a = true;
                                    if(!a && $queen_attack(p, s2, s) && $safe_check(p, s2, 3) > 0) a = true;
                                    if(a)
                                    {
                                        if(!flipy) showArrow3(
                                        {
                                            from: s,
                                            to: s2
                                        });
                                        else showArrow3(
                                        {
                                            from:
                                            {
                                                x: x,
                                                y: 7 - y
                                            },
                                            to:
                                            {
                                                x: x2,
                                                y: 7 - y2
                                            }
                                        });
                                        finalArrow3();
                                    }
                                }
                        };
                        showKDarrows(pos, false);
                        showKDarrows(colorflip(pos), true);
                    }
                    else
                    {
                        try
                        {
                            sqeval = func(pos,
                            {
                                x: x,
                                y: y
                            });
                            if(sqeval == 0 && sei.forwhite) sqeval = func(colorflip(pos),
                            {
                                x: x,
                                y: 7 - y
                            });
                            if(sqeval == 0) sqeval = func(pos,
                            {
                                x: x,
                                y: y
                            }, true);
                            if(sqeval == 0 && sei.forwhite) sqeval = func(colorflip(pos),
                            {
                                x: x,
                                y: 7 - y
                            }, true);
                        }
                        catch (e)
                        {}
                    }
                    var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
                    if(div.className.indexOf(" h2") >= 0) c += " h2";
                    if(sqeval != 0) c += " h3";
                    div.className = c;
                }
            };
            elem.appendChild(node1);
        }
        setElemText(document.getElementById('staticInfo'), "Static evaluation (" + (total / evalUnit).toFixed(2) + ")");
    }, 50);
}

function repaintLczero()
{
    if(document.getElementById("wLczero").style.display == "none") return;

    var curfen = getCurFEN();

    // Lczero window
    window.setTimeout(function()
    {
        if(getCurFEN() != curfen) return;
        if(network != null && network.model == null)
        {
            window.setTimeout(repaintLczero, 1000);
            return;
        }
        var elem = document.getElementById("lczero");
        while(elem.firstChild) elem.removeChild(elem.firstChild);
        var showwait = function()
        {
            var elem = document.getElementById("lczero");
            while(elem.firstChild) elem.removeChild(elem.firstChild);
            var node0 = document.createElement("DIV");
            setElemText(node0, "Please wait...");
            node0.className = "wait";
            elem.appendChild(node0);
        }
        if(network == null)
        {
            var node0 = document.createElement("DIV");
            setElemText(node0, "Load Built-In Data");
            node0.className = "loadButton";
            node0.onclick = function()
            {
                showwait();
                load_network("weights_32930.dat.gz", null, repaintLczero);
            }

            var node2 = document.createElement("INPUT");
            node2.type = "file"
            node2.style.display = "none";
            node2.onchange = function(e)
            {
                showwait();
                load_network(e.target.files[0].name, e.target.files[0], repaintLczero);
            }

            var node1 = document.createElement("DIV");
            setElemText(node1, "Load Custom Data");
            node1.className = "loadButton";
            node1.onclick = function()
            {
                node2.click();
            }

            elem.appendChild(node2);
            elem.appendChild(node0);
            elem.appendChild(node1);

        }
        else
        {
            showwait();
            window.setTimeout(function()
            {
                var result = lczeroEvaluate();
                while(elem.firstChild) elem.removeChild(elem.firstChild);
                if(result != null)
                {
                    var moveslist = result[0];
                    var value = 290.680623072 * Math.tan(1.548090806 * result[1]);
                    var nodeParent = document.createElement("DIV");
                    if(moveslist.length > 0) moveslist.sort(function(a, b)
                    {
                        return a.policy == b.policy ? 0 : a.policy < b.policy ? 1 : -1;
                    });
                    var policytotal = 0,
                        policypart = 0;
                    for(var i = 0; i < moveslist.length; i++) policytotal += moveslist[i].policy;
                    for(var i = 0; i < moveslist.length; i++)
                    {
                        var ci = -1;
                        for(var j = 0; j < _curmoves.length; j++)
                        {
                            if(_curmoves[j].move.from.x == moveslist[i].from.x &&
                                _curmoves[j].move.from.y == moveslist[i].from.y &&
                                _curmoves[j].move.to.x == moveslist[i].to.x &&
                                _curmoves[j].move.to.y == moveslist[i].to.y &&
                                _curmoves[j].move.p == moveslist[i].p) ci = j;
                        }
                        if(ci < 0) continue;
                        var node1 = document.createElement("DIV");
                        node1.className = "line";
                        var node0 = document.createElement("SPAN");
                        node0.className = "circle " + (policypart / policytotal < 0.8 ? "ok" : policypart / policytotal < 0.95 ? "mi" : "bl");
                        policypart += moveslist[i].policy
                        var node2 = document.createElement("SPAN");
                        node2.className = "san";
                        node2.appendChild(document.createTextNode(_curmoves[ci].san));
                        var node7 = document.createElement("SPAN");
                        node7.className = "policy";
                        node7.appendChild(document.createTextNode(((100 * moveslist[i].policy / policytotal).toFixed(2)) + "%"));
                        var node3 = document.createElement("SPAN");
                        node3.className = "eval";
                        var text = (value / 100).toFixed(2);
                        if(text.indexOf(".") >= 0)
                        {
                            var node4 = document.createElement("SPAN");
                            node4.className = "numleft";
                            node4.appendChild(document.createTextNode(text.substring(0, text.indexOf(".") + 1)));
                            var node5 = document.createElement("SPAN");
                            node5.className = "numright";
                            node5.appendChild(document.createTextNode(text.substring(text.indexOf(".") + 1)));
                            node3.appendChild(node4);
                            node3.appendChild(node5);
                        }
                        else
                        {
                            node3.appendChild(document.createTextNode(text));
                        }
                        node1.appendChild(node0);
                        node1.appendChild(node2);
                        node1.appendChild(node7);
                        node1.appendChild(node3);
                        node1.san = _curmoves[ci].san;
                        node1.index = ci;
                        node1.onmouseover = function()
                        {
                            this.index = findMoveIndexBySan(this.san);
                            if(this.index != null) highlightMove(this.index, true);
                        };
                        node1.onmouseout = function()
                        {
                            if(this.index != null) highlightMove(this.index, false);
                        };
                        node1.onmousedown = function(e)
                        {
                            this.index = findMoveIndexBySan(this.san);
                            if(_menu) showHideMenu(false);
                            if(this.index != null) doMoveHandler(_curmoves[this.index].move);
                        };
                        if(_historyindex + 1 < _history.length && _history[_historyindex + 1].length > 3 && _history[_historyindex + 1][3] == _curmoves[ci].san) node1.style.color = "#64c4db"
                        nodeParent.appendChild(node1);
                    }
                    elem.appendChild(nodeParent);
                }
                else
                {
                    var node0 = document.createElement("DIV");
                    setElemText(node0, "Error");
                    elem.appendChild(node0);
                }
            }, 1);
        }
    }, 50);

}

function getCircleClassName(i)
{
    var cl = "circle";
    if(_curmoves[i].eval != null && _curmoves[0].eval != null)
    {
        var etop = Math.max(-6, Math.min(6, _curmoves[0].eval / 100));
        var ecur = Math.max(-6, Math.min(6, _curmoves[i].eval / 100));
        var lost = Math.abs(etop - ecur);
        if(lost <= 1.0) cl += " ok";
        else if(lost <= 3.0) cl += " mi";
        else cl += " bl";
    }
    return cl;
}
var _movesPv = false;

function showEvals()
{
    setElemText(document.getElementById("moves"), "");
    setElemText(document.getElementById("buttonMovesPv"), _movesPv ? "PV" : "Reply");
    if(_curmoves.length > 0)
    {
        var sortfunc = function(a, b)
        {
            var a0 = a.eval == null ? -2000000 : a.eval * (_curmoves[0].w ? -1 : 1);
            var b0 = b.eval == null ? -2000000 : b.eval * (_curmoves[0].w ? -1 : 1);

            var r = 0;
            if(a0 < b0 || (a0 == b0 && a.san < b.san)) r = 1;
            if(a0 > b0 || (a0 == b0 && a.san > b.san)) r = -1;
            return r;
        }
        _curmoves.sort(sortfunc);
    }
    for(var i = 0; i < _curmoves.length; i++)
    {
        var node1 = document.createElement("DIV");
        node1.className = "line";
        var node0 = document.createElement("SPAN");
        node0.className = getCircleClassName(i);
        var node2 = document.createElement("SPAN");
        node2.appendChild(document.createTextNode(_curmoves[i].san));
        node2.className = "san";
        var node3 = document.createElement("SPAN");
        node3.className = "eval";
        var node6 = document.createElement("SPAN");
        node6.className = "pv";
        if(_movesPv) node6.appendChild(document.createTextNode(_curmoves[i].pvtext || "?"));
        else node6.appendChild(document.createTextNode((_curmoves[i].pvtext || "?").split(' ')[0]));
        var node7 = document.createElement("SPAN");
        node7.className = "depth";
        node7.appendChild(document.createTextNode(_curmoves[i].depth | "?"));

        var text = getEvalText(_curmoves[i].eval, false);
        if(text.indexOf(".") >= 0)
        {
            var node4 = document.createElement("SPAN");
            node4.className = "numleft";
            node4.appendChild(document.createTextNode(text.substring(0, text.indexOf(".") + 1)));
            var node5 = document.createElement("SPAN");
            node5.className = "numright";
            node5.appendChild(document.createTextNode(text.substring(text.indexOf(".") + 1)));
            node3.appendChild(node4);
            node3.appendChild(node5);
        }
        else
        {
            node3.appendChild(document.createTextNode(text));
        }
        node1.appendChild(node0);
        node1.appendChild(node2);
        node1.appendChild(node3);
        node1.appendChild(node6);
        node1.appendChild(node7);
        node1.index = i;
        node1.onmouseover = function()
        {
            highlightMove(this.index, true);
        };
        node1.onmouseout = function()
        {
            highlightMove(this.index, false);
        };
        node1.onmousedown = function(e)
        {
            if(_menu) showHideMenu(false);
            doMoveHandler(_curmoves[this.index].move);
        };
        if(_historyindex + 1 < _history.length && _history[_historyindex + 1].length > 3 && _history[_historyindex + 1][3] == _curmoves[i].san) node1.style.color = "#64c4db"
        document.getElementById("moves").appendChild(node1);
    }
    if(_arrow) setArrow(true);
    updateLegalMoves();
}

// Chess position

function bounds(x, y)
{
    return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}

function board(pos, x, y)
{
    if(x >= 0 && x <= 7 && y >= 0 && y <= 7) return pos.b[x][y];
    return "x";
}

function colorflip(pos)
{
    var board = new Array(8);
    for(var i = 0; i < 8; i++) board[i] = new Array(8);
    for(x = 0; x < 8; x++)
        for(y = 0; y < 8; y++)
        {
            board[x][y] = pos.b[x][7 - y];
            var color = board[x][y].toUpperCase() == board[x][y];
            board[x][y] = color ? board[x][y].toLowerCase() : board[x][y].toUpperCase();
        }
    return {
        b: board,
        c: [pos.c[2], pos.c[3], pos.c[0], pos.c[1]],
        e: pos.e == null ? null : [pos.e[0], 7 - pos.e[1]],
        w: !pos.w,
        m: [pos.m[0], pos.m[1]]
    };
}

function sum(pos, func, param)
{
    var sum = 0;
    for(var x = 0; x < 8; x++)
        for(var y = 0; y < 8; y++) sum += func(pos,
        {
            x: x,
            y: y
        }, param);
    return sum;
}

function parseMoveNumber(fen)
{
    var a = fen.replace(/^\s+/, '').split(' ');
    return (a.length > 5 && !isNaN(a[5]) && a[5] != '') ? parseInt(a[5]) : 1;
}

function parseFEN(fen)
{
    var board = new Array(8);
    for(var i = 0; i < 8; i++) board[i] = new Array(8);
    var a = fen.replace(/^\s+/, '').split(' '),
        s = a[0],
        x, y;
    for(x = 0; x < 8; x++)
        for(y = 0; y < 8; y++)
        {
            board[x][y] = '-';
        }
    x = 0, y = 0;
    for(var i = 0; i < s.length; i++)
    {
        if(s[i] == ' ') break;
        if(s[i] == '/')
        {
            x = 0;
            y++;
        }
        else
        {
            if(!bounds(x, y)) continue;
            if('KQRBNP'.indexOf(s[i].toUpperCase()) != -1)
            {
                board[x][y] = s[i];
                x++;
            }
            else if('0123456789'.indexOf(s[i]) != -1)
            {
                x += parseInt(s[i]);
            }
            else x++;
        }
    }
    var castling, enpassant, whitemove = !(a.length > 1 && a[1] == 'b');
    if(a.length > 2)
    {
        castling = [a[2].indexOf('K') != -1, a[2].indexOf('Q') != -1,
            a[2].indexOf('k') != -1, a[2].indexOf('q') != -1
        ];
    }
    else
    {
        castling = [true, true, true, true];
    }
    if(a.length > 3 && a[3].length == 2)
    {
        var ex = 'abcdefgh'.indexOf(a[3][0]);
        var ey = '87654321'.indexOf(a[3][1]);
        enpassant = (ex >= 0 && ey >= 0) ? [ex, ey] : null;
    }
    else
    {
        enpassant = null;
    }
    var movecount = [(a.length > 4 && !isNaN(a[4]) && a[4] != '') ? parseInt(a[4]) : 0,
        (a.length > 5 && !isNaN(a[5]) && a[5] != '') ? parseInt(a[5]) : 1
    ];
    return {
        b: board,
        c: castling,
        e: enpassant,
        w: whitemove,
        m: movecount
    };
}

function generateFEN(pos)
{
    var s = '',
        f = 0,
        castling = pos.c,
        enpassant = pos.e,
        board = pos.b;
    for(var y = 0; y < 8; y++)
    {
        for(var x = 0; x < 8; x++)
        {
            if(board[x][y] == '-')
            {
                f++;
            }
            else
            {
                if(f > 0) s += f, f = 0;
                s += board[x][y];
            }
        }
        if(f > 0) s += f, f = 0;
        if(y < 7) s += '/';
    }
    s += ' ' + (pos.w ? 'w' : 'b') +
        ' ' + ((castling[0] || castling[1] || castling[2] || castling[3]) ?
            ((castling[0] ? 'K' : '') + (castling[1] ? 'Q' : '') +
                (castling[2] ? 'k' : '') + (castling[3] ? 'q' : '')) :
            '-') +
        ' ' + (enpassant == null ? '-' : ('abcdefgh' [enpassant[0]] + '87654321' [enpassant[1]])) +
        ' ' + pos.m[0] + ' ' + pos.m[1];
    return s;
}

function isWhiteCheck(pos)
{
    var kx = null,
        ky = null;
    for(var x = 0; x < 8; x++)
    {
        for(var y = 0; y < 8; y++)
        {
            if(pos.b[x][y] == 'K')
            {
                kx = x;
                ky = y;
            }
        }
    }
    if(kx == null || ky == null) return false;
    if(board(pos, kx + 1, ky - 1) == 'p' ||
        board(pos, kx - 1, ky - 1) == 'p' ||
        board(pos, kx + 2, ky + 1) == 'n' ||
        board(pos, kx + 2, ky - 1) == 'n' ||
        board(pos, kx + 1, ky + 2) == 'n' ||
        board(pos, kx + 1, ky - 2) == 'n' ||
        board(pos, kx - 2, ky + 1) == 'n' ||
        board(pos, kx - 2, ky - 1) == 'n' ||
        board(pos, kx - 1, ky + 2) == 'n' ||
        board(pos, kx - 1, ky - 2) == 'n' ||
        board(pos, kx - 1, ky - 1) == 'k' ||
        board(pos, kx, ky - 1) == 'k' ||
        board(pos, kx + 1, ky - 1) == 'k' ||
        board(pos, kx - 1, ky) == 'k' ||
        board(pos, kx + 1, ky) == 'k' ||
        board(pos, kx - 1, ky + 1) == 'k' ||
        board(pos, kx, ky + 1) == 'k' ||
        board(pos, kx + 1, ky + 1) == 'k') return true;
    for(var i = 0; i < 8; i++)
    {
        var ix = (i + (i > 3)) % 3 - 1;
        var iy = (((i + (i > 3)) / 3) << 0) - 1;
        for(var d = 1; d < 8; d++)
        {
            var b = board(pos, kx + d * ix, ky + d * iy);
            var line = ix == 0 || iy == 0;
            if(b == 'q' || b == 'r' && line || b == 'b' && !line) return true;
            if(b != "-") break;
        }
    }
    return false;
}

function doMove(pos, from, to, promotion)
{
    if(pos.b[from.x][from.y].toUpperCase() != pos.b[from.x][from.y])
    {
        var r = colorflip(doMove(colorflip(pos),
        {
            x: from.x,
            y: 7 - from.y
        },
        {
            x: to.x,
            y: 7 - to.y
        }, promotion));
        r.m[1]++;
        return r;
    }
    var r = colorflip(colorflip(pos));
    r.w = !r.w;
    if(from.x == 7 && from.y == 7) r.c[0] = false;
    if(from.x == 0 && from.y == 7) r.c[1] = false;
    if(to.x == 7 && to.y == 0) r.c[2] = false;
    if(to.x == 0 && to.y == 0) r.c[3] = false;
    if(from.x == 4 && from.y == 7) r.c[0] = r.c[1] = false;
    r.e = pos.b[from.x][from.y] == 'P' && from.y == 6 && to.y == 4 ? [from.x, 5] : null;
    if(pos.b[from.x][from.y] == 'K')
    {
        if(Math.abs(from.x - to.x) > 1)
        {
            r.b[from.x][from.y] = '-';
            r.b[to.x][to.y] = 'K';
            r.b[to.x > 4 ? 5 : 3][to.y] = 'R';
            r.b[to.x > 4 ? 7 : 0][to.y] = '-';
            return r;
        }
    }
    if(pos.b[from.x][from.y] == 'P' && to.y == 0)
    {
        r.b[to.x][to.y] = promotion != null ? promotion : 'Q';
    }
    else if(pos.b[from.x][from.y] == 'P' &&
        pos.e != null && to.x == pos.e[0] && to.y == pos.e[1] &&
        Math.abs(from.x - to.x) == 1)
    {
        r.b[to.x][from.y] = '-';
        r.b[to.x][to.y] = pos.b[from.x][from.y];

    }
    else
    {
        r.b[to.x][to.y] = pos.b[from.x][from.y];
    }
    r.b[from.x][from.y] = '-';
    r.m[0] = (pos.b[from.x][from.y] == 'P' || pos.b[to.x][to.y] != '-') ? 0 : r.m[0] + 1;
    return r;
}

function isLegal(pos, from, to)
{
    if(!bounds(from.x, from.y)) return false;
    if(!bounds(to.x, to.y)) return false;
    if(from.x == to.x && from.y == to.y) return false;
    if(pos.b[from.x][from.y] != pos.b[from.x][from.y].toUpperCase())
    {
        return isLegal(colorflip(pos),
        {
            x: from.x,
            y: 7 - from.y
        },
        {
            x: to.x,
            y: 7 - to.y
        })
    }
    if(!pos.w) return false;
    var pfrom = pos.b[from.x][from.y];
    var pto = pos.b[to.x][to.y];
    if(pto.toUpperCase() == pto && pto != '-') return false;
    if(pfrom == '-')
    {
        return false;
    }
    else if(pfrom == 'P')
    {
        var enpassant = pos.e != null && to.x == pos.e[0] && to.y == pos.e[1];
        if(!((from.x == to.x && from.y == to.y + 1 && pto == '-') ||
                (from.x == to.x && from.y == 6 && to.y == 4 && pto == '-' && pos.b[to.x][5] == '-') ||
                (Math.abs(from.x - to.x) == 1 && from.y == to.y + 1 && (pto != '-' || enpassant))
            )) return false;
    }
    else if(pfrom == 'N')
    {
        if(Math.abs(from.x - to.x) < 1 || Math.abs(from.x - to.x) > 2) return false;
        if(Math.abs(from.y - to.y) < 1 || Math.abs(from.y - to.y) > 2) return false;
        if(Math.abs(from.x - to.x) + Math.abs(from.y - to.y) != 3) return false;
    }
    else if(pfrom == 'K')
    {
        var castling = true;
        if(from.y != 7 || to.y != 7) castling = false;
        if(from.x != 4 || (to.x != 2 && to.x != 6)) castling = false;
        if(to.x == 6 && !pos.c[0] || to.x == 2 && !pos.c[1]) castling = false;
        if(to.x == 2 && pos.b[0][7] + pos.b[1][7] + pos.b[2][7] + pos.b[3][7] != 'R---') castling = false;
        if(to.x == 6 && pos.b[5][7] + pos.b[6][7] + pos.b[7][7] != '--R') castling = false;
        if((Math.abs(from.x - to.x) > 1 || Math.abs(from.y - to.y) > 1) && !castling) return false;
        if(castling && isWhiteCheck(pos)) return false;
        if(castling && isWhiteCheck(doMove(pos, from,
            {
                x: to.x == 2 ? 3 : 5,
                y: 7
            }))) return false;
    }
    if(pfrom == 'B' || pfrom == 'R' || pfrom == 'Q')
    {
        var a = from.x - to.x,
            b = from.y - to.y;
        var line = a == 0 || b == 0;
        var diag = Math.abs(a) == Math.abs(b);
        if(!line && !diag) return false;
        if(pfrom == 'R' && !line) return false;
        if(pfrom == 'B' && !diag) return false;
        var count = Math.max(Math.abs(a), Math.abs(b));
        var ix = a > 0 ? -1 : a < 0 ? 1 : 0,
            iy = b > 0 ? -1 : b < 0 ? 1 : 0;
        for(var i = 1; i < count; i++)
        {
            if(pos.b[from.x + ix * i][from.y + iy * i] != '-') return false;
        }
    }
    if(isWhiteCheck(doMove(pos, from, to))) return false;
    return true;
}

function parseMove(pos, s)
{
    var promotion = null;
    s = s.replace(/[\+|#|\?|!|x]/g, "");
    if(s.length >= 2 && s[s.length - 2] == "=")
    {
        promotion = s[s.length - 1]
        s = s.substring(0, s.length - 2);
    }
    if(s.length >= 3 && "NBRQ".indexOf(s[s.length - 1]) >= 0)
    {
        promotion = s[s.length - 1]
        s = s.substring(0, s.length - 1);
    }
    if(s == "O-O" || s == "O-O-O")
    {
        var from = {
                x: 4,
                y: pos.w ? 7 : 0
            },
            to = {
                x: s == "O-O" ? 6 : 2,
                y: pos.w ? 7 : 0
            };
        if(isLegal(pos, from, to)) return {
            from: from,
            to: to
        };
        else return null;
    }
    else
    {
        var p;
        if("PNBRQK".indexOf(s[0]) < 0)
        {
            p = "P";
        }
        else
        {
            p = s[0];
            s = s.substring(1);
        }
        if(s.length < 2 || s.length > 4) return null;
        var xto = "abcdefgh".indexOf(s[s.length - 2]);
        var yto = "87654321".indexOf(s[s.length - 1]);
        var xfrom = -1,
            yfrom = -1;
        if(s.length > 2)
        {
            xfrom = "abcdefgh".indexOf(s[0]);
            yfrom = "87654321".indexOf(s[s.length - 3]);
        }
        for(var x = 0; x < 8; x++)
        {
            for(var y = 0; y < 8; y++)
            {
                if(xfrom != -1 && xfrom != x) continue;
                if(yfrom != -1 && yfrom != y) continue;
                if(pos.b[x][y] == (pos.w ? p : p.toLowerCase()) && isLegal(pos,
                    {
                        x: x,
                        y: y
                    },
                    {
                        x: xto,
                        y: yto
                    }))
                {
                    xfrom = x;
                    yfrom = y;
                }
            }
        }
        if(xto < 0 || yto < 0 || xfrom < 0 || yfrom < 0) return null;
        return {
            from:
            {
                x: xfrom,
                y: yfrom
            },
            to:
            {
                x: xto,
                y: yto
            },
            p: promotion
        };
    }
}

function genMoves(pos)
{
    var moves = [];
    for(var x1 = 0; x1 < 8; x1++)
        for(var y1 = 0; y1 < 8; y1++)
            for(var x2 = 0; x2 < 8; x2++)
                for(var y2 = 0; y2 < 8; y2++)
                {
                    if(isLegal(pos,
                        {
                            x: x1,
                            y: y1
                        },
                        {
                            x: x2,
                            y: y2
                        }))
                    {
                        if((y2 == 0 || y2 == 7) && pos.b[x1][y1].toUpperCase() == "P")
                        {
                            moves.push(
                            {
                                from:
                                {
                                    x: x1,
                                    y: y1
                                },
                                to:
                                {
                                    x: x2,
                                    y: y2
                                },
                                p: "N"
                            });
                            moves.push(
                            {
                                from:
                                {
                                    x: x1,
                                    y: y1
                                },
                                to:
                                {
                                    x: x2,
                                    y: y2
                                },
                                p: "B"
                            });
                            moves.push(
                            {
                                from:
                                {
                                    x: x1,
                                    y: y1
                                },
                                to:
                                {
                                    x: x2,
                                    y: y2
                                },
                                p: "R"
                            });
                            moves.push(
                            {
                                from:
                                {
                                    x: x1,
                                    y: y1
                                },
                                to:
                                {
                                    x: x2,
                                    y: y2
                                },
                                p: "Q"
                            });
                        }
                        else moves.push(
                        {
                            from:
                            {
                                x: x1,
                                y: y1
                            },
                            to:
                            {
                                x: x2,
                                y: y2
                            }
                        });
                    }
                }
    return moves;
}

function sanMove(pos, move, moves)
{
    var s = "";
    if(move.from.x == 4 && move.to.x == 6 && pos.b[move.from.x][move.from.y].toLowerCase() == "k")
    {
        s = 'O-O';
    }
    else if(move.from.x == 4 && move.to.x == 2 && pos.b[move.from.x][move.from.y].toLowerCase() == "k")
    {
        s = 'O-O-O';
    }
    else
    {
        var piece = pos.b[move.from.x][move.from.y].toUpperCase();
        if(piece != "P")
        {
            var a = 0,
                sx = 0,
                sy = 0;
            for(var i = 0; i < moves.length; i++)
            {
                if(pos.b[moves[i].from.x][moves[i].from.y] == pos.b[move.from.x][move.from.y] &&
                    (moves[i].from.x != move.from.x || moves[i].from.y != move.from.y) &&
                    (moves[i].to.x == move.to.x && moves[i].to.y == move.to.y))
                {
                    a++;
                    if(moves[i].from.x == move.from.x) sx++;
                    if(moves[i].from.y == move.from.y) sy++;
                }
            }
            s += piece;
            if(a > 0)
            {
                if(sx > 0 && sy > 0) s += "abcdefgh" [move.from.x] + "87654321" [move.from.y];
                else if(sx > 0) s += "87654321" [move.from.y];
                else s += "abcdefgh" [move.from.x];
            }
        }
        if(pos.b[move.to.x][move.to.y] != "-" || piece == "P" && move.to.x != move.from.x)
        {
            if(piece == "P") s += "abcdefgh" [move.from.x];
            s += 'x';
        }
        s += "abcdefgh" [move.to.x] + "87654321" [move.to.y];
        if(piece == "P" && (move.to.y == 0 || move.to.y == 7)) s += "=" + (move.p == null ? "Q" : move.p);
    }
    var pos2 = doMove(pos, move.from, move.to, move.p);
    if(isWhiteCheck(pos2) || isWhiteCheck(colorflip(pos2))) s += genMoves(pos2).length == 0 ? "#" : "+";
    return s;
}

function fixCastling(pos)
{
    pos.c[0] &= !(pos.b[7][7] != 'R' || pos.b[4][7] != 'K');
    pos.c[1] &= !(pos.b[0][7] != 'R' || pos.b[4][7] != 'K');
    pos.c[2] &= !(pos.b[7][0] != 'r' || pos.b[4][0] != 'k');
    pos.c[3] &= !(pos.b[0][0] != 'r' || pos.b[4][0] != 'k');
}

function checkPosition(pos)
{
    var errmsgs = [];
    var wk = bk = 0,
        wp = bp = 0,
        wpr = bpr = 0,
        wn = wb1 = wb2 = wr = wq = 0,
        bn = bb1 = bb2 = br = bq = 0;
    for(var x = 0; x < 8; x++)
    {
        for(var y = 0; y < 8; y++)
        {
            var c = ((x + y) % 2) == 0;
            if(pos.b[x][y] == 'K') wk++;
            if(pos.b[x][y] == 'k') bk++;
            if(pos.b[x][y] == 'P') wp++;
            if(pos.b[x][y] == 'p') bp++;
            if(pos.b[x][y] == 'N') wn++;
            if(pos.b[x][y] == 'n') bn++;
            if(c && pos.b[x][y] == 'B') wb1++;
            if(c && pos.b[x][y] == 'b') bb1++;
            if(!c && pos.b[x][y] == 'B') wb2++;
            if(!c && pos.b[x][y] == 'b') bb2++;
            if(pos.b[x][y] == 'R') wr++;
            if(pos.b[x][y] == 'r') br++;
            if(pos.b[x][y] == 'Q') wq++;
            if(pos.b[x][y] == 'q') bq++;
            if(pos.b[x][y] == 'P' && (y == 0 || y == 7)) wpr++;
            if(pos.b[x][y] == 'p' && (y == 0 || y == 7)) bpr++;
        }
    }
    if(wk == 0) errmsgs.push("Missing white king");
    if(bk == 0) errmsgs.push("Missing black king");
    if(wk > 1) errmsgs.push("Two white kings");
    if(bk > 1) errmsgs.push("Two black kings");
    var wcheck = isWhiteCheck(pos);
    var bcheck = isWhiteCheck(colorflip(pos));
    if(pos.w && bcheck || !pos.w && wcheck) errmsgs.push("Non-active color is in check");
    if(wp > 8) errmsgs.push("Too many white pawns");
    if(bp > 8) errmsgs.push("Too many black pawns");
    if(wpr > 0) errmsgs.push("White pawns in first or last rank");
    if(bpr > 0) errmsgs.push("Black pawns in first or last rank");
    var we = Math.max(0, wq - 1) + Math.max(0, wr - 2) + Math.max(0, wb1 - 1) + Math.max(0, wb2 - 1) + Math.max(0, wn - 2);
    var be = Math.max(0, bq - 1) + Math.max(0, br - 2) + Math.max(0, bb1 - 1) + Math.max(0, bb2 - 1) + Math.max(0, bn - 2);
    if(we > Math.max(0, 8 - wp)) errmsgs.push("Too many extra white pieces");
    if(be > Math.max(0, 8 - bp)) errmsgs.push("Too many extra black pieces");
    if((pos.c[0] && (pos.b[7][7] != 'R' || pos.b[4][7] != 'K')) ||
        (pos.c[1] && (pos.b[0][7] != 'R' || pos.b[4][7] != 'K'))) errmsgs.push("White has castling rights and king or rook not in their starting position");
    if((pos.c[2] && (pos.b[7][0] != 'r' || pos.b[4][0] != 'k')) ||
        (pos.c[3] && (pos.b[0][0] != 'r' || pos.b[4][0] != 'k'))) errmsgs.push("Black has castling rights and king or rook not in their starting position");
    return errmsgs;
}

// Move list
function refreshMoves()
{
    var pos = parseFEN(getCurFEN());
    _curmoves = [];
    setElemText(document.getElementById("moves"), "");
    var errmsgs = checkPosition(pos);
    if(errmsgs.length == 0)
    {
        var moves = genMoves(pos);
        for(var i = 0; i < moves.length; i++)
        {
            _curmoves.push(
            {
                move: moves[i],
                san: sanMove(pos, moves[i], moves),
                fen: generateFEN(doMove(pos, moves[i].from, moves[i].to, moves[i].p)),
                w: !pos.w,
                eval: null,
                depth: 0
            });
        }
        if(_curmoves.length == 0)
        {
            var matecheck = pos.w && isWhiteCheck(pos) || !pos.w && isWhiteCheck(colorflip(pos));
            var div0 = document.createElement('div');
            div0.style.padding = "8px 16px";
            var div = document.createElement('div');
            div.style.backgroundColor = "#800080";
            div.className = "positionStatus";
            setElemText(div, matecheck ? "Checkmate" : "Stalemate");
            div0.appendChild(div);
            var ul = document.createElement('ul'),
                li = document.createElement('li');
            setElemText(li, matecheck && pos.w ? "Black wins" : matecheck ? "White wins" : "Draw");
            ul.appendChild(li);
            div0.appendChild(ul);
            document.getElementById("moves").appendChild(div0);
        }
        else
        {
            showEvals();
        }
    }
    else
    {
        var div0 = document.createElement('div');
        div0.style.padding = "8px 16px";
        var div = document.createElement('div');
        div.style.backgroundColor = "#bb0000";
        div.className = "positionStatus";
        setElemText(div, "Illegal position");
        div0.appendChild(div);

        var ul = document.createElement('ul');
        for(var i = 0; i < errmsgs.length; i++)
        {
            var li = document.createElement('li');
            setElemText(li, errmsgs[i]);
            ul.appendChild(li);
        }
        div0.appendChild(ul);

        document.getElementById("moves").appendChild(div0);

    }

}

// History

function historyButtons()
{
    document.getElementById('buttonBack').className = _historyindex > 0 ? "on" : "off";
    document.getElementById('buttonForward').className = _historyindex < _history.length - 1 ? "on" : "off";
}

function historySave()
{}

function historyAdd(fen, oldhistory, move, san)
{
    if(_historyindex >= 0 && _history[_historyindex][0] == fen) return;
    var c = null;
    if(oldhistory != null)
    {
        for(var i = 0; i < oldhistory.length; i++)
        {
            if(oldhistory[i][0] == fen && oldhistory[i].length > 1) c = oldhistory[i][1];
        }
    }
    else
    {
        if(_history2 == null)
        {
            _history2 = [_historyindex, JSON.parse(JSON.stringify(_history))];
            refreshButtonRevert();
        }
    }
    _historyindex++;
    _history.length = _historyindex;
    _history.push([fen, c, move, san]);
    historyButtons();
    historySave();
}

function historyMove(v, e, ctrl)
{
    if(e == null) e = window.event;
    var oldindex = _historyindex;
    if(_historyindex == _history.length - 1 &&
        _history[_historyindex][0] != getCurFEN()) historyAdd(getCurFEN());
    _historyindex += v
    if(_historyindex < 0) _historyindex = 0;
    if(_historyindex >= _history.length) _historyindex = _history.length - 1;
    if((e != null && e.ctrlKey && Math.abs(v) == 1) || ctrl) _historyindex = v == 1 ? _history.length - 1 : 0;
    if(v == 0 || (oldindex != _historyindex || getCurFEN() != _history[_historyindex][0]))
    {
        setCurFEN(_history[_historyindex][0]);
        historyButtons();
        historySave();
        showBoard();
    }
}

function historyKeep(wname, bname)
{
    _wname = wname || "White";
    _bname = bname || "Black";
    _history2 = null;
    refreshButtonRevert();
    historyMove(0);
}

// Mouse and keyboard events
function getCurScale()
{
    if(document.getElementById("wChessboard").style.display == "none") return 1;
    return Math.min((document.getElementById("wChessboard").clientWidth - 414 + 408) / 408,
        (document.getElementById("wChessboard").clientHeight + (_mobile ? 30 : 0) - 437 + 368) / 368);
}

function getDragX(x, full)
{
    var bb = document.getElementById('chessboard1').getBoundingClientRect();
    var w = bb.width / 8;
    var offsetX = bb.left + w / 2;
    if(_flip) return 7 - Math.round((x - offsetX) / w);
    else return Math.round((x - offsetX) / w);
}

function getDragY(y, full)
{
    var bb = document.getElementById('chessboard1').getBoundingClientRect();
    var h = bb.width / 8;
    var offsetY = bb.top + h / 2;
    if(_flip) return 7 - Math.round((y - offsetY) / h);
    else return Math.round((y - offsetY) / h);
}

function getCurSan(move)
{
    if(move == null) return null;
    for(var i = 0; i < _curmoves.length; i++)
        if(_curmoves[i].move.from.x == move.from.x && _curmoves[i].move.from.y == move.from.y &&
            _curmoves[i].move.to.x == move.to.x && _curmoves[i].move.to.y == move.to.y &&
            _curmoves[i].move.p == move.p) return _curmoves[i].san;
    return null;
}

function onMouseDown(e)
{
    if(_menu) showHideMenu(false, e);
    if(e == null) e = window.event;
    var elem = target = e.target != null ? e.target : e.srcElement;
    if(document.onmousemove == graphMouseMove && target != null && target.id != 'graphWrapper' && target.id != 'graph')
    {
        document.getElementById("graphWrapper").onmouseout();
    }
    else if(document.onmousemove == graphMouseMove)
    {
        graphMouseDown(e);
        return;
    }
    if(_dragElement != null) return true;
    if(target != null && target.className == 'cbCell' && target.children[0].id == 'chessboard1')
    {
        target = target.children[0];
        var bb = document.getElementById('chessboard1').getBoundingClientRect();
        var w = bb.width / 8;
        var cx = Math.round((e.clientX - bb.left - (w / 2)) / w);
        var cy = Math.round((e.clientY - bb.top - (w / 2)) / w);
        for(var i = 0; i < target.children.length; i++)
        {
            e0 = target.children[i];
            if(e0.style.left == (cx * 40) + "px" && e0.style.top == (cy * 40) + "px") elem = e0;
        }
    }
    while(target != null && target.id != 'chessboard1' && target.id != 'editWrapper' && target.tagName != 'BODY')
    {
        target = target.parentNode;
    }
    if(target == null) return true;
    if(elem.id == 'editWrapper' || elem.className.length < 3) return;
    if(target.id != 'editWrapper' && target.id != 'chessboard1') return true;

    var edit = isEdit();
    if(edit && target.id == 'chessboard1' && elem.className != null && (e.which === 2 || e.button === 4))
    {
        if(getPaintPiece() == elem.className[2]) setPaintPiece('S');
        else setPaintPiece(elem.className[2]);
        if(e && e.preventDefault) e.preventDefault();
        return;
    }
    if(target.id == 'chessboard1' && edit && (getPaintPiece() != 'S' || (e.which === 3 || e.button === 2)))
    {
        if(e && e.preventDefault) e.preventDefault();
        paintMouse(e);
        return;
    }

    document.onmousemove = onMouseMove;
    document.body.focus();
    document.onselectstart = function()
    {
        return false;
    };
    elem.ondragstart = function()
    {
        return false;
    };
    _dragActive = false;
    _dragElement = elem;
    _startX = e.clientX;
    _startY = e.clientY;
    _dragCtrl = target.id == 'editWrapper' ? true : e.ctrlKey;
    _dragLMB = (e.which === 3 || e.button === 2) ? 1 : 0;
    return false;

}

function dragActivate()
{
    if(_dragElement == null) return;
    if(_dragElement.parentNode == null) return;
    if(_dragElement.className[2] == '-' && !dragFromEditTools) return;
    var dragFromEditTools = _dragElement.parentNode.id != 'chessboard1';

    var clone = _dragElement.cloneNode(false);
    if(!_dragCtrl) _dragElement.className = _dragElement.className[0] + " -";
    _dragElement = clone;
    _dragElement.className = _dragElement.className.substring(0, 3);
    _dragElement.style.backgroundColor = "transparent";
    _dragElement.style.background = "none";
    _dragElement.style.zIndex = 10000;
    _dragElement.style.pointerEvents = "none";
    _dragElement.style.transform = "scale(" + getCurScale() + ")";
    document.getElementById('dragPiece').appendChild(_dragElement);
    _dragActive = true;
    if(!isEdit() && !_dragCtrl) showLegalMoves(
    {
        x: getDragX(_startX),
        y: getDragY(_startY)
    });
    if(dragFromEditTools) setPaintPiece(_dragElement.className[2]);
}

function doMoveHandler(move, copy)
{
    updateTooltip("");
    var oldfen = getCurFEN();
    var pos = parseFEN(oldfen);
    var legal = copy == null && isLegal(pos, move.from, move.to) && _curmoves.length > 0;
    if(legal)
    {
        var san = getCurSan(move);
        if(pos.w != _play) pos = doMove(pos, move.from, move.to, move.p);
        historyAdd(oldfen);
        setCurFEN(generateFEN(pos));
        historyAdd(getCurFEN(), null, move, san);
        showBoard(getCurFEN() == oldfen);
        doComputerMove();
    }
    else if(isEdit() && (move.from.x != move.to.x || move.from.y != move.to.y))
    {
        if(copy && bounds(move.to.x, move.to.y))
        {
            pos.b[move.to.x][move.to.y] = copy;
        }
        else if(!copy && bounds(move.from.x, move.from.y))
        {
            if(bounds(move.to.x, move.to.y)) pos.b[move.to.x][move.to.y] = pos.b[move.from.x][move.from.y];
            pos.b[move.from.x][move.from.y] = '-';
        }
        else return false;
        fixCastling(pos);
        historyAdd(oldfen);
        setCurFEN(generateFEN(pos));
        historyAdd(getCurFEN());
        showBoard(getCurFEN() == oldfen);
    }
    else return false;
    return true;
}

function onMouseMove(e)
{
    defaultMouseMove(e);
    if(document.onmousemove != onMouseMove && isEdit() && getPaintPiece() != 'S') paintMouse(e, getPaintPiece());
    if(_dragElement == null) return;
    if(e == null) e = window.event;
    if(!_dragActive)
    {
        if(Math.abs(e.clientX - _startX) < 8 && Math.abs(e.clientY - _startY) < 8) return;
        if(_dragLMB > 0)
        {
            var x1 = getDragX(_startX),
                y1 = getDragY(_startY),
                x2 = getDragX(e.clientX),
                y2 = getDragY(e.clientY);
            showArrow3(
            {
                from:
                {
                    x: x1,
                    y: y1
                },
                to:
                {
                    x: x2,
                    y: y2
                }
            });
            _dragLMB = 2;
            return;
        }
        if('PNBRQK'.indexOf(_dragElement.className[2].toUpperCase()) < 0) return;
        dragActivate();
    }

    _dragElement.style.left = (e.clientX * _bodyScale - 20) + 'px';
    _dragElement.style.top = (getClientY(e) - 20) + 'px';
    _dragElement.style.color = 'transparent';
    setElemText(_dragElement, '-'); // force browser to refresh pop-up
}

function onMouseUp(e)
{
    if(document.onmousemove == graphMouseMove) return;
    onMouseMove(e);
    if(!_dragActive && _clickFrom != null && _clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 && _dragLMB == 0)
    {
        var oldDragElement = _dragElement;
        _dragElement = _clickFromElem;
        var x2 = getDragX(e.clientX);
        var y2 = getDragY(e.clientY);
        _dragElement = null;
        if(!doMoveHandler(
            {
                from: _clickFrom,
                to:
                {
                    x: x2,
                    y: y2
                }
            })) _dragElement = oldDragElement;
    }
    if(_dragElement != null)
    {
        var x1 = getDragX(_startX),
            y1 = getDragY(_startY);
        var x2 = getDragX(e.clientX),
            y2 = getDragY(e.clientY);
        if(_dragActive)
        {
            if(!doMoveHandler(
                {
                    from:
                    {
                        x: x1,
                        y: y1
                    },
                    to:
                    {
                        x: x2,
                        y: y2
                    }
                }, _dragCtrl ? _dragElement.className[2] : null))
            {
                showBoard(true);
            }
            else
            {
                if(!bounds(x1, y1)) setPaintPiece('S');
            }
        }
        else
        {
            var ew1br = document.getElementById('editWrapper').children[0].children[0].getBoundingClientRect();
            var ew1w = ew1br.width;
            if(_dragElement.parentNode.id != 'chessboard1')
            {
                x1 = -Math.round((e.clientX - ew1br.left - (ew1w / 2)) / ew1w) - 1;
                y1 = -Math.round((e.clientY - ew1br.top - (ew1w / 2)) / ew1w) - 1;
                if(_dragElement.parentNode.className != "cb" || x1 > 0 || y1 > 0) x1 = y1 = -99;
            }
            if(e.which === 3 || e.button === 2)
            {
                if(_dragElement.parentNode.id == 'chessboard1')
                {
                    if(_dragLMB == 1)
                    {
                        var c = _dragElement.className;
                        _dragElement.className = c.split(' ')[0] + " " + c.split(' ')[1] +
                            (c.indexOf(" h0") >= 0 ? " h0" : "") +
                            (c.indexOf(" h1") >= 0 ? " h1" : "") +
                            (c.indexOf(" h2") >= 0 ? " h2" : "") +
                            (c.indexOf(" h3") < 0 ? " h3" : "");
                    }
                    finalArrow3();
                }
                else
                {
                    var list = document.getElementById('editWrapper').children[0].children,
                        p = null;
                    for(var i = 0; i < list.length; i++)
                    {
                        var x1c = -Math.round((list[i].getBoundingClientRect().left - ew1br.left) / ew1w) - 1;
                        var y1c = -Math.round((list[i].getBoundingClientRect().top - ew1br.top) / ew1w) - 1;
                        if(list[i].className != null && x1c == x1 && y1c == y1) p = list[i].className[2];
                    }
                    if(p != null)
                    {
                        if(p == 'S') setCurFEN(START);
                        else if(p == '-') setCurFEN("8/8/8/8/8/8/8/8 w - - 0 0");
                        else
                        {
                            var pos = parseFEN(getCurFEN());
                            for(var x = 0; x < 8; x++)
                                for(var y = 0; y < 8; y++)
                                    if(pos.b[x][y] == p) pos.b[x][y] = '-';
                            fixCastling(pos);
                            setCurFEN(generateFEN(pos));
                        }
                        historySave();
                        showBoard();
                    }
                }
            }
            else if(_clickFrom != null &&
                _clickFromElem != null &&
                _clickFromElem.className.indexOf(" h0") > 0 &&
                _clickFrom.x == x1 &&
                _clickFrom.y == y1 ||
                _dragElement.className[2] == '-' && _dragElement.parentNode.id == 'chessboard1')
            {
                showLegalMoves(null);
            }
            else
            {
                showLegalMoves(
                {
                    x: x1,
                    y: y1
                });
            }
        }
    }
    else
    {
        if(_clickFrom == null || _clickFrom.x > 0 && _clickFrom.y > 0 || (_clickFromElem != null && _clickFromElem.className[2] == 'S' && (e.which === 1 || e.button === 0))) showLegalMoves(null);
    }
    document.onmousemove = defaultMouseMove;
    document.onselectstart = null;
    _dragElement = null;

}

function onWheel(e)
{
    if(_menu) showHideMenu(false);
    if(e.ctrlKey) return;
    if(isEdit())
    {
        var p = getPaintPiece();
        var str = 'Spnbrqk-PNBRQK';
        var index = str.indexOf(p);
        if(index >= 0)
        {
            if(e.deltaY < 0) index--;
            if(e.deltaY > 0) index++;
            if(index < 0) index = str.length - 1;
            if(index == str.length) index = 0;
            setPaintPiece(str[index]);
        }

    }
    else
    {
        if(e.deltaY < 0) historyMove(-1);
        if(e.deltaY > 0) historyMove(+1);
    }
    e.preventDefault();
}

function setPaintPiece(newp)
{
    var list = document.getElementById('editWrapper').children[0].children,
        newe = null;
    for(var i = 0; i < list.length; i++)
    {
        if(list[i].className != null && list[i].className[2] == newp) newe = list[i];
    }
    if(newe != null)
    {
        var x2 = -Math.round(parseFloat(newe.style.left.replace("px", "")) / 40) - 1;
        var y2 = -Math.round(parseFloat(newe.style.top.replace("px", "")) / 40) - 1;
        showLegalMoves(
        {
            x: x2,
            y: y2
        });
    }
}

function getPaintPiece()
{
    var list = document.getElementById('editWrapper').children[0].children;
    for(var i = 0; i < list.length; i++)
    {
        if(list[i].className != null && list[i].className.indexOf(" h0") > 0) return list[i].className[2];
    }
    return 'S';
}

function isEdit()
{
    return _clickFrom != null && _clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 && _clickFrom.x < 0 && _clickFrom.y < 0;
}

function paintMouse(e, p)
{
    if(e == null) e = window.event;
    var elem = target = e.target != null ? e.target : e.srcElement;
    if(elem.parentNode == null || elem.parentNode.id != 'chessboard1') return;
    var w = elem.getBoundingClientRect().width;
    var h = elem.getBoundingClientRect().height;
    var offsetX = document.getElementById('chessboard1').getBoundingClientRect().left + w / 2;
    var offsetY = document.getElementById('chessboard1').getBoundingClientRect().top + h / 2;
    var x1 = Math.round((e.clientX - offsetX) / w);
    var y1 = Math.round((e.clientY - offsetY) / h);
    if(_flip)
    {
        x1 = 7 - x1;
        y1 = 7 - y1;
    }
    if(bounds(x1, y1) && (_clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 || (e.which === 3 || e.button === 2)))
    {

        var pos = parseFEN(getCurFEN());
        var newp = null;
        if(e.ctrlKey || (e.which === 3 || e.button === 2)) newp = '-';
        else newp = p != null ? p : _clickFromElem.className[2];
        pos.b[x1][y1] = newp;
        fixCastling(pos);
        setCurFEN(generateFEN(pos));
        historySave();
        showBoard(null, null, true);
        if(p == null)
        {
            document.onmousemove = function(event)
            {
                paintMouse(event, newp);
            };
        }
    }
    else document.onmousemove = defaultMouseMove;
}

function onKeyDown(e)
{
    var k = e.keyCode || e.which;
    if(e.ctrlKey) return;
    var c = String.fromCharCode(e.keyCode || e.which).replace(" ", "-");
    if(k == 96 || k == 106)
    {
        if(_engine != null && _engine.ready) command("depth " + (_engine.depth != 0 ? "0" : "15"));
    }
    else if(k == 107)
    {
        if(_engine != null && _engine.ready) command("depth " + Math.min(128, _engine.depth + 1));
    }
    else if(k == 109)
    {
        if(_engine != null && _engine.ready) command("depth " + Math.max(0, _engine.depth - 1));
    }
    else if(k == 38 || k == 37) historyMove(-1);
    else if(k == 33) historyMove(-10);
    else if(k == 36) historyMove(-1, null, true);
    else if(k == 40 || k == 39) historyMove(+1);
    else if(k == 34) historyMove(+10);
    else if(k == 35) historyMove(+1, null, true);
    else if(c == 'R') showBoard(false, true);
    else if(k == 27) command("revert");
    else if(c == 'F') command("flip");
    else if(c == 'T') command("sidetomove");
    else if(c == 'C') showHideWindow("Chessboard");
    else if(c == 'M') showHideWindow("Moves");
    else if(c == 'H') showHideWindow("History");
    else if(c == 'G') showHideWindow("Graph");
    else if(c == 'O') showHideWindow("Opening");
    else if(c == 'S') showHideWindow("Static");
    else if(c == 'L') showHideWindow("Lczero");
    else if(c == 'E') showHideWindow("Edit");
    else if(c == '1') menuAnalysisMode();
    else if(c == '2') menuPlayEngineWhite();
    else if(c == '3') menuPlayEngineBlack();
    else if(c == '4') menuTwoPlayerMode();
}

// Evaluation engine

function loadEngine()
{
    var engine = {
        ready: false,
        kill: false,
        waiting: true,
        depth: 15,
        lastnodes: 0
    };
    var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
    if(typeof(Worker) === "undefined") return engine;
    try
    {
        var worker = new Worker(wasmSupported ? 'stockfish.wasm.js' : 'stockfish.js');
    }
    catch (err)
    {
        return engine;
    }
    worker.onmessage = function(e)
    {
        if(engine.messagefunc) engine.messagefunc(e.data);
    }
    engine.send = function send(cmd, message)
    {
        cmd = String(cmd).trim();
        engine.messagefunc = message;
        worker.postMessage(cmd);
    };
    engine.eval = function eval(fen, done, info)
    {
        engine.send("position fen " + fen);
        engine.send("go depth " + engine.depth, function message(str)
        {
            var matches = str.match(/depth (\d+) .*score (cp|mate) ([-\d]+) .*nodes (\d+) .*pv (.+)/);
            if(!matches) matches = str.match(/depth (\d+) .*score (cp|mate) ([-\d]+).*/);
            if(matches)
            {
                if(engine.lastnodes == 0) engine.fen = fen;
                if(matches.length > 4)
                {
                    var nodes = Number(matches[4]);
                    if(nodes < engine.lastnodes) engine.fen = fen;
                    engine.lastnodes = nodes;
                }
                var depth = Number(matches[1]);
                var type = matches[2];
                var score = Number(matches[3]);
                if(type == "mate") score = (1000000 - Math.abs(score)) * (score <= 0 ? -1 : 1);
                engine.score = score;
                if(matches.length > 5)
                {
                    var pv = matches[5].split(" ");
                    if(info != null && engine.fen == fen) info(depth, score, pv);
                }
            }
            if(str.indexOf("bestmove") >= 0 || str.indexOf("mate 0") >= 0 || str == "info depth 0 score cp 0")
            {
                if(engine.fen == fen) done(str);
                engine.lastnodes = 0;
            }
        });
    };
    engine.send("uci", function onuci(str)
    {
        if(str === "uciok")
        {
            engine.send("isready", function onready(str)
            {
                if(str === "readyok") engine.ready = true;
            });
        }
    });
    return engine;
}

function addHistoryEval(index, score, depth, move)
{
    if(_history[index].length < 2 || _history[index][1] == null || (_history[index][1] != null && _history[index][1].depth < depth))
    {
        var black = _history[index][0].indexOf(" b ") > 0;
        var ei = {
            score: score,
            depth: depth,
            black: black,
            move: move
        };
        if(_history[index].length >= 2) _history[index][1] = ei;
        else
        {
            _history[index].push(ei);
            _history[index].push(null);
        }
        repaintGraph();
        _wantUpdateInfo = true;
    }
}

function evalNext()
{
    for(var i = 0; i < _curmoves.length; i++)
    {
        if(_curmoves[i].depth < _engine.depth)
        {
            var curpos = _curmoves[i].fen;
            _engine.score = null;
            if(!_engine.waiting) return;
            _engine.waiting = false;
            var initialdepth = _engine.depth;
            var savedpv = [];
            _engine.eval(curpos, function done(str)
            {
                _engine.waiting = true;
                if(i >= _curmoves.length || _curmoves[i].fen != curpos) return;
                if(_engine.score != null && _engine.depth == initialdepth)
                {
                    _curmoves[i].eval = _curmoves[i].w ? _engine.score : -_engine.score;
                    _curmoves[i].depth = _engine.depth;
                    var m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
                    _curmoves[i].answer = (m && m.length > 1 && m[1] != null && (m[1].length == 4 || m[1].length == 5)) ? m[1] : null;
                    _curmoves[i].answerpv = [];
                    var pvtext = "";
                    if(_curmoves[i].answer != null)
                    {
                        if(savedpv.length < 1 || savedpv[0] != m[1]) savedpv = [m[1]];
                        if(m.length > 2 && m[2] != null && m[2].length != 4 && m[2].length != 5)
                        {
                            if(savedpv.length < 2 || savedpv[1] != m[2]) savedpv = [m[1], m[2]];
                        }
                        var nextpos = parseFEN(curpos);
                        for(var j = 0; j < savedpv.length; j++)
                        {
                            if(pvtext.length > 0) pvtext += " ";
                            var move = parseBestMove(savedpv[j]);
                            pvtext += sanMove(nextpos, move, genMoves(nextpos));
                            _curmoves[i].answerpv.push(savedpv[j]);
                            if(j + 1 < savedpv.length) nextpos = doMove(nextpos, move.from, move.to, move.p);
                        }
                    }
                    _curmoves[i].pvtext = pvtext.length > 0 ? pvtext : "-";
                    showEvals();
                }
                if(!_engine.kill) evalNext();
            }, function info(depth, score, pv)
            {
                savedpv = pv;
            });
            return;
        }
    }
    if(_curmoves.length > 0 && _history[_historyindex][0] == getCurFEN()) addHistoryEval(_historyindex, _curmoves[0].w ? -_curmoves[0].eval : _curmoves[0].eval, _engine.depth, _curmoves[0].move);
    for(var i = _history.length - 1; i >= 0; i--)
    {
        if(_history[i].length < 2 || _history[i][1] == null || (_history[i][1] != null && _history[i][1].depth < _engine.depth - 1))
        {
            var curpos = _history[i][0];
            _engine.score = null;
            if(!_engine.waiting) return;
            if(checkPosition(parseFEN(curpos)).length > 0)
            {
                addHistoryEval(i, null, _engine.depth - 1);
                if(!_engine.kill) evalNext();
            }
            else
            {
                _engine.waiting = false;
                _engine.eval(curpos, function done(str)
                {
                    _engine.waiting = true;
                    if(i >= _history.length || _history[i][0] != curpos) return;
                    if(_engine.score != null)
                    {
                        var m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
                        var answer = (m && m.length > 1 && (m[1].length == 4 || m[1].length == 5)) ? m[1] : null;
                        addHistoryEval(i, _engine.score, _engine.depth - 1, parseBestMove(answer));
                    }
                    if(!_engine.kill) evalNext();
                });
            }
            return;
        }
    }
    historySave();
}

function applyEval(m, s, d)
{
    if(s == null || m.length < 4 || _engine.depth == 0) return;
    for(var i = 0; i < _curmoves.length; i++)
    {
        if(_curmoves[i].move.from.x == "abcdefgh".indexOf(m[0]) &&
            _curmoves[i].move.from.y == "87654321".indexOf(m[1]) &&
            _curmoves[i].move.to.x == "abcdefgh".indexOf(m[2]) &&
            _curmoves[i].move.to.y == "87654321".indexOf(m[3]))
        {
            if(d > _curmoves[i].depth)
            {
                _curmoves[i].eval = _curmoves[i].w ? -s : s;
                _curmoves[i].depth = d;
                showEvals();
            }
            break;
        }
    }
}

function parseBestMove(m)
{
    if(m == null || m.length < 4) return null;
    var from = {
        x: "abcdefgh".indexOf(m[0]),
        y: "87654321".indexOf(m[1])
    };
    var to = {
        x: "abcdefgh".indexOf(m[2]),
        y: "87654321".indexOf(m[3])
    };
    var p = m.length > 4 ? "nbrq".indexOf(m[4]) : -1;
    if(p < 0) return {
        from: from,
        to: to
    };
    return {
        from: from,
        to: to,
        p: "NBRQ" [p]
    };
}

function evalAll()
{
    if(_play != null) return;
    if(_engine == null || !_engine.ready || !_engine.waiting)
    {
        if(_engine) _engine.kill = true;
        window.setTimeout(evalAll, 50);
        return;
    }
    _engine.kill = false;
    _engine.waiting = false;
    for(var i = 0; i < _curmoves.length; i++)
    {
        _curmoves[i].eval = null;
        _curmoves[i].depth = null;
    }
    if(_engine.depth == 0)
    {
        _engine.waiting = true;
        return;
    }
    var fen = getCurFEN();
    _engine.send("stop");
    _engine.send("ucinewgame");
    _engine.send("setoption name Skill Level value 20");
    _engine.score = null;
    if(_curmoves.length == 0)
    {
        _engine.waiting = true;
        if(!_engine.kill) evalNext();
        return;
    }
    _engine.eval(fen, function done(str)
    {
        _engine.waiting = true;
        if(fen != getCurFEN()) return;
        var matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
        if(matches && matches.length > 1)
        {
            applyEval(matches[1], _engine.score, _engine.depth - 1);
            if(_history[_historyindex][0] == fen) addHistoryEval(_historyindex, _engine.score, _engine.depth - 1, parseBestMove(matches[1]));
        }
        if(!_engine.kill) evalNext();
    }, function info(depth, score, pv)
    {
        if(fen != getCurFEN() || depth <= 10) return;
        applyEval(pv[0], score, depth - 1);
        if(_history[_historyindex][0] == fen) addHistoryEval(_historyindex, score, depth - 1, parseBestMove(pv[0]));
    });
}

function doComputerMove()
{
    if(_play == null) return;
    var fen = getCurFEN();
    if(_isPlayerWhite == true && fen.indexOf(" w ") > 0) return;
    if(_isPlayerWhite == false && fen.indexOf(" b ") > 0) return;
    if(_engine != null && !_engine.waiting)
    {
        if(_engine) _engine.kill = true;
        window.setTimeout(function()
        {
            doComputerMove();
        }, 50);
        return;
    }
    if(_engine == null || !_engine.ready || _engine.depth == 0)
    {
        if(_curmoves.length == 0) return;
        var move = _curmoves[Math.floor(Math.random() * _curmoves.length)].move;
        var san = getCurSan(move);
        var pos = doMove(parseFEN(fen), move.from, move.to, move.p);
        historyAdd(fen);
        setCurFEN(generateFEN(pos));
        historyAdd(getCurFEN(), null, move, san);
        updateTooltip("");
        showBoard(false);
    }
    else
    {
        _engine.kill = false;
        _engine.waiting = false;
        _engine.send("stop");
        _engine.send("ucinewgame");
        _engine.send("setoption name Skill Level value " + (_engine.depth - 1));
        _engine.score = null;
        _engine.eval(fen, function done(str)
        {
            _engine.waiting = true;
            if(fen != getCurFEN()) return;
            var matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
            if(matches && matches.length > 1)
            {
                var move = parseBestMove(matches[1]);
                var san = getCurSan(move);
                var pos = doMove(parseFEN(fen), move.from, move.to, move.p);
                historyAdd(fen);
                setCurFEN(generateFEN(pos));
                historyAdd(getCurFEN(), null, move, san);
                updateTooltip("");
                showBoard(false);
            }
        });
    }
}

// Evaluation graph

var _lastMouseDataPos = null;

function getGraphPointData(i)
{
    var e = null,
        black = false;
    if(_engine == null || _engine.depth == 0) return 0;
    if(i >= 0 && i < _history.length && _history[i].length >= 2 && _history[i][1] != null && _history[i][1].score != null)
    {
        black = _history[i][1].black;
        e = _history[i][1].score / 100;
        if(black) e = -e;
        if((e || 0) > 10) e = 10;
        else if((e || 0) < -10) e = -10;
    }
    return e;
}

function getGraphPointColor(i)
{
    var e = getGraphPointData(i),
        laste = getGraphPointData(i - 1);
    black = i >= 0 && i < _history.length && _history[i].length >= 2 && _history[i][1] != null && _history[i][1].score != null && _history[i][1].black;
    var lost = laste == null || e == null ? 0 : black ? (laste - e) : (e - laste);
    return lost <= 1.0 ? "#008800" : lost <= 3.0 ? "#bb8800" : "#bb0000";
}

function showGraphTooltip(i, event)
{
    if(i >= 0 && i < _history.length && _history[i] != null && _history[i].length > 3 && _history[i][3] != null)
    {
        var pos = parseFEN(_history[i][0]);
        var evalText = _history[i][3];
        if(_history[i][1] != null && _history[i][1].score != null)
        {
            var e = _history[i][1].score;
            if(_history[i][1].black) e = -e;
            evalText += " " + getEvalText(e, true);
        }
        updateTooltip(evalText, null, (pos.w ? (pos.m[1] - 1) + "..." : pos.m[1] + "."), null, event);
    }
    else updateTooltip("");
}

function setupMobileLayout(init)
{
    if(init)
    {
        document.getElementById('colLeft').style.width = "300px";
        document.getElementById('colRight').style.width = "300px";
        document.getElementById('wChessboard').style.margin = "8px 0 0 0";
        document.getElementById('wChessboard').style.resize = "none";
        document.getElementById('wGraph').style.display = "none";
        document.getElementById('wHistory').style.display = "none";
        document.getElementById('wMoves').style.height = "121px";
        document.getElementById('logo').style.height = "20px";
        document.getElementById('logo').style.padding = "0";
        document.getElementById('logo').style.transform = "scale(0.5)";
        document.getElementById('logo').style.transformOrigin = "top left";
        document.getElementById('logotextmain').style.top = "8px";
        document.getElementById('logotextmain').style.left = "75px";
        document.getElementById('logotextsub').style.top = "37px";
        document.getElementById('logotextsub').style.left = "75px";
        document.getElementById('toolbar').style.transform = "scale(2.3)";
        document.getElementById('toolbar').style.transformOrigin = "top left";
        document.getElementById('toolbar').style.top = "-2px";
        document.getElementById('toolbar').style.left = "345px";
        document.getElementById('toolbar').style.width = "112px";
        document.getElementById('wb').style.transform = "scale(2)";
        document.getElementById('wb').style.transformOrigin = "top left";
        document.getElementById('positionInfo').style.display = "none";
        document.getElementById('searchWrapper').style.top = "0";
        document.getElementById('searchWrapper').style.height = "24px";
        document.getElementById('searchInput').style.padding = "4px 4px 3px 4px";
        document.getElementById('boxBoardOuter').style.marginTop = "31px";
        document.getElementById('moves').style.bottom =
            document.getElementById('history').style.bottom =
            document.getElementById('opening').style.bottom =
            document.getElementById('static').style.bottom =
            document.getElementById('lczero').style.bottom = "6px";
        document.getElementById('buttonGo').style.padding = "3px 4px 5px 4px";
        document.getElementById('buttonGo').style.top = "0";
        document.getElementById('movesFooter').style.height = document.getElementById('lczeroFooter').style.height = "6px";
        document.getElementById('movesFooter').style.lineHeight = document.getElementById('lczeroFooter').style.lineHeight = "6px";
        document.getElementById('movesFooter').style.fontSize = document.getElementById('lczeroFooter').style.fontSize = "5px";
        document.getElementById('movesFooter').style.fontWeight = document.getElementById('lczeroFooter').style.fontWeight = "500";
    }
    var winWidth = Math.min(window.innerWidth, window.outerWidth);
    var winHeight = Math.min(window.innerHeight, window.outerHeight);
    var horiz = winWidth > winHeight;
    var width = horiz ? 660 : 320;
    var scale = winWidth / width;
    _bodyScale = 1 / scale;
    var height = horiz ? Math.max(280, Math.min(504, winHeight / scale)) : Math.max(490, winHeight / scale);
    document.body.style.display = "flex";
    document.body.style.transformOrigin = "top left";
    document.body.style.transform = "scale(" + (scale) + ")";
    document.body.style.width = width + "px";
    document.body.style.height = height + "px";
    document.body.style.overflowX = "hidden";
    document.getElementById('container').style.width = width + "px";
    document.getElementById('container').style.height = height + "px";

    document.getElementById('logo').style.position = horiz ? "absolute" : "";
    document.getElementById('logo').style.top = horiz ? "0" : "";
    document.getElementById('logo').style.left = horiz ? "355px" : "";
    document.getElementById('wChessboard').style.width = horiz ? "310px" : "";
    document.getElementById('wChessboard').style.height = (horiz ? height - 16 : 300) + "px";
    document.getElementById('wb').style.top = horiz ? "0" : "329px";
    document.getElementById('wb').style.right = horiz ? "324px" : "162px";
    document.getElementById('wb').style.width = horiz ? "21px" : "";
    document.getElementById('wb').style.height = horiz ? "120px" : "";
    document.getElementById('colLeft').style.minWidth = horiz ? "300px" : "";
    document.getElementById('colLeft').style.minHeight = horiz ? "1px" : "338px";
    document.getElementById('colLeft').style.paddingBottom = horiz ? "" : "24px";
    document.getElementById('colLeft').style.marginLeft = horiz ? "5px" : "10px";
    document.getElementById('colRight').style.marginLeft = horiz ? "45px" : "10px";
    document.getElementById('colRight').style.marginTop = horiz ? "29px" : "";

    var elems = document.getElementById("colRight");
    for(var i = 0; i < elems.children.length; i++)
    {
        var div = elems.children[i];
        if(div.tagName != 'DIV' || div.className != "box") continue;
        div.style.height = (horiz ? 243 + height - 280 : 121 + height - 490) + "px";
        div.style.margin = "0";
        div.style.resize = "none";
    }
}

function checkSizes()
{
    if(_mobile && (document.activeElement == null || document.activeElement.tagName != "INPUT")) setupMobileLayout(false);

    // Graph
    var cw = document.getElementById("graphWrapper").clientWidth;
    var ch = document.getElementById("graphWrapper").clientHeight;
    var canvas = document.getElementById("graph");
    if(canvas.width != cw || canvas.height != ch) repaintGraph();

    // Chessboard
    var targetScale = Math.round(getCurScale() * 1000) / 1000;
    var targetMargin = ((document.getElementById("wChessboard").clientWidth - (document.getElementById("boxBoard").clientWidth + 4) * targetScale) / 2) - 0.5;
    var oldScale = parseFloat(document.getElementById("boxBoard").style.transform.replace("scale(", "").replace(")", ""));
    var oldMargin = parseFloat(document.getElementById("boxBoardOuter").style.marginLeft.replace("px", ""));
    if(Math.round(oldScale * 1000) != Math.round(targetScale * 1000) ||
        Math.round(oldMargin) != Math.round(targetMargin))
    {
        document.getElementById("boxBoard").style.transform = "scale(" + targetScale + ")";
        document.getElementById("boxBoardOuter").style.marginLeft =
            document.getElementById("boxBoardOuter").style.marginRight = targetMargin + "px";
    }

    if(_wantUpdateInfo)
    {
        _wantUpdateInfo = false;
        updateInfo();
    }

}

function repaintGraph(event)
{
    var data = [];
    var color = [];
    var laste = null;
    for(var i = 0; i < _history.length; i++)
    {
        data.push(getGraphPointData(i));
        color.push(getGraphPointColor(i));
    }
    var border1 = 4.5,
        border2 = 18.5;
    var xMax = 40,
        yMax = 2,
        xStep = 10,
        yStep = 1;
    for(var i = 0; i < data.length; i++)
        if(Math.ceil(Math.abs(data[i])) > yMax) yMax = Math.ceil(Math.abs(data[i]));
    if(data.length > xMax) xMax = data.length;
    var cw = document.getElementById("graphWrapper").clientWidth;
    var ch = document.getElementById("graphWrapper").clientHeight;
    if(event != null)
    {
        var rect = document.getElementById("graph").getBoundingClientRect();
        var mx = event.clientX - rect.left;
        var my = event.clientY - rect.top;
        var mouseDataPos = null;
        var b1 = border1 / _bodyScale,
            b2 = border2 / _bodyScale;
        var mUnit = (rect.width - b1 - b2) / xMax;
        if(mx > b2 + mUnit / 2 && mx < rect.width - b1 + mUnit / 2 && my > b1 && my < rect.height - b2)
        {
            mouseDataPos = Math.round((mx - b2) / mUnit) - 1;
        }
        if(mouseDataPos == _lastMouseDataPos) return;
        _lastMouseDataPos = mouseDataPos;
    }
    else _lastMouseDataPos = mouseDataPos;

    var canvas = document.getElementById("graph");
    var ctx = canvas.getContext("2d");
    canvas.width = cw;
    canvas.height = ch;
    var yTotal = canvas.height - border1 - border2,
        xTotal = canvas.width - border1 - border2;
    var xUnit = xTotal / (xMax / xStep),
        yUnit = yTotal / (yMax * 2 / yStep);
    if(yUnit > 0)
        while(yUnit < 12)
        {
            yUnit *= 2;
            yStep *= 2;
        }
    if(xUnit > 0)
        while(xUnit < 18)
        {
            xUnit *= 2;
            xStep *= 2;
        }

    ctx.font = "10px Segoe UI";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#a0aab4";
    ctx.fillText("0", border2 - 6, border1 + yTotal / 2);
    ctx.beginPath();
    ctx.strokeStyle = "#738191";
    for(var i = yStep; i <= yMax; i += yStep)
    {
        if(i == 0) continue;
        var y = Math.round(i * yUnit / yStep);
        ctx.fillText("+" + i, border2 - 6, border1 + yTotal / 2 - y);
        ctx.fillText("-" + i, border2 - 6, border1 + yTotal / 2 + y);
        if(i < yMax)
        {
            ctx.moveTo(border2, border1 + yTotal / 2 - y);
            ctx.lineTo(border2 + xTotal, border1 + yTotal / 2 - y);
            ctx.moveTo(border2, border1 + yTotal / 2 + y);
            ctx.lineTo(border2 + xTotal, border1 + yTotal / 2 + y);
        }
    }
    ctx.moveTo(border2, border1);
    ctx.lineTo(border2 + xTotal, border1);
    ctx.stroke();
    ctx.beginPath();

    ctx.textAlign = "center";
    ctx.strokeStyle = "#a0aab4";
    for(var i = 0; i <= xMax; i += xStep)
    {
        var x = Math.round(i * xUnit / xStep);
        ctx.fillText(i / 2, border2 + x, border1 + yTotal + border2 / 2 + 2);
        ctx.moveTo(border2 + x, border1 + yTotal);
        ctx.lineTo(border2 + x, border1 + yTotal + 3);
    }
    for(var i = 0; i <= yMax; i += yStep)
    {
        var y = Math.round(i * yUnit / yStep);
        ctx.moveTo(border2 - 3, border1 + yTotal / 2 - y);
        ctx.lineTo(border2, border1 + yTotal / 2 - y);
        ctx.moveTo(border2 - 3, border1 + yTotal / 2 + y);
        ctx.lineTo(border2, border1 + yTotal / 2 + y);
    }

    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(border2, border1);
    ctx.lineTo(border2, border1 + yTotal);
    ctx.moveTo(border2, border1 + yTotal);
    ctx.lineTo(border2 + xTotal, border1 + yTotal);
    ctx.moveTo(border2, border1 + yTotal / 2);
    ctx.lineTo(border2 + xTotal, border1 + yTotal / 2);

    ctx.stroke();

    for(var i = 1; i < data.length; i++)
    {
        if(data[i] != null && data[i - 1] != null)
        {
            if(color[i] != "#008800")
            {
                ctx.beginPath();
                ctx.strokeStyle = color[i] == "#bb0000" ? "red" : "white";
                ctx.lineWidth = 1;
                ctx.moveTo(border2 + i * (xUnit / xStep), border1 + yTotal / 2 - data[i - 1] * (yUnit / yStep));
                ctx.lineTo(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep));
                ctx.stroke();
            }
            else
            {
                ctx.beginPath();
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1;
                ctx.moveTo(border2 + i * (xUnit / xStep), border1 + yTotal / 2 - data[i - 1] * (yUnit / yStep));
                ctx.lineTo(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep));
                ctx.stroke();
            }
        }
    }
    var i;
    for(i = 0; i < data.length; i++)
    {
        if(i != mouseDataPos && i != _historyindex)
        {
            ctx.beginPath();
            ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 2, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'black';
            ctx.fill();
        }
    }

    i = _historyindex;
    ctx.beginPath();
    ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 4, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 2, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#e1e2e6';
    ctx.fill();

    i = mouseDataPos;
    ctx.beginPath();
    ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 4, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 2, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#64c4db';
    ctx.fill();

    if(event) showGraphTooltip(mouseDataPos, event);
    repaintLastMoveArrow();
}

function defaultMouseMove(event)
{
    if(_tooltipState) updateTooltipPos(event);
}

function graphMouseMove(event)
{
    repaintGraph(event);
    if(_tooltipState) updateTooltipPos(event);
}

function graphMouseDown(event)
{
    if(_lastMouseDataPos != null)
    {
        var i = _lastMouseDataPos;
        if(i < _history.length && i >= 0 && i != _historyindex)
        {
            historyMove(i - _historyindex);
        }
    }
}

// Sidebars

function repaintSidebars()
{
    var pos = parseFEN(getCurFEN());
    var whitemat = [],
        blackmat = [],
        points = 0;
    for(var x = 0; x < 8; x++)
        for(var y = 0; y < 8; y++)
        {
            var p = board(pos, x, y).toLowerCase();
            var col = board(pos, x, y) != p;
            var index = "pnbrqk".indexOf(p);
            if(index >= 0)
            {
                if(col) whitemat.push(index);
                else blackmat.push(index);
                points += (col ? 1 : -1) * [1, 3, 3, 5, 9, 0][index];
            }
        }
    whitemat.sort();
    blackmat.sort();
    for(var i = 0, j = 0; i < whitemat.length && j < blackmat.length;)
    {
        if(whitemat[i] == blackmat[j])
        {
            whitemat.splice(i, 1);
            blackmat.splice(j, 1);
        }
        else if(whitemat[i] < blackmat[j]) i++;
        else if(whitemat[i] > blackmat[j]) j++;
    }
    var elem = document.getElementById("materialWrapper");
    while(elem.firstChild) elem.removeChild(elem.firstChild);
    var fmat = function(mat, flip)
    {
        for(var i = 0; i < mat.length; i++)
        {
            var node1 = document.createElement("DIV");
            node1.className = "pnbrqk" [mat[i]];
            var d = (mat.length - 1 - i) * 16 + "px";
            if(flip) node1.style.top = d;
            else node1.style.bottom = d;
            elem.appendChild(node1);
        }
    }
    if(points < 0) fmat(whitemat, _flip);
    fmat(blackmat, !_flip);
    if(points >= 0) fmat(whitemat, _flip);
    if(points != 0)
    {
        var node1 = document.createElement("DIV");
        node1.appendChild(document.createTextNode("+" + Math.abs(points)));
        var down = points > 0 && !_flip || points < 0 && _flip;
        var d = (_flip ^ down ? whitemat.length : blackmat.length) * 16 + "px";
        if(down) node1.style.bottom = d;
        else node1.style.top = d;
        elem.appendChild(node1);
    }

    elem = document.getElementById("namesWrapperTop");
    while(elem.firstChild) elem.removeChild(elem.firstChild);
    elem.appendChild(document.createTextNode(_flip ? _wname : _bname));
    elem = document.getElementById("namesWrapperBottom");
    while(elem.firstChild) elem.removeChild(elem.firstChild);
    elem.appendChild(document.createTextNode(_flip ? _bname : _wname));
}

// Buttons and menu

function refreshButtonRevert()
{
    if(_history2 == null)
    {
        document.getElementById('buttonRevert').className = "off";
        document.getElementById('buttonRevert').onclick = null;
    }
    else
    {
        document.getElementById('buttonRevert').className = "on";
        document.getElementById('buttonRevert').onclick = function(e)
        {
            command(e.ctrlKey ? "keep" : "revert");
        };
    }
}

function refreshFlip()
{
    var elem = document.getElementById('cbTable');
    for(var i = 0; i < 8; i++)
    {
        elem.children[0].children[0].children[1 + i].innerText =
            elem.children[0].children[9].children[1 + i].innerText = 'abcdefgh' [_flip ? 7 - i : i];
        elem.children[0].children[1 + i].children[0].innerText =
            elem.children[0].children[1 + i].children[i == 0 ? 2 : 1].innerText = '12345678' [_flip ? i : 7 - i];
    }
    showBoard(true);
}

function doFlip()
{
    _flip = !_flip;
    refreshFlip();
    historySave();
}

function showHideWindow(name, targetState)
{

    if(_mobile && name != "Chessboard")
    {
        var wb = document.getElementById("wb").children;
        var lparams = [];
        for(var i = 0; i < wb.length; i++)
        {
            if(wb[i].tagName != 'DIV') continue;
            var wbId = wb[i].id.substring(2);
            if(wbId == "Chessboard") continue;
            document.getElementById("w" + wbId).style.display = "none";
            var wbElem = document.getElementById("wb" + wbId);
            wbElem.className = wbElem.className.replace(" selected", "");
        }
    }
    var boxElem = document.getElementById("w" + name);
    var newState = targetState == null ? boxElem.style.display == "none" : targetState;
    boxElem.style.display = newState ? "" : "none";
    var wbElem = document.getElementById("wb" + name);
    wbElem.className = wbElem.className.replace(" selected", "") + (newState ? " selected" : "");
    checkSizes();
    if((name == "Edit" || _mobile) && isEdit()) showLegalMoves(null);
    if(name == "Graph" && document.onmousemove == graphMouseMove) document.getElementById("graphWrapper").onmouseout();
    if(name == "Lczero" && newState) repaintLczero();
    if(name == "Static" && newState) repaintStatic();
}

function showHideMenu(state, e)
{
    if(e != null)
    {
        var target = e.target != null ? e.target : e.srcElement;
        while(target != null && target.id != 'buttonMenu' && target.id != 'menu' && target.tagName != 'BODY') target = target.parentNode;
        if(target == null) return;
        if(!state && (target.id == 'buttonMenu' || target.id == 'menu')) return;
    }
    if(state) _menu = !_menu;
    else _menu = false;

    var bElem = document.getElementById("buttonMenu");
    var mElem = document.getElementById("menu");
    bElem.className = _menu ? "on down" : "on";
    mElem.style.top = (bElem.getBoundingClientRect().bottom - document.getElementById("container").getBoundingClientRect().top) * _bodyScale + "px";
    mElem.style.left = (bElem.getBoundingClientRect().left - document.getElementById("container").getBoundingClientRect().left) * _bodyScale + "px";
    mElem.style.right = "auto";
    if(_mobile)
    {
        mElem.style.left = "auto";
        mElem.style.right = (-bElem.getBoundingClientRect().right + document.getElementById("container").getBoundingClientRect().right - 1) * _bodyScale + "px";
    }
    mElem.style.display = _menu ? "" : "none";
    if(_menu) reloadMenu();
}

function setBoardColor(c)
{
    var count = 6;
    if(c < 0) c = count - 1;
    if(c >= count) c = 0;
    document.getElementById("cbTable").className = "c" + c;
    document.getElementById("boxBoard").className = "c" + c;
    document.getElementById("chessboard1").className = "cb c" + c;
    var elem = document.getElementById("icolor");
    if(elem != null) elem.className = "c" + c;
    _color = c;
}

function setEngineValue(elem)
{
    setElemText(elem, _engine != null && _engine.ready ? _engine.depth : "0");
    if(_engine != null && _engine.ready && _play != null)
    {
        var table = [0, 1000, 1100, 1200, 1300, 1450, 1600, 1750, 1900, 2050, 2150, 2250, 2350, 2450, 2550, 2650, 2700, 2800, 2900];
        elem.title = _engine.depth == 0 ? "Random play" : _engine.depth >= table.length ? "ELO: 3000+" : "ELO: " + table[_engine.depth];
    }
    else elem.removeAttribute("title");
}

function reloadMenu()
{

    var parent = document.getElementById("menu");
    while(parent.firstChild) parent.removeChild(parent.firstChild);
    var addMenuLine = function()
    {
        var div = document.createElement('div');
        div.className = "menuLine";
        parent.appendChild(div);
    }
    var addMenuItem = function(className, text, key, enabled, func)
    {
        var div = document.createElement('div');
        div.className = "menuItem " + className;
        if(!enabled) div.className += " disabled";
        var span1 = document.createElement('span');
        setElemText(span1, text);
        div.appendChild(span1);
        var span2 = document.createElement('span');
        span2.className = "key";
        if(key != null) setElemText(span2, key);
        div.appendChild(span2);
        if(enabled) div.onclick = func;
        parent.appendChild(div);
    }
    var addMenuItemEngine = function(className, text)
    {
        var div = document.createElement('div');
        div.className = "menuItem " + className;
        var span1 = document.createElement('span');
        setElemText(span1, text);
        div.appendChild(span1);
        var span2 = document.createElement('span');
        span2.id = "buttonEnginePlus";
        span2.onclick = function()
        {
            if(_engine != null && _engine.ready) command("depth " + Math.min(50, _engine.depth + 1));
            showBoard(false, true);
            setEngineValue(document.getElementById("buttonEngineValue"));
        }
        div.appendChild(span2);
        var span3 = document.createElement('span');
        span3.id = "buttonEngineValue";
        span3.onclick = function()
        {
            if(_engine != null && _engine.ready) command("depth " + (_engine.depth != 0 ? "0" : "15"));
            showBoard(false, true);
            setEngineValue(document.getElementById("buttonEngineValue"));
        }
        setEngineValue(span3);

        div.appendChild(span3);
        var span4 = document.createElement('span');
        span4.id = "buttonEngineMinus";
        span4.onclick = function()
        {
            if(_engine != null && _engine.ready) command("depth " + Math.max(0, _engine.depth - 1));
            showBoard(false, true);
            setEngineValue(document.getElementById("buttonEngineValue"));
        }
        div.appendChild(span4);
        parent.appendChild(div);
    }
    var addMenuItemColor = function(className, text)
    {
        var div = document.createElement('div');
        div.className = "menuItem " + className;
        var span1 = document.createElement('span');
        setElemText(span1, text);
        div.appendChild(span1);

        var span2 = document.createElement('span');
        span2.id = "buttonColorNext";
        span2.onclick = function()
        {
            setBoardColor(_color + 1);
        }

        div.appendChild(span2);
        var div1 = document.createElement('div');
        div1.id = "icolor";
        div1.className = "c" + _color;
        div1.onclick = function()
        {
            setBoardColor(0);
        };
        var div2, div3 = document.createElement('div');
        div2 = document.createElement('div');
        div2.style.left = "0px";
        div2.style.top = "0px";
        div2.className = "l";
        div3.appendChild(div2);
        div2 = document.createElement('div');
        div2.style.left = "0px";
        div2.style.top = "5px";
        div2.className = "d";
        div3.appendChild(div2);
        div2 = document.createElement('div');
        div2.style.left = "5px";
        div2.style.top = "0px";
        div2.className = "d";
        div3.appendChild(div2);
        div2 = document.createElement('div');
        div2.style.left = "5px";
        div2.style.top = "5px";
        div2.className = "l";
        div3.appendChild(div2);
        div1.appendChild(div3);
        div.appendChild(div1);

        var span4 = document.createElement('span');
        span4.id = "buttonColorPrev";
        span4.onclick = function()
        {
            setBoardColor(_color - 1);
        }
        div.appendChild(span4);

        parent.appendChild(div);
    }

    addMenuItem("menuAnalysisMode", "Mode 1: Analyze Board", 1, _gameMode != 1, function(e)
    {
        menuAnalysisMode()
    });
    addMenuItem("menuPlayEngine", "Mode 2: Player (White) vs. Engine (Black)", 2, _gameMode != 2, function(e)
    {
        menuPlayEngineWhite()
    });
    addMenuItem("menuPlayEngine", "Mode 3: Engine (White) vs. Player (Black)", 3, _gameMode != 3, function(e)
    {
        menuPlayEngineBlack()
    });
    addMenuItem("menuTwoPlayerMode", "Mode 4: Player vs. Player", 4, _gameMode != 4, function(e)
    {
        menuTwoPlayerMode()
    });

    addMenuLine();

    addMenuItemEngine("menuEngine", _play != null ? "Engine level" : "Engine depth");

    addMenuLine();
    addMenuItem("menuKeep", "Keep changes", null, document.getElementById("buttonRevert").className == "on", function()
    {
        command("keep");
        showHideMenu(false);
    });
    addMenuItem("menuRevert", "Revert changes", "ESC", document.getElementById("buttonRevert").className == "on", function()
    {
        command("revert");
        showHideMenu(false);
    });
    addMenuLine();
    addMenuItem("menuFlip", "Flip board", "F", true, function()
    {
        command("flip");
        showHideMenu(false);
    });
    addMenuItem("menuStm", "Change side to move", "T", true, function()
    {
        command("sidetomove");
        showHideMenu(false);
    });
    addMenuLine();
    addMenuItem("menuStart", "Go to game start", "Home", document.getElementById("buttonBack").className == "on", function()
    {
        historyMove(-1, null, true);
        showHideMenu(false);
    });
    addMenuItem("menuEnd", "Go to game end", "End", document.getElementById("buttonForward").className == "on", function()
    {
        historyMove(+1, null, true);
        showHideMenu(false);
    });
    addMenuItem("menuReset", "Reset game/position", null, true, function()
    {
        command("reset");
        showHideMenu(false);
    });
    addMenuLine();
    addMenuItemColor("menuColor", "Chessboard color");
    addMenuItem("menuWindow", "Open in new window...", null, true, function()
    {
        command("window");
        showHideMenu(false);
    });
}

// Menu Functions

function menuAnalysisMode()
{
    _gameMode = 1;
    _play = null;
    _engine.kill = false;
    showBoard(false);
    showHideMenu(false);
    historySave();
}

function menuPlayEngineWhite()
{
    _gameMode = 2;
    _isPlayerWhite = true;
    _play = 0;
    showBoard(true);
    showHideMenu(false);
    doComputerMove();
    historySave();
}

function menuPlayEngineBlack()
{
    _gameMode = 3;
    _isPlayerWhite = false;
    _play = 1;
    showBoard(true);
    showHideMenu(false);
    doComputerMove();
    historySave();
}

function menuTwoPlayerMode()
{
    _gameMode = 4;
    _engine.kill = true;
    _play = null;
    showBoard(false);
    showHideMenu(false);
    historySave();
}

// URL paramenters

function getParameterByName(name, url)
{
    if(!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if(!results || !results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// Initialization

function setupBoxes()
{
    var elems = [document.getElementById("colLeft"), document.getElementById("colRight")];
    for(var j = 0; j < elems.length; j++)
        for(var i = 0; i < elems[j].children.length; i++)
        {
            var div = elems[j].children[i];
            if(div.tagName != 'DIV') continue;
            if(div.className != "box") continue;
            if(!_mobile)
            {
                setupDragElement(div);
                var divCloseIcon = document.createElement('div');
                divCloseIcon.className = "closeIcon";
                divCloseIcon.onclick = function()
                {
                    var boxElem = this.parentElement;
                    showHideWindow(boxElem.id.substring(1));
                }
                div.appendChild(divCloseIcon);
            }
            if(!_mobile || div.id != "wChessboard")
            {
                var divBoxIcon = document.createElement('div');
                divBoxIcon.className = "boxIcon icon" + div.id.substring(1);
                div.appendChild(divBoxIcon);
            }
            var wbIcon = document.createElement('div');
            wbIcon.id = "wb" + div.id.substring(1);
            wbIcon.className = "wbButton icon" + div.id.substring(1);
            if(div.style.display != "none") wbIcon.className += " selected";

            wbIcon.onclick = function()
            {
                showHideWindow(this.id.substring(2));
            }
            document.getElementById("wb").appendChild(wbIcon);
        }
}

function setupDragElement(elmnt)
{
    var pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    oldDisplay = elmnt.style.display;
    elmnt.style.display = "";
    elmnt.originalWidth = elmnt.style.width = (elmnt.getBoundingClientRect().width - 2) + "px";
    elmnt.originalHeight = elmnt.style.height = (elmnt.getBoundingClientRect().height - 2) + "px";
    elmnt.style.display = oldDisplay;
    elmnt.firstElementChild.onmousedown = startBoxDrag;
    elmnt.firstElementChild.ondblclick = function()
    {
        elmnt.style.width = elmnt.originalWidth;
        elmnt.style.height = elmnt.originalHeight;
        elmnt.style.left = "";
        elmnt.style.top = "";
        elmnt.style.position = "";
        elmnt.style.zIndex = "4";
    };
    setupTouchEvents(elmnt.firstElementChild, startBoxDrag, moveBoxDrag, endBoxDrag);

    var resizeSquare = document.createElement('div');
    resizeSquare.style.position = "absolute";
    resizeSquare.style.bottom = resizeSquare.style.right = "0";
    resizeSquare.style.width = resizeSquare.style.height = "12px";
    resizeSquare.style.cursor = "nw-resize";
    resizeSquare.onmousedown = startBoxResize;
    resizeSquare.ondblclick = function()
    {
        elmnt.style.width = elmnt.originalWidth;
        elmnt.style.height = elmnt.originalHeight;
    };
    setupTouchEvents(resizeSquare, startBoxResize, moveBoxResize, endBoxDrag);
    elmnt.appendChild(resizeSquare);

    function startBoxDrag(e)
    {
        e = e || window.event;
        if(e && e.preventDefault) e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = endBoxDrag;
        document.onmousemove = moveBoxDrag;
    }

    function moveBoxDrag(e)
    {
        e = e || window.event;
        if(e && e.preventDefault) e.preventDefault();
        if(elmnt.style.position != "absolute")
        {
            elmnt.style.width = (elmnt.getBoundingClientRect().width - 2) + "px";
            elmnt.style.height = (elmnt.getBoundingClientRect().height - 2) + "px";
            elmnt.style.left = (elmnt.getBoundingClientRect().left - document.getElementById("container").getBoundingClientRect().left) + "px";
            elmnt.style.top = (elmnt.getBoundingClientRect().top - document.getElementById("container").getBoundingClientRect().top - 8) + "px";
            elmnt.style.position = "absolute";
        }

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        var x0 = parseFloat(elmnt.style.left.replace("px", "")) || 0;
        var y0 = parseFloat(elmnt.style.top.replace("px", "")) || 0;
        elmnt.style.left = (x0 - pos1) + "px";
        elmnt.style.top = (y0 - pos2) + "px";
        elmnt.style.zIndex = "5";
        elmnt.style.cursor = "move";
    }

    function endBoxDrag()
    {
        document.onmouseup = onMouseUp;
        document.onmousemove = defaultMouseMove;
        elmnt.style.zIndex = "4";
        elmnt.style.cursor = "";
    }

    function startBoxResize(e)
    {
        e = e || window.event;
        if(e && e.preventDefault) e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.width = (elmnt.getBoundingClientRect().width - 2) + "px";
        elmnt.style.height = (elmnt.getBoundingClientRect().height - 2) + "px";
        document.onmouseup = endBoxDrag;
        document.onmousemove = moveBoxResize;
    }

    function moveBoxResize(e)
    {
        e = e || window.event;
        if(e && e.preventDefault) e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        var x0 = parseFloat(elmnt.style.width.replace("px", "")) || 0;
        var y0 = parseFloat(elmnt.style.height.replace("px", "")) || 0;
        elmnt.style.width = (x0 - pos1) + "px";
        elmnt.style.height = (y0 - pos2) + "px";
        elmnt.style.zIndex = "5";
        elmnt.style.cursor = "nw-resize";
    }
}

var _staticEvalListCache = [],
    _staticEvalListCacheSize = 20;

function getStaticEvalList(pos)
{
    var posfen = generateFEN(pos);
    for(var si = 0; si < _staticEvalListCache.length; si++)
        if(_staticEvalListCache[si][0] == posfen) return _staticEvalListCache[si][1];

    var data = _staticEvalData;
    var grouplist = [],
        midindex = null,
        endindex = null,
        maincode = null;
    for(var i = 0; i < data.length; i++)
    {
        if(data[i].name == "Middle game evaluation") midindex = i;
        if(data[i].name == "End game evaluation") endindex = i;
        if(data[i].name == "Main evaluation") maincode = data[i].code;
    }
    if(midindex == null || endindex == null || maincode == null) return;
    var zero = function()
    {
        return 0;
    };
    for(var i = 0; i < data.length; i++)
    {
        var n = data[i].name.toLowerCase().replace(/ /g, "_");
        while(i != midindex && i != endindex && maincode.indexOf("$" + n + "(") >= 0)
        {
            try
            {
                maincode = maincode.replace("$" + n + "(", "(function(){return " + eval("$" + n + "(pos)") + ";})(");
            }
            catch (e)
            {
                alert(e.message);
                return [];
            }
        }
        if(data[midindex].code.indexOf("$" + n + "(") < 0 &&
            data[endindex].code.indexOf("$" + n + "(") < 0) continue;
        var code = data[i].code,
            list = [];
        for(var j = 0; j < data.length; j++)
        {
            if(!data[j].graph || data[j].group != data[i].group || i == j) continue;
            var n2 = data[j].name.toLowerCase().replace(/ /g, "_");
            code = code.replace("$" + n2 + "(", "$g-" + n2 + "(").replace("$" + n2 + "(", "$g-" + n2 + "(");
            list.push(n2);
        }
        if(data[i].graph) list.push(n);
        for(var j = 0; j < list.length; j++)
        {
            var n2 = list[j];
            if(code.indexOf("$g-" + n2 + "(") < 0 && !data[i].graph) continue;
            var mw = 0,
                mb = 0,
                ew = 0,
                eb = 0,
                func = null;
            try
            {
                eval("func = " + code.replace("$g-" + n2 + "(", "$" + n2 + "(")
                    .replace("$g-" + n2 + "(", "$" + n2 + "(")
                    .replace(/\$g\-[a-z_]+\(/g, "zero(") + ";");
                if(data[midindex].code.indexOf("$" + n + "(pos") >= 0) mw = func(pos);
                if(data[midindex].code.indexOf("$" + n + "(colorflip(pos)") >= 0) mb = func(colorflip(pos));
                if(data[endindex].code.indexOf("$" + n + "(pos") >= 0) ew = func(pos);
                if(data[endindex].code.indexOf("$" + n + "(colorflip(pos)") >= 0) eb = func(colorflip(pos));
            }
            catch (e)
            {
                alert(e.message);
                return [];
            }
            var evals = [mw - mb, ew - eb];
            var index = grouplist.map(function(e)
            {
                return e.elem;
            }).indexOf(n2);
            if(index < 0)
            {
                grouplist.push(
                {
                    group: data[i].group,
                    elem: n2,
                    item: evals,
                    hidden: false,
                    mc: pos.m[1]
                });
            }
            else
            {
                grouplist[index].item[0] += evals[0];
                grouplist[index].item[1] += evals[1];
            }
        }

    }
    grouplist.sort(function(a, b)
    {
        return (a.group > b.group) ? 1 : ((b.group > a.group) ? -1 : 0);
    });
    maincode = maincode.replace("function $$(pos)", "function $$(PMG,PEG)")
        .replace("$middle_game_evaluation(pos)", "PMG")
        .replace("$end_game_evaluation(pos)", "PEG")
    var mainfunc = eval("(" + maincode + ")");
    for(var i = 0; i < grouplist.length; i++)
    {
        grouplist[i].item.push(mainfunc(grouplist[i].item[0], grouplist[i].item[1]) - mainfunc(0, 0));
    }
    grouplist.push(
    {
        group: "Tempo",
        elem: "tempo",
        item: [mainfunc(0, 0), mainfunc(0, 0), mainfunc(0, 0)],
        hidden: false,
        mc: pos.m[1]
    });

    _staticEvalListCache.push([posfen, grouplist]);
    if(_staticEvalListCache.length > _staticEvalListCacheSize) _staticEvalListCache.shift();
    return grouplist;
}

function setupTouchEvents(elem, funcStart, funcMove, funcEnd)
{
    var onTouch = function(e)
    {
        if(e.cancelable) e.preventDefault();
        if(e.touches.length > 1 || e.type == "touchend" && e.touches.length > 0) return;
        switch(e.type)
        {
            case "touchstart":
                funcStart(e.changedTouches[0]);
                break;
            case "touchmove":
                funcMove(e.changedTouches[0]);
                break;
            case "touchend":
                funcEnd(e.changedTouches[0]);
                break;
        }
    }
    elem.addEventListener("touchstart", onTouch, false);
    elem.addEventListener("touchend", onTouch, false);
    elem.addEventListener("touchcancel", onTouch, false);
    elem.addEventListener("touchmove", onTouch, false);
}

function lczeroEvaluate()
{
    var index = _historyindex;
    if(_history[_historyindex][0] != getCurFEN()) index++;
    var fen = getCurFEN();
    var pos = parseFEN(fen);
    var input = [],
        ckey = "";
    for(var i = 0; i < 8; i++)
    {
        var pos2 = index < 0 ? null : parseFEN(index > _historyindex ? fen : _history[index][0]);
        if(pos2 != null && !pos.w) pos2 = colorflip(pos2);
        var s = "PNBRQKpnbrqk.";
        var rep = 0;
        var samepos = function(a1, a2)
        {
            var aa1 = a1.replace(/^\s+/, '').split(' ');
            var aa2 = a2.replace(/^\s+/, '').split(' ');
            if(aa1[0] != aa2[0]) return false;
            if(aa1[1] != aa2[1]) return false;
            if(aa1[2] != aa2[2]) return false;
            if(aa1[3] != aa2[3]) return false;
            return true;
        }
        if(index >= 0)
        {
            var a1 = index > _historyindex ? fen : _history[index][0];
            for(var j = index - 2; j >= 0; j -= 2)
            {
                var a2 = _history[j][0];
                if(samepos(a1, a2)) rep = 1;
            }
        }
        for(var j = 0; j < s.length; j++)
        {
            for(var y = 0; y < 8; y++)
                for(var x = 0; x < 8; x++)
                {
                    if(pos2 == null) input.push(0);
                    else input.push(j == s.length - 1 ? rep : (board(pos2, x, 7 - y) == s[j]) ? 1 : 0);
                }
        }
        ckey += index < 0 ? "" : rep + ":" + (index > _historyindex ? fen : _history[index][0]) + ",";
        index--;
    }
    v = [];
    v.push(pos == null ? 0 : pos.c[pos.w ? 1 : 3] ? 1 : 0);
    v.push(pos == null ? 0 : pos.c[pos.w ? 0 : 2] ? 1 : 0);
    v.push(pos == null ? 0 : pos.c[pos.w ? 3 : 1] ? 1 : 0);
    v.push(pos == null ? 0 : pos.c[pos.w ? 2 : 0] ? 1 : 0);
    v.push(pos == null ? 0 : pos.w ? 0 : 1);
    v.push(pos == null ? 0 : pos.m[1] - 1);
    v.push(0);
    v.push(1);
    for(var j = 0; j < v.length; j++)
        for(var y = 0; y < 8; y++)
            for(var x = 0; x < 8; x++) input.push(v[j]);

    if(_nncache == null) _nncache = new Map();
    var output;
    if(_nncache.has(ckey))
    {
        output = _nncache.get(ckey, output);
    }
    else
    {
        output = lczero_forward(input);
        if(output == null) return null;
        _nncache.set(ckey, output);
    }

    var winrate = Math.tanh(output[1]);
    var policy = [];
    var alpha = Math.max.apply(Math, output[0]);
    var denom = 0;
    for(var j = 0; j < output[0].length; j++)
    {
        var val = Math.exp(output[0][j] - alpha);
        policy.push(val);
        denom += val;
    }
    for(var j = 0; j < policy.length; j++) policy[j] /= denom;

    var moves = genMoves(pos);
    var ismove = function(x1, y1, x2, y2)
    {
        if(x1 == x2 && y1 == y2) return false;
        if(x1 == x2) return true;
        if(y1 == y2) return true;
        if(Math.abs(x1 - x2) == Math.abs(y1 - y2)) return true;
        if(Math.abs(x1 - x2) == 2 && Math.abs(y1 - y2) == 1) return true;
        if(Math.abs(x1 - x2) == 1 && Math.abs(y1 - y2) == 2) return true;
        return false;
    }
    var x1 = 0,
        y1 = 0,
        x2 = 0,
        y2 = 0,
        pp = 'B',
        px1 = 0,
        pxd = -1;
    for(var j = 0; j < output[0].length; j++)
    {
        var first = true;
        while(x1 < 8 && y1 < 8 && x2 < 8 && y2 < 8 && (!ismove(x1, y1, x2, y2) || first))
        {
            first = false;
            x2++;
            if(x2 == 8)
            {
                x2 = 0;
                y2++;
            }
            if(y2 == 8)
            {
                y2 = 0;
                x1++;
            }
            if(x1 == 8)
            {
                x1 = 0;
                y1++;
            }
            if(y1 == 8) break;
        }
        if(y1 == 8)
        {
            if(pp == 'Q') pp = 'R';
            else if(pp == 'R') pp = 'B';
            else if(pp == 'B')
            {
                pp = 'Q';
                pxd++;
                if(pxd > 1)
                {
                    pxd = -1;
                    px1++;
                }
            }
        }
        for(var i = 0; i < moves.length; i++)
        {
            var move = moves[i];
            var castling = (board(pos, move.from.x, move.from.y).toUpperCase() == 'K' && Math.abs(move.from.x - move.to.x) > 1);
            if(!castling &&
                ((move.from.x == x1 && move.from.y == (pos.w ? 7 - y1 : y1) && move.to.x == x2 && move.to.y == (pos.w ? 7 - y2 : y2) && (move.p == null || move.p == 'N')) ||
                    (y1 == 8 && move.p == pp && move.from.x == px1 && move.to.x == px1 + pxd && move.from.y == (pos.w ? 1 : 6) && move.to.y == (pos.w ? 0 : 7))) ||
                castling &&
                (move.from.x == x1 && move.from.y == (pos.w ? 7 - y1 : y1) && (move.to.x > 3 ? 7 : 0) == x2 && move.to.y == (pos.w ? 7 - y2 : y2))
            )
            {
                move.policy = policy[j];
            }
        }
    }
    return [moves, pos.w ? winrate : -winrate];
}

window.onload = function()
{
    document.onmousedown = onMouseDown;
    document.onmouseup = onMouseUp;
    document.onmousemove = defaultMouseMove;
    document.onkeydown = onKeyDown;
    document.getElementById("chessboard1").oncontextmenu =
        document.getElementById("chessboard1").parentNode.oncontextmenu =
        document.getElementById("editWrapper").oncontextmenu = function()
        {
            return false;
        };
    document.getElementById("chessboard1").parentNode.onwheel =
        document.getElementById("editWrapper").onwheel = onWheel;
    document.getElementById("buttonStm").onclick = function()
    {
        command("sidetomove");
    };
    document.getElementById("buttonFlip").onclick = function()
    {
        doFlip();
    };
    document.getElementById("buttonBack").onclick = function(event)
    {
        historyMove(-1, event);
    };
    document.getElementById("buttonForward").onclick = function(event)
    {
        historyMove(+1, event);
    };
    document.getElementById("buttonMenu").onclick = function(event)
    {
        showHideMenu(true, event);
    };
    document.getElementById("buttonStaticSortByValue").onclick = function(event)
    {
        _staticSortByChange = false;
        repaintStatic();
    };
    document.getElementById("buttonStaticSortByChange").onclick = function(event)
    {
        _staticSortByChange = true;
        repaintStatic();
    };
    document.getElementById("buttonMovesPv").onclick = function(event)
    {
        _movesPv = !_movesPv;
        showEvals();
    };
    document.getElementById("graphWrapper").onmouseover = function()
    {
        if(document.onmousemove == defaultMouseMove) document.onmousemove = graphMouseMove;
    };
    document.getElementById("graphWrapper").onmousedown = function(event)
    {
        if(document.onmousemove == defaultMouseMove)
        {
            document.onmousemove = graphMouseMove;
            graphMouseMove(event);
            graphMouseDown(event);
        }
    };
    document.getElementById("graphWrapper").onmouseout = function()
    {
        if(document.onmousemove == graphMouseMove) document.onmousemove = defaultMouseMove;
        repaintGraph();
        updateTooltip("");
    };
    document.getElementById("graphWrapper").onwheel = function(event)
    {
        onWheel(event);
        showGraphTooltip(_historyindex, event);
    };

    document.getElementById("arrowWrapper1").style.top = document.getElementById("arrowWrapper2").style.top = document.getElementById("arrowWrapper3").style.top = document.getElementById('chessboard1').getBoundingClientRect().top - document.getElementById("boardWrapper").getBoundingClientRect().top + "px";
    document.getElementById("arrowWrapper1").style.left = document.getElementById("arrowWrapper2").style.left = document.getElementById("arrowWrapper3").style.left = document.getElementById('chessboard1').getBoundingClientRect().left - document.getElementById("boardWrapper").getBoundingClientRect().left + "px";
    document.getElementById("arrowWrapper1").style.width = document.getElementById("arrowWrapper2").style.width = document.getElementById("arrowWrapper3").style.width = document.getElementById("arrowWrapper1").style.height = document.getElementById("arrowWrapper2").style.height = document.getElementById("arrowWrapper3").style.height = (40 * 8) + "px";

    if(_mobile) setupMobileLayout(true);
    setupTouchEvents(document.getElementById("chessboard1"), onMouseDown, onMouseMove, onMouseUp);
    setupTouchEvents(document.getElementById("editWrapper"), onMouseDown, onMouseMove, onMouseUp);
    checkSizes();
    window.setInterval(checkSizes, 500);
    setupBoxes();
    setupInput();
    _engine = loadEngine();
    showBoard();
    for(var i = 0; i < 26; i++) command(getParameterByName(String.fromCharCode("a".charCodeAt(0) + i)));
}