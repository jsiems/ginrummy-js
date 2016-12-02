var nextId = 1;
var games = {};

module.exports = {
  addClient: function(ws) {

    ws.on('message', function(message){
      var data = JSON.parse(message);

      if(data.action == "connect") {
        if(games[data.game] == null) {
          games[data.game] = new Game(data.game);
        }
        ws.username = data.username;
        ws.game = data.game;
        games[data.game].connect(ws);
      }
      else if(data.action == "ping") {
        console.log("recieved ping");
        data = {};
        data.action = "ping";
        data.response = "yes";
        ws.send(JSON.stringify(data));
      }
      else if(data.action == "game") {
        games[data.game].processMessage(ws, data);
      }
      else {
        console.log("Unkown message recieved");
        console.log("  Action: " + data.action);
      }
    });

    ws.on('close', function(){
      for(var key in games) {
        if(games.hasOwnProperty(key)) {
          //if disconnect returns true, the game is empty
          if(games[key].disconnect(ws)) {
            console.log(games[key].getName() + " is now empty, deleting!");
            games[key] = null;
            delete games[key];
          }
        }
      }
    });
  }
}

function Card(valueInput, suitInput) {
  var suit = suitInput;
  var value = Number(valueInput);
  var counted = true;
  var scoringMode = "";
  var ignored = false;  //whether or not conflicts should be ignored for this card

  this.getSuit = function() {return suit};
  this.setSuit = function(s) {suit = s};
  this.getValue = function() {return value};
  this.setValue = function(v) {value = Number(v)};
  this.isCounted = function() {return counted};
  this.setCounted = function(cnt) {counted = cnt};
  this.getScoringMode = function() {return scoringMode};
  this.setScoringMode = function(s) {scoringMode = s};
  this.ignored = function() {return ignored};
  this.setIgnored = function(i) {ignored = i};
}

/*******************Setting a clean deck ********************/

function getCleanDeck(deck) {
  for(var i = 1; i <= 52; i ++) {
    var card;
    if(i <= 13)
      card = new Card(i, 'hearts');
    else if(i <= 26)
      card = new Card (i - 13, 'diamonds');
    else if(i <= 39)
      card = new Card(i - 26, 'clubs');
    else
      card = new Card(i - 39, 'spades');

    deck[i - 1] = card;
  }
  return deck;
}

function printDeck(deck) {
  deck.forEach(function(item) {
    console.log("Card: " + item.getValue() + " of " + item.getSuit());
  });
}

function inHand(card, deck) {
  //Unfortunately this variable is required
  //  trying to return out of the for each loop
  //  does not work
  var found = false;
  
  if(deck == null) {
    console.log("Deck is null");
  }
  
  deck.forEach(function(item){
    if(item.getValue() == card.getValue() && item.getSuit() == card.getSuit()) {
        found = true;
        return;
      }
  });
  
  return found;
}

function removeCard(card, deck) {
  if(deck == null) {
    console.log("Very big very bad error");
  }
  
  deck.forEach(function(item, index){
    if(item.getValue() == card.getValue() && item.getSuit() == card.getSuit()) {
        deck.splice(index, 1);
        return;
      }
  });
}

function addCard(card, deck) {
  var inserted = false;

  if(deck == null) {
    deck = hand;
  }
  
  for(var i = 0; i < deck.length; i ++) {
    if(Number(deck[i].getValue()) > Number(card.getValue())){
      deck.splice(i, 0, card);
      return;
    }
  }

  if(!inserted)
    deck.push(card);
}

function stringDeck(deck) {
  var result = "";
  deck.forEach(function(item) {
    result += item.getValue() + " of " + item.getSuit() + "|";
  });

  return result;
}

function stringCard(card) {
  var result = "";
  result += card.getValue();
  result += " of ";
  result += card.getSuit();
  return result;
}

function destringDeck(string) {
  var value = 0;
  var suit = "";
  var pipeLoc = 0;
  var spaceLoc = 0;
  for(var i = 0; i < string.length; i ++) {
    spaceLoc = string.indexOf(' ', i);
    value = string.substring(i, spaceLoc);
    i = string.indexOf(' ', spaceLoc + 1);
    pipeLoc = string.indexOf('|', i);
    suit = string.substring(i + 1, pipeLoc);
    i = pipeLoc
    var c = new Card(value, suit);
    hand.push(c);
  }
}

function destringCard(string) {
  var result = new Card(0, "");
  var spaceLoc = 0;
  var wordStart = 0;

  spaceLoc = string.indexOf(' ');
  result.setValue(string.substring(0, spaceLoc));
  wordStart = string.indexOf(' ', spaceLoc + 1);
  result.setSuit(string.substring(wordStart + 1));

  return result;
}

function calculateScore(deck) {
  //Step 1: Make all cards counted, not ignored
  deck.forEach(function(item) {item.setCounted(true); item.setIgnored(false)})

  //Step 2: calculate what cards are not counted based on triples or quadruples
  for(var i = 0; i < deck.length - 2; i ++) {
    var nextLoc = i + 1;
    var skipped = 0;
    while(deck[nextLoc].getValue() == deck[i].getValue()
            && deck[i].getScoringMode() != 'run') {
      if(deck[nextLoc].getScoringMode() == 'run') {
        skipped ++;
      }
      nextLoc ++;
      if(nextLoc >= deck.length) {
        break;
      }
    }
    if(nextLoc - i - skipped >= 3) {
      for(var j = i; j < nextLoc; j ++) {
        if(skipped == 0 || deck[j].getScoringMode() != 'run')
          deck[j].setCounted(false);
      }
    }
  }

  //Setp 3: calculate a straight
  for(var i = 0; i < deck.length - 2; i ++) {
    var nextLoc = i + 1;
    var skipped = 0;
    var lastValue = deck[i].getValue();
    var lastGoodValue = lastValue;

    while((deck[i].getSuit() == deck[nextLoc].getSuit() && deck[i].getValue() + (nextLoc - i - skipped) == deck[nextLoc].getValue())
              || deck[nextLoc].getValue() == lastValue 
              || deck[nextLoc].getValue() == lastValue + 1) {

      if(deck[i].getScoringMode() == 'set' || deck[nextLoc].getScoringMode() == 'set')
        break;

      if((deck[nextLoc].getValue() == lastValue && deck[nextLoc].getSuit() != deck[i].getSuit())
              || deck[nextLoc].getScoringMode() == 'set' 
              || (deck[nextLoc].getValue() == lastValue + 1 && deck[nextLoc].getSuit() != deck[i].getSuit())) {
        skipped ++;
      }
      else {
        //the card is the correct suit, but there is a gap between
        //  the current cards value and the last value in the run
        if(lastGoodValue + 2 <= deck[nextLoc].getValue()) {
          skipped ++;
          break;
        }
        lastGoodValue = deck[nextLoc].getValue();
      }

      lastValue = deck[nextLoc].getValue();
      nextLoc ++;

      if(nextLoc >= deck.length)
         break;
    }
    
    if(nextLoc - i - skipped >= 3) {
      for(var j = i; j < nextLoc; j ++) {
        if(deck[j].getSuit() == deck[i].getSuit()) {
          if(deck[j].isCounted() || deck[j].getScoringMode() != '' || deck[j].ignored()) {
            deck[j].setIgnored(true); //makes sure that if this is detected as a run
                                      // again because the length is greater than 3,
                                      // it is ignored the second time the loop goes over it
            deck[j].setCounted(false);
          }
          else {
            deck[j].setScoringMode('set');
            var setScore = calculateScore(deck);

            deck[j].setScoringMode('run');
            var runScore = calculateScore(deck);
			
            if(setScore < runScore)
              deck[j].setScoringMode('set');

            calculateScore(deck);
          }
        }
      }
    }
  }
  var score = 0;
  deck.forEach(function(card) {
    score += (card.getValue() > 10 ? 10 * card.isCounted() : card.getValue()) * card.isCounted();
  });
  return score;
}

function shuffle(deck) {
  var rand;

  for(var i = deck.length - 1; i >= 0; i --) {
    rand = Math.floor(Math.random() * i);

    var temp = deck[i];
    deck[i] = deck[rand];
    deck[rand] = temp;
  }

  return deck;
}

/*
dealerHand.sort(function(a, b) { return a.getValue() - b.getValue()});
playerHand.sort(function(a, b) { return a.getValue() - b.getValue()});
*/

/*************gin rummy ws handler ****************/
function Game(name_input) {
  var name = name_input;
  var host;
  var join;
  var state;
  var deck = [];
  var topOfDiscard;

  this.getName = function() {return name};

  this.processMessage = function(ws, message) {
    switch(state) {
      case "NEWGAME":
        console.log("Message while state is NEWGAME");
        ws.ready = message.ready
        if(host.ready && join.ready) {
          console.log("  starting new round");
          host.score = 0;
          join.score = 0;
          this.newround();
        }
        break;

      case "DISCARD":
        console.log("message recieved state is DISCARD");

        if(!ws.turn) {
          console.log("  it is not this sockets turn");
          var data = {};
          data.action = "display_message";
          data.message = "ITS NOT YOUR TURN FOO!!!";
          ws.send(JSON.stringify(data));
          break;
        }

        if(!inHand(destringCard(message.card), ws.deck)) {
          console.log("  That card is not in their hand!" + message.card);
          var data = {};
          data.action = "display_message";
          data.message = "You dont have that card! " + message.card;
          ws.send(JSON.stringify(data));
          break;
        }

        removeCard(destringCard(message.card), ws.deck);
        topOfDiscard = destringCard(message.card);

        if(message.knock) {
          console.log("The player is trying to go down");
          host.deck.sort(function(a, b) { return a.getValue() - b.getValue()});
          join.deck.sort(function(a, b) { return a.getValue() - b.getValue()});
          var score = calculateScore(ws.deck);
          var otherscore;
          console.log("Score for their deck: " + score);
          if(score > 10) {
            console.log("They got too much score!");
            addCard(destringCard(message.card), ws.deck);
            var data = {};
            data.action = "display_message";
            data.message = "Server thinks you got too many points: " + score;
            ws.send(JSON.stringify(data));
            break;
          }

          if(ws == host) {
            otherscore = calculateScore(join.deck);
          }
          else if(ws == join) {
            otherscore = calculateScore(host.deck);
          }
          else {
            console.log("Error. unkown websocket trying to calculate score");
            break;
          }

          if(score == 0) {
            console.log("GIN WOW");
            ws.score += otherscore + 25; 
          }
          else if(score < otherscore) {
            console.log("player that went down had less score");
            ws.score += otherscore - score;
          }
          else {
            console.log("UNDERCUT OOOOOOHHH");
            if(ws == host) {
              join.score += score - otherscore + 25;
            }
            else {
              host.score += score - otherscore + 25;
            }
          }

          if(ws == host) {
            host.turn = 0;
            join.turn = 1;
            hostroundscore = score;
            joinroundscore = otherscore;
          }
          else if(ws == join) {
            join.turn = 0;
            host.turn = 1;
            joinroundscore = score;
            hostroundscore = otherscore;
          }

          var data = {};

          //updates the deck of the player that went down
          data.action = "game";
          data.state = "UPDATE_DECK";
          data.update = "remove";
          data.card = message.card;
          ws.send(JSON.stringify(data));

          data = null;
          data = {};
          data.endofgame = 0;

          if(host.score >= 100 || join.score >= 100) {
            console.log("We have a winner!!");
            data.endofgame = 1;

            state = "NEWGAME";
            break;
          }
          host.ready = 0;
          join.ready = 0;

          data.action = "game";
          data.state = "ROUND_REPORT";
          data.myscore = hostroundscore;
          data.otherscore = joinroundscore;
          data.otherdeck = stringDeck(join.deck);
          host.send(JSON.stringify(data));

          data.otherdeck = null;

          data.myscore = joinroundscore;
          data.otherscore = hostroundscore;
          data.otherdeck = stringDeck(host.deck);
          join.send(JSON.stringify(data));

          state = (data.endofgame ?"NEWGAME" : "ROUND_REPORT");
          break;
        }

        if(deck.length == 0) {
          console.log("out of fresh card and no one went down!");
          var data = {};
          data.action = "display_message";
          data.message = "Winnder of round: none, ran out of cards";
          this.broadcastMessage(JSON.stringify(data));

          this.newround();
        }

        if(ws == host) {
          host.turn = 0;
          join.turn = 1;
        }
        else if(ws == join) {
          join.turn = 0; 
          host.turn = 1;
        }
        else {
          console.log("  Weird Error. WS is neither host nor join");
          break;
        }

        var data = {};
        data.action = "game";
        data.state = "UPDATE_DECK";
        data.update = "remove";
        data.card = message.card;
        ws.send(JSON.stringify(data));
        data = null;

        data = {};
        data.action = "game";
        data.state = "DRAW";
        data.discard = stringCard(topOfDiscard);
        data.remaining = deck.length;
        data.turn = host.turn;
        host.send(JSON.stringify(data));
        data.turn = join.turn;
        join.send(JSON.stringify(data));

        state = "DRAW";
        break;

      case "DRAW":
        console.log("recieved message state is draw");
        var newCard;

        if(!ws.turn) {
          console.log("  it is not this sockets turn");
          var data = {};
          data.action = "display_message";
          data.message = "ITS NOT YOUR TURN FOO!!!";
          ws.send(JSON.stringify(data));
          break;
        }

        if(message.pile == "discard") {
          console.log("user is drawing from discard");
          newCard = topOfDiscard
        }
        else if(message.pile == "new") {
          console.log("user is drawing from new");
          newCard = deck.pop();
        }
        else {
          console.log("Unkown pile user is drawing from");
          break;
        }

        addCard(newCard, ws.deck);

        var data = {};
        data.action = "game";
        data.state = "UPDATE_DECK";
        data.update = "add";
        data.card = stringCard(newCard);
        ws.send(JSON.stringify(data));

        data = null;
        data = {};
        data.action = "game";
        data.state = "DISCARD";
        data.turn = host.turn;
        host.send(JSON.stringify(data));
        data.turn = join.turn;
        join.send(JSON.stringify(data));

        data = null;
        data = {};
        data.action = "display_message";
        data.message = ws.username + " drew from " + message.pile
        this.broadcastMessage(JSON.stringify(data));

        state = "DISCARD";
        break;

      case "ROUND_REPORT":
        console.log("Message recieved state is NEWROUND")
        ws.ready = message.ready;

        if(host.ready && join.ready) {
          console.log("Both are ready. Starting new round.");
          this.newround();
        }
        break;

      case "WAITING":
        console.log("recieved message whilst waiting somehow");
        break;

      default:
        console.log("unkown game state. messed up somewhere: " + state);
        break;
    }
  }

  this.connect = function(ws) {
    if(host == null) {
      host = ws;
      state = "WAITING";
    }
    else if(join == null) {
      join = ws;
    }
    else {
      console.log("The game is full. Send an error message?");
      ws.close();
      return;
    }

    if(host != null && join != null) {
      state = "NEWGAME";
      var data = {};
      data.username1 = host.username;
      data.username2 = join.username;
      data.action = "game";
      data.state = "NEWGAME";
      this.broadcastMessage(JSON.stringify(data));
    }
  }

  this.disconnect = function(ws) {
    if(ws == host) {
      host = join;
      join = null;
    }
    else if(ws == join) {
      join = null;
    }
    else {
      console.log("ERROR DISCONNECTING: probly cause the game is "
       + "full and they arent in it");
      return;
    }

    if(join == null && host == null) {
      return true;
    }
    
    console.log("user disconnect");

    var data = {};
    data.username = "server";
    data.action = "opponent_quit"
    data.message = ws.username + " has left the game.";
    this.broadcastMessage(JSON.stringify(data));

    return false;
  }

  this.broadcastMessage = function(data) {
    if(host != null) 
      host.send(data);
    if(join != null)
      join.send(data);
  }

  this.newround = function() {
    deck = [];
    getCleanDeck(deck);
    shuffle(deck);
    host.deck = [];
    join.deck = [];
    for(var i = 0; i < 10; i ++) {
      host.deck.push(deck.pop());
      join.deck.push(deck.pop());
    }
    if(host.turn) {
      host.deck.push(deck.pop());
    }
    else if(join.turn) {
      join.deck.push(deck.pop());
    }
    else {
      console.log("ERROR: niether host nor join have turn set. Making host go first");
      host.deck.push(deck.pop());
      host.turn = 1;
      join.turn = 0;
    }

    //first send a message updating the decks
    var data = {};
    data.action = "game";
    data.state = "SET_DECK";
    data.deck = stringDeck(host.deck);
    data.myscore = host.score;
    data.otherscore = join.score;
    host.send(JSON.stringify(data));

    data.myscore = join.score;
    data.otherscore = host.score;
    data.deck = stringDeck(join.deck);
    join.send(JSON.stringify(data));
    
    data = null;
    data = {};

    //then send a message setting the turn
    data.action = "game";
    data.state = "DISCARD";
    data.turn = host.turn;
    host.send(JSON.stringify(data));
    data.turn = join.turn;
    join.send(JSON.stringify(data));
    
    state = "DISCARD";
    }
}


console.log("Down here, running");	

var d = [new Card(2, 'spades'), new Card(2, 'hearts'), new Card(2, 'clubs'), new Card(3, 'spades'), new Card(4, 'spades'),
        new Card(5, 'spades'), new Card(7, 'clubs'), new Card(8, 'clubs'), new Card(9, 'clubs'), new Card(10, 'clubs')];
/*var d = [new Card(1, 'clubs'), new Card(3, 'hearts'), new Card(4, 'spades'), new Card(7, 'clubs'),
        new Card(7, 'diamonds'), new Card(10, 'hearts'), new Card(11, 'hearts'), new Card(12, 'hearts'), new Card(13, 'diamonds')]

var d = [new Card(1, 'spades'), new Card(3, 'diamonds'), new Card(4, 'hearts'), new Card(5, 'diamonds'),  
  new Card(5, 'spades'), new Card(6, 'hearts'), new Card(7, 'hearts'), new Card(9, 'hearts'), 
  new Card(11, 'diamonds'), new Card(13, 'spades')]
*/
printDeck(d);
	
console.log("Score: " + calculateScore(d) + "\n");
/*
var clean = [];

for(var i = 0; i < 15; i ++) {
  getCleanDeck(clean);
  shuffle(clean);
  d = null;
  d = [];
  for(var j = 0; j < 10; j ++) {
    d.push(clean.pop());
  }
  d.sort(function(a, b) { return a.getValue() - b.getValue()});
  printDeck(d);
  console.log("Score: " + calculateScore(d) + "\n\n");
}
*/