"use strict";

//global CONSTANTS
var MAXHANDWIDTH = 800;
var CARDWIDTH = 80;
var CARDHEIGHT = 116;

//global VARIABLES
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
var stage = null;

$(document).ready(function() {
    //Loads the canvas dimensions
        //    otherwise it will look like crap
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
    
    stage = new createjs.Stage("canvas");
    createjs.Ticker.setFPS(60);
        createjs.Ticker.addEventListener("tick", stage);
    
    //card click function is in display deck
    // TAKE THIS OUT TO STOP THE AUTO CONNECTING!!!
    console.log("Autoconnecting...")
    connect();
});

//Class storing the location and value of a card
function Card(valueInput, suitInput) {
    var suit = suitInput;
    var value = Number(valueInput);
    var counted = true;
    var scoringMode = "";
    var ignored = false;    //whether or not conflicts should be ignored for this card
    
    //drawing variables
    var graphics = null;
    var side = "front";
    var image_string = "";

    //Value accessor functions
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
    
    //Drawing accessor functions
    this.getGraphics = function() {return graphics};
    this.setGraphics = function(g) {graphics = g};
    this.getSide = function() {return side};
    this.setSide - function(s) {side = s};
    this.getImageString = function() {return image_string};
    this.setImageString = function(s) {image_string = s}
    
    //drawing functions
    //moves the center of a card to the given location with the given rotation
    //  x = x location of top left corner
    //  y = y location of top left corner
    //  r = rotation on 2d plane
    //  s = back or front
    //  t = time in ms
    this.moveTo = function(xin, yin, rin, s, time) {
        //variables
        // nx, ny = new x and new y
        // t = theta, used to calculate nx and ny
        // cw and ch = smaller variable names for global constants
        var nx, ny, t, cw, ch;
        cw = CARDWIDTH;
        ch = CARDHEIGHT;
        
        //rotate input angle to be between 0 and 360
        while(rin >= 360) {
            rin -= 360;
        }
        while(rin < 0) {
            rin += 360;
        }
        
        //calculate where to place actual x and y based on center input and angle input
        if(rin >= 0 && rin <= 90) {
            t = rin;
            t = t * Math.PI / 180;
            nx = xin - (ch * Math.sin(t) + cw * Math.cos(t)) / 2 + ch * Math.sin(t);
            ny = yin - (ch * Math.cos(t) + cw * Math.sin(t)) / 2;
        }
        else if(rin > 90 && rin <= 180) {
            t = rin - 90;
            t = t * Math.PI / 180;
            nx = xin + (cw * Math.sin(t) + ch * Math.cos(t)) / 2;
            ny = yin - (cw * Math.cos(t) + ch * Math.sin(t)) / 2 + ch * Math.sin(t);
        }
        else if(rin > 180 && rin <= 270) {
            t = rin - 180;
            t = t * Math.PI / 180;
            nx = xin - (ch * Math.sin(t) + cw * Math.cos(t)) / 2 + cw * Math.cos(t);
            ny = yin + (ch * Math.cos(t) + cw * Math.sin(t)) / 2;
        }
        else if(rin > 270 && rin <= 360) {
            t = rin - 270;
            t = t * Math.PI / 180;
            nx = xin - (cw * Math.sin(t) + ch * Math.cos(t)) / 2;
            ny = yin - (cw * Math.cos(t) + ch * Math.sin(t)) / 2 + cw * Math.cos(t);
        }
        
        
        //New tween instance from graphics object
        var anim = createjs.Tween.get(graphics);
        
        //if not flipping just move the card
        if(s == side) {
            anim.to({x: nx, y: ny, rotation: rin}, time, createjs.Ease.getPowInOut(1));
        }
        //flip the card
        else {
            console.log("Graphics X: " + graphics.x);
            anim.to({ x: (graphics.x + nx) / 2 + graphics.image.width / 2, 
                      y: (graphics.y + ny) / 2,
                      rotation: (graphics.rotation + rin) / 2,
                      scaleX: 0 }, 
                    time / 2, 
                    createjs.Ease.getPowInOut(1));
            anim.call(halfMoveComplete);
            
            //Called at end of half of a move
            function halfMoveComplete() {
                if(side == "front") {
                    $(graphics.image).attr('src', 'images/cards/cardback.png');
                    side = "back";
                }
                else {
                    $(graphics.image).attr('src', image_string);
                    side = "front";
                }
                anim = createjs.Tween.get(graphics);
                anim.to({ x: nx, 
                          y: ny,
                          rotation: rin,
                          scaleX: 1 }, 
                        time / 2, 
                        createjs.Ease.getPowInOut(1));
            }
        }
    }
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

        while((deck[i].getSuit() == deck[nextLoc].getSuit() 
            && deck[i].getValue() + (nextLoc - i - skipped) == deck[nextLoc].getValue())
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
                //    the current cards value and the last value in the run
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
    //    trying to return out of the for each loop
    //    does not work
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

function displayDeck(deck) {
    //DRAW the players hand
    deck = deck || hand;
    var canvaswidth = $("#canvas").css("width").replace("px", "");
    var canvasheight = $("#canvas").css("height").replace("px", "");
    console.log("CONSTANTS:\n\tcanvaswidth: " + canvaswidth + "\n\tcanvasheight: " + canvasheight + "\n\tcw: " + CARDWIDTH + "\n\tch: " + CARDHEIGHT)

    //initial and final angle (theta)
    //    between card and edge of canvas
    //    some need degrees, some need radians
    //    tid == theta initial degrees
    //    tfd == theta final degrees
    //    TI AND TF MUST BE EQUAL
    var tid = 30;
    var tfd = 180 - tid;
    var ti = tid * Math.PI / 180;
    var tf = tfd * Math.PI / 180;
    
    var A = 100;     //amplitude of y curvature
    var xw = canvaswidth - CARDWIDTH * Math.sin(tf);    //width of x coordinates
    var yf = CARDWIDTH * Math.cos(ti); //final y distance above y initial
    
    var p = 5
    
    for(var i = 0; i < deck.length; i ++) {
        var cardname = deck[i].getValue() + "_of_" + deck[i].getSuit();
        deck[i].setImageString("images/cards/" + cardname + ".png");

        var card = new createjs.Bitmap("images/cards/" + cardname + ".png");
        
        //x is a linear function from 0 to almost edge of canvas
        //card.x = i / (deck.length - 1) * (canvaswidth - CARDWIDTH * Math.sin(ti));
        //card.x = xw / 2 - xw / 2 * Math.cos(2 * Math.PI / (2 * (deck.length - 1)) * i)
        card.x = -2 * xw / Math.pow(deck.length - 1, 3) * Math.pow(i, 3) + 3 * xw / Math.pow(deck.length - 1, 2) * Math.pow(i, 2)
        
        //angle of rotation, AKA theta, used for card rotation
        var t = ((tf - ti) / (xw)) * card.x + ti;
        
        card.rotation = (t - Math.PI / 2) * 180 / Math.PI;
        
        //y is a sin function of x
        card.y = canvasheight - (A * Math.sin(2 * Math.PI / (2 * xw) * card.x) + CARDHEIGHT * Math.sin(ti) + yf / xw * card.x);
        
        card.cardname = cardname;
        stage.addChild(card);
        deck[i].setGraphics(card);
        
        console.log("CARD: " + cardname + "\n\tx: " + card.x + "\n\ty: " + card.y + "\n\trotation: " + t * 180 / Math.PI)
        
        $(card).click(function(){
            //use THIS instead of card in this function
            //    if you use 'card' where 'this' is, 
            //    all clicks on any card only effect the 
            //    last card that was added to the stage
            console.log("Card clicked!");
            console.log("Send a message to server letting it know a card was selected!!");
            console.log("Cardname: " + this.cardname);
            discardSelection = this.cardname;
            createjs.Tween.get(this, {loop: false})
                .to({rotation: -1 * this.rotation}, 500, createjs.Ease.getPowInOut(1))
        });
    }

    //ADD THE MIDDLE DECK TO THE SCREEN    ************
    // (deck and discard piles)

    //draw decks y buffer (space between players hands and the decks)
    var dby = (canvasheight - 3 * CARDHEIGHT) / 2;
    var dy = CARDHEIGHT + dby;

    //space between the two decks is less than space between decks
    //    and the canvas border
    var dbx1 = (canvaswidth - 2 * CARDWIDTH) / 5;
    var dbx2 = 2 * dbx1;

    var deck = new createjs.Bitmap("images/cards/cardback.png");
    var discard = new createjs.Bitmap("images/cards/cardback.png");

    deck.x = dbx2;
    deck.y = dy;
    discard.x = dbx1 + CARDWIDTH + dbx2;
    discard.y = dy;

    stage.addChild(deck);
    stage.addChild(discard);

    
    /*
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
    */
}

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
        //setInterval(function() { ping(); }, 120000);    dont know if I still need to do this
        console.log("THE GAME REDRAWS EVERYTHING ON RECONNECT");
        console.log("Find out a way to clear the screen when disconnecting");
        //Josh, you might be wondering:
        //        how did I discover this?
        //    well let me do you a knowledge
        //    on mobile, start game in one orientation
        //    disconnect, rotate screen
        //    then reconnect. Two copies of cards on screen!!!
        //    also happens if player disconnects, reconnects without letting other player hit ok on the alert
        //-- Josh
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
                $("#playing_field").css("visibility", "hidden");
                playerready = 0;
                $("#ready_button").html("Unready");
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
    $("#playing_field").css("visibility", "hidden");
    
    hand = [];
    discardSelection = "";
    playerready = 0;
    $("#ready_button").html("Unready");
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
            $("#ready_button").html("Ready");
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