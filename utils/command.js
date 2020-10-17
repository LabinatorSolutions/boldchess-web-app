const command = (text) => {
  if (text == null || text.length == 0) return;
  var mvdivs = ['<div class="moves">', '<div class="tview2 tview2-column">', '<div class="extension-item Moves">'];
  for (var i = 0; i < mvdivs.length; i++) {
      if (text.indexOf(mvdivs[i]) >= 0) {
          var text2 = text,
              ntext = '';
          text2 = text2.replace(/<span class="user_link[^>]*>([^<]*)<\/span>/g, "<a class=\"user_link\">$1</a>");
          var nmt = '<a class="user_link';
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
          for (var j = 0; j < 2; j++)
              if (text2.indexOf(nmt) > 0) {
                  text2 = text2.substr(text2.indexOf(nmt));
                  var black = text2.indexOf("black") < text2.indexOf(">");
                  text2 = text2.substr(nmt.length);
                  var h = '<h2 class="name">';
                  var nm = "[" + (black ? "Black" : "White") + " \"" + text2.substring(text2.indexOf(h) + h.length, text2.indexOf('</h2>')).trim() + "\"]\n";
                  if (j == 1 && !black) ntext = nm + ntext;
                  else ntext += nm;
              }

          text = text.substring(text.indexOf(mvdivs[i]));
          if (i == 2) text = text.replace(/<div class="notationTableInlineElement((?!<\/div>).)*<\/div>/g, "");
          text = text.substring(mvdivs[i].length, text.indexOf('</div>'));
          if (i == 2) {
              text = text.replace(/<dt>\s*(<span[^>]*>)?\s*([^<\s]*)\s*(<\/span>)?\s*<\/dt>/g, "<index>$2</index>")
                  .replace(/<span class="move">\s*([^<\s]*)\s*<\/span>/g, "<move>$1</move>")
          } else {
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
  if (text.split("/").length == 8 && text.split(".").length == 1) {
      pos = parseFEN(text);
      setCurFEN(generateFEN(pos));
      _history = [
          [getCurFEN()]
      ];
      _historyindex = 0;
      historyMove(0);
  } else if (text.split(".").length > 1) {
      var whitename = null,
          blackname = null;
      var wi = text.indexOf("[White \""),
          bi = text.indexOf("[Black \"");
      if (wi >= 0 && bi > wi) {
          var wil = text.substr(wi + 8).indexOf("\"]"),
              bil = text.substr(bi + 8).indexOf("\"]");
          if (wil > 0 && wil < 128) whitename = text.substr(wi + 8, wil);
          if (bil > 0 && bil < 128) blackname = text.substr(bi + 8, bil);
      }

      text = text.replace(/\u2605/g, "").replace(/\u0445/g, "x");
      text = " " + text.replace(/\./g, " ").replace(/(\[FEN [^\]]+\])+?/g, function($0, $1) {
          return $1.replace(/\[|\]|"/g, "").replace(/\s/g, ".");
      });
      text = text.replace(/\[Event /g, "* [Event ").replace(/\s(\[[^\]]+\])+?/g, "").replace(/(\{[^\}]+\})+?/g, "");
      var r = /(\([^\(\)]+\))+?/g;
      while (r.test(text)) text = text.replace(r, "");
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
      for (var i = 0; i < moves.length; i++) {
          if (moves[i].length == 0) continue;
          if ("*".indexOf(moves[i][0]) == 0) {
              if (i < moves.length - 1) {
                  pos = parseFEN(START);
                  historyAdd(generateFEN(pos), oldhistory);
                  gm++;
              }
              continue;
          } else if (moves[i].indexOf("FEN.") == 0) {
              pos = parseFEN(moves[i].substring(4).replace(/\./g, " "));
              if (_history[_historyindex][0] == START) _historyindex--;
              historyAdd(generateFEN(pos), oldhistory);
              continue;
          }
          if (moves[i] == "--") {
              pos.w = !pos.w;
              historyAdd(generateFEN(pos), oldhistory);
              continue;
          }
          var move = parseMove(pos, moves[i]);
          if (move == null) {
              alert("incorrect move: " + moves[i] + " " + gm);
              break;
          }
          var san = sanMove(pos, move, genMoves(pos));
          pos = doMove(pos, move.from, move.to, move.p);
          historyAdd(generateFEN(pos), oldhistory, move, san);
      }
      setCurFEN(generateFEN(pos));
      historyKeep(whitename, blackname);
  } else if (text.toLowerCase() == "reset") {
      setCurFEN(START);
      _history = [
          [getCurFEN()]
      ];
      _historyindex = 0;
      historyKeep();
      _history2 = null;
      if (_nncache != null) _nncache.clear();
  } else if (text.toLowerCase() == "clear") {
      setCurFEN("8/8/8/8/8/8/8/8 w - - 0 0");
      showBoard();
      historySave();
  } else if (text.toLowerCase() == "colorflip") {
      setCurFEN(generateFEN(colorflip(parseFEN(getCurFEN()))));
      showBoard();
      historySave();
  } else if (text.toLowerCase() == "sidetomove") {
      setCurFEN(getCurFEN().replace(" w ", " ! ").replace(" b ", " w ").replace(" ! ", " b "));
      showBoard();
      historySave();
  } else if (text.toLowerCase().indexOf("depth ") == 0) {
      if (_engine != null && _engine.ready) {
          _engine.depth = Math.min(128, Math.max(0, parseInt(text.toLowerCase().replace("depth ", ""))));
          if (isNaN(_engine.depth)) _engine.depth = 15;
      }
      showBoard();
      historySave();
  } else if (text.toLowerCase() == "flip") {
      doFlip();
  } else if (text.toLowerCase() == "window") {

      var encoded = "";
      if (_history[0][0] == START) {
          var gi = "";
          for (var i = 1; i < _history.length; i++) {
              var pos = parseFEN(_history[i - 1][0]);
              var moves = genMoves(pos);
              var mindex = -1;
              for (var j = 0; j < moves.length; j++) {
                  var move = moves[j];
                  var pos2 = doMove(pos, move.from, move.to, move.p);
                  if (generateFEN(pos2) == _history[i][0]) mindex = j;
              }
              if (mindex < 0) {
                  gi = "";
                  break;
              }
              var symbols = (moves.length + 1).toString(2).length,
                  v = "";
              for (var j = 0; j < symbols; j++) v += "0";
              var n = (mindex + 1).toString(2);
              n = v.substr(n.length) + n;
              gi += n;
              if (i == _history.length - 1) gi += v;
          }
          var cur = "";
          for (var i = 0; i < gi.length; i++) {
              cur += gi[i];
              if (i == gi.length - 1)
                  while (cur.length < 6) cur += "0";
              if (cur.length == 6) {
                  encoded += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_" [parseInt(cur, 2)];
                  cur = "";
              }
          }
      }
      var wb = document.getElementById("wb").children;
      var lparams = [];
      for (var i = 0; i < wb.length; i++) {
          if (wb[i].tagName != 'DIV') continue;
          var winId = wb[i].id.substring(2);
          var elem = document.getElementById("w" + winId);
          if (elem.style.display == "none") continue;
          if (elem.style.position == "absolute" && !_mobile) {
              lparams.push((winId[0] + elem.style.width + "," + elem.style.height + "," + elem.style.left + "," + elem.style.top).replace(/px/g, ""));
          } else if ((elem.style.width != elem.originalWidth || elem.style.height != elem.originalHeight) && !_mobile) {
              lparams.push((winId[0] + elem.style.width + "," + elem.style.height).replace(/(\.[0-9]+)?px/g, ""));
          } else lparams.push(winId[0]);
      }
      let lparamsstr = lparams.join(" ").toLowerCase();
      let url = [location.protocol, '//', location.host, location.pathname].join('');
      var params = [];
      if (_color > 0) params.push("col" + _color);
      if (_engine != null && _engine.ready && _engine.depth != 15) params.push("depth " + _engine.depth);
      if (lparamsstr != "c m h g") params.push("layout " + (lparamsstr.length == 0 ? "-" : lparamsstr));
      if (encoded.length > 0) params.push("~" + encoded);
      else if (getCurFEN() != START) params.push(getCurFEN());
      for (var i = 0; i < params.length; i++) {
          url += (i == 0 ? "?" : "&") + String.fromCharCode("a".charCodeAt(0) + i) + "=" + params[i];
      }
      window.open(url, "_blank");

  } else if (text[0] == "~") {
      var pos = parseFEN(START);
      var oldhistory = JSON.parse(JSON.stringify(_history));
      _history = [
          [START]
      ];
      _historyindex = 0;
      var gi = "";
      for (var i = 1; i < text.length; i++) {
          var n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".indexOf(text[i]).toString(2);
          gi += "000000".substr(n.length) + n;
      }
      var i = 0;
      while (i < gi.length) {
          var moves = genMoves(pos);
          var symbols = (moves.length + 1).toString(2).length,
              cur = "";
          for (var j = 0; j < symbols; j++) {
              cur += (i < gi.length ? gi[i] : "0");
              i++;
          }
          var n = parseInt(cur, 2);
          if (n == 0 || n >= moves.length + 1) break;
          var move = moves[n - 1],
              san = sanMove(pos, move, moves);
          pos = doMove(pos, move.from, move.to, move.p);
          historyAdd(generateFEN(pos), oldhistory, move, san);
      }
      setCurFEN(generateFEN(pos));
      historyKeep();
  } else if (text.toLowerCase() == "revert") {
      if (_history2 != null) {
          _historyindex = _history2[0];
          _history = _history2[1];
          _history2 = null;
          setCurFEN(_history[_historyindex][0]);
          refreshButtonRevert();
          historyMove(0);
      }
  } else if (text.toLowerCase() == "keep") {
      historyKeep(_wname, _bname);
  } else if (text.length == 4 && text.toLowerCase().indexOf("col") == 0) {
      setBoardColor(Math.max(0, text.charCodeAt(3) - "0".charCodeAt(0)));
  } else if (text.toLowerCase().indexOf("layout ") == 0) {
      var a = text.toUpperCase().split(" ");
      a.splice(0, 1);
      var wb = document.getElementById("wb").children;
      for (var i = 0; i < wb.length; i++) {
          if (wb[i].tagName != 'DIV') continue;
          var winId = wb[i].id.substring(2);
          var cur = a.find(function(x) {
              return x[0] == winId[0];
          });
          if (cur != null && !_mobile) {
              cur = cur.substring(1);
              var b = cur.length == 0 ? [] : cur.split(",");
              var elem = document.getElementById("w" + winId);
              if (elem.firstElementChild.ondblclick != null) elem.firstElementChild.ondblclick();
              if (b.length >= 2) {
                  elem.style.width = b[0] + "px";
                  elem.style.height = b[1] + "px";
              }
              if (b.length >= 4) {
                  elem.style.left = b[2] + "px";
                  elem.style.top = b[3] + "px";
                  elem.style.position = "absolute";
              }
              showHideWindow(winId, true);
          } else if (cur != null && _mobile) showHideWindow(winId, true);
          else if (!_mobile) showHideWindow(winId, false);
      }
  } else {
      for (var i = 0; i < _curmoves.length; i++)
          if (_curmoves[i].san == text) {
              doMoveHandler(_curmoves[i].move);
              break;
          }
  }
}

export default command;