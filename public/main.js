// ============================
// Global Cosntants
// ============================

// File Paths
const NNUE_PATH = './engine/nn-b1a57edbea57.nnue';

// Engine Depth Constants
const MIN_DEPTH = 1;
const MAX_DEPTH = 28;
const DEFAULT_DEPTH = 18;

// Default Starting FEN
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ============================
// Global Variables
// ============================

let _analysisEngine;
let _playEngine;
let _curmoves = [];
let _history = [
        [START]
    ],
    _history2 = null,
    _historyindex = 0;
let _flip = false,
    _edit = false,
    _info = false,
    _play = null;
let _arrow = false,
    _menu = false;
let _dragElement = null,
    _dragActive = false,
    _startX, _startY, _dragCtrl, _dragLMB, _clickFrom, _clickFromElem;
let _tooltipState = false,
    _wantUpdateInfo = true;
let _wname = 'White',
    _bname = 'Black',
    _color = 0,
    _bodyScale = 1;
let _nncache = null,
    _gameMode = 1,
    _isPlayerWhite = true;
let _staticSortByChange = false,
    _movesPv = false;
let _lastMouseDataPos = null;
let _staticEvalListCache = [],
    _staticEvalListCacheSize = 20;
let _coachMode = false;
let _coachModeLabel = "Active Coach Mode";
let _userUciEloRating = 2200;

// ============================
// Initialization
// ============================

document.addEventListener('DOMContentLoaded', function(e) {
    try {
        const url = new URL(document.location.href);
        const search_params = new URLSearchParams(url.search);

        if (search_params.has('mode')) {
            const mode = search_params.get('mode');

            if (mode === 'play') {
                menuPlayEngineWhite();
            } else if (mode === 'edit') {
                showHideWindow('Edit');
            }
        }
    } catch (error) {
        console.error('Failed to initialize the application:', error);
    }
});

window.onload = function() {
    // Load The Analysis & Playing Engines
    _analysisEngine = loadEngine();
    _playEngine = loadEngine(function(engine) {
        // Configure playing engine when it's ready
        engine.send('setoption name UCI_LimitStrength value true');
        engine.send('setoption name UCI_Elo value ' + _userUciEloRating);
    });

    document.onmousedown = onMouseDown;
    document.onmouseup = onMouseUp;
    document.onmousemove = defaultMouseMove;
    document.onkeydown = onKeyDown;

    document.getElementById('chessboard1').oncontextmenu =
        document.getElementById('chessboard1').parentNode.oncontextmenu =
        document.getElementById('editWrapper').oncontextmenu = function() {
            return false;
        };

    document.getElementById('chessboard1').parentNode.onwheel = document.getElementById('editWrapper').onwheel = onWheel;
    document.getElementById('buttonStm').onclick = function() {
        command('sidetomove');
    };
    document.getElementById('buttonFlip').onclick = function() {
        doFlip();
    };
    document.getElementById('buttonBack').onclick = function(event) {
        historyMove(-1, event);
    };
    document.getElementById('buttonForward').onclick = function(event) {
        historyMove(+1, event);
    };
    document.getElementById('buttonMenu').onclick = function(event) {
        showHideMenu(true, event);
    };
    document.getElementById('buttonStaticSortByValue').onclick = function(event) {
        _staticSortByChange = false;
        repaintStatic();
    };
    document.getElementById('buttonStaticSortByChange').onclick = function(event) {
        _staticSortByChange = true;
        repaintStatic();
    };
    document.getElementById('buttonMovesPv').onclick = function(event) {
        _movesPv = !_movesPv;
        showEvals();
    };
    document.getElementById('graphWrapper').onmouseover = function() {
        if (document.onmousemove == defaultMouseMove) document.onmousemove = graphMouseMove;
    };
    document.getElementById('graphWrapper').onmousedown = function(event) {
        if (document.onmousemove == defaultMouseMove) {
            document.onmousemove = graphMouseMove;
            graphMouseMove(event);
            graphMouseDown(event);
        }
    };
    document.getElementById('graphWrapper').onmouseout = function() {
        if (document.onmousemove == graphMouseMove) document.onmousemove = defaultMouseMove;
        repaintGraph();
        updateTooltip('');
    };
    document.getElementById('graphWrapper').onwheel = function(event) {
        onWheel(event);
        showGraphTooltip(_historyindex, event);
    };

    document.getElementById('arrowWrapper1').style.top = document.getElementById('arrowWrapper2').style.top = document.getElementById('arrowWrapper3').style.top = document.getElementById('chessboard1').getBoundingClientRect().top - document.getElementById('boardWrapper').getBoundingClientRect().top + 'px';
    document.getElementById('arrowWrapper1').style.left = document.getElementById('arrowWrapper2').style.left = document.getElementById('arrowWrapper3').style.left = document.getElementById('chessboard1').getBoundingClientRect().left - document.getElementById('boardWrapper').getBoundingClientRect().left + 'px';
    document.getElementById('arrowWrapper1').style.width = document.getElementById('arrowWrapper2').style.width = document.getElementById('arrowWrapper3').style.width = document.getElementById('arrowWrapper1').style.height = document.getElementById('arrowWrapper2').style.height = document.getElementById('arrowWrapper3').style.height = (40 * 8) + 'px';

    if (_mobile) setupMobileLayout(true);
    setupTouchEvents(document.getElementById('chessboard1'), onMouseDown, onMouseMove, onMouseUp);
    setupTouchEvents(document.getElementById('editWrapper'), onMouseDown, onMouseMove, onMouseUp);
    checkSizes();
    window.setInterval(checkSizes, 500);
    setupBoxes();
    setupInput();
    showBoard();
    for (let i = 0; i < 26; i++) command(getParameterByName(String.fromCharCode('a'.charCodeAt(0) + i)));
};

// ============================
// Helper Functions
// ============================

function setElemText(elem, value) {
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    elem.appendChild(document.createTextNode(value));
}

function getElemText(elem) {
    return elem.textContent;
}

function setCurFEN(fen) {
    setElemText(document.getElementById('fen'), fen);
}

function getCurFEN() {
    return getElemText(document.getElementById('fen'));
}

// ============================
// Promotion Piece Functions
// ============================

function togglePromotionPiece() {
    let promotionItem = document.querySelector('.menuItem.menuPromote span:first-child');
    let currentText = promotionItem.innerText;
    let newText = currentText.includes('Queen') ? 'Pawn Promotion: Knight' : 'Pawn Promotion: Queen';
    promotionItem.innerText = newText;
    localStorage.setItem('promotionPiece', newText.includes('Queen') ? 'Q' : 'N');
}

function getPromotionPiece() {
    return localStorage.getItem('promotionPiece') || 'Q';
}

// ============================
// Coach Mode Function
// ============================

function toggleCoachMode() {
    _coachMode = (_coachMode === true) ? false : true;
    let newText = (_coachMode === true) ? 'Deactivate Coach Mode' : 'Activate Coach Mode';
    _coachModeLabel = newText;
}

// ============================
// Search Functions
// ============================

function command(text) {
    if (text == null || text.length == 0) return;
    let mvdivs = ['<div class="moves">', '<div class="tview2 tview2-column">', '<div class="extension-item Moves">'];
    for (let i = 0; i < mvdivs.length; i++) {
        if (text.indexOf(mvdivs[i]) >= 0) {
            let text2 = text,
                ntext = '';
            text2 = text2.replace(/<span class="user_link[^>]*>([^<]*)<\/span>/g, "<a class=\"user_link\">$1</a>");
            let nmt = '<a class="user_link';
            if (text2.indexOf(nmt) > 0) {
                text2 = text2.substr(text2.indexOf(nmt) + nmt.length);
                text2 = text2.substr(text2.indexOf(">") + 1);
                ntext += "[White \"" + text2.substr(0, text2.indexOf("</a>")).replace(/<span[^>]*>[^<]*<\/span>/g, "").replace(/&nbsp;/g, " ").trim() + "\"]\n";
                text2 = text2.substr(text2.indexOf("</a>") + 4);
            }
            if (text2.indexOf(nmt) > 0) {
                text2 = text2.substr(text2.indexOf(nmt) + nmt.length);
                text2 = text2.substr(text2.indexOf(">") + 1);
                ntext += "[Black \"" + text2.substr(0, text2.indexOf("</a>")).replace(/<span[^>]*>[^<]*<\/span>/g, "").replace(/&nbsp;/g, " ").trim() + "\"]\n";
                text2 = text2.substr(text2.indexOf("</a>") + 4);
            }
            text2 = text;
            nmt = '<div class="playerInfo';
            for (let j = 0; j < 2; j++)
                if (text2.indexOf(nmt) > 0) {
                    text2 = text2.substr(text2.indexOf(nmt));
                    let black = text2.indexOf("black") < text2.indexOf(">");
                    text2 = text2.substr(nmt.length);
                    let h = '<h2 class="name">';
                    let nm = "[" + (black ? "Black" : "White") + " \"" + text2.substring(text2.indexOf(h) + h.length, text2.indexOf('</h2>')).trim() + "\"]\n";
                    if (j == 1 && !black) ntext = nm + ntext;
                    else ntext += nm;
                }
            text = text.substring(text.indexOf(mvdivs[i]));
            if (i == 2) text = text.replace(/<div class='notationTableInlineElement((?!<\/div>).)*<\/div>/g, '');
            text = text.substring(mvdivs[i].length, text.indexOf('</div>'));
            if (i == 2) {
                text = text.replace(/<dt>\s*(<span[^>]*>)?\s*([^<\s]*)\s*(<\/span>)?\s*<\/dt>/g, '<index>$2</index>')
                    .replace(/<span class='move'>\s*([^<\s]*)\s*<\/span>/g, '<move>$1</move>')
            } else {
                text = text.replace(/<interrupt>((?!<\/interrupt>).)*<\/interrupt>/g, '')
                    .replace(/<(move|m1|m2)[^<>']*(('[^']*')[^<>']*)*>/g, '<move>').replace(/<\/(m1|m2)>/g, '</move>')
                    .replace(/<\/?san>|<eval>[^<]*<\/eval>|<glyph[^<]*<\/glyph>|<move>\.\.\.<\/move>/g, '')
                    .replace(/\?/g, 'x');
            }
            text = ntext + text
                .replace(/{|}/g, '')
                .replace(/(<index[^>]*>)/g, '{').replace(/<\/index>/g, '.}')
                .replace(/<move>/g, '{').replace(/<\/move>/g, ' }')
                .replace(/(^|})[^{]*($|{)/g, '');
        }
    }
    if (text.split('/').length == 8 && text.split('.').length == 1) {
        pos = parseFEN(text);
        setCurFEN(generateFEN(pos));
        _history = [
            [getCurFEN()]
        ];
        _historyindex = 0;
        historyMove(0);
    } else if (text.split('.').length > 1) {
        let whitename = null,
            blackname = null;
        let wi = text.indexOf('[White \''),
            bi = text.indexOf('[Black \'');
        if (wi >= 0 && bi > wi) {
            let wil = text.substr(wi + 8).indexOf('\']'),
                bil = text.substr(bi + 8).indexOf('\']');
            if (wil > 0 && wil < 128) whitename = text.substr(wi + 8, wil);
            if (bil > 0 && bil < 128) blackname = text.substr(bi + 8, bil);
        }

        text = text.replace(/\u2605/g, '').replace(/\u0445/g, 'x');
        text = ' ' + text.replace(/\./g, ' ').replace(/(\[FEN [^\]]+\])+?/g, function($0, $1) {
            return $1.replace(/\[|\]|'/g, '').replace(/\s/g, '.');
        });
        text = text.replace(/\[Event /g, '* [Event ').replace(/\s(\[[^\]]+\])+?/g, '').replace(/(\{[^\}]+\})+?/g, '');
        let r = /(\([^\(\)]+\))+?/g;
        while (r.test(text)) text = text.replace(r, '');
        text = text.replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O').replace(/(1\-0|0\-1|1\/2\-1\/2)/g, ' * ')
            .replace(/\s\d+/g, ' ').replace(/\$\d+/g, '').replace(/\?/g, '');
        let moves = text.replace(/\s/g, ' ').replace(/ +/g, ' ').trim().split(' ');
        let pos = parseFEN(START);
        let oldhistory = JSON.parse(JSON.stringify(_history));
        _history = [
            [START]
        ];
        _historyindex = 0;
        gm = 0;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].length == 0) continue;
            if ('*'.indexOf(moves[i][0]) == 0) {
                if (i < moves.length - 1) {
                    pos = parseFEN(START);
                    // Add only the new position without move and SAN
                    historyAdd(generateFEN(pos), oldhistory, null, null);
                    gm++;
                }
                continue;
            } else if (moves[i].indexOf('FEN.') == 0) {
                pos = parseFEN(moves[i].substring(4).replace(/\./g, ' '));
                if (_history[_historyindex][0] == START) _historyindex--;
                // Add only the new position without move and SAN
                historyAdd(generateFEN(pos), oldhistory, null, null);
                continue;
            }
            if (moves[i] == '--') {
                pos.w = !pos.w;
                // Add only the new position without move and SAN
                historyAdd(generateFEN(pos), oldhistory, null, null);
                continue;
            }
            let move = parseMove(pos, moves[i]);
            if (move == null) {
                alert('Incorrect move: ' + moves[i] + ' ' + gm);
                break;
            }
            let san = sanMove(pos, move, genMoves(pos));
            pos = doMove(pos, move.from, move.to, move.p);
            // Add the new position with move and SAN notation
            historyAdd(generateFEN(pos), oldhistory, move, san);
        }
        setCurFEN(generateFEN(pos));
        historyKeep(whitename, blackname);
    } else if (text.toLowerCase() == 'reset') {
        setCurFEN(START);
        _history = [
            [getCurFEN()]
        ];
        _historyindex = 0;
        historyKeep();
        _history2 = null;
        if (_nncache != null) _nncache.clear();
    } else if (text.toLowerCase() == 'clear') {
        setCurFEN('8/8/8/8/8/8/8/8 w - - 0 0');
        showBoard();
    } else if (text.toLowerCase() == 'colorflip') {
        setCurFEN(generateFEN(colorflip(parseFEN(getCurFEN()))));
        showBoard();
    } else if (text.toLowerCase() == 'sidetomove') {
        setCurFEN(getCurFEN().replace(' w ', ' ! ').replace(' b ', ' w ').replace(' ! ', ' b '));
        showBoard();
    } else if (text.toLowerCase().indexOf('depth ') == 0) {
        if (_analysisEngine != null && _analysisEngine.ready) {
            _analysisEngine.depth = Math.min(MAX_DEPTH, Math.max(0, parseInt(text.toLowerCase().replace('depth ', ''))));
            if (isNaN(_analysisEngine.depth)) _analysisEngine.depth = DEFAULT_DEPTH;
        }
        showBoard();
    } else if (text.toLowerCase() == 'flip') {
        doFlip();
    } else if (text.toLowerCase() == 'window') {
        let encoded = '';
        if (_history[0][0] == START) {
            let gi = '';
            for (let i = 1; i < _history.length; i++) {
                let pos = parseFEN(_history[i - 1][0]);
                let moves = genMoves(pos);
                let mindex = -1;
                for (let j = 0; j < moves.length; j++) {
                    let move = moves[j];
                    let pos2 = doMove(pos, move.from, move.to, move.p);
                    if (generateFEN(pos2) == _history[i][0]) mindex = j;
                }
                if (mindex < 0) {
                    gi = '';
                    break;
                }
                let symbols = (moves.length + 1).toString(2).length,
                    v = '';
                for (let j = 0; j < symbols; j++) v += '0';
                let n = (mindex + 1).toString(2);
                n = v.substr(n.length) + n;
                gi += n;
                if (i == _history.length - 1) gi += v;
            }
            let cur = '';
            for (let i = 0; i < gi.length; i++) {
                cur += gi[i];
                if (i == gi.length - 1)
                    while (cur.length < 6) cur += '0';
                if (cur.length == 6) {
                    encoded += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' [parseInt(cur, 2)];
                    cur = '';
                }
            }
        }
        let wb = document.getElementById('wb').children;
        let lparams = [];
        for (let i = 0; i < wb.length; i++) {
            if (wb[i].tagName != 'DIV') continue;
            let winId = wb[i].id.substring(2);
            let elem = document.getElementById('w' + winId);
            if (elem.style.display == 'none') continue;
            if (elem.style.position == 'absolute' && !_mobile) {
                lparams.push((winId[0] + elem.style.width + ',' + elem.style.height + ',' + elem.style.left + ',' + elem.style.top).replace(/px/g, ''));
            } else if ((elem.style.width != elem.originalWidth || elem.style.height != elem.originalHeight) && !_mobile) {
                lparams.push((winId[0] + elem.style.width + ',' + elem.style.height).replace(/(\.[0-9]+)?px/g, ''));
            } else lparams.push(winId[0]);
        }
        let lparamsstr = lparams.join(' ').toLowerCase();
        let url = [location.protocol, '//', location.host, location.pathname].join('');
        let params = [];
        if (_color > 0) params.push('col' + _color);
        if (_analysisEngine != null && _analysisEngine.ready && _analysisEngine.depth != DEFAULT_DEPTH) params.push('depth ' + _analysisEngine.depth);
        if (lparamsstr != 'c m h g') params.push('layout ' + (lparamsstr.length == 0 ? '-' : lparamsstr));
        if (encoded.length > 0) params.push('~' + encoded);
        else if (getCurFEN() != START) params.push(getCurFEN());
        for (let i = 0; i < params.length; i++) {
            url += (i == 0 ? '?' : '&') + String.fromCharCode('a'.charCodeAt(0) + i) + '=' + params[i];
        }
        window.open(url, '_blank');

    } else if (text[0] == '~') {
        let pos = parseFEN(START);
        let oldhistory = JSON.parse(JSON.stringify(_history));
        _history = [
            [START]
        ];
        _historyindex = 0;
        let gi = '';
        for (let i = 1; i < text.length; i++) {
            let n = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.indexOf(text[i]).toString(2);
            gi += '000000'.substr(n.length) + n;
        }
        let i = 0;
        while (i < gi.length) {
            let moves = genMoves(pos);
            let symbols = (moves.length + 1).toString(2).length,
                cur = '';
            for (let j = 0; j < symbols; j++) {
                cur += (i < gi.length ? gi[i] : '0');
                i++;
            }
            let n = parseInt(cur, 2);
            if (n == 0 || n >= moves.length + 1) break;
            let move = moves[n - 1],
                san = sanMove(pos, move, moves);
            pos = doMove(pos, move.from, move.to, move.p);
            historyAdd(generateFEN(pos), oldhistory, move, san);
        }
        setCurFEN(generateFEN(pos));
        historyKeep();
    } else if (text.toLowerCase() == 'revert') {
        if (_history2 != null) {
            _historyindex = _history2[0];
            _history = _history2[1];
            _history2 = null;
            setCurFEN(_history[_historyindex][0]);
            refreshButtonRevert();
            historyMove(0);
        }
    } else if (text.toLowerCase() == 'keep') {
        historyKeep(_wname, _bname);
    } else if (text.length == 4 && text.toLowerCase().indexOf('col') == 0) {
        setBoardColor(Math.max(0, text.charCodeAt(3) - '0'.charCodeAt(0)));
    } else if (text.toLowerCase().indexOf('layout ') == 0) {
        let a = text.toUpperCase().split(' ');
        a.splice(0, 1);
        let wb = document.getElementById('wb').children;
        for (let i = 0; i < wb.length; i++) {
            if (wb[i].tagName != 'DIV') continue;
            let winId = wb[i].id.substring(2);
            let cur = a.find(function(x) {
                return x[0] == winId[0];
            });
            if (cur != null && !_mobile) {
                cur = cur.substring(1);
                let b = cur.length == 0 ? [] : cur.split(',');
                let elem = document.getElementById('w' + winId);
                if (elem.firstElementChild.ondblclick != null) elem.firstElementChild.ondblclick();
                if (b.length >= 2) {
                    elem.style.width = b[0] + 'px';
                    elem.style.height = b[1] + 'px';
                }
                if (b.length >= 4) {
                    elem.style.left = b[2] + 'px';
                    elem.style.top = b[3] + 'px';
                    elem.style.position = 'absolute';
                }
                showHideWindow(winId, true);
            } else if (cur != null && _mobile) showHideWindow(winId, true);
            else if (!_mobile) showHideWindow(winId, false);
        }
    } else {
        for (let i = 0; i < _curmoves.length; i++)
            if (_curmoves[i].san == text) {
                doMoveHandler(_curmoves[i].move);
                break;
            }
    }
}

function dosearch() {
    let text = document.getElementById('searchInput').value;
    document.getElementById('searchInput').value = getCurFEN();
    command(text);
    document.getElementById('searchInput').value = getCurFEN();
    document.getElementById('searchInput').blur();
}

function showHideButtonGo(state) {
    if (!document.getElementById('searchInput').focus) state = false;
    if (state && document.getElementById('searchInput').value == getCurFEN()) state = false;
    document.getElementById('buttonGo').style.display = state ? '' : 'none';
}

function setupInput() {
    document.getElementById('buttonGo').onclick = function() {
        dosearch();
    };
    document.getElementById('buttonGo').onmousedown = function(event) {
        event.preventDefault();
    };
    let input = document.getElementById('searchInput');
    input.onmousedown = function() {
        this.focuswithmouse = 1;
    };
    input.onmouseup = function() {
        if (this.focuswithmouse == 2 && input.selectionStart == input.selectionEnd) this.select();
        this.focuswithmouse = 0;
    }
    input.onfocus = function() {
        if (this.focuswithmouse == 1) this.focuswithmouse = 2;
        else {
            input.select();
            this.focuswithmouse = 0;
        }
        showHideButtonGo(true);
        document.onkeydown = null;
    };
    input.onblur = function() {
        input.selectionStart = input.selectionEnd;
        showHideButtonGo(false);
        document.onkeydown = onKeyDown;
        this.focuswithmouse = 0;
    };
    input.onpaste = function() {
        window.setTimeout(function() {
            showHideButtonGo(true);
        }, 1);
    };
    input.onkeydown = function(e) {
        if (e.key === 'Escape') {
            e.preventDefault(); // Prevents default handling of the Escape key
            // Using setTimeout with 0 delay to queue the function at the end of the call stack
            window.setTimeout(() => {
                showHideButtonGo(true);
            }, 0);
        }
    };
    input.onkeyup = function(e) {
        if (e.key === 'Escape') {
            input.value = getCurFEN(); // Reset input value to the current FEN
            this.select(); // Select the content of the input
            showHideButtonGo(true); // Update the visibility state of the button
        }
    };
    document.getElementById('simpleSearch').onsubmit = function() {
        dosearch();
        return false;
    };
}

// ============================
// Tooltip Functions
// ============================

function getClientY(e) {
    if (!_mobile) return e.clientY;
    let scrollOffset = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
    return (e.clientY + scrollOffset) * _bodyScale;
}

function updateTooltipPos(e) {
    let tooltip = document.getElementById('tooltip');
    tooltip.style.left = (e.clientX * _bodyScale) + 'px';
    tooltip.style.top = (getClientY(e) + 20) + 'px';
}

function updateTooltip(text, answerpv, movenumber, cl, e) {
    let state = text.length > 0;
    let tooltip = document.getElementById('tooltip');

    requestAnimationFrame(() => {
        while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);

        let span1 = document.createElement('span');
        setElemText(span1, state ? text : '');

        if (movenumber != null) {
            let span2 = document.createElement('span');
            span2.style.color = '#64c4db';
            setElemText(span2, movenumber + ' ');
            tooltip.appendChild(span2);
        }

        if (cl != null && cl != 'circle') {
            let span3 = document.createElement('span');
            span3.className = cl;
            tooltip.appendChild(span3);
            span1.style.paddingLeft = '12px';
        }

        tooltip.appendChild(span1);

        _tooltipState = state;
        tooltip.style.display = state ? '' : 'none';
        if (e != null) updateTooltipPos(e);

        if (answerpv != null && answerpv.length > 0 && (answerpv[0].length == 4 || answerpv[0].length == 5)) {
            for (let i = 0; i < Math.min(answerpv.length, _movesPv ? 5 : 1); i++) {
                let move = {
                    from: {
                        x: 'abcdefgh'.indexOf(answerpv[i][0]),
                        y: '87654321'.indexOf(answerpv[i][1])
                    },
                    to: {
                        x: 'abcdefgh'.indexOf(answerpv[i][2]),
                        y: '87654321'.indexOf(answerpv[i][3])
                    }
                };
                showArrow1(move, 1 - (i / 5));
            }
        } else {
            setArrow(_arrow);
        }
    });
}

// ============================
// Chessboard and Arrows
// ============================

function getEvalText(e, s) {
    if (e == null) return s ? '' : '?';
    let matein = Math.abs(Math.abs(e) - 1000000);
    if (Math.abs(e) > 900000) {
        return s ? (e > 0 ? '+M' : '-M') + matein : (e > 0 ? 'white mate in ' : 'black mate in ') + matein;
    }
    return (e / 100).toFixed(2);
}

function showLegalMoves(from) {
    setArrow(from == null);
    let pos = parseFEN(getCurFEN());
    let elem = document.getElementById('chessboard1');
    for (let i = 0; i < elem.children.length; i++) {
        let div = elem.children[i];
        if (div.tagName != 'DIV') continue;
        if (div.style.zIndex > 0) continue;
        let x = parseInt(div.style.left.replace('px', '')) / 40;
        let y = parseInt(div.style.top.replace('px', '')) / 40;
        if (_flip) {
            x = 7 - x;
            y = 7 - y;
        }
        let c = div.className.split(' ')[0] + ' ' + div.className.split(' ')[1];
        if (div.className.indexOf(' h2') >= 0) c += ' h2';
        div.className = c;
        div.onmouseover = null;
        setElemText(div, '');
        if (from == null || from.x < 0 || from.y < 0) continue;
        if (from.x == x && from.y == y) {
            div.className += ' h0';
            _clickFromElem = div;
        } else if (isLegal(pos, from, {
                x: x,
                y: y
            })) {
            if (_curmoves.length == 0) continue;
            let text = '',
                san = '',
                answerpv = null,
                cl = null;
            for (let j = 0; j < _curmoves.length; j++) {
                if (_curmoves[j].move.from.x == from.x && _curmoves[j].move.from.y == from.y &&
                    _curmoves[j].move.to.x == x && _curmoves[j].move.to.y == y &&
                    (_curmoves[j].move.p == 'Q' || _curmoves[j].move.p == null)) {
                    text = getEvalText(_curmoves[j].eval, true);
                    san = _curmoves[j].san;
                    answerpv = _curmoves[j].answerpv;
                    cl = getCircleClassName(j);
                    break;
                }
            }
            div.className += ' h1';
            setElemText(div, text);
            div.tooltip = san + (text.length > 0 ? ' ' + text : '');
            div.answerpv = answerpv == null ? [] : answerpv;
            div.cl = cl == null ? 'circle' : cl;
            div.onmouseover = function(e) {
                updateTooltip(this.tooltip, this.answerpv, null, this.cl, e);
            };
            div.onmouseout = function() {
                updateTooltip('');
            };
        }
        updateTooltip('');
    }

    elem = document.getElementById('editWrapper').children[0];
    for (let i = 0; i < elem.children.length; i++) {
        let div = elem.children[i];
        if (div.tagName != 'DIV') continue;
        if (div.style.zIndex > 0) continue;
        let x = -parseInt(div.style.left.replace('px', '')) / 40 - 1;
        let y = -parseInt(div.style.top.replace('px', '')) / 40 - 1;
        let c = div.className.split(' ')[0] + ' ' + div.className.split(' ')[1];
        div.className = c;
        setElemText(div, '');
        if (from == null || from.x >= 0 || from.y >= 0) continue;
        if (from.x == x && from.y == y) {
            div.className += ' h0';
            _clickFromElem = div;
        }
    }
    showArrow3(null);

    _clickFrom = from;
}

function updateLegalMoves() {
    let pos = parseFEN(getCurFEN());
    let elem = document.getElementById('chessboard1');
    for (let i = 0; i < elem.children.length; i++) {
        let div = elem.children[i];
        if (div.tagName != 'DIV' || div.style.zIndex > 0 || div.className.indexOf(' h1') < 0 || div.cl != 'circle') continue;
        let x = parseInt(div.style.left.replace('px', '')) / 40;
        let y = parseInt(div.style.top.replace('px', '')) / 40;
        if (_flip) {
            x = 7 - x;
            y = 7 - y;
        }
        let c = div.className.split(' ')[0] + ' ' + div.className.split(' ')[1];
        if (div.className.indexOf(' h2') >= 0) c += ' h2';
        for (let j = 0; j < _curmoves.length; j++) {
            if (div.tooltip == _curmoves[j].san) {
                let text = getEvalText(_curmoves[j].eval, true);
                let san = _curmoves[j].san;
                let answerpv = _curmoves[j].answerpv;
                let cl = getCircleClassName(j);
                setElemText(div, text);
                div.tooltip = san + (text.length > 0 ? ' ' + text : '');
                div.answerpv = answerpv == null ? [] : answerpv;
                div.cl = cl == null ? 'circle' : cl;
                div.onmouseover = function(e) {
                    updateTooltip(this.tooltip, this.answerpv, null, this.cl, e);
                };
                div.onmouseout = function() {
                    updateTooltip('');
                };
                if (_tooltipState && getElemText(document.getElementById('tooltip').firstChild) == _curmoves[j].san) updateTooltip(div.tooltip, div.answerpv, null, div.cl, null);
                break;
            }
        }
    }
}

function setArrow(state) {
    _arrow = state;
    if (_arrow && _curmoves.length > 0 && _curmoves[0].eval != null) showArrow1(_curmoves[0].move);
    else showArrow1();
}

function repaintLastMoveArrow() {
    requestAnimationFrame(() => {
        let lastmove = (getCurFEN() == _history[_historyindex][0] && _history[_historyindex].length > 2) ? _history[_historyindex][2] : null;
        if (lastmove != null) {
            let elem = document.getElementById('arrowWrapper2');
            if (elem.children[0].children != null) {
                const arrowFillColor = getGraphPointColor(_historyindex);
                requestAnimationFrame(() => {
                    elem.children[0].children[0].children[0].children[0].style.fill = arrowFillColor;
                    elem.children[0].children[1].style.stroke = arrowFillColor;
                });
            }
        }
        showArrow2(lastmove);
    });
}

function showArrowInternal(move, wrapperId, opacity = 1) {
    let elem = document.getElementById(wrapperId);
    if (move == null) {
        elem.style.display = 'none';
        return;
    }
    if (elem.children[0].children == null) return;
    let line = elem.children[0].children[1];
    line.setAttribute('x1', 20 + (_flip ? 7 - move.from.x : move.from.x) * 40);
    line.setAttribute('y1', 20 + (_flip ? 7 - move.from.y : move.from.y) * 40);
    line.setAttribute('x2', 20 + (_flip ? 7 - move.to.x : move.to.x) * 40);
    line.setAttribute('y2', 20 + (_flip ? 7 - move.to.y : move.to.y) * 40);
    line.style.opacity = opacity.toFixed(2);
    elem.style.display = 'block';
}

function showArrow1(move, opacity) {
    let elem = document.getElementById('arrowWrapper1');
    let elem0 = elem.children[0];
    if (opacity == null || opacity == 1)
        for (let i = elem0.children.length - 1; i >= 2; i--) elem0.removeChild(elem0.children[i]);
    else elem.children[0].appendChild(elem0.children[1].cloneNode(false));
    showArrowInternal(move, 'arrowWrapper1', opacity);
}

function showArrow2(move) {
    showArrowInternal(move, 'arrowWrapper2');
}

function showArrow3(move) {
    let elem0 = document.getElementById('arrowWrapper3').children[0];
    if (elem0.children == null) return;
    if (move == null) {
        for (let i = elem0.children.length - 1; i >= 2; i--) elem0.removeChild(elem0.children[i]);
    } else if (move.from.x == move.to.x && move.from.y == move.to.y || !bounds(move.from.x, move.from.y) || !bounds(move.to.x, move.to.y)) {
        elem0.children[1].style.display = 'none';
    } else {
        elem0.children[1].style.display = '';
    }
    showArrowInternal(move, 'arrowWrapper3');
}

function finalArrow3() {
    let elem = document.getElementById('arrowWrapper3');
    let list = elem.children[0].children,
        remElem = null;
    if (list == null) return;
    if (list[1].style.display == 'none') return;
    for (let i = 2; i < list.length; i++) {
        if (list[i].getAttribute('x1') == list[1].getAttribute('x1') &&
            list[i].getAttribute('y1') == list[1].getAttribute('y1') &&
            list[i].getAttribute('x2') == list[1].getAttribute('x2') &&
            list[i].getAttribute('y2') == list[1].getAttribute('y2')) remElem = list[i];
    }
    if (remElem == null) {
        elem.children[0].appendChild(list[1].cloneNode(false));
    } else {
        elem.children[0].removeChild(remElem);
    }
    list[1].style.display = 'none';
}

function updateInfo() {
    let curfen = getCurFEN();
    let pos = parseFEN(curfen);
    let curpos = pos.m[1];
    let positionInfoText = 'Position: ' + (_historyindex + 1) + ' of ' + _history.length + ' - Last Move: ';

    if (_history[_historyindex].length > 3 && _history[_historyindex][3] != null) {
        let pos2 = parseFEN(_history[_historyindex][0]);
        positionInfoText += (pos2.w ? (pos2.m[1] - 1) + '... ' : pos2.m[1] + '. ') + _history[_historyindex][3];
    } else positionInfoText += '-';

    let movesInfoText = (pos.w ? 'White' : 'Black') + ' To Play (' + _curmoves.length + ' Legal Move' + (_curmoves.length == 1 ? '' : 's') + ')';

    // Batch DOM updates
    const positionInfoElem = document.getElementById('positionInfo');
    const movesInfoElem = document.getElementById('movesInfo');
    positionInfoElem.innerText = positionInfoText;
    movesInfoElem.innerText = movesInfoText;

    // History window
    const historyElem = document.getElementById('history');
    while (historyElem.firstChild) historyElem.removeChild(historyElem.firstChild);

    const historyFragment = document.createDocumentFragment();
    let lastmn = null,
        mn = null;
    let movesText = '';

    for (let i = 0; i < _history.length; i++) {
        mn = parseMoveNumber(_history[i][0]);
        if (mn != lastmn) {
            const span1 = document.createElement('span');
            setElemText(span1, mn + '. ');
            span1.style.color = '#64c4db';
            historyFragment.appendChild(span1);
            // Do not add move numbers to movesText
            // if (i <= _historyindex) movesText += mn + '.';
            lastmn = mn;
        }
        const san = (_history[i].length > 3 && _history[i][3] != null) ? _history[i][3] : '\u2605';
        const span2 = document.createElement('span');
        setElemText(span2, san);
        span2.className = 'movelink' + (i == _historyindex ? ' selected' : '');
        span2.targetindex = i;
        const c = getGraphPointColor(i);
        if (c != '#008800') span2.style.borderBottomColor = c;
        span2.onclick = function() {
            const targetIndex = this.targetindex;
            if (targetIndex < _history.length && targetIndex >= 0 && targetIndex != _historyindex) {
                historyMove(targetIndex - _historyindex);
            }
        };
        historyFragment.appendChild(span2);
        historyFragment.appendChild(document.createTextNode(' '));

        // Include only SAN moves in movesText
        if (i <= _historyindex) movesText += san + ' ';
    }
    historyElem.appendChild(historyFragment);
}

// ============================
// Position and Moves
// ============================

function bounds(x, y) {
    return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}

function board(pos, x, y) {
    if (x >= 0 && x <= 7 && y >= 0 && y <= 7) return pos.b[x][y];
    return 'x';
}

function colorflip(pos) {
    let board = new Array(8);
    for (let i = 0; i < 8; i++) board[i] = new Array(8);
    for (x = 0; x < 8; x++)
        for (y = 0; y < 8; y++) {
            board[x][y] = pos.b[x][7 - y];
            let color = board[x][y].toUpperCase() == board[x][y];
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

function sum(pos, func, param) {
    let sum = 0;
    for (let x = 0; x < 8; x++)
        for (let y = 0; y < 8; y++) sum += func(pos, { x: x, y: y }, param);
    return sum;
}

function parseMoveNumber(fen) {
    let a = fen.replace(/^\s+/, '').split(' ');
    return (a.length > 5 && !isNaN(a[5]) && a[5] != '') ? parseInt(a[5]) : 1;
}

function parseFEN(fen) {
    let board = new Array(8);
    for (let i = 0; i < 8; i++) board[i] = new Array(8);
    let a = fen.replace(/^\s+/, '').split(' '),
        s = a[0],
        x, y;
    for (x = 0; x < 8; x++)
        for (y = 0; y < 8; y++) {
            board[x][y] = '-';
        }
    x = 0, y = 0;
    for (let i = 0; i < s.length; i++) {
        if (s[i] == ' ') break;
        if (s[i] == '/') {
            x = 0;
            y++;
        } else {
            if (!bounds(x, y)) continue;
            if ('KQRBNP'.indexOf(s[i].toUpperCase()) != -1) {
                board[x][y] = s[i];
                x++;
            } else if ('0123456789'.indexOf(s[i]) != -1) {
                x += parseInt(s[i]);
            } else x++;
        }
    }
    let castling, enpassant, whitemove = !(a.length > 1 && a[1] == 'b');
    if (a.length > 2) {
        castling = [a[2].indexOf('K') != -1, a[2].indexOf('Q') != -1,
            a[2].indexOf('k') != -1, a[2].indexOf('q') != -1
        ];
    } else {
        castling = [true, true, true, true];
    }
    if (a.length > 3 && a[3].length == 2) {
        let ex = 'abcdefgh'.indexOf(a[3][0]);
        let ey = '87654321'.indexOf(a[3][1]);
        enpassant = (ex >= 0 && ey >= 0) ? [ex, ey] : null;
    } else {
        enpassant = null;
    }
    let movecount = [(a.length > 4 && !isNaN(a[4]) && a[4] != '') ? parseInt(a[4]) : 0,
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

function generateFEN(pos) {
    let s = '',
        f = 0,
        castling = pos.c,
        enpassant = pos.e,
        board = pos.b;
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (board[x][y] == '-') {
                f++;
            } else {
                if (f > 0) s += f, f = 0;
                s += board[x][y];
            }
        }
        if (f > 0) s += f, f = 0;
        if (y < 7) s += '/';
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

function isWhiteCheck(pos) {
    let kx = null,
        ky = null;
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            if (pos.b[x][y] == 'K') {
                kx = x;
                ky = y;
            }
        }
    }
    if (kx == null || ky == null) return false;
    if (board(pos, kx + 1, ky - 1) == 'p' ||
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
    for (let i = 0; i < 8; i++) {
        let ix = (i + (i > 3)) % 3 - 1;
        let iy = (((i + (i > 3)) / 3) << 0) - 1;
        for (let d = 1; d < 8; d++) {
            let b = board(pos, kx + d * ix, ky + d * iy);
            let line = ix == 0 || iy == 0;
            if (b == 'q' || b == 'r' && line || b == 'b' && !line) return true;
            if (b != '-') break;
        }
    }
    return false;
}

function doMove(pos, from, to, promotion) {
    if (!pos.b ||
        typeof pos.b[from.x] === 'undefined' ||
        typeof pos.b[from.x][from.y] === 'undefined' ||
        typeof pos.b[to.x] === 'undefined' ||
        typeof pos.b[to.x][to.y] === 'undefined') {
        return pos; // Return the original position without changes
    }
    if (pos.b[from.x][from.y].toUpperCase() != pos.b[from.x][from.y]) {
        let r = colorflip(doMove(colorflip(pos), {
            x: from.x,
            y: 7 - from.y
        }, {
            x: to.x,
            y: 7 - to.y
        }, promotion));
        r.m[1]++;
        return r;
    }
    let r = colorflip(colorflip(pos));
    r.w = !r.w;
    if (from.x == 7 && from.y == 7) r.c[0] = false;
    if (from.x == 0 && from.y == 7) r.c[1] = false;
    if (to.x == 7 && to.y == 0) r.c[2] = false;
    if (to.x == 0 && to.y == 0) r.c[3] = false;
    if (from.x == 4 && from.y == 7) r.c[0] = r.c[1] = false;
    r.e = pos.b[from.x][from.y] == 'P' && from.y == 6 && to.y == 4 ? [from.x, 5] : null;
    if (pos.b[from.x][from.y] == 'K') {
        if (Math.abs(from.x - to.x) > 1) {
            r.b[from.x][from.y] = '-';
            r.b[to.x][to.y] = 'K';
            r.b[to.x > 4 ? 5 : 3][to.y] = 'R';
            r.b[to.x > 4 ? 7 : 0][to.y] = '-';
            return r;
        }
    }
    if (pos.b[from.x][from.y] == 'P' && to.y == 0) {
        r.b[to.x][to.y] = promotion != null ? promotion : getPromotionPiece();
    } else if (pos.b[from.x][from.y] == 'P' &&
        pos.e != null && to.x == pos.e[0] && to.y == pos.e[1] &&
        Math.abs(from.x - to.x) == 1) {
        r.b[to.x][from.y] = '-';
        r.b[to.x][to.y] = pos.b[from.x][from.y];

    } else {
        r.b[to.x][to.y] = pos.b[from.x][from.y];
    }
    r.b[from.x][from.y] = '-';
    r.m[0] = (pos.b[from.x][from.y] == 'P' || pos.b[to.x][to.y] != '-') ? 0 : r.m[0] + 1;
    return r;
}

function isLegal(pos, from, to) {
    if (!bounds(from.x, from.y)) return false;
    if (!bounds(to.x, to.y)) return false;
    if (from.x == to.x && from.y == to.y) return false;
    if (pos.b[from.x][from.y] != pos.b[from.x][from.y].toUpperCase()) {
        return isLegal(colorflip(pos), {
            x: from.x,
            y: 7 - from.y
        }, {
            x: to.x,
            y: 7 - to.y
        })
    }
    if (!pos.w) return false;
    let pfrom = pos.b[from.x][from.y];
    let pto = pos.b[to.x][to.y];
    if (pto.toUpperCase() == pto && pto != '-') return false;
    if (pfrom == '-') {
        return false;
    } else if (pfrom == 'P') {
        let enpassant = pos.e != null && to.x == pos.e[0] && to.y == pos.e[1];
        if (!((from.x == to.x && from.y == to.y + 1 && pto == '-') ||
                (from.x == to.x && from.y == 6 && to.y == 4 && pto == '-' && pos.b[to.x][5] == '-') ||
                (Math.abs(from.x - to.x) == 1 && from.y == to.y + 1 && (pto != '-' || enpassant))
            )) return false;
    } else if (pfrom == 'N') {
        if (Math.abs(from.x - to.x) < 1 || Math.abs(from.x - to.x) > 2) return false;
        if (Math.abs(from.y - to.y) < 1 || Math.abs(from.y - to.y) > 2) return false;
        if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) != 3) return false;
    } else if (pfrom == 'K') {
        let castling = true;
        if (from.y != 7 || to.y != 7) castling = false;
        if (from.x != 4 || (to.x != 2 && to.x != 6)) castling = false;
        if (to.x == 6 && !pos.c[0] || to.x == 2 && !pos.c[1]) castling = false;
        if (to.x == 2 && pos.b[0][7] + pos.b[1][7] + pos.b[2][7] + pos.b[3][7] != 'R---') castling = false;
        if (to.x == 6 && pos.b[5][7] + pos.b[6][7] + pos.b[7][7] != '--R') castling = false;
        if ((Math.abs(from.x - to.x) > 1 || Math.abs(from.y - to.y) > 1) && !castling) return false;
        if (castling && isWhiteCheck(pos)) return false;
        if (castling && isWhiteCheck(doMove(pos, from, {
                x: to.x == 2 ? 3 : 5,
                y: 7
            }))) return false;
    }
    if (pfrom == 'B' || pfrom == 'R' || pfrom == 'Q') {
        let a = from.x - to.x,
            b = from.y - to.y;
        let line = a == 0 || b == 0;
        let diag = Math.abs(a) == Math.abs(b);
        if (!line && !diag) return false;
        if (pfrom == 'R' && !line) return false;
        if (pfrom == 'B' && !diag) return false;
        let count = Math.max(Math.abs(a), Math.abs(b));
        let ix = a > 0 ? -1 : a < 0 ? 1 : 0,
            iy = b > 0 ? -1 : b < 0 ? 1 : 0;
        for (let i = 1; i < count; i++) {
            if (pos.b[from.x + ix * i][from.y + iy * i] != '-') return false;
        }
    }
    if (isWhiteCheck(doMove(pos, from, to))) return false;
    return true;
}

function parseMove(pos, s) {
    let promotion = null;
    s = s.replace(/[\+|#|\?|!|x]/g, '');
    if (s.length >= 2 && s[s.length - 2] == '=') {
        promotion = s[s.length - 1]
        s = s.substring(0, s.length - 2);
    }
    if (s.length >= 3 && 'NBRQ'.indexOf(s[s.length - 1]) >= 0) {
        promotion = s[s.length - 1]
        s = s.substring(0, s.length - 1);
    }
    if (s == 'O-O' || s == 'O-O-O') {
        let from = {
                x: 4,
                y: pos.w ? 7 : 0
            },
            to = {
                x: s == 'O-O' ? 6 : 2,
                y: pos.w ? 7 : 0
            };
        if (isLegal(pos, from, to)) return {
            from: from,
            to: to
        };
        else return null;
    } else {
        let p;
        if ('PNBRQK'.indexOf(s[0]) < 0) {
            p = 'P';
        } else {
            p = s[0];
            s = s.substring(1);
        }
        if (s.length < 2 || s.length > 4) return null;
        let xto = 'abcdefgh'.indexOf(s[s.length - 2]);
        let yto = '87654321'.indexOf(s[s.length - 1]);
        let xfrom = -1,
            yfrom = -1;
        if (s.length > 2) {
            xfrom = 'abcdefgh'.indexOf(s[0]);
            yfrom = '87654321'.indexOf(s[s.length - 3]);
        }
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                if (xfrom != -1 && xfrom != x) continue;
                if (yfrom != -1 && yfrom != y) continue;
                if (pos.b[x][y] == (pos.w ? p : p.toLowerCase()) && isLegal(pos, {
                        x: x,
                        y: y
                    }, {
                        x: xto,
                        y: yto
                    })) {
                    xfrom = x;
                    yfrom = y;
                }
            }
        }
        if (xto < 0 || yto < 0 || xfrom < 0 || yfrom < 0) return null;
        return {
            from: {
                x: xfrom,
                y: yfrom
            },
            to: {
                x: xto,
                y: yto
            },
            p: promotion
        };
    }
}

function genMoves(pos) {
    let moves = [];
    for (let x1 = 0; x1 < 8; x1++)
        for (let y1 = 0; y1 < 8; y1++)
            for (let x2 = 0; x2 < 8; x2++)
                for (let y2 = 0; y2 < 8; y2++) {
                    if (isLegal(pos, {
                            x: x1,
                            y: y1
                        }, {
                            x: x2,
                            y: y2
                        })) {
                        if ((y2 == 0 || y2 == 7) && pos.b[x1][y1].toUpperCase() == 'P') {
                            moves.push({
                                from: {
                                    x: x1,
                                    y: y1
                                },
                                to: {
                                    x: x2,
                                    y: y2
                                },
                                p: 'N'
                            });
                            moves.push({
                                from: {
                                    x: x1,
                                    y: y1
                                },
                                to: {
                                    x: x2,
                                    y: y2
                                },
                                p: 'B'
                            });
                            moves.push({
                                from: {
                                    x: x1,
                                    y: y1
                                },
                                to: {
                                    x: x2,
                                    y: y2
                                },
                                p: 'R'
                            });
                            moves.push({
                                from: {
                                    x: x1,
                                    y: y1
                                },
                                to: {
                                    x: x2,
                                    y: y2
                                },
                                p: 'Q'
                            });
                        } else moves.push({
                            from: {
                                x: x1,
                                y: y1
                            },
                            to: {
                                x: x2,
                                y: y2
                            }
                        });
                    }
                }
    return moves;
}

function sanMove(pos, move, moves) {
    let s = '';
    if (move.from.x == 4 && move.to.x == 6 && pos.b[move.from.x][move.from.y].toLowerCase() == 'k') {
        s = 'O-O';
    } else if (move.from.x == 4 && move.to.x == 2 && pos.b[move.from.x][move.from.y].toLowerCase() == 'k') {
        s = 'O-O-O';
    } else {
        if (!pos.b ||
            typeof pos.b[move.from.x] === 'undefined' ||
            typeof pos.b[move.from.x][move.from.y] === 'undefined') {
            return s; // Return the original position without changes
        }
        let piece = pos.b[move.from.x][move.from.y].toUpperCase();
        if (piece != 'P') {
            let a = 0,
                sx = 0,
                sy = 0;
            for (let i = 0; i < moves.length; i++) {
                if (pos.b[moves[i].from.x][moves[i].from.y] == pos.b[move.from.x][move.from.y] &&
                    (moves[i].from.x != move.from.x || moves[i].from.y != move.from.y) &&
                    (moves[i].to.x == move.to.x && moves[i].to.y == move.to.y)) {
                    a++;
                    if (moves[i].from.x == move.from.x) sx++;
                    if (moves[i].from.y == move.from.y) sy++;
                }
            }
            s += piece;
            if (a > 0) {
                if (sx > 0 && sy > 0) s += 'abcdefgh' [move.from.x] + '87654321' [move.from.y];
                else if (sx > 0) s += '87654321' [move.from.y];
                else s += 'abcdefgh' [move.from.x];
            }
        }
        if (pos.b[move.to.x][move.to.y] != '-' || piece == 'P' && move.to.x != move.from.x) {
            if (piece == 'P') s += 'abcdefgh' [move.from.x];
            s += 'x';
        }
        s += 'abcdefgh' [move.to.x] + '87654321' [move.to.y];
        if (piece == 'P' && (move.to.y == 0 || move.to.y == 7)) s += '=' + (move.p == null ? 'Q' : move.p);
    }
    let pos2 = doMove(pos, move.from, move.to, move.p);
    if (isWhiteCheck(pos2) || isWhiteCheck(colorflip(pos2))) s += genMoves(pos2).length == 0 ? '#' : '+';
    return s;
}

function fixCastling(pos) {
    pos.c[0] &= !(pos.b[7][7] != 'R' || pos.b[4][7] != 'K');
    pos.c[1] &= !(pos.b[0][7] != 'R' || pos.b[4][7] != 'K');
    pos.c[2] &= !(pos.b[7][0] != 'r' || pos.b[4][0] != 'k');
    pos.c[3] &= !(pos.b[0][0] != 'r' || pos.b[4][0] != 'k');
}

function checkPosition(pos) {
    let errmsgs = [];
    let wk = bk = 0,
        wp = bp = 0,
        wpr = bpr = 0,
        wn = wb1 = wb2 = wr = wq = 0,
        bn = bb1 = bb2 = br = bq = 0;
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            let c = ((x + y) % 2) == 0;
            if (pos.b[x][y] == 'K') wk++;
            if (pos.b[x][y] == 'k') bk++;
            if (pos.b[x][y] == 'P') wp++;
            if (pos.b[x][y] == 'p') bp++;
            if (pos.b[x][y] == 'N') wn++;
            if (pos.b[x][y] == 'n') bn++;
            if (c && pos.b[x][y] == 'B') wb1++;
            if (c && pos.b[x][y] == 'b') bb1++;
            if (!c && pos.b[x][y] == 'B') wb2++;
            if (!c && pos.b[x][y] == 'b') bb2++;
            if (pos.b[x][y] == 'R') wr++;
            if (pos.b[x][y] == 'r') br++;
            if (pos.b[x][y] == 'Q') wq++;
            if (pos.b[x][y] == 'q') bq++;
            if (pos.b[x][y] == 'P' && (y == 0 || y == 7)) wpr++;
            if (pos.b[x][y] == 'p' && (y == 0 || y == 7)) bpr++;
        }
    }
    if (wk == 0) errmsgs.push('Missing white king');
    if (bk == 0) errmsgs.push('Missing black king');
    if (wk > 1) errmsgs.push('Two white kings');
    if (bk > 1) errmsgs.push('Two black kings');
    let wcheck = isWhiteCheck(pos);
    let bcheck = isWhiteCheck(colorflip(pos));
    if (pos.w && bcheck || !pos.w && wcheck) errmsgs.push('Non-active color is in check');
    if (wp > 8) errmsgs.push('Too many white pawns');
    if (bp > 8) errmsgs.push('Too many black pawns');
    if (wpr > 0) errmsgs.push('White pawns in first or last rank');
    if (bpr > 0) errmsgs.push('Black pawns in first or last rank');
    let we = Math.max(0, wq - 1) + Math.max(0, wr - 2) + Math.max(0, wb1 - 1) + Math.max(0, wb2 - 1) + Math.max(0, wn - 2);
    let be = Math.max(0, bq - 1) + Math.max(0, br - 2) + Math.max(0, bb1 - 1) + Math.max(0, bb2 - 1) + Math.max(0, bn - 2);
    if (we > Math.max(0, 8 - wp)) errmsgs.push('Too many extra white pieces');
    if (be > Math.max(0, 8 - bp)) errmsgs.push('Too many extra black pieces');
    if ((pos.c[0] && (pos.b[7][7] != 'R' || pos.b[4][7] != 'K')) ||
        (pos.c[1] && (pos.b[0][7] != 'R' || pos.b[4][7] != 'K'))) errmsgs.push('White has castling rights and king or rook not in their starting position');
    if ((pos.c[2] && (pos.b[7][0] != 'r' || pos.b[4][0] != 'k')) ||
        (pos.c[3] && (pos.b[0][0] != 'r' || pos.b[4][0] != 'k'))) errmsgs.push('Black has castling rights and king or rook not in their starting position');
    return errmsgs;
}

// ============================
// Move List Functions
// ============================

function refreshMoves() {
    requestAnimationFrame(() => {
        let pos = parseFEN(getCurFEN());
        _curmoves = [];
        setElemText(document.getElementById('moves'), '');
        let errmsgs = checkPosition(pos);
        if (errmsgs.length == 0) {
            let moves = genMoves(pos);
            for (let i = 0; i < moves.length; i++) {
                _curmoves.push({
                    move: moves[i],
                    san: sanMove(pos, moves[i], moves),
                    fen: generateFEN(doMove(pos, moves[i].from, moves[i].to, moves[i].p)),
                    w: !pos.w,
                    eval: null,
                    depth: 0
                });
            }
            if (_curmoves.length == 0) {
                let matecheck = pos.w && isWhiteCheck(pos) || !pos.w && isWhiteCheck(colorflip(pos));
                let fragment = document.createDocumentFragment();
                let div0 = document.createElement('div');
                div0.style.padding = '8px 16px';
                let div = document.createElement('div');
                div.style.backgroundColor = '#800080';
                div.className = 'positionStatus';
                setElemText(div, matecheck ? 'Checkmate' : 'Stalemate');
                div0.appendChild(div);
                let ul = document.createElement('ul'),
                    li = document.createElement('li');
                setElemText(li, matecheck && pos.w ? 'Black wins' : matecheck ? 'White wins' : 'Draw');
                ul.appendChild(li);
                div0.appendChild(ul);
                fragment.appendChild(div0);
                document.getElementById('moves').appendChild(fragment);
            } else {
                showEvals();
            }
        } else {
            let fragment = document.createDocumentFragment();
            let div0 = document.createElement('div');
            div0.style.padding = '8px 16px';
            let div = document.createElement('div');
            div.style.backgroundColor = '#bb0000';
            div.className = 'positionStatus';
            setElemText(div, 'Illegal position');
            div0.appendChild(div);
            fragment.appendChild(div0);
            document.getElementById('moves').appendChild(fragment);
        }
    });
}

// ============================
// History Functions
// ============================
function historyButtons() {
    document.getElementById('buttonBack').className = _historyindex > 0 ? 'on' : 'off';
    document.getElementById('buttonForward').className = _historyindex < _history.length - 1 ? 'on' : 'off';
}

function historyAdd(fen, oldhistory, move, san) {
    if (_historyindex >= 0 && _history[_historyindex][0] == fen) return;
    let c = null;
    if (oldhistory != null) {
        for (let i = 0; i < oldhistory.length; i++) {
            if (oldhistory[i][0] == fen && oldhistory[i].length > 1) c = oldhistory[i][1];
        }
    } else {
        if (_history2 == null) {
            _history2 = [_historyindex, JSON.parse(JSON.stringify(_history))];
            refreshButtonRevert();
        }
    }
    _historyindex++;
    _history.length = _historyindex;
    _history.push([fen, c, move, san]);
    historyButtons();
}

function historyMove(v, e, ctrl) {
    if (e == null) e = window.event;
    let oldindex = _historyindex;
    // Adjust this block to include move and san as null
    if (_historyindex == _history.length - 1 && _history[_historyindex][0] != getCurFEN()) {
        historyAdd(getCurFEN(), null, null, null); // Pass null for move and san
    }
    _historyindex += v;
    if (_historyindex < 0) _historyindex = 0;
    if (_historyindex >= _history.length) _historyindex = _history.length - 1;
    if ((e != null && e.ctrlKey && Math.abs(v) == 1) || ctrl) _historyindex = v == 1 ? _history.length - 1 : 0;
    if (v == 0 || (oldindex != _historyindex || getCurFEN() != _history[_historyindex][0])) {
        setCurFEN(_history[_historyindex][0]);
        historyButtons();
        showBoard();
    }
}

function historyKeep(wname, bname) {
    _wname = wname || 'White';
    _bname = bname || 'Black';
    _history2 = null;
    refreshButtonRevert();
    historyMove(0);
}

// ============================
// Mouse and Keyboard Events
// ============================

function getCurScale() {
    if (document.getElementById('wChessboard').style.display == 'none') return 1;
    return Math.min(
        (document.getElementById('wChessboard').clientWidth - 414 + 408) / 408,
        (document.getElementById('wChessboard').clientHeight + (_mobile ? 30 : 0) - 437 + 368) / 368
    );
}

function getDragX(x, full) {
    let bb = document.getElementById('chessboard1').getBoundingClientRect();
    let w = bb.width / 8;
    let offsetX = bb.left + w / 2;
    if (_flip) return 7 - Math.round((x - offsetX) / w);
    else return Math.round((x - offsetX) / w);
}

function getDragY(y, full) {
    let bb = document.getElementById('chessboard1').getBoundingClientRect();
    let h = bb.width / 8;
    let offsetY = bb.top + h / 2;
    if (_flip) return 7 - Math.round((y - offsetY) / h);
    else return Math.round((y - offsetY) / h);
}

function getCurSan(move) {
    if (move == null) return null;
    for (let i = 0; i < _curmoves.length; i++)
        if (_curmoves[i].move.from.x == move.from.x && _curmoves[i].move.from.y == move.from.y &&
            _curmoves[i].move.to.x == move.to.x && _curmoves[i].move.to.y == move.to.y &&
            _curmoves[i].move.p == move.p) return _curmoves[i].san;
    return null;
}

function onMouseDown(e) {
    if (_menu) showHideMenu(false, e);
    if (e == null) e = window.event;
    let elem = target = e.target != null ? e.target : e.srcElement;
    if (document.onmousemove == graphMouseMove && target != null && target.id != 'graphWrapper' && target.id != 'graph') {
        document.getElementById('graphWrapper').onmouseout();
    } else if (document.onmousemove == graphMouseMove) {
        graphMouseDown(e);
        return;
    }
    if (_dragElement != null) return true;
    if (target != null && target.className == 'cbCell' && target.children[0].id == 'chessboard1') {
        target = target.children[0];
        let bb = document.getElementById('chessboard1').getBoundingClientRect();
        let w = bb.width / 8;
        let cx = Math.round((e.clientX - bb.left - (w / 2)) / w);
        let cy = Math.round((e.clientY - bb.top - (w / 2)) / w);
        for (let i = 0; i < target.children.length; i++) {
            e0 = target.children[i];
            if (e0.style.left == (cx * 40) + 'px' && e0.style.top == (cy * 40) + 'px') elem = e0;
        }
    }
    while (target != null && target.id != 'chessboard1' && target.id != 'editWrapper' && target.tagName != 'BODY') {
        target = target.parentNode;
    }
    if (target == null) return true;
    if (elem.id == 'editWrapper' || elem.className.length < 3) return;
    if (target.id != 'editWrapper' && target.id != 'chessboard1') return true;

    let edit = isEdit();
    if (edit && target.id == 'chessboard1' && elem.className != null && (e.which === 2 || e.button === 4)) {
        if (getPaintPiece() == elem.className[2]) setPaintPiece('S');
        else setPaintPiece(elem.className[2]);
        if (e && e.preventDefault) e.preventDefault();
        return;
    }
    if (target.id == 'chessboard1' && edit && (getPaintPiece() != 'S' || (e.which === 3 || e.button === 2))) {
        if (e && e.preventDefault) e.preventDefault();
        paintMouse(e);
        return;
    }

    document.onmousemove = onMouseMove;
    document.body.focus();
    document.onselectstart = function() {
        return false;
    };
    elem.ondragstart = function() {
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

function dragActivate() {
    if (_dragElement == null) return;
    if (_dragElement.parentNode == null) return;
    if (_dragElement.className[2] == '-' && !dragFromEditTools) return;
    let dragFromEditTools = _dragElement.parentNode.id != 'chessboard1';

    let clone = _dragElement.cloneNode(false);
    if (!_dragCtrl) _dragElement.className = _dragElement.className[0] + ' -';
    _dragElement = clone;
    _dragElement.className = _dragElement.className.substring(0, 3);
    _dragElement.style.backgroundColor = 'transparent';
    _dragElement.style.background = 'none';
    _dragElement.style.zIndex = 10000;
    _dragElement.style.pointerEvents = 'none';
    _dragElement.style.transform = 'scale(' + getCurScale() + ')';
    document.getElementById('dragPiece').appendChild(_dragElement);
    _dragActive = true;
    if (!isEdit() && !_dragCtrl) showLegalMoves({
        x: getDragX(_startX),
        y: getDragY(_startY)
    });
    if (dragFromEditTools) setPaintPiece(_dragElement.className[2]);
}

function doMoveHandler(move, copy) {
    updateTooltip('');
    let oldfen = getCurFEN(); // Position before the move
    let pos = parseFEN(oldfen);
    let legal = copy == null && isLegal(pos, move.from, move.to) && _curmoves.length > 0;
    if (legal) {
        let san = getCurSan(move); // Get the SAN notation of the move
        if (pos.w != _play) {
            pos = doMove(pos, move.from, move.to, move.p); // Apply the move to the position
        }
        setCurFEN(generateFEN(pos)); // Update the current FEN to the new position
        // Store the new position along with the move and SAN notation in history
        historyAdd(getCurFEN(), null, move, san);
        // Optional: Log history for debugging
        // console.log('History:', _history);
        requestAnimationFrame(() => {
            showBoard(getCurFEN() == oldfen);
            doComputerMove();
        });
    } else if (isEdit() && (move.from.x != move.to.x || move.from.y != move.to.y)) {
        if (copy && bounds(move.to.x, move.to.y)) {
            pos.b[move.to.x][move.to.y] = copy;
        } else if (!copy && bounds(move.from.x, move.from.y)) {
            if (bounds(move.to.x, move.to.y)) pos.b[move.to.x][move.to.y] = pos.b[move.from.x][move.from.y];
            pos.b[move.from.x][move.from.y] = '-';
        } else return false;
        fixCastling(pos);
        // Store SAN notation for edit moves as null
        historyAdd(oldfen, null, null, null); // Update this line
        setCurFEN(generateFEN(pos));
        historyAdd(getCurFEN(), null, null, null); // Update this line
        requestAnimationFrame(() => {
            showBoard(getCurFEN() == oldfen);
        });
    } else return false;
    return true;
}

function onMouseMove(e) {
    requestAnimationFrame(() => {
        defaultMouseMove(e);
        if (document.onmousemove != onMouseMove && isEdit() && getPaintPiece() != 'S') paintMouse(e, getPaintPiece());
        if (_dragElement == null) return;
        if (e == null) e = window.event;
        if (!_dragActive) {
            if (Math.abs(e.clientX - _startX) < 8 && Math.abs(e.clientY - _startY) < 8) return;
            if (_dragLMB > 0) {
                let x1 = getDragX(_startX),
                    y1 = getDragY(_startY),
                    x2 = getDragX(e.clientX),
                    y2 = getDragY(e.clientY);
                showArrow3({
                    from: { x: x1, y: y1 },
                    to: { x: x2, y: y2 }
                });
                _dragLMB = 2;
                return;
            }
            if ('PNBRQK'.indexOf(_dragElement.className[2].toUpperCase()) < 0) return;
            dragActivate();
        }

        _dragElement.style.left = (e.clientX * _bodyScale - 20) + 'px';
        _dragElement.style.top = (getClientY(e) - 20) + 'px';
        _dragElement.style.color = 'transparent';
        setElemText(_dragElement, '-'); // force browser to refresh pop-up
    });
}

function onMouseUp(e) {
    if (document.onmousemove == graphMouseMove) return;
    onMouseMove(e);
    if (!_dragActive && _clickFrom != null && _clickFromElem != null && _clickFromElem.className.indexOf(' h0') > 0 && _dragLMB == 0) {
        let oldDragElement = _dragElement;
        _dragElement = _clickFromElem;
        let x2 = getDragX(e.clientX);
        let y2 = getDragY(e.clientY);
        _dragElement = null;
        if (!doMoveHandler({
                from: _clickFrom,
                to: {
                    x: x2,
                    y: y2
                }
            })) _dragElement = oldDragElement;
    }
    if (_dragElement != null) {
        let x1 = getDragX(_startX),
            y1 = getDragY(_startY);
        let x2 = getDragX(e.clientX),
            y2 = getDragY(e.clientY);
        if (_dragActive) {
            if (!doMoveHandler({
                    from: {
                        x: x1,
                        y: y1
                    },
                    to: {
                        x: x2,
                        y: y2
                    }
                }, _dragCtrl ? _dragElement.className[2] : null)) {
                showBoard(true);
            } else {
                if (!bounds(x1, y1)) setPaintPiece('S');
            }
        } else {
            let ew1br = document.getElementById('editWrapper').children[0].children[0].getBoundingClientRect();
            let ew1w = ew1br.width;
            if (_dragElement.parentNode.id != 'chessboard1') {
                x1 = -Math.round((e.clientX - ew1br.left - (ew1w / 2)) / ew1w) - 1;
                y1 = -Math.round((e.clientY - ew1br.top - (ew1w / 2)) / ew1w) - 1;
                if (_dragElement.parentNode.className != 'cb' || x1 > 0 || y1 > 0) x1 = y1 = -99;
            }
            if (e.which === 3 || e.button === 2) {
                if (_dragElement.parentNode.id == 'chessboard1') {
                    if (_dragLMB == 1) {
                        let c = _dragElement.className;
                        _dragElement.className = c.split(' ')[0] + ' ' + c.split(' ')[1] +
                            (c.indexOf(' h0') >= 0 ? ' h0' : '') +
                            (c.indexOf(' h1') >= 0 ? ' h1' : '') +
                            (c.indexOf(' h2') >= 0 ? ' h2' : '') +
                            (c.indexOf(' h3') < 0 ? ' h3' : '');
                    }
                    finalArrow3();
                } else {
                    let list = document.getElementById('editWrapper').children[0].children,
                        p = null;
                    for (let i = 0; i < list.length; i++) {
                        let x1c = -Math.round((list[i].getBoundingClientRect().left - ew1br.left) / ew1w) - 1;
                        let y1c = -Math.round((list[i].getBoundingClientRect().top - ew1br.top) / ew1w) - 1;
                        if (list[i].className != null && x1c == x1 && y1c == y1) p = list[i].className[2];
                    }
                    if (p != null) {
                        if (p == 'S') setCurFEN(START);
                        else if (p == '-') setCurFEN('8/8/8/8/8/8/8/8 w - - 0 0');
                        else {
                            let pos = parseFEN(getCurFEN());
                            for (let x = 0; x < 8; x++)
                                for (let y = 0; y < 8; y++)
                                    if (pos.b[x][y] == p) pos.b[x][y] = '-';
                            fixCastling(pos);
                            setCurFEN(generateFEN(pos));
                        }
                        showBoard();
                    }
                }
            } else if (_clickFrom != null &&
                _clickFromElem != null &&
                _clickFromElem.className.indexOf(' h0') > 0 &&
                _clickFrom.x == x1 &&
                _clickFrom.y == y1 ||
                _dragElement.className[2] == '-' && _dragElement.parentNode.id == 'chessboard1') {
                showLegalMoves(null);
            } else {
                showLegalMoves({
                    x: x1,
                    y: y1
                });
            }
        }
    } else {
        if (_clickFrom == null || _clickFrom.x > 0 && _clickFrom.y > 0 || (_clickFromElem != null && _clickFromElem.className[2] == 'S' && (e.which === 1 || e.button === 0))) showLegalMoves(null);
    }
    document.onmousemove = defaultMouseMove;
    document.onselectstart = null;
    _dragElement = null;

}

function onWheel(e) {
    if (_menu) showHideMenu(false);
    if (e.ctrlKey) return;
    if (isEdit()) {
        let p = getPaintPiece();
        let str = 'Spnbrqk-PNBRQK';
        let index = str.indexOf(p);
        if (index >= 0) {
            if (e.deltaY < 0) index--;
            if (e.deltaY > 0) index++;
            if (index < 0) index = str.length - 1;
            if (index == str.length) index = 0;
            setPaintPiece(str[index]);
        }

    } else {
        if (e.deltaY < 0) historyMove(-1);
        if (e.deltaY > 0) historyMove(+1);
    }
    e.preventDefault();
}

function setPaintPiece(newp) {
    let list = document.getElementById('editWrapper').children[0].children,
        newe = null;
    for (let i = 0; i < list.length; i++) {
        if (list[i].className != null && list[i].className[2] == newp) newe = list[i];
    }
    if (newe != null) {
        let x2 = -Math.round(parseFloat(newe.style.left.replace('px', '')) / 40) - 1;
        let y2 = -Math.round(parseFloat(newe.style.top.replace('px', '')) / 40) - 1;
        showLegalMoves({
            x: x2,
            y: y2
        });
    }
}

function getPaintPiece() {
    let list = document.getElementById('editWrapper').children[0].children;
    for (let i = 0; i < list.length; i++) {
        if (list[i].className != null && list[i].className.indexOf(' h0') > 0) return list[i].className[2];
    }
    return 'S';
}

function isEdit() {
    return _clickFrom != null && _clickFromElem != null && _clickFromElem.className.indexOf(' h0') > 0 && _clickFrom.x < 0 && _clickFrom.y < 0;
}

function paintMouse(e, p) {
    if (e == null) e = window.event;
    let elem = target = e.target != null ? e.target : e.srcElement;
    if (elem.parentNode == null || elem.parentNode.id != 'chessboard1') return;
    let w = elem.getBoundingClientRect().width;
    let h = elem.getBoundingClientRect().height;
    let offsetX = document.getElementById('chessboard1').getBoundingClientRect().left + w / 2;
    let offsetY = document.getElementById('chessboard1').getBoundingClientRect().top + h / 2;
    let x1 = Math.round((e.clientX - offsetX) / w);
    let y1 = Math.round((e.clientY - offsetY) / h);
    if (_flip) {
        x1 = 7 - x1;
        y1 = 7 - y1;
    }
    if (bounds(x1, y1) && (_clickFromElem != null && _clickFromElem.className.indexOf(' h0') > 0 || (e.which === 3 || e.button === 2))) {

        let pos = parseFEN(getCurFEN());
        let newp = null;
        if (e.ctrlKey || (e.which === 3 || e.button === 2)) newp = '-';
        else newp = p != null ? p : _clickFromElem.className[2];
        pos.b[x1][y1] = newp;
        fixCastling(pos);
        setCurFEN(generateFEN(pos));
        showBoard(null, null, true);
        if (p == null) {
            document.onmousemove = function(event) {
                paintMouse(event, newp);
            };
        }
    } else document.onmousemove = defaultMouseMove;
}

function onKeyDown(e) {
    if (e.ctrlKey) return;

    const key = e.key;
    const engineReady = _analysisEngine != null && _analysisEngine.ready;

    switch (key) {
        case '`':
        case '*':
            if (engineReady) command('depth ' + (_analysisEngine.depth !== 0 ? '0' : DEFAULT_DEPTH));
            break;
        case '+':
            if (engineReady) command('depth ' + Math.min(MAX_DEPTH, _analysisEngine.depth + 1));
            break;
        case '-':
            if (engineReady) command('depth ' + Math.max(MIN_DEPTH, _analysisEngine.depth - 1));
            break;
        case 'ArrowUp':
        case 'ArrowLeft':
            historyMove(-1);
            break;
        case 'PageUp':
            historyMove(-10);
            break;
        case 'Home':
            historyMove(-1, null, true);
            break;
        case 'ArrowDown':
        case 'ArrowRight':
            historyMove(1);
            break;
        case 'PageDown':
            historyMove(10);
            break;
        case 'End':
            historyMove(1, null, true);
            break;
        case 'R':
            showBoard(false, true);
            break;
        case 'P':
            togglePromotionPiece();
            break;
        case 'K':
            command('keep');
            break;
        case 'Escape':
            command('revert');
            break;
        case 'F':
            command('flip');
            break;
        case 'T':
            command('sidetomove');
            break;
        case '0':
            command('reset');
            break;
        case 'N':
            command('window');
            break;
        case 'C':
            showHideWindow('Chessboard');
            break;
        case 'M':
            showHideWindow('Moves');
            break;
        case 'H':
            showHideWindow('History');
            break;
        case 'G':
            showHideWindow('Graph');
            break;
        case 'S':
            showHideWindow('Static');
            break;
        case 'E':
            showHideWindow('Edit');
            break;
        case '1':
            menuAnalysisMode();
            break;
        case '2':
            menuPlayEngineWhite();
            break;
        case '3':
            menuPlayEngineBlack();
            break;
        case '4':
            menuTwoPlayerMode();
            break;
        default:
            break;
    }
}

// ============================
// Evaluation Engine
// ============================

function loadEngine(onReady) {
    let engine = {
        ready: false,
        kill: false,
        waiting: true,
        depth: DEFAULT_DEPTH,
        lastnodes: 0
    };

    let wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
    if (typeof(Worker) === 'undefined') return engine;
    try {
        var worker = new Worker('./engine/stockfish-16.1.js');
    } catch (err) {
        return engine;
    }
    worker.onmessage = function(e) {
        if (engine.messagefunc) engine.messagefunc(e.data);
    }
    engine.send = function send(cmd, message) {
        cmd = String(cmd).trim();
        engine.messagefunc = message;
        worker.postMessage(cmd);
    };
    engine.eval = function eval(fen, done, info) {
        engine.send('position fen ' + fen);
        engine.send('go depth ' + engine.depth, function message(str) {
            let matches = str.match(/depth (\d+) .*score (cp|mate) ([-\d]+) .*nodes (\d+) .*pv (.+)/);
            if (!matches) matches = str.match(/depth (\d+) .*score (cp|mate) ([-\d]+).*/);
            if (matches) {
                if (engine.lastnodes == 0) engine.fen = fen;
                if (matches.length > 4) {
                    let nodes = Number(matches[4]);
                    if (nodes < engine.lastnodes) engine.fen = fen;
                    engine.lastnodes = nodes;
                }
                let depth = Number(matches[1]);
                let type = matches[2];
                let score = Number(matches[3]);
                if (type == 'mate') score = (1000000 - Math.abs(score)) * (score <= 0 ? -1 : 1);
                engine.score = score;
                if (matches.length > 5) {
                    let pv = matches[5].split(' ');
                    if (info != null && engine.fen == fen) info(depth, score, pv);
                }
            }
            if (str.indexOf('bestmove') >= 0 || str.indexOf('mate 0') >= 0 || str == 'info depth 0 score cp 0') {
                if (engine.fen == fen) done(str);
                engine.lastnodes = 0;
            }
        });
    };
    engine.send('uci', function onuci(str) {
        if (str === 'uciok') {
            engine.send('isready', function onready(str) {
                if (str === 'readyok') {
                    engine.ready = true;
                    engine.send('setoption name EvalFile value ' + NNUE_PATH);
                    if (onReady) onReady(engine);
                }
            });
        }
    });
    return engine;
}

function addHistoryEval(index, score, depth, move) {
    if (_history[index].length < 2 || _history[index][1] == null || (_history[index][1] != null && _history[index][1].depth < depth)) {
        let black = _history[index][0].indexOf(' b ') > 0;
        let ei = { score: score, depth: depth, black: black, move: move };
        if (_history[index].length >= 2) _history[index][1] = ei;
        else {
            _history[index].push(ei);
            _history[index].push(null);
        }
        repaintGraph();
        _wantUpdateInfo = true;
    }
}

function evalNext() {
    for (let i = 0; i < _curmoves.length; i++) {
        if (_curmoves[i].depth < _analysisEngine.depth) {
            let curpos = _curmoves[i].fen;
            _analysisEngine.score = null;
            if (!_analysisEngine.waiting) return;
            _analysisEngine.waiting = false;
            let initialdepth = _analysisEngine.depth;
            let savedpv = [];
            _analysisEngine.eval(curpos, function done(str) {
                _analysisEngine.waiting = true;
                if (i >= _curmoves.length || _curmoves[i].fen != curpos) return;
                if (_analysisEngine.score != null && _analysisEngine.depth == initialdepth) {
                    _curmoves[i].eval = _curmoves[i].w ? _analysisEngine.score : -_analysisEngine.score;
                    _curmoves[i].depth = _analysisEngine.depth;
                    let m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
                    _curmoves[i].answer = (m && m.length > 1 && m[1] != null && (m[1].length == 4 || m[1].length == 5)) ? m[1] : null;
                    _curmoves[i].answerpv = [];
                    let pvtext = '';
                    if (_curmoves[i].answer != null) {
                        if (savedpv.length < 1 || savedpv[0] != m[1]) savedpv = [m[1]];
                        if (m.length > 2 && m[2] != null && m[2].length != 4 && m[2].length != 5) {
                            if (savedpv.length < 2 || savedpv[1] != m[2]) savedpv = [m[1], m[2]];
                        }
                        let nextpos = parseFEN(curpos);
                        for (let j = 0; j < savedpv.length; j++) {
                            if (pvtext.length > 0) pvtext += ' ';
                            let move = parseBestMove(savedpv[j]);
                            pvtext += sanMove(nextpos, move, genMoves(nextpos));
                            _curmoves[i].answerpv.push(savedpv[j]);
                            if (j + 1 < savedpv.length) nextpos = doMove(nextpos, move.from, move.to, move.p);
                        }
                    }
                    _curmoves[i].pvtext = pvtext.length > 0 ? pvtext : '-';
                    showEvals();
                }
                if (!_analysisEngine.kill) evalNext();
            }, function info(depth, score, pv) {
                savedpv = pv;
            });
            return;
        }
    }
    if (_curmoves.length > 0 && _history[_historyindex][0] == getCurFEN()) addHistoryEval(_historyindex, _curmoves[0].w ? -_curmoves[0].eval : _curmoves[0].eval, _analysisEngine.depth, _curmoves[0].move);
    for (let i = _history.length - 1; i >= 0; i--) {
        if (_history[i].length < 2 || _history[i][1] == null || (_history[i][1] != null && _history[i][1].depth < _analysisEngine.depth - 1)) {
            let curpos = _history[i][0];
            _analysisEngine.score = null;
            if (!_analysisEngine.waiting) return;
            if (checkPosition(parseFEN(curpos)).length > 0) {
                addHistoryEval(i, null, _analysisEngine.depth - 1);
                if (!_analysisEngine.kill) evalNext();
            } else {
                _analysisEngine.waiting = false;
                _analysisEngine.eval(curpos, function done(str) {
                    _analysisEngine.waiting = true;
                    if (i >= _history.length || _history[i][0] != curpos) return;
                    if (_analysisEngine.score != null) {
                        let m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
                        let answer = (m && m.length > 1 && (m[1].length == 4 || m[1].length == 5)) ? m[1] : null;
                        addHistoryEval(i, _analysisEngine.score, _analysisEngine.depth - 1, parseBestMove(answer));
                    }
                    if (!_analysisEngine.kill) evalNext();
                });
            }
            return;
        }
    }
}

function applyEval(m, s, d) {
    if (s == null || m.length < 4 || _analysisEngine.depth == 0) return;
    for (let i = 0; i < _curmoves.length; i++) {
        if (_curmoves[i].move.from.x == 'abcdefgh'.indexOf(m[0]) &&
            _curmoves[i].move.from.y == '87654321'.indexOf(m[1]) &&
            _curmoves[i].move.to.x == 'abcdefgh'.indexOf(m[2]) &&
            _curmoves[i].move.to.y == '87654321'.indexOf(m[3])) {
            if (d > _curmoves[i].depth) {
                _curmoves[i].eval = _curmoves[i].w ? -s : s;
                _curmoves[i].depth = d;
                showEvals();
            }
            break;
        }
    }
}

function parseBestMove(m) {
    if (m == null || m.length < 4) return null;
    let from = {
        x: 'abcdefgh'.indexOf(m[0]),
        y: '87654321'.indexOf(m[1])
    };
    let to = {
        x: 'abcdefgh'.indexOf(m[2]),
        y: '87654321'.indexOf(m[3])
    };
    let p = m.length > 4 ? 'nbrq'.indexOf(m[4]) : -1;
    if (p < 0) return {
        from: from,
        to: to
    };
    return {
        from: from,
        to: to,
        p: 'NBRQ' [p]
    };
}

function updateSkillLevelBasedOnDepth(depth) {
    let skillLevel;
    if (depth >= 1 && depth <= 10) {
        skillLevel = depth;
    } else {
        switch (depth) {
            case 11:
                skillLevel = 12;
                break;
            case 12:
                skillLevel = 14;
                break;
            case 13:
                skillLevel = 16;
                break;
            case 14:
                skillLevel = 18;
                break;
            default:
                skillLevel = 20; // Any depth 15 or higher sets the skill to 20
        }
    }
    _analysisEngine.send('setoption name Skill Level value ' + skillLevel);
}

function evalAll() {
    if (_coachMode == false && _play != null) {
        return;
    }
    if (_analysisEngine == null || !_analysisEngine.ready || !_analysisEngine.waiting) {
        if (_analysisEngine) _analysisEngine.kill = true;
        window.setTimeout(evalAll, 50);
        return;
    }
    _analysisEngine.kill = false;
    _analysisEngine.waiting = false;
    for (let i = 0; i < _curmoves.length; i++) {
        _curmoves[i].eval = null;
        _curmoves[i].depth = null;
    }
    if (_analysisEngine.depth == 0) {
        _analysisEngine.waiting = true;
        return;
    }
    let fen = getCurFEN();
    _analysisEngine.send('stop');
    _analysisEngine.send('ucinewgame');
    updateSkillLevelBasedOnDepth(_analysisEngine.depth);
    _analysisEngine.score = null;
    if (_curmoves.length == 0) {
        _analysisEngine.waiting = true;
        if (!_analysisEngine.kill) evalNext();
        return;
    }
    _analysisEngine.eval(fen, function done(str) {
        _analysisEngine.waiting = true;
        if (fen != getCurFEN()) return;
        let matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
        if (matches && matches.length > 1) {
            applyEval(matches[1], _analysisEngine.score, _analysisEngine.depth - 1);
            if (_history[_historyindex][0] == fen) addHistoryEval(_historyindex, _analysisEngine.score, _analysisEngine.depth - 1, parseBestMove(matches[1]));
        }
        if (!_analysisEngine.kill) evalNext();
    }, function info(depth, score, pv) {
        if (fen != getCurFEN() || depth <= 10) return;
        applyEval(pv[0], score, depth - 1);
        if (_history[_historyindex][0] == fen) addHistoryEval(_historyindex, score, depth - 1, parseBestMove(pv[0]));
    });
}

function doComputerMove() {
    if (_play == null) return;
    let fen = getCurFEN();
    if (_isPlayerWhite && fen.indexOf(' w ') > 0) return;
    if (!_isPlayerWhite && fen.indexOf(' b ') > 0) return;

    if (_playEngine != null && !_playEngine.waiting) {
        if (_playEngine) _playEngine.kill = true;
        window.setTimeout(doComputerMove, 50);
        return;
    }
    if (_playEngine == null || !_playEngine.ready) {
        window.setTimeout(doComputerMove, 100);
        return;
    } else {
        _playEngine.kill = false;
        _playEngine.waiting = false;
        _playEngine.send('stop');
        _playEngine.send('ucinewgame');
        _playEngine.score = null;
        _playEngine.eval(fen, function done(str) {
            _playEngine.waiting = true;
            if (fen != getCurFEN()) return;
            let matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
            if (matches && matches.length > 1) {
                let move = parseBestMove(matches[1]);
                let fenBeforeMove = getCurFEN(); // FEN before the engine's move
                let pos = doMove(parseFEN(fenBeforeMove), move.from, move.to, move.p); // Apply the engine's move
                setCurFEN(generateFEN(pos)); // Update to the new position
                // Compute SAN notation for the engine's move
                let san = sanMove(parseFEN(fenBeforeMove), move, genMoves(parseFEN(fenBeforeMove)));
                // Add only one entry to history with the new position, move, and SAN notation
                historyAdd(getCurFEN(), null, move, san);
                // Optional: Log history for debugging
                // console.log('History:', _history);
                updateTooltip('');
                showBoard(false);
            }
        });
    }
}

// ============================
// Classical Static Evaluation
// ============================

function highlightMove(index, state) {
    setArrow(!state);
    if (_dragElement != null) return;
    let elem = document.getElementById('chessboard1');
    let x1 = _curmoves[index].move.from.x;
    let y1 = _curmoves[index].move.from.y;
    let x2 = _curmoves[index].move.to.x;
    let y2 = _curmoves[index].move.to.y;
    let text = getEvalText(_curmoves[index].eval, true);
    for (let i = 0; i < elem.children.length; i++) {
        let div = elem.children[i];
        if (div.tagName != 'DIV') continue;
        if (div.style.zIndex > 0) continue;
        let x = parseInt(div.style.left.replace('px', '')) / 40;
        let y = parseInt(div.style.top.replace('px', '')) / 40;
        if (_flip) {
            x = 7 - x;
            y = 7 - y;
        }
        let c = div.className.split(' ')[0] + ' ' + div.className.split(' ')[1];
        setElemText(div, '');
        if (div.className.indexOf(' h2') >= 0) c += ' h2';
        if (state && x1 == x && y1 == y) div.className = c + ' h0';
        else if (state && x2 == x && y2 == y) {
            div.className = c + ' h1';
            setElemText(div, text);
        } else div.className = c;
        div.onmouseover = null;
    }
    if (state) updateTooltip('', _curmoves[index].answerpv);
    else updateTooltip('');
}

function repaintStatic() {
    if (document.getElementById('wStatic').style.display == 'none') return;

    let curfen = getCurFEN();
    let pos = parseFEN(curfen);

    // Static evaluation window
    requestAnimationFrame(() => {
        if (getCurFEN() != curfen) return;

        let elem = document.getElementById('static');
        let evalUnit = 213;
        while (elem.firstChild) elem.removeChild(elem.firstChild);
        let staticEvalListLast = _historyindex > 0 ? getStaticEvalList(parseFEN(_history[_historyindex - 1][0])) : null;
        let staticEvalList = getStaticEvalList(pos),
            total = 0,
            ci = 5;

        for (let i = 0; i < staticEvalList.length; i++) {
            if (i > 0 && staticEvalList[i - 1].group != staticEvalList[i].group) ci++;
            let c1 = 0,
                c2 = 0,
                c3 = 0;
            while (c1 + c2 + c3 == 0) {
                c1 = 22 + (ci % 2) * 216;
                c2 = 22 + (((ci / 2) << 0) % 3) * 108;
                c3 = 22 + ((((ci / 6) << 0)) % 2) * 216;
                if (c1 + c2 + c3 < 100) {
                    c1 = c2 = c3 = 0;
                    ci++;
                }
            }
            staticEvalList[i].bgcol = 'rgb(' + c1 + ',' + c2 + ',' + c3 + ')';
            staticEvalList[i].rel = staticEvalList[i].item[2] - (staticEvalListLast == null ? 0 : staticEvalListLast[i].item[2]);
        }

        let sortArray = [];
        for (let i = 0; i < staticEvalList.length; i++) {
            sortArray.push({
                value: _staticSortByChange ? staticEvalList[i].rel : staticEvalList[i].item[2],
                index: i
            });
        }

        sortArray.sort(function(a, b) {
            return (Math.abs(a.value) < Math.abs(b.value)) ? 1 : Math.abs(a.value) > Math.abs(b.value) ? -1 : 0;
        });

        let fragment = document.createDocumentFragment();

        for (let j = 0; j < sortArray.length; j++) {
            let i = sortArray[j].index;
            total += staticEvalList[i].item[2];
            let text = (staticEvalList[i].item[2] / evalUnit).toFixed(2);
            if (text == '-0.00') text = '0.00';
            let rel = (staticEvalList[i].rel / evalUnit).toFixed(2);
            if (rel == '-0.00') rel = '0.00';
            if (!_staticSortByChange && text == '0.00') continue;
            if (_staticSortByChange && rel == '0.00') continue;

            let node0 = document.createElement('SPAN');
            node0.className = 'circle';
            node0.style.backgroundColor = staticEvalList[i].bgcol;

            let node1 = document.createElement('DIV');
            node1.className = 'line';
            let node2 = document.createElement('SPAN');
            node2.className = 'group';
            node2.appendChild(document.createTextNode(staticEvalList[i].group));
            let node6 = document.createElement('SPAN');
            node6.className = 'name';
            node6.appendChild(document.createTextNode(staticEvalList[i].elem[0].toUpperCase() + staticEvalList[i].elem.replace(/\_/g, ' ').substring(1)));

            let node3 = document.createElement('SPAN');
            node3.className = 'eval';
            if (text.indexOf('.') >= 0) {
                let node4 = document.createElement('SPAN');
                node4.className = 'numleft';
                node4.appendChild(document.createTextNode(text.substring(0, text.indexOf('.') + 1)));
                let node5 = document.createElement('SPAN');
                node5.className = 'numright';
                node5.appendChild(document.createTextNode(text.substring(text.indexOf('.') + 1)));
                node3.appendChild(node4);
                node3.appendChild(node5);
            } else {
                node3.appendChild(document.createTextNode(text));
            }

            let node7 = document.createElement('SPAN');
            node7.className = 'eval rel';
            if (rel.indexOf('.') >= 0) {
                let node8 = document.createElement('SPAN');
                node8.className = 'numleft';
                node8.appendChild(document.createTextNode(rel.substring(0, rel.indexOf('.') + 1)));
                let node9 = document.createElement('SPAN');
                node9.className = 'numright';
                node9.appendChild(document.createTextNode(rel.substring(rel.indexOf('.') + 1)));
                node7.appendChild(node8);
                node7.appendChild(node9);
            } else {
                node7.appendChild(document.createTextNode(rel));
            }
            node1.appendChild(node0);
            node1.appendChild(node2);
            node1.appendChild(node6);
            node1.appendChild(node3);
            node1.appendChild(node7);
            node1.name = staticEvalList[i].elem.toLowerCase().replace(/ /g, '_');
            node1.onclick = function() {
                let data = _staticEvalData,
                    sei = null;
                for (let j = 0; j < data.length; j++) {
                    let n = data[j].name.toLowerCase().replace(/ /g, '_');
                    if (n == this.name) sei = data[j];
                }
                if (sei == null) return;
                let func = null,
                    n2 = this.name.toLowerCase().replace(/ /g, '_');
                try {
                    eval('func = $' + n2 + ';');
                } catch (e) {}
                let elem = document.getElementById('chessboard1');
                for (let i = 0; i < elem.children.length; i++) {
                    let div = elem.children[i];
                    if (div.tagName != 'DIV' || div.style.zIndex > 0) continue;
                    let x = parseInt(div.style.left.replace('px', '')) / 40;
                    let y = parseInt(div.style.top.replace('px', '')) / 40;
                    if (_flip) {
                        x = 7 - x;
                        y = 7 - y;
                    }
                    let sqeval = 0;
                    if (n2 == 'king_danger') {
                        sqeval = $unsafe_checks(pos, { x: x, y: y });
                        if (sqeval == 0) sqeval = $unsafe_checks(colorflip(pos), { x: x, y: 7 - y });
                        if (sqeval == 0) sqeval = $weak_bonus(pos, { x: x, y: y });
                        if (sqeval == 0) sqeval = $weak_bonus(colorflip(pos), { x: x, y: 7 - y });
                        let showKDarrows = function(p, flipy) {
                            for (let x2 = 0; x2 < 8; x2++)
                                for (let y2 = 0; y2 < 8; y2++) {
                                    if ('PNBRQ'.indexOf(board(p, x, y)) < 0) continue;
                                    let s = { x: x, y: y },
                                        s2 = { x: x2, y: y2 },
                                        a = false;
                                    if ($king_ring(p, s2)) {
                                        if ($pawn_attack(p, s2) && Math.abs(x - x2) == 1 && y - y2 == flipy ? 1 : -1 ||
                                            $knight_attack(p, s2, s) ||
                                            $bishop_xray_attack(p, s2, s) ||
                                            $rook_xray_attack(p, s2, s) ||
                                            $queen_attack(p, s2, s)) a = false;
                                    }
                                    if (!a && $knight_attack(p, s2, s) && $safe_check(p, s2, 0) > 0) a = true;
                                    if (!a && $bishop_xray_attack(p, s2, s) && $safe_check(p, s2, 1) > 0) a = true;
                                    if (!a && $rook_xray_attack(p, s2, s) && $safe_check(p, s2, 2) > 0) a = true;
                                    if (!a && $queen_attack(p, s2, s) && $safe_check(p, s2, 3) > 0) a = true;
                                    if (a) {
                                        if (!flipy) showArrow3({ from: s, to: s2 });
                                        else showArrow3({ from: { x: x, y: 7 - y }, to: { x: x2, y: 7 - y2 } });
                                        finalArrow3();
                                    }
                                }
                        };
                        showKDarrows(pos, false);
                        showKDarrows(colorflip(pos), true);
                    } else {
                        try {
                            sqeval = func(pos, { x: x, y: y });
                            if (sqeval == 0 && sei.forwhite) sqeval = func(colorflip(pos), { x: x, y: 7 - y });
                            if (sqeval == 0) sqeval = func(pos, { x: x, y: y }, true);
                            if (sqeval == 0 && sei.forwhite) sqeval = func(colorflip(pos), { x: x, y: 7 - y }, true);
                        } catch (e) {}
                    }
                    let c = div.className.split(' ')[0] + ' ' + div.className.split(' ')[1];
                    if (div.className.indexOf(' h2') >= 0) c += ' h2';
                    if (sqeval != 0) c += ' h3';
                    div.className = c;
                }
            };
            fragment.appendChild(node1);
        }

        elem.appendChild(fragment);
        setElemText(document.getElementById('staticInfo'), 'Static evaluation (' + (total / evalUnit).toFixed(2) + ')');
    });
}

function showEvals() {
    setElemText(document.getElementById('moves'), '');
    setElemText(document.getElementById('buttonMovesPv'), _movesPv ? 'PV' : 'Reply');
    if (_curmoves.length > 0) {
        let sortfunc = function(a, b) {
            let a0 = a.eval == null ? -2000000 : a.eval * (_curmoves[0].w ? -1 : 1);
            let b0 = b.eval == null ? -2000000 : b.eval * (_curmoves[0].w ? -1 : 1);

            let r = 0;
            if (a0 < b0 || (a0 == b0 && a.san < b.san)) r = 1;
            if (a0 > b0 || (a0 == b0 && a.san > b.san)) r = -1;
            return r;
        }
        _curmoves.sort(sortfunc);
    }
    for (let i = 0; i < _curmoves.length; i++) {
        let node1 = document.createElement('DIV');
        node1.className = 'line';
        let node0 = document.createElement('SPAN');
        node0.className = getCircleClassName(i);
        let node2 = document.createElement('SPAN');
        node2.appendChild(document.createTextNode(_curmoves[i].san));
        node2.className = 'san';
        let node3 = document.createElement('SPAN');
        node3.className = 'eval';
        let node6 = document.createElement('SPAN');
        node6.className = 'pv';
        if (_movesPv) node6.appendChild(document.createTextNode(_curmoves[i].pvtext || '?'));
        else node6.appendChild(document.createTextNode((_curmoves[i].pvtext || '?').split(' ')[0]));
        let node7 = document.createElement('SPAN');
        node7.className = 'depth';
        node7.appendChild(document.createTextNode(_curmoves[i].depth | '?'));

        let text = getEvalText(_curmoves[i].eval, false);
        if (text.indexOf('.') >= 0) {
            let node4 = document.createElement('SPAN');
            node4.className = 'numleft';
            node4.appendChild(document.createTextNode(text.substring(0, text.indexOf('.') + 1)));
            let node5 = document.createElement('SPAN');
            node5.className = 'numright';
            node5.appendChild(document.createTextNode(text.substring(text.indexOf('.') + 1)));
            node3.appendChild(node4);
            node3.appendChild(node5);
        } else {
            node3.appendChild(document.createTextNode(text));
        }
        node1.appendChild(node0);
        node1.appendChild(node2);
        node1.appendChild(node3);
        node1.appendChild(node6);
        node1.appendChild(node7);
        node1.index = i;
        node1.onmouseover = function() {
            highlightMove(this.index, true);
        };
        node1.onmouseout = function() {
            highlightMove(this.index, false);
        };
        node1.onmousedown = function(e) {
            if (_menu) showHideMenu(false);
            doMoveHandler(_curmoves[this.index].move);
        };
        if (_historyindex + 1 < _history.length && _history[_historyindex + 1].length > 3 && _history[_historyindex + 1][3] == _curmoves[i].san) node1.style.color = '#64c4db'
        document.getElementById('moves').appendChild(node1);
    }
    if (_arrow) setArrow(true);
    updateLegalMoves();
}

_staticEvalData = (function() {
    let data = [],
        curindex = null;
    data.push({
        "name": "Main evaluation",
        "group": "",
        "text": "<b>$</b>. An evaluation function is used to heuristically determine the relative value of a positions used in general case when no specialized evaluation or tablebase evaluation is available. In Stockfish it is never applied for positions where king of either side is in check. Resulting value is computed by combining [[Middle game evaluation]] and [[End game evaluation]]. We use <a class=\"external\" href=\"https://www.chessprogramming.org/Tapered_Eval\">Tapered Eval</a>, a technique used in evaluation to make a smooth transition between the phases of the game. [[Phase]] is a coeficient of simple linear combination. Before using  [[End game evaluation]] in this formula we also scale it down using [[Scale factor]].",
        "code": "function $$(pos) {\n  let mg = $middle_game_evaluation(pos);\n  let eg = $end_game_evaluation(pos);\n  let p = $phase(pos), t = $tempo(pos);\n  eg = eg * $scale_factor(pos, eg) / 64;\n  return ((((mg * p + eg * (128 - p)) << 0) / 128) << 0) + t;\n}",
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
    data.push({
        "name": "Isolated",
        "group": "Pawns",
        "text": "<b>$</b> checks if pawn is isolated. In chess, an isolated pawn is a pawn which has no friendly pawn on an adjacent file.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  for (let y = 0 ; y < 8; y++) {\n    if (board(pos, square.x - 1, y) == \"P\") return 0;\n    if (board(pos, square.x + 1, y) == \"P\") return 0;\n  }\n  return 1;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Isolated_pawn", "Isolated pawn"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "14.8",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a7b374d0ebc5902971a9a58"
        }
    });
    data.push({
        "name": "Opposed",
        "group": "Pawns",
        "text": "<b>$</b> flag is set if there is opponent opposing pawn on the same file to prevent it from advancing.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  for (let y = 0; y < square.y; y++) {\n    if (board(pos, square.x, y) == \"p\") return 1;\n  }\n  return 0;\n}",
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
    data.push({
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
    data.push({
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
    data.push({
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
    data.push({
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
    data.push({
        "name": "Backward",
        "group": "Pawns",
        "text": "A pawn is <b>$</b> when it is behind all pawns of the same color on the adjacent files and cannot be safely advanced.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  for (let y = square.y; y < 8; y++) {\n    if (board(pos, square.x - 1, y) == \"P\"\n     || board(pos, square.x + 1, y) == \"P\") return 0;\n  }\n  if ($isolated(pos, square)) return 0;\n  if (board(pos, square.x - 1, square.y - 2) == \"p\"\n   || board(pos, square.x + 1, square.y - 2) == \"p\"\n   || board(pos, square.x    , square.y - 1) == \"p\") return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
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
        "elo": {
            "value": "2.25",
            "error": "2.9",
            "link": "http://tests.stockfishchess.org/tests/view/5acf80740ebc59547e5380fe"
        }
    });
    data.push({
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
        "elo": {
            "value": "29.34",
            "error": "4.4",
            "link": "http://tests.stockfishchess.org/tests/view/5a7a1ab60ebc5902971a99ed"
        }
    });
    data.push({
        "name": "Middle game evaluation",
        "group": "",
        "text": "<b>$</b>. Evaluates position for the middlegame and the opening phases.",
        "code": "function $$(pos) {\n  let v = 0;\n  v += $piece_value_mg(pos) - $piece_value_mg(colorflip(pos));\n  v += $psqt_mg(pos) - $psqt_mg(colorflip(pos));\n  v += $imbalance_total(pos);\n  v += $pawns_mg(pos) - $pawns_mg(colorflip(pos));\n  v += $pieces_mg(pos) - $pieces_mg(colorflip(pos));\n  v += $mobility_mg(pos) - $mobility_mg(colorflip(pos));\n  v += $threats_mg(pos) - $threats_mg(colorflip(pos));\n  v += $passed_mg(pos) - $passed_mg(colorflip(pos));\n  v += $space(pos) - $space(colorflip(pos));\n  v += $king_mg(pos) - $king_mg(colorflip(pos));\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false
    });
    data.push({
        "name": "End game evaluation",
        "group": "",
        "text": "<b>$</b>. Evaluates position for the endgame phase.",
        "code": "function $$(pos, noinitiative) {\n  let v = 0;\n  v += $piece_value_eg(pos) - $piece_value_eg(colorflip(pos));\n  v += $psqt_eg(pos) - $psqt_eg(colorflip(pos));\n  v += $imbalance_total(pos);\n  v += $pawns_eg(pos) - $pawns_eg(colorflip(pos));\n  v += $pieces_eg(pos) - $pieces_eg(colorflip(pos));\n  v += $mobility_eg(pos) - $mobility_eg(colorflip(pos));\n  v += $threats_eg(pos) - $threats_eg(colorflip(pos));\n  v += $passed_eg(pos) - $passed_eg(colorflip(pos));\n  v += $king_eg(pos) - $king_eg(colorflip(pos));\n  if (!noinitiative) v += $initiative_total(pos, v);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": false
    });
    data.push({
        "name": "Scale factor",
        "group": "",
        "text": "<b>$</b>. The scale factors are used to scale the endgame evaluation score down.",
        "code": "function $$(pos, eg) {\n  if (eg == null) eg = $end_game_evaluation(pos);\n  let pos_w = eg > 0 ? pos : colorflip(pos);\n  let pos_b = eg > 0 ? colorflip(pos) : pos;\n  let sf = 64;\n  let pc_w = $pawn_count(pos_w);\n  let pc_b = $pawn_count(pos_b);\n  let npm_w = $non_pawn_material(pos_w);\n  let npm_b = $non_pawn_material(pos_b);\n  let bishopValueMg = 830, bishopValueEg = 918, rookValueMg = 1289;\n  if (pc_w == 0 && npm_w - npm_b <= bishopValueMg) sf = npm_w < rookValueMg ? 0 : npm_b <= bishopValueMg ? 4 : 14;\n  if (sf == 64) {\n    let ob = $opposite_bishops(pos);\n    if (ob && npm_w == bishopValueMg && npm_b == bishopValueMg) {\n      sf = 16 + 4 * ($candidate_passed(pos) + $candidate_passed(colorflip(pos)));\n    } else {\n      sf = Math.min(40 + (ob ? 2 : 7) * pc_w, sf);\n    }\n  }\n  return sf;\n}",
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
    data.push({
        "name": "Phase",
        "group": "",
        "text": "<b>$</b>. We define phase value for tapered eval based on the amount of non-pawn material on the board.",
        "code": "function $$(pos) {\n  let midgameLimit = 15258, endgameLimit  = 3915;\n  let npm = $non_pawn_material(pos) + $non_pawn_material(colorflip(pos));\n  npm = Math.max(endgameLimit, Math.min(npm, midgameLimit));\n  return (((npm - endgameLimit) * 128) / (midgameLimit - endgameLimit)) << 0;\n}",
        "links": [
            ["https://www.chessprogramming.org/Game_Phases", "Game Phases in cpw"],
            ["https://www.chessprogramming.org/Tapered_Eval", "Tapered Eval in cpw"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false
    });
    data.push({
        "name": "Imbalance",
        "group": "Imbalance",
        "text": "<b>$</b> calculates the imbalance by comparing the piece count of each piece type for both colors. Evaluate the material imbalance. We use a place holder for the bishop pair \"extended piece\", which allows us to be more flexible in defining bishop pair bonuses.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let qo = [[0],[40,38],[32,255,-62],[0,104,4,0],[-26,-2,47,105,-208],[-189,24,117,133,-134,-6]];\n  let qt = [[0],[36,0],[9,63,0],[59,65,42,0],[46,39,24,-24,0],[97,100,-42,137,268,0]];\n  let j = \"XPNBRQxpnbrq\".indexOf(board(pos, square.x, square.y));\n  if (j < 0 || j > 5) return 0;\n  let bishop = [0, 0], v = 0;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      let i = \"XPNBRQxpnbrq\".indexOf(board(pos, x, y));\n      if (i < 0) continue;\n      if (i == 9) bishop[0]++;\n      if (i == 3) bishop[1]++;\n      if (i % 6 > j) continue;\n      if (i > 5) v += qt[j][i-6];\n            else v += qo[j][i];\n    }\n  }\n  if (bishop[0] > 1) v += qt[j][0];\n  if (bishop[1] > 1) v += qo[j][0];\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
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
    data.push({
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
    data.push({
        "name": "Pinned direction",
        "group": "Attack",
        "text": "<b>$</b>. Helper function for detecting blockers for king. For our pinned pieces result is positive for enemy blockers negative and value encodes direction of pin. 1 - horizontal, 2 - topleft to bottomright, 3 - vertical, 4 - topright to bottomleft",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"PNBRQK\".indexOf(board(pos, square.x, square.y).toUpperCase()) < 0) return 0;\n  let color = 1;\n  if (\"PNBRQK\".indexOf(board(pos, square.x, square.y)) < 0) color = -1;\n  for (let i = 0; i < 8; i++) {\n    let ix = (i + (i > 3)) % 3 - 1;\n    let iy = (((i + (i > 3)) / 3) << 0) - 1;\n    let king = false;\n    for (let d = 1; d < 8; d++) {\n      let b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"K\") king = true;\n      if (b != \"-\") break;\n    }\n    if (king) {\n      for (let d = 1; d < 8; d++) {\n        let b = board(pos, square.x - d * ix, square.y - d * iy);\n        if (b == \"q\"\n         || b == \"b\" && ix * iy != 0\n         || b == \"r\" && ix * iy == 0) return Math.abs(ix + iy * 3) * color;\n        if (b != \"-\") break;\n      }\n    }\n  }\n  return 0;\n}",
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
    data.push({
        "name": "Mobility",
        "group": "Mobility",
        "text": "<b>$</b>. Number of attacked squares in the [[Mobility area]]. For queen squares defended by opponent knight, bishop or rook are ignored. For minor pieces squares occupied by our  queen are ignored.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;  \n  let b = board(pos, square.x, square.y);\n  if (\"NBRQ\".indexOf(b) < 0) return 0;\n  for (let x = 0; x < 8; x++) {\n    for(let y = 0; y < 8; y++) {\n      let s2 = {x:x, y:y};\n      if (!$mobility_area(pos, s2)) continue;\n      if (b == \"N\" && $knight_attack(pos, s2, square) && board(pos, x, y) != 'Q') v++;\n      if (b == \"B\" && $bishop_xray_attack(pos, s2, square) && board(pos, x, y) != 'Q') v++;\n      if (b == \"R\" && $rook_xray_attack(pos, s2, square)) v++;\n      if (b == \"Q\" && $queen_attack(pos, s2, square)) v++;\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
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
    data.push({
        "name": "Mobility bonus",
        "group": "Mobility",
        "text": "<b>$</b> attach bonuses for middlegame and endgame by piece type and [[Mobility]].",
        "code": "function $$(pos, square, mg) {\n  if (square == null) return sum(pos, $$, mg);\n  let bonus = mg ? [\n    [-62,-53,-12,-4,3,13,22,28,33],\n    [-48,-20,16,26,38,51,55,63,63,68,81,81,91,98],\n    [-58,-27,-15,-10,-5,-2,9,16,30,29,32,38,46,48,58],\n    [-39,-21,3,3,14,22,28,41,43,48,56,60,60,66,67,70,71,73,79,88,88,99,102,102,106,109,113,116]\n  ] : [\n    [-81,-56,-30,-14,8,15,23,27,33],\n    [-59,-23,-3,13,24,42,54,57,65,73,78,86,88,97],\n    [-76,-18,28,55,69,82,112,118,132,142,155,165,166,169,171],\n    [-36,-15,8,18,34,54,61,73,79,92,94,104,113,120,123,126,133,136,140,143,148,166,170,175,184,191,206,212]\n  ];\n  let i = \"NBRQ\".indexOf(board(pos, square.x, square.y));\n  if (i < 0) return 0;\n  return bonus[i][$mobility(pos, square)];\n}",
        "links": [],
        "eval": false,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
        "name": "Knight attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by knight.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  for (let i = 0; i < 8; i++) {\n    let ix = ((i > 3) + 1) * (((i % 4) > 1) * 2 - 1);\n    let iy = (2 - (i > 3)) * ((i % 2 == 0) * 2 - 1);\n    let b = board(pos, square.x + ix, square.y + iy);\n    if (b == \"N\"\n    && (s2 == null || s2.x == square.x + ix && s2.y == square.y + iy)\n    && !$pinned(pos, {x:square.x + ix, y:square.y + iy})) v++;\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
        "name": "Bishop xray attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by bishop. Includes x-ray attack through queens.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  for (let i = 0; i < 4; i++) {\n    let ix = ((i > 1) * 2 - 1);\n    let iy = ((i % 2 == 0) * 2 - 1);\n    for (let d = 1; d < 8; d++) {\n      let b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"B\"\n      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {\n        let dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});\n        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;\n      }\n      if (b != \"-\" && b != \"Q\" && b != \"q\") break;\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
        "name": "Rook xray attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by rook. Includes x-ray attack through queens and our rook.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  for (let i = 0; i < 4; i++) {\n    let ix = (i == 0 ? -1 : i == 1 ? 1 : 0);\n    let iy = (i == 2 ? -1 : i == 3 ? 1 : 0);\n    for (let d = 1; d < 8; d++) {\n      let b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"R\"\n      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {\n        let dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});\n        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;\n      }\n      if (b != \"-\" && b != \"R\" && b != \"Q\" && b != \"q\") break;\n    }\n  }\n\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
        "name": "Queen attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by queen.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  for (let i = 0; i < 8; i++) {\n    let ix = (i + (i > 3)) % 3 - 1;\n    let iy = (((i + (i > 3)) / 3) << 0) - 1;\n    for (let d = 1; d < 8; d++) {\n      let b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"Q\"\n      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {\n        let dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});\n        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;\n      }\n      if (b != \"-\") break;\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
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
    data.push({
        "name": "Outpost square",
        "group": "Pieces",
        "text": "<b>$</b>. Outpost squares for knight or bishop.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($rank(pos, square) < 4 || $rank(pos, square) > 6) return 0;\n  if (board(pos, square.x - 1, square.y + 1) != \"P\"\n   && board(pos, square.x + 1, square.y + 1) != \"P\") return 0;\n  for (let y = 0; y < square.y; y++) {\n    if (board(pos, square.x - 1, y) == \"p\") return 0;\n    if (board(pos, square.x + 1, y) == \"p\") return 0;\n  }\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
        "name": "Reachable outpost",
        "group": "Pieces",
        "text": "<b>$</b>. Knights and bishops which can reach an outpost square in one move.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"B\"\n   && board(pos, square.x, square.y) != \"N\") return 0;\n  let v = 0;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 2; y < 5; y++) {\n      if ((board(pos, square.x, square.y) == \"N\"\n        && \"PNBRQK\".indexOf(board(pos, x, y)) < 0\n        && $knight_attack(pos, {x:x,y:y}, square)\n        && $outpost_square(pos, {x:x,y:y}))\n       || (board(pos, square.x, square.y) == \"B\"\n        && \"PNBRQK\".indexOf(board(pos, x, y)) < 0\n        && $bishop_xray_attack(pos, {x:x,y:y}, square)\n        && $outpost_square(pos, {x:x,y:y}))) {\n        let support = board(pos, x - 1, y + 1) == \"P\" || board(pos, x + 1, y + 1) == \"P\" ? 2 : 1;\n        v = Math.max(v, support);\n      }\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
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
        "elo": {
            "value": "-0.35",
            "error": "4.5",
            "link": "http://tests.stockfishchess.org/tests/view/5a723b850ebc590f2c86e9e5"
        }
    });
    data.push({
        "name": "Bishop pawns",
        "group": "Pieces",
        "text": "<b>$</b>. Number of pawns on the same color square as the bishop multiplied by one plus the number of our blocked pawns in the center files C, D, E or F.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"B\") return 0;\n  let c = (square.x + square.y) % 2, v = 0;\n  let blocked = 0;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"P\" && c == (x + y) % 2) v++;\n      if (board(pos, x, y) == \"P\"\n       && x > 1 && x < 6\n       && board(pos, x, y - 1) != \"-\") blocked++;\n    }\n  }\n  return v * (blocked + 1);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "10.57",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a7262390ebc590f2c86e9fc"
        }
    });
    data.push({
        "name": "Rook on pawn",
        "group": "Pieces",
        "text": "<b>$</b>. Rook aligned with enemy pawns on the same rank/file.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"R\") return 0;\n  if ($rank(pos, square) < 5) return 0;\n  let v = 0;  \n  for (let x = 0; x < 8; x++) {\n    if (board(pos, x, square.y) == \"p\") v++;\n  }\n  for (let y = 0; y < 8; y++) {\n    if (board(pos, square.x, y) == \"p\") v++;\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "2.61",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a73024b0ebc5902971a9658"
        }
    });
    data.push({
        "name": "Rook on file",
        "group": "Pieces",
        "text": "<b>$</b>. Rook when on an open or semi-open file.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"R\") return 0;\n  let open = 1;\n  for (let y = 0; y < 8; y++) {\n    if (board(pos, square.x, y) == \"P\") return 0;\n    if (board(pos, square.x, y) == \"p\") open = 0;\n  }\n  return open + 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "13.59",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a78c23c0ebc5902971a991b"
        }
    });
    data.push({
        "name": "Trapped rook",
        "group": "Pieces",
        "text": "<b>$</b>. Penalize rook when trapped by the king, even more if the king cannot castle.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"R\") return 0;\n  if ($rook_on_file(pos, square)) return 0;\n  if ($mobility(pos, square)> 3) return 0;\n  let kx = 0, ky = 0;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"K\") { kx = x; ky = y; }\n    }\n  }\n  if ((kx < 4) != (square.x < kx)) return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "2.92",
            "error": "3.7",
            "link": "http://tests.stockfishchess.org/tests/view/5a876e560ebc590297cc82d9"
        }
    });
    data.push({
        "name": "Weak queen",
        "group": "Pieces",
        "text": "<b>$</b>. Penalty if any relative pin or discovered attack against the queen.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"Q\") return 0;\n  for (let i = 0; i < 8; i++) {\n    let ix = (i + (i > 3)) % 3 - 1;\n    let iy = (((i + (i > 3)) / 3) << 0) - 1;\n    let count = 0;\n    for (let d = 1; d < 8; d++) {\n      let b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"r\" && (ix == 0 || iy == 0) && count == 1) return 1;\n      if (b == \"b\" && (ix != 0 && iy != 0) && count == 1) return 1;\n      if (b != \"-\") count++;\n    }\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "6.36",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a73900b0ebc5902971a96a8"
        }
    });
    data.push({
        "name": "Space area",
        "group": "Space",
        "text": "<b>$</b>. Number of safe squares available for minor pieces on the central four files on ranks 2 to 4. Safe squares one, two or three squares behind a friendly pawn are counted twice.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  let rank = $rank(pos, square);\n  let file = $file(pos, square);\n  if ((rank >= 2 && rank <= 4 && file >= 3 && file <= 6)\n   && (board(pos, square.x ,square.y) != \"P\")\n   && (board(pos, square.x - 1 ,square.y - 1) != \"p\")\n   && (board(pos, square.x + 1 ,square.y - 1) != \"p\")) {\n    v++;\n    if (board(pos, square.x, square.y - 1) == \"P\"\n     || board(pos, square.x, square.y - 2) == \"P\"\n     || board(pos, square.x, square.y - 3) == \"P\") v++;\n  }   \n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
        "name": "Pawn attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by pawn. Pins or en-passant attacks are not considered here.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  if (board(pos, square.x - 1, square.y + 1) == \"P\") v++;\n  if (board(pos, square.x + 1, square.y + 1) == \"P\") v++;\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "King attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  for (let i = 0; i < 8; i++) {\n    let ix = (i + (i > 3)) % 3 - 1;\n    let iy = (((i + (i > 3)) / 3) << 0) - 1;\n    if (board(pos, square.x + ix, square.y + iy) == \"K\") return 1;\n  }\n  \n \n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true
    });
    data.push({
        "name": "Attack",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by all pieces. For bishop and rook x-ray attacks are included. For pawns pins or en-passant are ignored.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  v += $pawn_attack(pos, square);\n  v += $king_attack(pos, square);\n  v += $knight_attack(pos, square);\n  v += $bishop_xray_attack(pos, square);\n  v += $rook_xray_attack(pos, square);\n  v += $queen_attack(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true
    });
    data.push({
        "name": "Non pawn material",
        "group": "Material",
        "text": "<b>$</b>. Middlegame value of non-pawn material.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let i = \"NBRQ\".indexOf(board(pos, square.x, square.y));\n  if (i >= 0) return $piece_value_bonus(pos, square, true);\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": false
    });
    data.push({
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
    data.push({
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
        "elo": {
            "value": 14.95,
            "error": 4.6,
            "link": "http://tests.stockfishchess.org/tests/view/5a74bb6f0ebc5902971a9701"
        }
    });
    data.push({
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
    data.push({
        "name": "Minor threat",
        "group": "Threats",
        "text": "<b>$</b>. Threat type for knight and bishop attacking pieces.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let type = \"pnbrqk\".indexOf(board(pos, square.x, square.y));\n  if (type < 0) return 0;\n  if (!$knight_attack(pos, square) && !$bishop_xray_attack(pos, square)) return 0;\n  if ((board(pos, square.x, square.y) == \"p\"\n       || !(board(pos, square.x - 1, square.y - 1) == \"p\"\n         || board(pos, square.x + 1, square.y - 1) == \"p\"\n         || ($attack(pos, square) <= 1 && $attack(colorflip(pos),{x:square.x,y:7-square.y}) > 1)))\n    && !$weak_enemies(pos, square)) return 0;\n  return type + 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true
    });
    data.push({
        "name": "Rook threat",
        "group": "Threats",
        "text": "<b>$</b>. Threat type for attacked by rook pieces.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let type = \"pnbrqk\".indexOf(board(pos, square.x, square.y));\n  if (type < 0) return 0;\n  if (!$weak_enemies(pos, square)) return 0;\n  if (!$rook_xray_attack(pos, square)) return 0;\n  return type + 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "10.98",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a7a14000ebc5902971a99e6"
        }
    });
    data.push({
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
        "elo": {
            "value": "2.78",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a74c1ef0ebc5902971a9707"
        }
    });
    data.push({
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
        "elo": {
            "value": "4.69",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a7a4dea0ebc5902971a99ff"
        }
    });
    data.push({
        "name": "Pawn push threat",
        "group": "Threats",
        "text": "<b>$</b>. Bonus if some pawns can safely push and attack an enemy piece.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"pnbrqk\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  for (let ix = -1; ix <= 1; ix += 2) {\n    if (board(pos, square.x + ix, square.y + 2) == \"P\"\n     && board(pos, square.x + ix, square.y + 1) == \"-\"\n     && board(pos, square.x + ix - 1, square.y) != \"p\"\n     && board(pos, square.x + ix + 1, square.y) != \"p\"\n     && ($attack(pos, {x:square.x+ix,y:square.y+1})\n         || !$attack(colorflip(pos),{x:square.x+ix,y:6-square.y}))\n     ) return 1;\n\n    if (square.y == 3\n     && board(pos, square.x + ix, square.y + 3) == \"P\"\n     && board(pos, square.x + ix, square.y + 2) == \"-\"\n     && board(pos, square.x + ix, square.y + 1) == \"-\"\n     && board(pos, square.x + ix - 1, square.y) != \"p\"\n     && board(pos, square.x + ix + 1, square.y) != \"p\"\n     && ($attack(pos, {x:square.x+ix,y:square.y+1})\n         || !$attack(colorflip(pos),{x:square.x+ix,y:6-square.y}))\n     ) return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "7.89",
            "error": "4.5",
            "link": "http://tests.stockfishchess.org/tests/view/5a74f1300ebc5902971a9717"
        }
    });
    data.push({
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
        "elo": {
            "value": "1.56",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a74bd040ebc5902971a9703"
        }
    });
    data.push({
        "name": "Passed square",
        "group": "Passed pawns",
        "text": "<b>$</b> checks if you put own pawn on square it is passed. Pawn is passed if there are no opposing pawns in front of it on the same file nor on an adjacent file.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  for (let y = 0 ; y < square.y; y++) {\n    if (board(pos, square.x - 1, y) == \"p\") return 0;\n    if (board(pos, square.x    , y) == \"p\") return 0;\n    if (board(pos, square.x + 1, y) == \"p\") return 0;\n    if (board(pos, square.x    , y) == \"P\") return 0;\n  }\n  return 1;\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Passed_pawn", "Passed pawn"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": false
    });
    data.push({
        "name": "Candidate passed",
        "group": "Passed pawns",
        "text": "<b>$</b> checks if pawn is passed or candidate passer. Pawn is passed if there are no opposing pawns in front of it on the same file nor on an adjacent file. Include also not passed pawns which could become passed after one or two pawn pushes when are not attacked more times than defended.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"P\") return 0;\n  let ty1 = 8, ty2 = 8, oy = 8;\n  for (let y = square.y - 1; y >= 0; y--) {\n    if (board(pos, square.x    , y) == \"p\") ty1 = y;\n    if (board(pos, square.x - 1, y) == \"p\"\n     || board(pos, square.x + 1, y) == \"p\") ty2 = y;\n  }\n  if (ty1 == 8 && ty2 >= square.y - 1) return 1;\n  if (ty2 < square.y - 2 || ty1 < square.y - 1) return 0;\n  if (ty2 >= square.y && ty1 == square.y - 1 && square.y < 4) {\n    if (board(pos, square.x - 1, square.y + 1) == \"P\"\n     && board(pos, square.x - 1, square.y    ) != \"p\"\n     && board(pos, square.x - 2, square.y - 1) != \"p\") return 1;\n    if (board(pos, square.x + 1, square.y + 1) == \"P\"\n     && board(pos, square.x + 1, square.y    ) != \"p\"\n     && board(pos, square.x + 2, square.y - 1) != \"p\") return 1;\n  }\n  if (board(pos, square.x, square.y - 1) == \"p\") return 0;\n  let lever = (board(pos, square.x - 1, square.y - 1) == \"p\" ? 1 : 0)\n             + (board(pos, square.x + 1, square.y - 1) == \"p\" ? 1 : 0);\n  let leverpush = (board(pos, square.x - 1, square.y - 2) == \"p\" ? 1 : 0)\n                + (board(pos, square.x + 1, square.y - 2) == \"p\" ? 1 : 0);\n  let phalanx = (board(pos, square.x - 1, square.y) == \"P\" ? 1 : 0)\n              + (board(pos, square.x + 1, square.y) == \"P\" ? 1 : 0);\n  if (lever - $supported(pos, square) > 1) return 0;\n  if (leverpush - phalanx  > 0) return 0;\n  if (lever > 0 && leverpush > 0) return 0;\n  return 1;\n}",
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
    data.push({
        "name": "King proximity",
        "group": "Passed pawns",
        "text": "<b>$</b> is endgame bonus based on the king's proximity. If block square is not the queening square then consider also a second push.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  let r = $rank(pos, square)-1;\n  let rr = r > 2 ? (r-2)*(r-2)+2 : 0;\n  let v = 0;\n  if (rr <= 0) return 0;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\") {\n        v += Math.min(Math.max(Math.abs(y - square.y + 1),\n                      Math.abs(x - square.x)),5) * 5 * rr;\n      }\n      if (board(pos, x, y) == \"K\") {\n        v -= Math.min(Math.max(Math.abs(y - square.y + 1),\n                      Math.abs(x - square.x)),5) * 2 * rr;\n        if (square.y > 1) {\n          v -= Math.min(Math.max(Math.abs(y - square.y + 2),\n                      Math.abs(x - square.x)),5) * rr;\n        }\n      }\n    }\n  }\n  return v;\n}",
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
    data.push({
        "name": "Passed block",
        "group": "Passed pawns",
        "text": "<b>$</b> adds bonus if passed pawn is free to advance. Bonus is adjusted based on attacked and defended status of block square and entire path in front of pawn.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  if ($rank(pos, square) < 4) return 0;\n  if (board(pos, square.x, square.y - 1) != \"-\") return 0;\n  let r = $rank(pos, square) - 1;\n  let rr = r > 2 ? (r-2)*(r-2)+2 : 0;\n  let pos2 = colorflip(pos);\n  let defended = 0, unsafe = 0, wunsafe = 0, defended1 = 0, unsafe1 = 0;\n  for (let y = square.y - 1; y >= 0; y--) {\n    if ($attack(pos, {x:square.x,y:y})) defended++;\n    if (\"pnbrqk\".indexOf(board(pos, square.x, y)) >= 0\n     || $attack(pos2, {x:square.x,y:7-y})) unsafe++;\n    if (\"pnbrqk\".indexOf(board(pos, square.x-1, y)) >= 0\n     || $attack(pos2, {x:square.x-1,y:7-y})) wunsafe++;\n    if (\"pnbrqk\".indexOf(board(pos, square.x+1, y)) >= 0\n     || $attack(pos2, {x:square.x+1,y:7-y})) wunsafe++;\n    if (y == square.y - 1) {\n      defended1 = defended;\n      unsafe1 = unsafe;\n    }\n  }\n  for (let y = square.y + 1; y < 8; y++) {\n    if (board(pos, square.x, y) == \"R\"\n     || board(pos, square.x, y) == \"Q\") defended1 = defended = square.y;\n    if (board(pos, square.x, y) == \"r\"\n     || board(pos, square.x, y) == \"q\") unsafe1 = unsafe = square.y;\n  }\n  let k = (unsafe == 0 && wunsafe == 0 ? 35 : unsafe == 0 ? 20 : unsafe1 == 0 ? 9 : 0)\n        + (defended1 != 0 ? 5 : 0);\n  return k * rr;\n}",
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
    data.push({
        "name": "Passed file",
        "group": "Passed pawns",
        "text": "<b>$</b> is a bonus according to the file of a passed pawn.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  let file = $file(pos, square);\n  return Math.min(file, 9 - file);\n}",
        "links": [
            ["https://en.wikipedia.org/wiki/Isolated_pawn", "Isolated pawn"]
        ],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "4.08",
            "error": "4.1",
            "link": "http://tests.stockfishchess.org/tests/view/5a84ed040ebc590297cc8144"
        }
    });
    data.push({
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
        "elo": {
            "value": "73.24",
            "error": "4.9",
            "link": "http://tests.stockfishchess.org/tests/view/5a84edbb0ebc590297cc8146"
        }
    });
    data.push({
        "name": "Passed mg",
        "group": "Passed pawns",
        "text": "<b>$</b> middlegame bonuses for passed pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  let v = 0;\n  v += [0,5,12,10,57,163,271][$passed_rank(pos, square)];\n  v += $passed_block(pos, square);\n  if (!$passed_square(pos,{x:square.x,y:square.y-1})\n    || board(pos, square.x, square.y-1).toUpperCase() == \"P\") v = (v / 2) << 0;\n  v += [0,-1,0,-9,-30][$passed_file(pos, square)];\n  return v;\n}",
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
    data.push({
        "name": "Passed eg",
        "group": "Passed pawns",
        "text": "<b>$</b> endgame bonuses for passed pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$candidate_passed(pos, square)) return 0;\n  let v = 0;\n  v += $king_proximity(pos, square);\n  v += [0,18,23,31,62,167,250][$passed_rank(pos, square)];\n  v += $passed_block(pos, square);\n  if (!$passed_square(pos,{x:square.x,y:square.y-1})\n    || board(pos, square.x, square.y-1).toUpperCase() == \"P\") v = (v / 2) << 0;\n  v += [0,7,9,-8,-14][$passed_file(pos, square)];\n  return v;\n}",
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
    data.push({
        "name": "Pawnless flank",
        "group": "King",
        "text": "<b>$</b>. Penalty when our king is on a pawnless flank.",
        "code": "function $$(pos) {\n  let pawns=[0,0,0,0,0,0,0,0], kx = 0;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y).toUpperCase() == \"P\") pawns[x]++;\n      if (board(pos, x, y) == \"k\") kx = x;\n    }\n  }\n  let sum;\n  if (kx == 0) sum = pawns[0] + pawns[1] + pawns[2];\n  else if (kx < 3) sum = pawns[0] + pawns[1] + pawns[2] + pawns[3];\n  else if (kx < 5) sum = pawns[2] + pawns[3] + pawns[4] + pawns[5];\n  else if (kx < 7) sum = pawns[4] + pawns[5] + pawns[6] + pawns[7];\n  else  sum = pawns[5] + pawns[6] + pawns[7];\n  return sum == 0 ? 1 : 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "1.29",
            "error": "4.5",
            "link": "http://tests.stockfishchess.org/tests/view/5a73a7000ebc5902971a96b6"
        }
    });
    data.push({
        "name": "Strength square",
        "group": "King",
        "text": "<b>$</b>. King shelter strength for each square on board.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let v = 5;\n  let kx = Math.min(6, Math.max(1, square.x));\n  let weakness =\n      [[-6,81,93,58,39,18,25],\n      [-43,61,35,-49,-29,-11,-63],\n      [-10,75,23,-2,32,3,-45],\n      [-39,-13,-29,-52,-48,-67,-166]];\n  for (let x = kx - 1; x <= kx +1; x++) {\n    let us = 0;\n    for (let y = 7; y >= square.y; y--) {\n      if (board(pos, x, y) == \"p\") us = y;\n    }\n    let f = Math.min(x, 7 - x);\n    v += weakness[f][us] || 0;\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "Storm square",
        "group": "King",
        "text": "<b>$</b>. Enemy pawns storm for each square on board.",
        "code": "function $$(pos, square, eg) {\n  if (square == null) return sum(pos, $$);\n  let v = 0, ev = 0;\n  let kx = Math.min(6, Math.max(1, square.x));\n  let unblockedstorm = [\n    [89,107,123,93,57,45,51],\n    [44,-18,123,46,39,-7,23],\n    [4,52,162,37,7,-14,-2],\n    [-10,-14,90,15,2,-7,-16]];\n  for (let x = kx - 1; x <= kx +1; x++) {\n    let us = 0, them = 0;\n    for (let y = 7; y >= square.y; y--) {\n      if (board(pos, x, y) == \"p\") us = y;\n      if (board(pos, x, y) == \"P\") them = y;\n    }\n    let f = Math.min(x, 7 - x);\n    if (us > 0 && them == us + 1) {\n      v += 82 * (them == 2); ev += 82 * (them == 2);\n    }\n    else v += unblockedstorm[f][them];\n  }\n  if ((square.x == 0 || square.x == 7)\n   && (square.y == 0 || square.y == 1)\n   && board(pos, square.x, square.y + 1) == \"P\") v -= 369;\n  return eg ? ev : v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "Shelter strength",
        "group": "King",
        "text": "<b>$</b>. King shelter bonus for king position. If we can castle use the penalty after the castling if ([[Shelter strength]] + [[Shelter storm]]) is smaller.",
        "code": "function $$(pos, square) {\n  let w = 0, s = 1024, tx = null;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\"\n       || pos.c[2] && x == 6 && y == 0\n       || pos.c[3] && x == 2 && y == 0) {\n        let w1 = $strength_square(pos, {x:x,y:y});\n        let s1 = $storm_square(pos, {x:x,y:y});\n        if (s1 - w1 < s - w) { w = w1; s = s1; tx=Math.max(1,Math.min(6,x)); }\n      }\n    }\n  }\n  if (square == null) return w;\n  if (tx != null && board(pos, square.x, square.y) == \"p\" && square.x >= tx-1 && square.x <= tx+1) {\n    for (let y = square.y-1; y >= 0; y--) if (board(pos, square.x, y) == \"p\") return 0;\n    return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
        "name": "Shelter storm",
        "group": "King",
        "text": "<b>$</b>. Shelter strom penalty for king position. If we can castle use the penalty after the castling if ([[Shelter weakness]] + [[Shelter storm]]) is smaller.",
        "code": "function $$(pos, square) {\n  let w = 0, s = 1024, tx = null;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\"\n       || pos.c[2] && x == 6 && y == 0\n       || pos.c[3] && x == 2 && y == 0) {\n        let w1 = $strength_square(pos, {x:x,y:y});\n        let s1 = $storm_square(pos, {x:x,y:y});\n        if (s1 - w1 < s - w) { w = w1; s = s1; tx=Math.max(1,Math.min(6,x)); }\n      }\n    }\n  }\n  if (square == null) return s;\n  if (tx != null && board(pos, square.x, square.y).toUpperCase() == \"P\" && square.x >= tx-1 && square.x <= tx+1) {\n    for (let y = square.y-1; y >= 0; y--) if (board(pos, square.x, y) == board(pos, square.x, square.y)) return 0;\n    return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
        "name": "King danger",
        "group": "King",
        "text": "<b>$</b>. The initial value is based on the number and types of the enemy's attacking pieces, the number of attacked and undefended squares around our king and the quality of the pawn shelter.",
        "code": "function $$(pos) {\n  let count = $king_attackers_count(pos);\n  let weight = $king_attackers_weight(pos);\n  let kingattacks = $king_attacks(pos);\n  let weak = $weak_bonus(pos);\n  let pins_uchcks = $unsafe_checks(pos);\n  let tropism = $close_enemies(pos);\n  let noqueen = ($queen_count(pos) > 0 ? 0 : 1);\n  let v = count * weight\n        + 69 * kingattacks\n        + 185 * weak\n        - 100 * ($knight_defender(colorflip(pos)) > 0)\n        -  35 * ($bishop_defender(colorflip(pos)) > 0)\n        + 150 * pins_uchcks\n        + ((5 * tropism * tropism / 16) << 0)\n        - 873 * noqueen\n        - ((6 * ($shelter_strength(pos) - $shelter_storm(pos)) / 8) << 0)\n        + $mobility_mg(pos) - $mobility_mg(colorflip(pos))\n        - 7\n        + 780 * ($safe_check(pos, null, 3) > 0 ? 1 : 0)\n        + 1080 * ($safe_check(pos, null, 2) > 0 ? 1 : 0)\n        + 635 * ($safe_check(pos, null, 1) > 0 ? 1 : 0)\n        + 790 * ($safe_check(pos, null, 0) > 0 ? 1 : 0);\n  if (v > 100) return v;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
        "name": "King pawn distance",
        "group": "King",
        "text": "<b>$</b>. Minimal distance of our king to our pawns.",
        "code": "function $$(pos, square) {\n  let v = 8, kx = 0, ky = 0, px = 0, py = 0;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"K\") {\n        kx = x;\n        ky = y;\n      }\n    }\n  }\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      let dist = Math.max(Math.abs(x-kx),Math.abs(y-ky));\n      if (board(pos, x, y) == \"P\" && dist < v) { px = x; py = y; v = dist; }\n    }\n  }\n  if (v < 8 && (square == null || square.x == px && square.y == py)) return v;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "3.71",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a7dacfd0ebc5902971a9bc3"
        }
    });
    data.push({
        "name": "Close enemies",
        "group": "King",
        "text": "<b>$</b>. King tropism: firstly, find squares that opponent attacks in our king flank. Secondly, add the squares which are attacked twice in that flank.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (square.y > 4) return 0;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\") {\n        if (x == 0 && square.x > 2) return 0;\n        if (x < 3 && square.x > 3) return 0;\n        if (x >= 3 && x < 5 && (square.x < 2 || square.x > 5)) return 0;\n        if (x >= 5 && square.x < 4) return 0;\n        if (x == 7 && square.x < 5) return 0;\n      }\n    }\n  }\n  let a = $attack(pos, square);\n  if (!a) return 0;\n  return a > 1 ? 2 : 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "2.19",
            "error": "4.6",
            "link": "http://tests.stockfishchess.org/tests/view/5a7399f10ebc5902971a96b3"
        }
    });
    data.push({
        "name": "Check",
        "group": "King",
        "text": "<b>$</b>. Possible checks by knight, bishop, rook or queen. Defending queen is not considered as check blocker.",
        "code": "function $$(pos, square, type) {\n  if (square == null) return sum(pos, $$);\n  if ($rook_xray_attack(pos, square)\n  && (type == null || type == 2 || type == 4)\n   || $queen_attack(pos, square)\n  && (type == null || type == 3)) {\n    for (let i = 0; i < 4; i++) {\n      let ix = (i == 0 ? -1 : i == 1 ? 1 : 0);\n      let iy = (i == 2 ? -1 : i == 3 ? 1 : 0);\n      for (let d = 1; d < 8; d++) {\n        let b = board(pos, square.x + d * ix, square.y + d * iy);\n        if (b == \"k\") return 1;\n        if (b != \"-\" && b != \"q\") break;\n      }\n    }\n  }\n  if ($bishop_xray_attack(pos, square)\n  && (type == null || type == 1 || type == 4)\n   || $queen_attack(pos, square)\n  && (type == null || type == 3)) {\n    for (let i = 0; i < 4; i++) {\n      let ix = ((i > 1) * 2 - 1);\n      let iy = ((i % 2 == 0) * 2 - 1);\n      for (let d = 1; d < 8; d++) {\n        let b = board(pos, square.x + d * ix, square.y + d * iy);\n        if (b == \"k\") return 1;\n        if (b != \"-\" && b != \"q\") break;\n      }\n    }\n  }\n  if ($knight_attack(pos, square)\n  && (type == null || type == 0 || type == 4)) {\n    if (board(pos, square.x + 2, square.y + 1) == \"k\"\n     || board(pos, square.x + 2, square.y - 1) == \"k\"\n     || board(pos, square.x + 1, square.y + 2) == \"k\"\n     || board(pos, square.x + 1, square.y - 2) == \"k\"\n     || board(pos, square.x - 2, square.y + 1) == \"k\"\n     || board(pos, square.x - 2, square.y - 1) == \"k\"\n     || board(pos, square.x - 1, square.y + 2) == \"k\"\n     || board(pos, square.x - 1, square.y - 2) == \"k\") return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
        "name": "Safe check",
        "group": "King",
        "text": "<b>$</b>. Analyse the safe enemy's checks which are possible on next move. Enemy queen safe checks: we count them only if they are from squares from which we can't give a rook check, because rook checks are more valuable. Enemy bishops checks: we count them only if they are from squares from which we can't give a queen check, because queen checks are more valuable.",
        "code": "function $$(pos, square, type) {\n  if (square == null) return sum(pos, $$, type);\n  if (\"PNBRQK\".indexOf(board(pos, square.x, square.y)) >= 0) return 0;\n  if (!$check(pos, square, type)) return 0;\n  let pos2 = colorflip(pos);\n  if (type == 3 && $safe_check(pos, square, 2)) return 0;\n  if (type == 1 && $safe_check(pos, square, 3)) return 0;\n  if ((!$attack(pos2, {x:square.x,y:7-square.y})\n    || ($weak_squares(pos, square) && $attack(pos, square) > 1))\n    && (type != 3 || !$queen_attack(pos2, {x:square.x,y:7-square.y}))) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
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
    data.push({
        "name": "King attackers count",
        "group": "King",
        "text": "<b>$</b> is the number of pieces of the given color which attack a square in the kingRing of the enemy king. For pawns we count number of attacked squares in kingRing.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"PNBRQ\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  if (board(pos, square.x, square.y) == \"P\") {\n    let v = 0;\n    for (let dir = -1; dir <= 1; dir += 2) {\n      let fr = board(pos, square.x + dir * 2, square.y) == \"P\";\n      if (square.x + dir >= 0 && square.x + dir <= 7\n       && $king_ring(pos, {x:square.x+dir,y:square.y-1}, true)) v = v + (fr ? 0.5 : 1);\n    }\n    return v;\n  }\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      let s2 = {x:x,y:y};\n      if ($king_ring(pos, s2)) {\n        if ($knight_attack(pos, s2, square)\n         || $bishop_xray_attack(pos, s2, square)\n         || $rook_xray_attack(pos, s2, square)\n         || $queen_attack(pos, s2, square)) return 1;\n      }\n    }\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
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
    data.push({
        "name": "King attacks",
        "group": "King",
        "text": "<b>$</b> is the number of attacks by the given color to squares directly adjacent to the enemy king. Pieces which attack more than one square are counted multiple times. For instance, if there is a white knight on g5 and black's king is on g8, this white knight adds 2.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"NBRQ\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  if ($king_attackers_count(pos, square) == 0) return 0;\n  let kx = 0, ky = 0, v = 0;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\") { kx = x; ky = y; }\n    }\n  }\n  for (let x = kx - 1; x <= kx + 1; x++) {\n    for (let y = ky - 1; y <= ky + 1; y++) {\n      let s2 = {x:x,y:y};\n      if (x >= 0 && y >= 0 && x <= 7 && y <= 7 && (x != kx || y != ky)) {\n        v += $knight_attack(pos, s2, square);\n        v += $bishop_xray_attack(pos, s2, square);\n        v += $rook_xray_attack(pos, s2, square);\n        v += $queen_attack(pos, s2, square);\n      }\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
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
    data.push({
        "name": "Weak squares",
        "group": "King",
        "text": "<b>$</b>. Attacked squares defended at most once by our queen or king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($attack(pos, square)) {\n    let pos2 = colorflip(pos);\n    let attack = $attack(pos2, {x:square.x,y:7-square.y});\n    if (attack >= 2) return 0;\n    if (attack == 0) return 1;\n    if ($king_attack(pos2, {x:square.x,y:7-square.y})\n     || $queen_attack(pos2, {x:square.x,y:7-square.y})) return 1;\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
        "name": "Initiative",
        "group": "Initiative",
        "text": "<b>$</b> computes the initiative correction value for the position, i.e., second order bonus/malus based on the known attacking/defending status of the players.",
        "code": "function $$(pos, square) {\n  if (square != null) return 0;\n  let pawns = 0, kx = [0, 0], ky = [0, 0], flanks = [0, 0];\n  for (let x = 0; x < 8; x++) {\n    let open = [0, 0];\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y).toUpperCase() == \"P\" ) {\n        open[board(pos, x, y) == \"P\" ? 0 : 1] = 1;\n        pawns++\n      }\n      if (board(pos, x, y).toUpperCase() == \"K\" ) {\n        kx[board(pos, x, y) == \"K\" ? 0 : 1] = x;\n        ky[board(pos, x, y) == \"K\" ? 0 : 1] = y;\n      }\n    }\n    if (open[0] + open[1] > 0) flanks[x < 4 ? 0 : 1] = 1;\n  }\n  let pos2 = colorflip(pos);\n  let passedCount = $candidate_passed(pos) + $candidate_passed(pos2);\n  let bothFlanks = flanks[0] && flanks[1] ? 1 : 0;\n  let kingDistance = Math.abs(kx[0] - kx[1]) - Math.abs(ky[0] - ky[1]);\n  let purePawn = ($non_pawn_material(pos) + $non_pawn_material(pos2)) == 0 ? 1 : 0;\n  return 9 * passedCount + 11 * pawns + 9 * kingDistance + 18 * bothFlanks + 49 * purePawn - 103;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": true,
        "elo": null
    });
    data.push({
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
    data.push({
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
    data.push({
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
    data.push({
        "name": "Connected bonus",
        "group": "Pawns",
        "text": "<b>$</b> is bonus for connected pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (!$connected(pos, square)) return 0;\n  let seed = [0, 7, 8, 12, 29, 48, 86];\n  let op = $opposed(pos, square);\n  let ph = $phalanx(pos, square);\n  let su = $supported(pos, square);\n  let r = $rank(pos, square);\n  if (r < 2 || r > 7) return 0;\n  return ((seed[r - 1] * (ph ? 3 : 2) / (op ? 2 : 1)) >> 0) + 17 * su;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
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
    data.push({
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
    data.push({
        "name": "Piece value bonus",
        "group": "Material",
        "text": "<b>$</b>. Material values for middlegame and engame.",
        "code": "function $$(pos, square, mg) {\n  if (square == null) return sum(pos, $$);\n  let a = mg ? [128, 782, 830, 1289, 2529]\n             : [213, 865, 918, 1378, 2687];\n  let i = \"PNBRQ\".indexOf(board(pos, square.x, square.y));\n  if (i >= 0) return a[i];\n  return 0;\n}",
        "links": [],
        "eval": false,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
        "name": "Psqt bonus",
        "group": "Material",
        "text": "<b>$</b>. Piece square table bonuses. For each piece type on a given square a (middlegame, endgame) score pair is assigned.",
        "code": "function $$(pos, square, mg) {\n  if (square == null) return sum(pos, $$, mg);\n  let bonus = mg ? [\n    [[-169,-96,-80,-79],[-79,-39,-24,-9],[-64,-20,4,19],[-28,5,41,47],[-29,13,42,52],[-11,28,63,55],[-67,-21,6,37],[-200,-80,-53,-32]],\n    [[-44,-4,-11,-28],[-18,7,14,3],[-8,24,-3,15],[1,8,26,37],[-7,30,23,28],[-17,4,-1,8],[-21,-19,10,-6],[-48,-3,-12,-25]],\n    [[-24,-13,-7,2],[-18,-10,-5,9],[-21,-7,3,-1],[-13,-5,-4,-6],[-24,-12,-1,6],[-24,-4,4,10],[-8,6,10,12],[-22,-24,-6,4]],\n    [[3,-5,-5,4],[-3,5,8,12],[-3,6,13,7],[4,5,9,8],[0,14,12,5],[-4,10,6,8],[-5,6,10,8],[-2,-2,1,-2]],\n    [[272,325,273,190],[277,305,241,183],[198,253,168,120],[169,191,136,108],[145,176,112,69],[122,159,85,36],[87,120,64,25],[64,87,49,0]]\n  ] : [\n    [[-105,-74,-46,-18],[-70,-56,-15,6],[-38,-33,-5,27],[-36,0,13,34],[-41,-20,4,35],[-51,-38,-17,19],[-64,-45,-37,16],[-98,-89,-53,-16]],\n    [[-63,-30,-35,-8],[-38,-13,-14,0],[-18,0,-7,13],[-26,-3,1,16],[-24,-6,-10,17],[-26,2,1,16],[-34,-18,-7,9],[-51,-40,-39,-20]],\n    [[-2,-6,-3,-2],[-10,-7,1,0],[10,-4,2,-2],[-5,2,-8,8],[-8,5,4,-9],[3,-2,-10,7],[1,2,17,-8],[12,-6,13,7]],\n    [[-69,-57,-47,-26],[-55,-31,-22,-4],[-39,-18,-9,3],[-23,-3,13,24],[-29,-6,9,21],[-38,-18,-12,1],[-50,-27,-24,-8],[-75,-52,-43,-36]],\n    [[0,41,80,93],[57,98,138,131],[86,138,165,173],[103,152,168,169],[98,166,197,194],[87,164,174,189],[40,99,128,141],[5,60,75,75]]\n  ];\n  let pbonus = mg ? \n    [[0,0,0,0,0,0,0,0],[0,-5,10,13,21,17,6,-3],[-11,-10,15,22,26,28,4,-24],[-9,-18,8,22,33,25,-4,-16],\n     [6,-3,-10,1,12,6,-12,1],[-6,-8,5,11,-14,0,-12,-14],[-10,6,-5,-11,-2,-14,12,-1],[0,0,0,0,0,0,0,0]]:\n    [[0,0,0,0,0,0,0,0],[-10,-3,7,-1,7,6,1,-20],[-6,-6,-1,-1,-1,2,-2,-5],[4,-5,-4,-5,-6,-13,-3,-7],\n     [18,2,2,-9,-13,-8,11,9],[25,17,19,29,29,8,4,12],[-1,-6,18,22,22,17,2,9],[0,0,0,0,0,0,0,0]];\n  let i = \"PNBRQK\".indexOf(board(pos, square.x, square.y));\n  if (i < 0) return 0;\n  if (i == 0) return pbonus[7 - square.y][square.x];\n  else return bonus[i-1][7 - square.y][Math.min(square.x, 7 - square.x)];\n}",
        "links": [],
        "eval": false,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
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
    data.push({
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
    data.push({
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
    data.push({
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
    data.push({
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
    data.push({
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
        "elo": {
            "value": "5.82",
            "error": "4.1",
            "link": "http://tests.stockfishchess.org/tests/view/5a7af24e0ebc5902971a9a3c"
        }
    });
    data.push({
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
    data.push({
        "name": "Imbalance total",
        "group": "Imbalance",
        "text": "<b>$</b>. Second-degree polynomial material imbalance by Tord Romstad.",
        "code": "function $$(pos, square) {\n  let v = 0;\n  v += $imbalance(pos) - $imbalance(colorflip(pos));\n  v += $bishop_pair(pos) - $bishop_pair(colorflip(pos));\n  return (v / 16) << 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": false
    });
    data.push({
        "name": "Weak unopposed pawn",
        "group": "Pawns",
        "text": "<b>$</b>. Check if our pawn is weak and unopposed.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($opposed(pos, square)) return 0;\n  let v = 0;\n  if ($isolated(pos, square)) v++;\n  if ($backward(pos, square)) v++;\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "1.25",
            "error": "4.5",
            "link": "http://tests.stockfishchess.org/tests/view/5a74e8d40ebc5902971a9715"
        }
    });
    data.push({
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
    data.push({
        "name": "Opposite bishops",
        "group": "Helpers",
        "text": "<b>$</b> determines if we have bishops of opposite colors.",
        "code": "function $$(pos) {\n  if ($bishop_count(pos) != 1) return 0;\n  if ($bishop_count(colorflip(pos)) != 1) return 0;\n  let color = [0, 0];\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"B\") color[0] = (x + y) % 2;\n      if (board(pos, x, y) == \"b\") color[1] = (x + y) % 2;\n    }\n  }\n  return color[0] == color[1] ? 0 : 1;\n}",
        "links": [
            ["https://www.chessprogramming.org/Bishops_of_Opposite_Colors", "Bishops of Opposite Colors in cpw"]
        ],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": false,
        "graph": false
    });
    data.push({
        "name": "King distance",
        "group": "Helpers",
        "text": "<b>$</b> counts distance to our king.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"K\") {\n        return Math.max(Math.abs(x - square.x), Math.abs(y - square.y));\n      }\n    }\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "Long diagonal bishop",
        "group": "Pieces",
        "text": "<b>$</b>. Bonus for bishop on a long diagonal which can \"see\" both center squares.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"B\") return 0;\n  if (square.x - square.y != 0 && square.x - (7 - square.y) != 0) return 0;\n  let x1 = square.x, y1 = square.y;\n  if (Math.min(x1,7-x1) > 2) return 0;\n  for (let i = Math.min(x1,7-x1); i < 4; i++) {\n    if (board(pos, x1, y1) == \"p\") return 0;\n    if (board(pos, x1, y1) == \"P\") return 0;\n    if (x1 < 4) x1++; else x1--;\n    if (y1 < 4) y1++; else y1--;\n  }\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "-1.15",
            "error": "2.9",
            "link": "http://tests.stockfishchess.org/tests/view/5a75acec0ebc5902971a975f"
        }
    });
    data.push({
        "name": "Queen attack diagonal",
        "group": "Attack",
        "text": "<b>$</b> counts number of attacks on square by queen only with diagonal direction.",
        "code": "function $$(pos, square, s2) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  for (let i = 0; i < 8; i++) {\n    let ix = (i + (i > 3)) % 3 - 1;\n    let iy = (((i + (i > 3)) / 3) << 0) - 1;\n    if (ix == 0 || iy == 0) continue;\n    for (let d = 1; d < 8; d++) {\n      let b = board(pos, square.x + d * ix, square.y + d * iy);\n      if (b == \"Q\"\n      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {\n        let dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});\n        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;\n      }\n      if (b != \"-\") break;\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false
    });
    data.push({
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
    data.push({
        "name": "King ring",
        "group": "Helpers",
        "text": "<b>$</b> is square occupied by king and 8 squares around king. Squares defended by two pawns are removed from king ring.",
        "code": "function $$(pos, square, full) {\n  if (square == null) return sum(pos, $$);\n  if (!full\n   && board(pos, square.x + 1, square.y - 1) == \"p\"\n   && board(pos, square.x - 1, square.y - 1) == \"p\") return 0;\n  for (let ix = -2; ix <= 2; ix++) {\n    for (let iy = -2; iy <= 1; iy++) {\n      if (board(pos, square.x + ix, square.y + iy) == \"k\"\n      && (iy >= -1 || square.y + iy == 0)\n      && (ix >= -1 && ix <= 1 || square.x + ix == 0 || square.x + ix == 7)) return 1;\n    }\n  }\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "Slider on queen",
        "group": "Threats",
        "text": "<b>$</b>. Add a bonus for safe slider attack threats on opponent queen.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let pos2 = colorflip(pos);\n  if ($queen_count(pos2) != 1) return 0;\n  if (board(pos, square.x - 1, square.y - 1) == \"p\") return 0;\n  if (board(pos, square.x + 1, square.y - 1) == \"p\") return 0;\n  if ($attack(pos, square) <= 1) return 0;\n  if (!$mobility_area(pos, square)) return 0;\n  let diagonal = $queen_attack_diagonal(pos2, {x:square.x, y:7-square.y});\n  if (diagonal && $bishop_xray_attack(pos, square)) return 1;\n  if (!diagonal\n   && $rook_xray_attack(pos, square)\n   && $queen_attack(pos2, {x:square.x, y:7-square.y})) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true
    });
    data.push({
        "name": "Knight on queen",
        "group": "Threats",
        "text": "<b>$</b>. Add a bonus for safe knight attack threats on opponent queen.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let pos2 = colorflip(pos);\n  let qx = -1, qy = -1;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"q\") {\n        if (qx >= 0 || qy >= 0) return 0;\n        qx = x;\n        qy = y;\n      }\n    }\n  }\n  if ($queen_count(pos2) != 1) return 0;\n  if (board(pos, square.x - 1, square.y - 1) == \"p\") return 0;\n  if (board(pos, square.x + 1, square.y - 1) == \"p\") return 0;\n  if ($attack(pos, square) <= 1 && $attack(pos2, {x:square.x, y:7-square.y}) > 1) return 0;\n  if (!$mobility_area(pos, square)) return 0;\n  if (!$knight_attack(pos, square)) return 0;\n  if (Math.abs(qx-square.x) == 2 && Math.abs(qy-square.y) == 1) return 1;\n  if (Math.abs(qx-square.x) == 1 && Math.abs(qy-square.y) == 2) return 1;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true
    });
    data.push({
        "name": "Outpost total",
        "group": "Pieces",
        "text": "<b>$</b>. Middlegame and endgame bonuses for knights and bishops outposts, bigger if outpost piece is supported by a pawn.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (board(pos, square.x, square.y) != \"N\"\n   && board(pos, square.x, square.y) != \"B\") return 0;\n  let knight = board(pos, square.x, square.y) == \"N\";\n  let reachable = 0;\n  if (!$outpost(pos, square)) {\n    reachable = $reachable_outpost(pos, square);\n    if (!reachable) return 0;\n  }\n  return (knight ? 2 : 1) / (reachable ? 2 : 1);\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 0,
        "forwhite": true,
        "graph": true,
        "elo": {
            "value": "12.05",
            "error": "4.2",
            "link": "http://tests.stockfishchess.org/tests/view/5a774a8b0ebc5902971a9877"
        }
    });
    data.push({
        "name": "Pieces mg",
        "group": "Pieces",
        "text": "<b>$</b>. Middlegame bonuses and penalties to the pieces of a given color and type. Mobility not included here.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"NBRQ\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  let v = 0;\n  v += 36 * $outpost_total(pos, square);\n  v += 18 * $minor_behind_pawn(pos, square);\n  v -= 3 * $bishop_pawns(pos, square);\n  v += 10 * $rook_on_pawn(pos, square);\n  v += [0,18,44][$rook_on_file(pos, square)];\n  v -= $trapped_rook(pos, square) * 47 * (pos.c[0] || pos.c[1] ? 1 : 2);\n  v -= 49 * $weak_queen(pos, square);\n  v -= 7 * $king_protector(pos, square);\n  v += 45 * $long_diagonal_bishop(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "Pieces eg",
        "group": "Pieces",
        "text": "<b>$</b>. Endgame bonuses and penalties to the pieces of a given color and type. Mobility not included here.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if (\"NBRQ\".indexOf(board(pos, square.x, square.y)) < 0) return 0;\n  let v = 0;\n  v += 12 * $outpost_total(pos, square);\n  v += 3 * $minor_behind_pawn(pos, square);\n  v -= 7 * $bishop_pawns(pos, square);\n  v += 32 * $rook_on_pawn(pos, square);\n  v += [0,7,20][$rook_on_file(pos, square)];\n  v -= $trapped_rook(pos, square) * 4 * (pos.c[0] || pos.c[1] ? 1 : 2);\n  v -= 15 * $weak_queen(pos, square);\n  v -= 8 * $king_protector(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "Restricted",
        "group": "Threats",
        "text": "<b>$</b>. Bonus for restricting their piece moves.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  if ($attack(pos, square) == 0) return 0;\n  let pos2 = colorflip(pos);\n  if (!$attack(pos2, {x:square.x,y:7-square.y})) return 0;\n  if ($pawn_attack(pos2, {x:square.x,y:7-square.y}) > 0) return 0;\n  if ($attack(pos2, {x:square.x,y:7-square.y}) > 1 && $attack(pos, square) == 1) return 0;\n  return 1;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
        "name": "Threats mg",
        "group": "Threats",
        "text": "<b>$</b>. Middlegame threats bonus.",
        "code": "function $$(pos) {\n  let v = 0;\n  v += 69 * $hanging(pos);\n  v += $king_threat(pos) > 0 ? 24 : 0;\n  v += 48 * $pawn_push_threat(pos);\n  v += 13 * $rank_threat(pos);\n  v += 173 * $threat_safe_pawn(pos);\n  v += 59 * $slider_on_queen(pos);\n  v += 16 * $knight_on_queen(pos);\n  v += 7 * $restricted(pos);\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      let s = {x:x,y:y};\n      v += [0,0,39,57,68,62,0][$minor_threat(pos, s)];\n      v += [0,0,38,38,0,51,0][$rook_threat(pos, s)];\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "Threats eg",
        "group": "Threats",
        "text": "<b>$</b>. Endgame threats bonus.",
        "code": "function $$(pos) {\n  let v = 0;\n  v += 36 * $hanging(pos);\n  v += $king_threat(pos) > 0 ? 89 : 0;\n  v += 39 * $pawn_push_threat(pos);\n  v += 94 * $threat_safe_pawn(pos);\n  v += 18 * $slider_on_queen(pos);\n  v += 12 * $knight_on_queen(pos);\n  v += 7 * $restricted(pos);\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      let s = {x:x,y:y};\n      v += [0,31,42,44,112,120,0][$minor_threat(pos, s)];\n      v += [0,24,71,61,38,38,0][$rook_threat(pos, s)];\n    }\n  }\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
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
    data.push({
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
    data.push({
        "name": "Endgame shelter",
        "group": "King",
        "text": "<b>$</b>. Add an endgame component to the blockedstorm penalty so that the penalty applies more uniformly through the game.",
        "code": "function $$(pos, square) {\n  let w = 0, s = 1024, tx = null;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (board(pos, x, y) == \"k\"\n       || pos.c[2] && x == 6 && y == 0\n       || pos.c[3] && x == 2 && y == 0) {\n        let w1 = $strength_square(pos, {x:x,y:y});\n        let s1 = $storm_square(pos, {x:x,y:y});\n        let e1 = $storm_square(pos, {x:x,y:y}, true);\n        if (s1 - w1 < s - w) { w = w1; s = s1; e = e1; }\n      }\n    }\n  }\n  if (square == null) return e;\n  return 0;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
        "name": "King mg",
        "group": "King",
        "text": "<b>$</b> assigns middlegame bonuses and penalties for attacks on enemy king.",
        "code": "function $$(pos) {\n  let v = 0;\n  let kd = $king_danger(pos);\n  v -= $shelter_strength(pos);\n  v += $shelter_storm(pos);\n  v += (kd * kd / 4096) << 0;\n  v += 8 * $close_enemies(pos);\n  v += 17 * $pawnless_flank(pos);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "King eg",
        "group": "King",
        "text": "<b>$</b> assigns endgame bonuses and penalties for attacks on enemy king.",
        "code": "function $$(pos) {\n  let v = 0;\n  v -= 16 * $king_pawn_distance(pos);\n  v += $endgame_shelter(pos);\n  v += 95 * $pawnless_flank(pos);\n  v += ($king_danger(pos) / 16) << 0;\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 0,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
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
    data.push({
        "name": "Space",
        "group": "Space",
        "text": "<b>$</b> computes the space evaluation for a given side. The [[Space area]] bonus is multiplied by a weight: number of our pieces minus two times number of open files. The aim is to improve play on game opening.",
        "code": "function $$(pos, square) {\n  if ($non_pawn_material(pos) + $non_pawn_material(colorflip(pos)) < 12222) return 0;\n  let weight = -1;\n  for (let x = 0; x < 8; x++) {\n    for (let y = 0; y < 8; y++) {\n      if (\"PNBRQK\".indexOf(board(pos, x, y)) >= 0) weight++;\n    }\n  }\n  return (($space_area(pos, square) * weight * weight / 16) << 0) - 4 * $attacks_on_space(pos, square);\n}",
        "links": [],
        "eval": true,
        "squares": 0,
        "highlight": 2,
        "forwhite": true,
        "graph": true,
        "elo": null
    });
    data.push({
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
    data.push({
        "name": "Pawns mg",
        "group": "Pawns",
        "text": "<b>$</b> is middlegame evaluation for pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  v -= $isolated(pos, square) ? 5 : 0;\n  v -= $backward(pos, square) ? 9 : 0;\n  v -= $doubled(pos, square) ? 11 : 0;\n  v += $connected(pos, square) ?  $connected_bonus(pos, square) : 0;\n  v -= 13 * $weak_unopposed_pawn(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    data.push({
        "name": "Pawns eg",
        "group": "Pawns",
        "text": "<b>$</b> is endgame evaluation for pawns.",
        "code": "function $$(pos, square) {\n  if (square == null) return sum(pos, $$);\n  let v = 0;\n  v -= $isolated(pos, square) ? 15 : 0;\n  v -= $backward(pos, square) ? 24 : 0;\n  v -= $doubled(pos, square) ? 56 : 0;\n  v += $connected(pos, square) ?  $connected_bonus(pos, square) * ($rank(pos, square) - 3) / 4 << 0 : 0;\n  v -= 27 * $weak_unopposed_pawn(pos, square);\n  v += 20 * $double_attacked_pawn(pos, square);\n  return v;\n}",
        "links": [],
        "eval": true,
        "squares": 1,
        "highlight": 2,
        "forwhite": true,
        "graph": false,
        "elo": null
    });
    for (let i = 0; i < data.length; i++) eval("$" + data[i].name.toLowerCase().replace(/ /g, "_") + " = " + data[i].code + ";");
    return data;
})();

// ============================
// Evaluation Graph
// ============================

function getGraphPointData(i) {
    let e = null,
        black = false;
    if (_analysisEngine == null || _analysisEngine.depth == 0) return 0;
    if (i >= 0 && i < _history.length && _history[i].length >= 2 && _history[i][1] != null && _history[i][1].score != null) {
        black = _history[i][1].black;
        e = _history[i][1].score / 100;
        if (black) e = -e;
        if ((e || 0) > 10) e = 10;
        else if ((e || 0) < -10) e = -10;
    }
    return e;
}

function getGraphPointColor(i) {
    let e = getGraphPointData(i),
        laste = getGraphPointData(i - 1);
    black = i >= 0 && i < _history.length && _history[i].length >= 2 && _history[i][1] != null && _history[i][1].score != null && _history[i][1].black;
    let lost = laste == null || e == null ? 0 : black ? (laste - e) : (e - laste);
    return lost <= 1.0 ? '#008800' : lost <= 3.0 ? '#bb8800' : '#bb0000';
}

function showGraphTooltip(i, event) {
    if (i >= 0 && i < _history.length && _history[i] != null && _history[i].length > 3 && _history[i][3] != null) {
        let pos = parseFEN(_history[i][0]);
        let evalText = _history[i][3];
        if (_history[i][1] != null && _history[i][1].score != null) {
            let e = _history[i][1].score;
            if (_history[i][1].black) e = -e;
            evalText += ' ' + getEvalText(e, true);
        }
        updateTooltip(evalText, null, (pos.w ? (pos.m[1] - 1) + '...' : pos.m[1] + '.'), null, event);
    } else updateTooltip('');
}

function repaintGraph(event) {
    requestAnimationFrame(() => {
        let data = [];
        let color = [];
        for (let i = 0; i < _history.length; i++) {
            data.push(getGraphPointData(i));
            color.push(getGraphPointColor(i));
        }

        let border1 = 4.5,
            border2 = 18.5;
        let xMax = 40,
            yMax = 2,
            xStep = 10,
            yStep = 1;

        for (let i = 0; i < data.length; i++) {
            if (Math.ceil(Math.abs(data[i])) > yMax) yMax = Math.ceil(Math.abs(data[i]));
        }
        if (data.length > xMax) xMax = data.length;

        let cw = document.getElementById('graphWrapper').clientWidth;
        let ch = document.getElementById('graphWrapper').clientHeight;
        let mouseDataPos = null;

        if (event != null) {
            let rect = document.getElementById('graph').getBoundingClientRect();
            let mx = event.clientX - rect.left;
            let my = event.clientY - rect.top;
            let b1 = border1 / _bodyScale,
                b2 = border2 / _bodyScale;
            let mUnit = (rect.width - b1 - b2) / xMax;
            if (mx > b2 + mUnit / 2 && mx < rect.width - b1 + mUnit / 2 && my > b1 && my < rect.height - b2) {
                mouseDataPos = Math.round((mx - b2) / mUnit) - 1;
            }
            if (mouseDataPos == _lastMouseDataPos) return;
            _lastMouseDataPos = mouseDataPos;
        } else {
            _lastMouseDataPos = mouseDataPos;
        }

        let canvas = document.getElementById('graph');
        let ctx = canvas.getContext('2d');
        canvas.width = cw;
        canvas.height = ch;
        let yTotal = canvas.height - border1 - border2,
            xTotal = canvas.width - border1 - border2;
        let xUnit = xTotal / (xMax / xStep),
            yUnit = yTotal / (yMax * 2 / yStep);

        if (yUnit > 0) {
            while (yUnit < 12) {
                yUnit *= 2;
                yStep *= 2;
            }
        }
        if (xUnit > 0) {
            while (xUnit < 18) {
                xUnit *= 2;
                xStep *= 2;
            }
        }

        ctx.font = '10px Segoe UI';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#a0aab4';
        ctx.fillText('0', border2 - 6, border1 + yTotal / 2);
        ctx.beginPath();
        ctx.strokeStyle = '#738191';
        for (let i = yStep; i <= yMax; i += yStep) {
            if (i == 0) continue;
            let y = Math.round(i * yUnit / yStep);
            ctx.fillText('+' + i, border2 - 6, border1 + yTotal / 2 - y);
            ctx.fillText('-' + i, border2 - 6, border1 + yTotal / 2 + y);
            if (i < yMax) {
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

        ctx.textAlign = 'center';
        ctx.strokeStyle = '#a0aab4';
        for (let i = 0; i <= xMax; i += xStep) {
            let x = Math.round(i * xUnit / xStep);
            ctx.fillText(i / 2, border2 + x, border1 + yTotal + border2 / 2 + 2);
            ctx.moveTo(border2 + x, border1 + yTotal);
            ctx.lineTo(border2 + x, border1 + yTotal + 3);
        }
        for (let i = 0; i <= yMax; i += yStep) {
            let y = Math.round(i * yUnit / yStep);
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

        for (let i = 1; i < data.length; i++) {
            if (data[i] != null && data[i - 1] != null) {
                ctx.beginPath();
                ctx.strokeStyle = color[i] == '#bb0000' ? 'red' : (color[i] == '#008800' ? 'black' : 'white');
                ctx.lineWidth = 1;
                ctx.moveTo(border2 + i * (xUnit / xStep), border1 + yTotal / 2 - data[i - 1] * (yUnit / yStep));
                ctx.lineTo(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep));
                ctx.stroke();
            }
        }

        for (let i = 0; i < data.length; i++) {
            if (i != mouseDataPos && i != _historyindex) {
                ctx.beginPath();
                ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 2, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'black';
                ctx.fill();
            }
        }

        let i = _historyindex;
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

        if (event) showGraphTooltip(mouseDataPos, event);
        repaintLastMoveArrow();
    });
}

// ============================
// Sidebar Functions
// ============================

function repaintSidebars() {
    requestAnimationFrame(() => {
        let pos = parseFEN(getCurFEN());
        let whitemat = [],
            blackmat = [],
            points = 0;

        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                let p = board(pos, x, y).toLowerCase();
                let col = board(pos, x, y) != p;
                let index = 'pnbrqk'.indexOf(p);
                if (index >= 0) {
                    if (col) whitemat.push(index);
                    else blackmat.push(index);
                    points += (col ? 1 : -1) * [1, 3, 3, 5, 9, 0][index];
                }
            }
        }

        whitemat.sort();
        blackmat.sort();

        for (let i = 0, j = 0; i < whitemat.length && j < blackmat.length;) {
            if (whitemat[i] == blackmat[j]) {
                whitemat.splice(i, 1);
                blackmat.splice(j, 1);
            } else if (whitemat[i] < blackmat[j]) i++;
            else if (whitemat[i] > blackmat[j]) j++;
        }

        let elem = document.getElementById('materialWrapper');
        while (elem.firstChild) elem.removeChild(elem.firstChild);

        let fmat = function(mat, flip) {
            let fragment = document.createDocumentFragment();
            for (let i = 0; i < mat.length; i++) {
                let node1 = document.createElement('DIV');
                node1.className = 'pnbrqk' [mat[i]];
                let d = (mat.length - 1 - i) * 16 + 'px';
                if (flip) node1.style.top = d;
                else node1.style.bottom = d;
                fragment.appendChild(node1);
            }
            elem.appendChild(fragment);
        }

        if (points < 0) fmat(whitemat, _flip);
        fmat(blackmat, !_flip);
        if (points >= 0) fmat(whitemat, _flip);

        if (points != 0) {
            let node1 = document.createElement('DIV');
            node1.appendChild(document.createTextNode('+' + Math.abs(points)));
            let down = points > 0 && !_flip || points < 0 && _flip;
            let d = (_flip ^ down ? whitemat.length : blackmat.length) * 16 + 'px';
            if (down) node1.style.bottom = d;
            else node1.style.top = d;
            elem.appendChild(node1);
        }

        let topElem = document.getElementById('namesWrapperTop');
        while (topElem.firstChild) topElem.removeChild(topElem.firstChild);
        topElem.appendChild(document.createTextNode(_flip ? _wname : _bname));

        let bottomElem = document.getElementById('namesWrapperBottom');
        while (bottomElem.firstChild) bottomElem.removeChild(bottomElem.firstChild);
        bottomElem.appendChild(document.createTextNode(_flip ? _bname : _wname));
    });
}

// ============================
// Buttons and Menu
// ============================

function refreshButtonRevert() {
    if (_history2 == null) {
        document.getElementById('buttonRevert').className = 'off';
        document.getElementById('buttonRevert').onclick = null;
    } else {
        document.getElementById('buttonRevert').className = 'on';
        document.getElementById('buttonRevert').onclick = function(e) {
            command(e.ctrlKey ? 'keep' : 'revert');
        };
    }
}

function refreshFlip() {
    let elem = document.getElementById('cbTable');
    for (let i = 0; i < 8; i++) {
        elem.children[0].children[0].children[1 + i].innerText =
            elem.children[0].children[9].children[1 + i].innerText = 'abcdefgh' [_flip ? 7 - i : i];
        elem.children[0].children[1 + i].children[0].innerText =
            elem.children[0].children[1 + i].children[i == 0 ? 2 : 1].innerText = '12345678' [_flip ? i : 7 - i];
    }
    showBoard(true);
}

function doFlip() {
    _flip = !_flip;
    refreshFlip();
}

function showHideWindow(name, targetState) {
    if (_mobile && name != 'Chessboard') {
        let wb = document.getElementById('wb').children;
        let lparams = [];
        for (let i = 0; i < wb.length; i++) {
            if (wb[i].tagName != 'DIV') continue;
            let wbId = wb[i].id.substring(2);
            if (wbId == 'Chessboard') continue;
            document.getElementById('w' + wbId).style.display = 'none';
            let wbElem = document.getElementById('wb' + wbId);
            wbElem.className = wbElem.className.replace(' selected', '');
        }
    }
    let boxElem = document.getElementById('w' + name);
    let newState = targetState == null ? boxElem.style.display == 'none' : targetState;
    boxElem.style.display = newState ? '' : 'none';
    let wbElem = document.getElementById('wb' + name);
    wbElem.className = wbElem.className.replace(' selected', '') + (newState ? ' selected' : '');
    checkSizes();
    if ((name == 'Edit' || _mobile) && isEdit()) showLegalMoves(null);
    if (name == 'Graph' && document.onmousemove == graphMouseMove) document.getElementById('graphWrapper').onmouseout();
    if (name == 'Static' && newState) repaintStatic();
}

function showHideMenu(state, e) {
    if (e != null) {
        let target = e.target != null ? e.target : e.srcElement;
        while (target != null && target.id != 'buttonMenu' && target.id != 'menu' && target.tagName != 'BODY') target = target.parentNode;
        if (target == null) return;
        if (!state && (target.id == 'buttonMenu' || target.id == 'menu')) return;
    }
    if (state) _menu = !_menu;
    else _menu = false;

    let bElem = document.getElementById('buttonMenu');
    let mElem = document.getElementById('menu');
    bElem.className = _menu ? 'on down' : 'on';
    mElem.style.top = (bElem.getBoundingClientRect().bottom - document.getElementById('container').getBoundingClientRect().top) * _bodyScale + 'px';
    mElem.style.left = (bElem.getBoundingClientRect().left - document.getElementById('container').getBoundingClientRect().left) * _bodyScale + 'px';
    mElem.style.right = 'auto';
    if (_mobile) {
        mElem.style.left = 'auto';
        mElem.style.right = (-bElem.getBoundingClientRect().right + document.getElementById('container').getBoundingClientRect().right - 1) * _bodyScale + 'px';
    }
    mElem.style.display = _menu ? '' : 'none';
    if (_menu) reloadMenu();
}

function setBoardColor(c) {
    let count = 6;
    if (c < 0) c = count - 1;
    if (c >= count) c = 0;
    document.getElementById('cbTable').className = 'c' + c;
    document.getElementById('boxBoard').className = 'c' + c;
    document.getElementById('chessboard1').className = 'cb c' + c;
    let elem = document.getElementById('icolor');
    if (elem != null) elem.className = 'c' + c;
    _color = c;
}

function setEngineValue(elem) {
    setElemText(elem, _analysisEngine != null && _analysisEngine.ready ? _analysisEngine.depth : '18');
    elem.removeAttribute('title');
}

function reloadMenu() {
    requestAnimationFrame(() => {
        let parent = document.getElementById('menu');
        while (parent.firstChild) parent.removeChild(parent.firstChild);

        let addMenuLine = function() {
            let div = document.createElement('div');
            div.className = 'menuLine';
            parent.appendChild(div);
        }

        let addMenuItem = function(className, text, key, enabled, func) {
            let div = document.createElement('div');
            div.className = 'menuItem ' + className;
            if (!enabled) div.className += ' disabled';
            let span1 = document.createElement('span');
            setElemText(span1, text);
            div.appendChild(span1);
            let span2 = document.createElement('span');
            span2.className = 'key';
            if (key != null) setElemText(span2, key);
            div.appendChild(span2);
            if (enabled) div.onclick = func;
            parent.appendChild(div);
        }

        let addMenuItemEngine = function(className, text) {
            let div = document.createElement('div');
            div.className = 'menuItem ' + className;
            let span1 = document.createElement('span');
            setElemText(span1, text);
            div.appendChild(span1);
            let span2 = document.createElement('span');
            span2.id = 'buttonEnginePlus';
            span2.onclick = function() {
                if (_analysisEngine != null && _analysisEngine.ready) command('depth ' + Math.min(MAX_DEPTH, _analysisEngine.depth + 1));
                showBoard(false, true);
                setEngineValue(document.getElementById('buttonEngineValue'));
            }
            div.appendChild(span2);
            let span3 = document.createElement('span');
            span3.id = 'buttonEngineValue';
            span3.onclick = function() {
                if (_analysisEngine != null && _analysisEngine.ready) command('depth ' + (_analysisEngine.depth != 0 ? '0' : '28'));
                showBoard(false, true);
                setEngineValue(document.getElementById('buttonEngineValue'));
            }
            setEngineValue(span3);
            div.appendChild(span3);
            let span4 = document.createElement('span');
            span4.id = 'buttonEngineMinus';
            span4.onclick = function() {
                if (_analysisEngine != null && _analysisEngine.ready) command('depth ' + Math.max(0, _analysisEngine.depth - 1));
                showBoard(false, true);
                setEngineValue(document.getElementById('buttonEngineValue'));
            }
            div.appendChild(span4);
            parent.appendChild(div);
        }

        let addMenuItemUciElo = function(className, text) {
            let div = document.createElement('div');
            div.className = 'menuItem ' + className;

            let span1 = document.createElement('span');
            setElemText(span1, text);
            div.appendChild(span1);

            // '+' button
            let span2 = document.createElement('span');
            span2.id = 'buttonUciEloPlus';
            span2.onclick = function() {
                _userUciEloRating = Math.min(3190, _userUciEloRating + 10);
                updateUciEloValue(span3);
                if (_playEngine && _playEngine.ready) {
                    _playEngine.send('setoption name UCI_LimitStrength value true');
                    _playEngine.send('setoption name UCI_Elo value ' + _userUciEloRating);
                }
            };
            div.appendChild(span2);

            // Elo rating display
            let span3 = document.createElement('span');
            span3.id = 'buttonUciEloValue';
            updateUciEloValue(span3);
            div.appendChild(span3);

            // '-' button
            let span4 = document.createElement('span');
            span4.id = 'buttonUciEloMinus';
            span4.onclick = function() {
                _userUciEloRating = Math.max(1320, _userUciEloRating - 10);
                updateUciEloValue(span3);
                if (_playEngine && _playEngine.ready) {
                    _playEngine.send('setoption name UCI_LimitStrength value true');
                    _playEngine.send('setoption name UCI_Elo value ' + _userUciEloRating);
                }
            };
            div.appendChild(span4);
            parent.appendChild(div);
        };

        // Helper function to update the Elo rating display
        function updateUciEloValue(span) {
            setElemText(span, '' + _userUciEloRating);
        }

        let addMenuItemColor = function(className, text) {
            let div = document.createElement('div');
            div.className = 'menuItem ' + className;
            let span1 = document.createElement('span');
            setElemText(span1, text);
            div.appendChild(span1);

            let span2 = document.createElement('span');
            span2.id = 'buttonColorNext';
            span2.onclick = function() {
                setBoardColor(_color + 1);
            }
            div.appendChild(span2);
            let div1 = document.createElement('div');
            div1.id = 'icolor';
            div1.className = 'c' + _color;
            div1.onclick = function() {
                setBoardColor(0);
            };
            let div2, div3 = document.createElement('div');
            div2 = document.createElement('div');
            div2.style.left = '0px';
            div2.style.top = '0px';
            div2.className = 'l';
            div3.appendChild(div2);
            div2 = document.createElement('div');
            div2.style.left = '0px';
            div2.style.top = '5px';
            div2.className = 'd';
            div3.appendChild(div2);
            div2 = document.createElement('div');
            div2.style.left = '5px';
            div2.style.top = '0px';
            div2.className = 'd';
            div3.appendChild(div2);
            div2 = document.createElement('div');
            div2.style.left = '5px';
            div2.style.top = '5px';
            div2.className = 'l';
            div3.appendChild(div2);
            div1.appendChild(div3);
            div.appendChild(div1);

            let span4 = document.createElement('span');
            span4.id = 'buttonColorPrev';
            span4.onclick = function() {
                setBoardColor(_color - 1);
            }
            div.appendChild(span4);

            parent.appendChild(div);
        }

        addMenuItem('menuAnalysisMode', 'Mode 1: Analyze Board', 1, _gameMode != 1, function(e) {
            menuAnalysisMode()
        });
        addMenuItem('menuPlayEngine', 'Mode 2: Player (White) vs. Engine (Black)', 2, _gameMode != 2, function(e) {
            menuPlayEngineWhite()
        });
        addMenuItem('menuPlayEngine', 'Mode 3: Engine (White) vs. Player (Black)', 3, _gameMode != 3, function(e) {
            menuPlayEngineBlack()
        });
        addMenuItem('menuTwoPlayerMode', 'Mode 4: Player vs. Player', 4, _gameMode != 4, function(e) {
            menuTwoPlayerMode()
        });
        addMenuLine();
        addMenuItemEngine('menuAnalysisEngine', 'Analysis Engine Depth');
        addMenuItemUciElo('menuPlayingEngine', 'Playing Engine Rating');
        addMenuLine();
        addMenuItem('menuPromote', 'Pawn Promotion: Queen', 'P', true, function() {
            togglePromotionPiece();
        });
        addMenuLine();
        addMenuItem('menuCoach', _coachModeLabel, 'C', true, function() {
            toggleCoachMode();
            showHideMenu(false);
        });
        addMenuLine();
        addMenuItem('menuKeep', 'Keep Changes', 'K', document.getElementById('buttonRevert').className == 'on', function() {
            command('keep');
            showHideMenu(false);
        });
        addMenuItem('menuRevert', 'Revert Changes', 'ESC', document.getElementById('buttonRevert').className == 'on', function() {
            command('revert');
            showHideMenu(false);
        });
        addMenuLine();
        addMenuItem('menuFlip', 'Flip Board', 'F', true, function() {
            command('flip');
            showHideMenu(false);
        });
        addMenuItem('menuStm', 'Change Side To Move', 'T', true, function() {
            command('sidetomove');
            showHideMenu(false);
        });
        addMenuLine();
        addMenuItem('menuStart', 'Go To First Move', 'Home', document.getElementById('buttonBack').className == 'on', function() {
            historyMove(-1, null, true);
            showHideMenu(false);
        });
        addMenuItem('menuEnd', 'Go To Last Move', 'End', document.getElementById('buttonForward').className == 'on', function() {
            historyMove(+1, null, true);
            showHideMenu(false);
        });
        addMenuItem('menuReset', 'Reset Game', '0', true, function() {
            command('reset');
            showHideMenu(false);
        });
        addMenuLine();
        addMenuItemColor('menuColor', 'Chessboard Theme');
        addMenuItem('menuWindow', 'Open Board In New Window', 'N', true, function() {
            command('window');
            showHideMenu(false);
        });
    });
}

// ============================
// Menu Functions
// ============================

function menuAnalysisMode() {
    _gameMode = 1;
    _play = null;
    _analysisEngine.kill = false;
    _analysisEngine.send('setoption name Skill Level value 20');
    showBoard(false);
    showHideMenu(false);
}

function menuPlayEngineWhite() {
    _gameMode = 2;
    _isPlayerWhite = true;
    _play = 0;
    if (_playEngine != null && _playEngine.ready) {
        _playEngine.send('setoption name UCI_LimitStrength value true');
        _playEngine.send('setoption name UCI_Elo value ' + _userUciEloRating);
    }
    showBoard(true);
    showHideMenu(false);
    doComputerMove();
}

function menuPlayEngineBlack() {
    _gameMode = 3;
    _isPlayerWhite = false;
    _play = 1;
    if (_playEngine != null && _playEngine.ready) {
        _playEngine.send('setoption name UCI_LimitStrength value true');
        _playEngine.send('setoption name UCI_Elo value ' + _userUciEloRating);
    }
    showBoard(true);
    showHideMenu(false);
    doComputerMove();
}

function menuTwoPlayerMode() {
    _gameMode = 4;
    _analysisEngine.kill = true;
    _play = null;
    showBoard(false);
    showHideMenu(false);
}

// ============================
// URL Parameters
// ============================

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results || !results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// ============================
// Setup Functions
// ============================

function setupBoxes() {
    let elems = [document.getElementById('colLeft'), document.getElementById('colRight')];
    for (let j = 0; j < elems.length; j++)
        for (let i = 0; i < elems[j].children.length; i++) {
            let div = elems[j].children[i];
            if (div.tagName != 'DIV') continue;
            if (div.className != 'box') continue;
            if (!_mobile) {
                setupDragElement(div);
                let divCloseIcon = document.createElement('div');
                divCloseIcon.className = 'closeIcon';
                divCloseIcon.onclick = function() {
                    let boxElem = this.parentElement;
                    showHideWindow(boxElem.id.substring(1));
                }
                div.appendChild(divCloseIcon);
            }
            if (!_mobile || div.id != 'wChessboard') {
                let divBoxIcon = document.createElement('div');
                divBoxIcon.className = 'boxIcon icon' + div.id.substring(1);
                div.appendChild(divBoxIcon);
            }
            let wbIcon = document.createElement('div');
            wbIcon.id = 'wb' + div.id.substring(1);
            wbIcon.className = 'wbButton icon' + div.id.substring(1);
            if (div.style.display != 'none') wbIcon.className += ' selected';

            wbIcon.onclick = function() {
                showHideWindow(this.id.substring(2));
            }
            document.getElementById('wb').appendChild(wbIcon);
        }
}

function setupDragElement(elmnt) {
    let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    oldDisplay = elmnt.style.display;
    elmnt.style.display = '';
    elmnt.originalWidth = elmnt.style.width = (elmnt.getBoundingClientRect().width - 2) + 'px';
    elmnt.originalHeight = elmnt.style.height = (elmnt.getBoundingClientRect().height - 2) + 'px';
    elmnt.style.display = oldDisplay;
    elmnt.firstElementChild.onmousedown = startBoxDrag;
    elmnt.firstElementChild.ondblclick = function() {
        elmnt.style.width = elmnt.originalWidth;
        elmnt.style.height = elmnt.originalHeight;
        elmnt.style.left = '';
        elmnt.style.top = '';
        elmnt.style.position = '';
        elmnt.style.zIndex = '4';
    };
    setupTouchEvents(elmnt.firstElementChild, startBoxDrag, moveBoxDrag, endBoxDrag);

    let resizeSquare = document.createElement('div');
    resizeSquare.style.position = 'absolute';
    resizeSquare.style.bottom = resizeSquare.style.right = '0';
    resizeSquare.style.width = resizeSquare.style.height = '12px';
    resizeSquare.style.cursor = 'nw-resize';
    resizeSquare.onmousedown = startBoxResize;
    resizeSquare.ondblclick = function() {
        elmnt.style.width = elmnt.originalWidth;
        elmnt.style.height = elmnt.originalHeight;
    };
    setupTouchEvents(resizeSquare, startBoxResize, moveBoxResize, endBoxDrag);
    elmnt.appendChild(resizeSquare);

    function startBoxDrag(e) {
        e = e || window.event;
        if (e && e.preventDefault) e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = endBoxDrag;
        document.onmousemove = moveBoxDrag;
    }

    function moveBoxDrag(e) {
        e = e || window.event;
        if (e && e.preventDefault) e.preventDefault();
        if (elmnt.style.position != 'absolute') {
            elmnt.style.width = (elmnt.getBoundingClientRect().width - 2) + 'px';
            elmnt.style.height = (elmnt.getBoundingClientRect().height - 2) + 'px';
            elmnt.style.left = (elmnt.getBoundingClientRect().left - document.getElementById('container').getBoundingClientRect().left) + 'px';
            elmnt.style.top = (elmnt.getBoundingClientRect().top - document.getElementById('container').getBoundingClientRect().top - 8) + 'px';
            elmnt.style.position = 'absolute';
        }

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        let x0 = parseFloat(elmnt.style.left.replace('px', '')) || 0;
        let y0 = parseFloat(elmnt.style.top.replace('px', '')) || 0;
        elmnt.style.left = (x0 - pos1) + 'px';
        elmnt.style.top = (y0 - pos2) + 'px';
        elmnt.style.zIndex = '5';
        elmnt.style.cursor = 'move';
    }

    function endBoxDrag() {
        document.onmouseup = onMouseUp;
        document.onmousemove = defaultMouseMove;
        elmnt.style.zIndex = '4';
        elmnt.style.cursor = '';
    }

    function startBoxResize(e) {
        e = e || window.event;
        if (e && e.preventDefault) e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.width = (elmnt.getBoundingClientRect().width - 2) + 'px';
        elmnt.style.height = (elmnt.getBoundingClientRect().height - 2) + 'px';
        document.onmouseup = endBoxDrag;
        document.onmousemove = moveBoxResize;
    }

    function moveBoxResize(e) {
        e = e || window.event;
        if (e && e.preventDefault) e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        let x0 = parseFloat(elmnt.style.width.replace('px', '')) || 0;
        let y0 = parseFloat(elmnt.style.height.replace('px', '')) || 0;
        elmnt.style.width = (x0 - pos1) + 'px';
        elmnt.style.height = (y0 - pos2) + 'px';
        elmnt.style.zIndex = '5';
        elmnt.style.cursor = 'nw-resize';
    }
}

function setupTouchEvents(elem, funcStart, funcMove, funcEnd) {
    let onTouch = function(e) {
        if (e.cancelable) e.preventDefault();
        if (e.touches.length > 1 || e.type == 'touchend' && e.touches.length > 0) return;
        switch (e.type) {
            case 'touchstart':
                funcStart(e.changedTouches[0]);
                break;
            case 'touchmove':
                funcMove(e.changedTouches[0]);
                break;
            case 'touchend':
                funcEnd(e.changedTouches[0]);
                break;
        }
    }
    elem.addEventListener('touchstart', onTouch, false);
    elem.addEventListener('touchend', onTouch, false);
    elem.addEventListener('touchcancel', onTouch, false);
    elem.addEventListener('touchmove', onTouch, false);
}

function showBoard(noeval, refreshhistory, keepcontent) {
    requestAnimationFrame(() => {
        let pos = parseFEN(getCurFEN());
        let dragElem = document.getElementById('dragPiece');
        while (dragElem.firstChild) dragElem.removeChild(dragElem.firstChild);

        let elem = document.getElementById('chessboard1');
        if (keepcontent && elem.children.length != 64) keepcontent = false;
        if (!keepcontent)
            while (elem.firstChild) elem.removeChild(elem.firstChild);

        let fragment = document.createDocumentFragment();
        let index = 0;
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                let div = keepcontent ? elem.children[index] : document.createElement('div');
                index++;
                div.style.left = (_flip ? 7 - x : x) * 40 + 'px';
                div.style.top = (_flip ? 7 - y : y) * 40 + 'px';
                div.className = ((x + y) % 2 ? 'd' : 'l') + ' ' + pos.b[x][y];
                if ((pos.b[x][y] == 'K' && isWhiteCheck(pos)) || (pos.b[x][y] == 'k' && isWhiteCheck(colorflip(pos)))) {
                    div.className += ' h2';
                }
                if (!keepcontent) fragment.appendChild(div);
            }
        }

        if (!keepcontent) elem.appendChild(fragment);

        if (_clickFromElem != null && _clickFrom != null && _clickFrom.x >= 0 && _clickFrom.y >= 0) _clickFromElem = null;
        document.getElementById('searchInput').value = getCurFEN();

        if (!noeval) {
            refreshMoves();
            if (refreshhistory) {
                for (let i = 0; i < _history.length; i++) {
                    if (_history[i].length > 1 && _history[i][1] != null) _history[i][1].depth = -1;
                }
            }
            scrollReset('Moves');
            scrollReset('Static');
            if (_analysisEngine && !_analysisEngine.kill) evalAll();
        }

        document.getElementById('buttonStm').className = pos.w ? 'white' : 'black';

        // Batch updates
        setArrow(true);
        repaintLastMoveArrow();
        showArrow3(null);

        if (_menu) reloadMenu();
        repaintGraph();
        repaintSidebars();
        updateInfo();
        repaintStatic();
        updateTooltip('');
    });
}

function scrollReset(winId) {
    requestAnimationFrame(() => {
        let windowElem = document.getElementById('w' + winId);
        let scrollElem = document.getElementById(winId.toLowerCase());
        let oldDisplay = windowElem.style.display;
        windowElem.style.display = '';
        scrollElem.scrollTop = 0;
        windowElem.style.display = oldDisplay;
    });
}

function findMoveIndexBySan(san) {
    for (let i = 0; i < _curmoves.length; i++)
        if (san == _curmoves[i].san) return i;
    return null;
}

function defaultMouseMove(event) {
    if (_tooltipState) updateTooltipPos(event);
}

function graphMouseMove(event) {
    repaintGraph(event);
    if (_tooltipState) updateTooltipPos(event);
}

function graphMouseDown(event) {
    if (_lastMouseDataPos != null) {
        let i = _lastMouseDataPos;
        if (i < _history.length && i >= 0 && i != _historyindex) {
            historyMove(i - _historyindex);
        }
    }
}

function getCircleClassName(i) {
    let cl = 'circle';
    if (_curmoves[i].eval != null && _curmoves[0].eval != null) {
        let etop = Math.max(-6, Math.min(6, _curmoves[0].eval / 100));
        let ecur = Math.max(-6, Math.min(6, _curmoves[i].eval / 100));
        let lost = Math.abs(etop - ecur);
        if (lost <= 1.0) cl += ' ok';
        else if (lost <= 3.0) cl += ' mi';
        else cl += ' bl';
    }
    return cl;
}

function getStaticEvalList(pos) {
    let posfen = generateFEN(pos);
    for (let si = 0; si < _staticEvalListCache.length; si++)
        if (_staticEvalListCache[si][0] == posfen) return _staticEvalListCache[si][1];

    let data = _staticEvalData;
    let grouplist = [],
        midindex = null,
        endindex = null,
        maincode = null;
    for (let i = 0; i < data.length; i++) {
        if (data[i].name == 'Middle game evaluation') midindex = i;
        if (data[i].name == 'End game evaluation') endindex = i;
        if (data[i].name == 'Main evaluation') maincode = data[i].code;
    }
    if (midindex == null || endindex == null || maincode == null) return;
    let zero = function() {
        return 0;
    };
    for (let i = 0; i < data.length; i++) {
        let n = data[i].name.toLowerCase().replace(/ /g, '_');
        while (i != midindex && i != endindex && maincode.indexOf('$' + n + '(') >= 0) {
            try {
                maincode = maincode.replace('$' + n + '(', '(function(){return ' + eval('$' + n + '(pos)') + ';})(');
            } catch (e) {
                alert(e.message);
                return [];
            }
        }
        if (data[midindex].code.indexOf('$' + n + '(') < 0 &&
            data[endindex].code.indexOf('$' + n + '(') < 0) continue;
        let code = data[i].code,
            list = [];
        for (let j = 0; j < data.length; j++) {
            if (!data[j].graph || data[j].group != data[i].group || i == j) continue;
            let n2 = data[j].name.toLowerCase().replace(/ /g, '_');
            code = code.replace('$' + n2 + '(', '$g-' + n2 + '(').replace('$' + n2 + '(', '$g-' + n2 + '(');
            list.push(n2);
        }
        if (data[i].graph) list.push(n);
        for (let j = 0; j < list.length; j++) {
            let n2 = list[j];
            if (code.indexOf('$g-' + n2 + '(') < 0 && !data[i].graph) continue;
            let mw = 0,
                mb = 0,
                ew = 0,
                eb = 0,
                func = null;
            try {
                eval('func = ' + code.replace('$g-' + n2 + '(', '$' + n2 + '(')
                    .replace('$g-' + n2 + '(', '$' + n2 + '(')
                    .replace(/\$g\-[a-z_]+\(/g, 'zero(') + ';');
                if (data[midindex].code.indexOf('$' + n + '(pos') >= 0) mw = func(pos);
                if (data[midindex].code.indexOf('$' + n + '(colorflip(pos)') >= 0) mb = func(colorflip(pos));
                if (data[endindex].code.indexOf('$' + n + '(pos') >= 0) ew = func(pos);
                if (data[endindex].code.indexOf('$' + n + '(colorflip(pos)') >= 0) eb = func(colorflip(pos));
            } catch (e) {
                alert(e.message);
                return [];
            }
            let evals = [mw - mb, ew - eb];
            let index = grouplist.map(function(e) {
                return e.elem;
            }).indexOf(n2);
            if (index < 0) {
                grouplist.push({
                    group: data[i].group,
                    elem: n2,
                    item: evals,
                    hidden: false,
                    mc: pos.m[1]
                });
            } else {
                grouplist[index].item[0] += evals[0];
                grouplist[index].item[1] += evals[1];
            }
        }

    }
    grouplist.sort(function(a, b) {
        return (a.group > b.group) ? 1 : ((b.group > a.group) ? -1 : 0);
    });
    maincode = maincode.replace('function $$(pos)', 'function $$(PMG,PEG)')
        .replace('$middle_game_evaluation(pos)', 'PMG')
        .replace('$end_game_evaluation(pos)', 'PEG')
    let mainfunc = eval('(' + maincode + ')');
    for (let i = 0; i < grouplist.length; i++) {
        grouplist[i].item.push(mainfunc(grouplist[i].item[0], grouplist[i].item[1]) - mainfunc(0, 0));
    }
    grouplist.push({
        group: 'Tempo',
        elem: 'tempo',
        item: [mainfunc(0, 0), mainfunc(0, 0), mainfunc(0, 0)],
        hidden: false,
        mc: pos.m[1]
    });

    _staticEvalListCache.push([posfen, grouplist]);
    if (_staticEvalListCache.length > _staticEvalListCacheSize) _staticEvalListCache.shift();
    return grouplist;
}

function checkSizes() {
    if (_mobile && (document.activeElement == null || document.activeElement.tagName != 'INPUT')) setupMobileLayout(false);

    // Graph
    let cw = document.getElementById('graphWrapper').clientWidth;
    let ch = document.getElementById('graphWrapper').clientHeight;
    let canvas = document.getElementById('graph');
    if (canvas.width != cw || canvas.height != ch) repaintGraph();

    // Chessboard
    let targetScale = Math.round(getCurScale() * 1000) / 1000;
    let targetMargin = ((document.getElementById('wChessboard').clientWidth - (document.getElementById('boxBoard').clientWidth + 4) * targetScale) / 2) - 0.5;
    let oldScale = parseFloat(document.getElementById('boxBoard').style.transform.replace('scale(', '').replace(')', ''));
    let oldMargin = parseFloat(document.getElementById('boxBoardOuter').style.marginLeft.replace('px', ''));
    if (Math.round(oldScale * 1000) != Math.round(targetScale * 1000) ||
        Math.round(oldMargin) != Math.round(targetMargin)) {
        document.getElementById('boxBoard').style.transform = 'scale(' + targetScale + ')';
        document.getElementById('boxBoardOuter').style.marginLeft =
            document.getElementById('boxBoardOuter').style.marginRight = targetMargin + 'px';
    }

    if (_wantUpdateInfo) {
        _wantUpdateInfo = false;
        updateInfo();
    }
}

function setupMobileLayout(init) {
    if (init) {
        document.getElementById('colLeft').style.width = '300px';
        document.getElementById('colRight').style.width = '300px';
        document.getElementById('wChessboard').style.margin = '8px 0 0 0';
        document.getElementById('wChessboard').style.resize = 'none';
        document.getElementById('wGraph').style.display = 'none';
        document.getElementById('wHistory').style.display = 'none';
        document.getElementById('wMoves').style.height = '121px';
        document.getElementById('logo').style.height = '30px';
        document.getElementById('logo').style.padding = '0';
        document.getElementById('logo').style.transform = 'scale(0.5)';
        document.getElementById('logo').style.transformOrigin = 'top left';
        document.getElementById('logotextmain').style.top = '15px';
        document.getElementById('logotextmain').style.left = '75px';
        document.getElementById('logotextsub').style.top = '46px';
        document.getElementById('logotextsub').style.left = '75px';
        document.getElementById('toolbar').style.transform = 'scale(2.3)';
        document.getElementById('toolbar').style.transformOrigin = 'top left';
        document.getElementById('toolbar').style.top = '-2px';
        document.getElementById('toolbar').style.left = '345px';
        document.getElementById('toolbar').style.width = '112px';
        document.getElementById('wb').style.transform = 'scale(2)';
        document.getElementById('positionInfo').style.display = 'none';
        document.getElementById('searchWrapper').style.top = '0';
        document.getElementById('searchWrapper').style.height = '24px';
        document.getElementById('searchInput').style.padding = '4px 4px 3px 4px';
        document.getElementById('boxBoardOuter').style.marginTop = '31px';
        document.getElementById('buttonGo').style.padding = '3px 4px 5px 4px';
        document.getElementById('buttonGo').style.top = '0';
    }
    let winWidth = Math.min(window.innerWidth, window.outerWidth);
    let winHeight = Math.min(window.innerHeight, window.outerHeight);
    let horiz = winWidth > winHeight;
    let width = horiz ? 660 : 320;
    let scale = winWidth / width;
    _bodyScale = 1 / scale;
    let height = horiz ? Math.max(280, Math.min(504, winHeight / scale)) : Math.max(490, winHeight / scale);
    document.body.style.display = 'flex';
    document.body.style.transformOrigin = 'top left';
    document.body.style.transform = 'scale(' + (scale) + ')';
    document.body.style.width = width + 'px';
    document.body.style.height = height + 'px';
    document.body.style.overflowX = 'hidden';
    document.getElementById('container').style.width = width + 'px';
    document.getElementById('container').style.height = height + 'px';
    document.getElementById('logo').style.position = horiz ? 'absolute' : '';
    document.getElementById('logo').style.top = horiz ? '0' : '';
    document.getElementById('logo').style.left = horiz ? '355px' : '';
    document.getElementById('wChessboard').style.width = horiz ? '310px' : '';
    document.getElementById('wChessboard').style.height = (horiz ? height - 16 : 300) + 'px';
    document.getElementById('wb').style.top = horiz ? '0' : '329px';
    document.getElementById('wb').style.right = horiz ? '324px' : '162px';
    document.getElementById('wb').style.width = horiz ? '21px' : '';
    document.getElementById('wb').style.height = horiz ? '120px' : '';
    document.getElementById('colLeft').style.minWidth = horiz ? '300px' : '';
    document.getElementById('colLeft').style.minHeight = horiz ? '1px' : '338px';
    document.getElementById('colLeft').style.paddingTop = horiz ? '' : '7px';
    document.getElementById('colLeft').style.marginLeft = horiz ? '5px' : '10px';
    document.getElementById('colRight').style.marginLeft = horiz ? '45px' : '10px';
    document.getElementById('colRight').style.marginTop = horiz ? '29px' : '';

    let elems = document.getElementById('colRight');
    for (let i = 0; i < elems.children.length; i++) {
        let div = elems.children[i];
        if (div.tagName != 'DIV' || div.className != 'box') continue;
        div.style.height = (horiz ? 243 + height - 280 : 121 + height - 490) + 'px';
        div.style.margin = '0';
        div.style.resize = 'none';
    }
}