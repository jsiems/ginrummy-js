"use strict";

var username;
var opponent_username;
var game;
var ws;
var hand = [];
var myturn = 0;
var state = "NOSTATE";
var cardHTML = "<div id='ID' class='card'><img id='ID_image' class='card_image' alt='card' src='images/cards/ID.png'></div>";
var discardSelection = "";
var playerready = 0;

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

function stringCard(card) {
  var result = "";
  result += card.getValue();
  result += " of ";
  result += card.getSuit();
  return result;
}

function stringDeck(deck) {
  var result = "";
  deck.forEach(function(item) {
    result += item.getValue() + " of " + item.getSuit() + "|";
  });

  return result;
}

function destringDeck(string, deck) {
  if(deck == null) {
    deck = hand;
  }

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
    deck.push(c);
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

function inHand(card, deck) {
  //Unfortunately this variable is required
  //  trying to return out of the for each loop
  //  does not work
  var found = false;
  
  if(deck == null) {
    deck = hand;
  }
  
  deck.forEach(function(item){
    if(item.getValue() == card.getValue() && item.getSuit() == card.getSuit()) {
        found = true;
        return false;
      }
  });
  
  return found;
}

function printDeck(deck) {
  deck.forEach(function(item) {
    console.log("Card: " + item.getValue() + " of " + item.getSuit());
  });
}

function removeCard(card, deck) {
  if(deck == null) {
    deck = hand;
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

function HTMLdeck(deck) {
  if(deck == null) {
    deck = hand;
  }
  var endHTML = "";
  for(var i = 0; i < deck.length; i ++) {
    var currentHTML = cardHTML;
    currentHTML = currentHTML.replace(/ID/g, deck[i].getValue() + "_of_" + deck[i].getSuit());
    endHTML += currentHTML;
  }

  return endHTML;
}

function displayDeck(deck) {
  var endHTML = HTMLdeck(deck);
  $("#playerhand").html("");
  $("#playerhand").html(endHTML);
  
  $(".card").click(function() {
    var id = $(this).attr('id');
    $(".card_image").removeClass("selected");
    $(".card").removeClass("selected");

    if(id == discardSelection)
      return;

    discardSelection = id;
    $("#" + id + "_image").addClass("selected");
    $("#" + id).addClass("selected");
  });
}

function flip(id) {
  //id is the id of the card to be flipped
  id = "#" + id;
  $(id).toggleClass('rotate');
  $(id).on("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function(e) {
    console.log("Flipping back");
    console.log(id + "_image" + id + "_image_back");
    $(id + "_image").css('z-index', $(id + "_image").css('z-index') == 1 ? 0 : 1);
    $(id + "_image_back").css('z-index', $(id + "_image_back").css('z-index') == 1 ? 0 : 1);
    $(id).off()
    $(id).toggleClass("rotate");
  });
}

$(document).ready(function() {
  //Loads the canvas dimensions
	//  otherwise it will look like crap
	var canvas = $("#canvas");
	canvas.attr('width', canvas.width());
	canvas.attr('height', canvas.height());
  
  $("#join_game").click(function() {
    console.log("Join game clicked");
    connect();	
  });
  
  $("#disconnect").click(function() {
    console.log("Disconnect button pressed");
    disconnect();
  });

  $("#ready_button").click(function() {
    console.log("ready button clicked");
    ready();
  });

  $("#discardbutton").click(function() {
    console.log("discard button pushed");
    discard(discardSelection.replace(/_/g, ' '), $("#knockcheckbox").is(":checked"));
  });

  $("#drawnewbutton").click(function() {
    console.log("draw new button pushed");
    draw('new');
  });

  $("#drawdiscardbutton").click(function() {
    console.log("draw discard button pushed");
    draw('discard');
  });
  
  //card click function is in display deck
});

function connect() {
  ws = new WebSocket('ws://' + document.location.hostname, 'ginrummy');

  ws.onopen = function() {
    username = $("#name").val();
    game = $("#room").val();

    $("#launch_screen").css("visibility", "hidden");
    $("#waiting").css("visibility", "visible");
    $("#disconnect").css("visibility", "visible")
    $("#waiting_room").html("Room: " + game);

    var data = {};
    data.action = "connect";
    data.game = game;
    data.username = username;
    ws.send(JSON.stringify(data));
    console.log("Make sure if they are joining and it is full to show error");
    //setInterval(function() { ping(); }, 120000);  dont know if I still need to do this
  }

  ws.onmessage = function(msg) {
    var data = JSON.parse(msg.data);
    switch(data.action) {
      case 'display_message' :
        console.log("Displaying a message. Add a new function to display a message box here!")
        $("#messageBox").html(data.message);
        alert(data.message);
        break;

      case 'opponent_quit' :
        $("#waiting").css("visibility", "visible");
        $("#new_round").css("visibility", "hidden");
        //someting about hiding the playing pane
        //$("#messageBox").html(data.message);
        alert(data.message);
        //add some sort of message popup box function
        break;

      case 'ping' :
        console.log("Ping response: " + data.response);
        break;

      case 'game' :
        processMessage(data);
        break;

      default :
        console.log("unknown action: " + data.action);
        break;
    }
  }
}

function disconnect(msg) {  
  ws.close();
  
  //disconnect_box is the class, disconnect is the id
  $("#disconnect").css("visibility", "hidden");
  $("#waiting").css("visibility", "hidden");
  $("#new_game").css("visibility", "hidden");
  $("#launch_screen").css("visibility", "visible");
  
  hand = [];
  discardSelection = "";
  playerready = 0;
}

function processMessage(msg) {
  state = msg.state;
  switch(state) {
    case "WAITING":
      console.log("message state is waiting");
      break;

    case "NEWGAME":
      console.log("message state is newgame, create appropriate buttons and whatnot");
      hand = [];
      $("#new_game").css("visibility", "visible");
      $("#new_game_player").html(username);
      opponent_username = (username == msg.username1 ? msg.username2 : msg.username1);
      $("#new_game_opponent").html(opponent_username);
      $("#waiting").css("visibility", "hidden");
      break;

    case "SET_DECK":
      //this will run at the beginning of each new round
      $("#new_game").css("visibility", "hidden");
      $("#playing_field").css("visibility", "visible");
      hand = [];
      console.log("state is SET_DECK");
      
      //sets the players hand and then sorts
      destringDeck(msg.deck);
      hand.sort(function(a, b) { return a.getValue() - b.getValue()});
      
      displayDeck();
      break;

    case "UPDATE_DECK":
      console.log("updating card");
      var card = destringCard(msg.card);
      if(msg.update == "remove") {
        console.log("removing card");
        removeCard(card);
      }  
      else if(msg.update == "add") {
        console.log("adding card");
        addCard(card);
      }
      else {
        console.log("unkown message update");
      }

      displayDeck();
      break;

    case "DISCARD":
      console.log("Waiting on discard...");
      myturn = msg.turn;
      if(myturn) {
        console.log("my turn!");
        $("#messageBox").html("Your turn to discard!");
      }
      else {
        $("#messageBox").html("Other players turn to discard!");
      }

      break;

    case "DRAW":
      console.log("Waiting on draw...");
      myturn = msg.turn;
      if(myturn) {
        console.log("my turn!");
        $("#messageBox").html("Your turn to draw!");
      }
      else {
        $("#messageBox").html("Other players turn to draw!");
      }
      var id = msg.discard.replace(/ /g, '_');
      $("#discardpile").html("Discard: " + cardHTML.replace(/ID/g, id));
      break;

    case "ROUND_REPORT":
      console.log("Reporting the round");
      playerready = 0;
      var otherdeck = [];
      destringDeck(msg.otherdeck, otherdeck);

      $("#playing").hide();
      $("#readybutton").html("ready");
      $("#ready").show();
      $("#ready_playerscore").html("Your round score: " + msg.myscore);
      $("#ready_opponentscore").html("Opponent round score: " + msg.otherscore);
      $("#ready_playerhand").html(HTMLdeck());
      $("#ready_opponenthand").html(HTMLdeck(otherdeck));

      if(msg.endofgame)
        $("#messageBox").html("End of the game! Press ready to play again");

      break;

    default:
      console.log("unkown state: " + msg.state);
      break;
  }
}

function ready() {
  console.log("switch the ready state");
  playerready = !playerready;

  if(playerready)
    $("#ready_button").html("Unready");
  else
    $("#ready_button").html("Ready");

  var data = {};
  data.action = "game";
  data.game = game;
  data.ready = playerready;
  ws.send(JSON.stringify(data));
}

function discard(card, knock) {
  //card will be a string, like 6 of hearts
  //knock will be a boolean sotring whether or not they wish to go down
  if(state != "DISCARD") {
    console.log("state is not discard fool!");
    return;
  }
  if(!myturn) {
    console.log("its not your turn fool");
    $("#messageBox").html("It is not your turn!");
    return;
  }
  if(!inHand(destringCard(card))) {
    console.log("That card is not in your hand!!");
    $("#messageBox").html("That card is not in your hand");
    return;
  }

  if(knock) {
    console.log("The player is going down");
    removeCard(destringCard(card));
    var score = calculateScore(hand);
    addCard(destringCard(card));
    console.log("Score for your deck: " + score);
    if(score > 10) {
      console.log("You cannot go down, too many points!");
      $("#messageBox").html("You cannot do down, you have too main points: " + score);
      return;
    }
  }

  console.log(card);

  var data = {};
  data.action = "game";
  data.card = card;
  data.game = game;
  data.knock = knock;
  ws.send(JSON.stringify(data));
}

function draw(pile) {
  //pile can be 'discard' or 'new'
  if(state != "DRAW") {
    console.log("state is not draw fool!");
    return;
  }

  if(!myturn) {
    console.log("its not your turn fool");
    return;
  }

  var data = {};
  data.action = "game";
  data.game = game;
  data.pile = pile;
  ws.send(JSON.stringify(data));
}

function ping() {
  console.log("pinging...");
  var data = {};
  data.action = "ping";
  ws.send(JSON.stringify(data));
}