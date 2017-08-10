document.getElementById("level").innerText=currentLevel;
document.getElementById("num-levels").innerText=levels.length;

var running = true;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const width = 1000;
const height = 500;

var timeRemaining, time, prevTime;

var paddle = {
    width: 80,
    height: 14,
    speed: 5
};
paddle.sensitivity = 0.05/paddle.width; // constant which determines how hard the paddle "strikes" the ball
paddle.startXPos = paddle.xPos = (width - paddle.width)/2;
paddle.yPos = height - paddle.height;

var ball = {
    radius: 8,
    angle: Math.PI/2,
    speed: 4,
    active: false // used to track whether played has pressed space bar to launch ball at start of level
};
ball.centre = {
    xPos: paddle.startXPos + paddle.width/2,
    yPos: (height - paddle.height - ball.radius)
};
// "helper" method to reduce all angles to the range (-pi, pi]
ball.normaliseAngle = function(angle) {
    if (angle>0) {
        while (angle>Math.PI) {
            angle -= 2*Math.PI;
        }
    }
    if (angle<0) {
        while (angle<=-Math.PI) {
            angle += 2*Math.PI;
        }
    }
    return angle;
}

document.body.addEventListener("keydown", function(e) {
    if (e.keyCode == 39) {
        e.preventDefault();
        paddle.goingEast = true;
    }
    else if (e.keyCode == 37) {
        e.preventDefault();
        paddle.goingWest = true;
    }
});
document.body.addEventListener("keyup", function(e) {
    e.preventDefault();
    if (e.keyCode == 39) {
        paddle.goingEast = false;
    }
    else if (e.keyCode == 37) {
        paddle.goingWest = false;
    }
});


function makeBlocks() {
    // use level array to compute actual block positions:
    blocks.data = [];
    levels[currentLevel-1].blocks.forEach(function(row, rowNo) {
        var lastEntry;
        row.forEach(function(entry, colNo) {
            if (entry>0) {
                if (entry === lastEntry) {
                    // extend previous block's width
                    blocks.data[blocks.data.length-1].width += blocks.unitWidth;
                }
                else {
                    // add new block
                    blocks.data.push({
                        xPos: blocks.unitWidth*colNo,
                        yPos: blocks.rowHeight*rowNo + blocks.heightOffset,
                        width: blocks.unitWidth,
                        height: blocks.rowHeight,
                        colour: colours[entry-1],
                        stillThere: true // used later to track blocks hit by the ball
                    });
                }
            }
            lastEntry = entry;
        })
    });
}


function initialise() {
    document.getElementById("level").innerText=currentLevel;
    ball.centre = {
        xPos: paddle.startXPos + paddle.width/2,
        yPos: (height - paddle.height - ball.radius)
    };
    ball.speed = 4;
    ball.angle = Math.PI/2;
    ball.active = false;
    paddle.xPos = paddle.startXPos;
    paddle.goingEast = paddle.goingWest = false;
    makeBlocks();
    running = true;
    timeRemaining = (levels[currentLevel-1].time+1)*1000;  // add extra second to get starting time displayed 
                                                           // correctly. It is taken off at the end!
    time = Date.now();
    document.body.addEventListener("keydown", function launch(e) {
        // space bar to launch ball
        if (e.keyCode == 32) {
            e.preventDefault();
            ball.active = true;
            document.body.removeEventListener("keydown", launch);
        }
    });
    gameLoop();
}


function clearCanvas() {
    // clears everything from canvas, before redrawing
    ctx.clearRect(0, 0, width, height);
}


function drawStuff() {
    // draw paddle
    ctx.fillStyle = "brown";
    ctx.fillRect(paddle.xPos+paddle.height/2, paddle.yPos, paddle.width-paddle.height, paddle.height);
    ctx.beginPath();
    ctx.arc(paddle.xPos+paddle.height/2, paddle.yPos+paddle.height/2, paddle.height/2, Math.PI/2, 3*Math.PI/2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(paddle.xPos+paddle.width-paddle.height/2, paddle.yPos+paddle.height/2, paddle.height/2, -Math.PI/2, Math.PI/2);
    ctx.fill();

    // draw ball
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ball.centre.xPos, ball.centre.yPos, ball.radius, 0, 2*Math.PI);
    ctx.fill();
    ctx.stroke();

    // draw blocks
    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.5;
    blocks.data.forEach(function(block) {
        ctx.fillStyle = block.colour;
        ctx.fillRect(block.xPos, block.yPos, block.width, block.height);
        ctx.strokeRect(block.xPos, block.yPos, block.width, block.height);
    });
}


function moveStuff() {
    // compute new positions of ball and paddle

    // paddle:
    // first save previous position:
    paddle.prevXPos = paddle.xPos;

    // calculate new positions
    if (paddle.goingEast) {
        paddle.xPos += paddle.speed;
    }
    if (paddle.goingWest) {
        paddle.xPos -= paddle.speed;
    }

    // ball:
    if (ball.active) {
        ball.centre.xPos += Math.cos(ball.angle)*ball.speed;
        ball.centre.yPos -= Math.sin(ball.angle)*ball.speed;
    }
    else {
        ball.centre.xPos = paddle.xPos + (paddle.width - ball.radius)/2; // ball needs to stick to paddle!
    }
    
}


function hitDetection() {
    var hitBlockBelow, hitBlockAbove, hitBlockLeft, hitBlockRight;
    // paddle can't move beyond right/left walls
    if (paddle.xPos<=0) {
        paddle.xPos = 0;
    }
    if (paddle.xPos>=width-paddle.width) {
        paddle.xPos = width - paddle.width;
    }

    // the rest is altering the ball's path - obviously kind of the whole point of the game ;)

    // bottom of screen: bounce off paddle if it's there
    if (ball.centre.yPos+ball.radius>=height-paddle.height) {
        if (paddle.xPos<=ball.centre.xPos+ball.radius && ball.centre.xPos-ball.radius<=paddle.xPos+paddle.width) {
            ball.paddleHit = true;
            if (ball.angle<0) { 
                // avoid "wobbling" by not changing direction if ball is already going upwards

                // now change angle, depending on position on paddle it hits (not very physicallyl realistic,
                // but needed to give player any chance of controlling the ball's path, and usually done)
                // we do this by setting the new angle to be that made from the horizontal by a straight line from
                // a point 10px below the bottom middle of the paddle to the contact point
                // (the very bottom of the ball)
                var paddleCentre = {x: paddle.xPos + paddle.width/2, y: height + 10};
                var contactPoint = {x: ball.centre.xPos, y: ball.centre.yPos + ball.radius};
                var xDist = contactPoint.x - paddleCentre.x;
                var yDist = contactPoint.y - paddleCentre.y;
                var distance = Math.sqrt(xDist*xDist + yDist*yDist);
                ball.angle = Math.acos(xDist/distance);
            }
        }
    }

    // bounce off top of screen:
    if (ball.centre.yPos-ball.radius<=0) {
        // more "wobble avoidance":
        if (ball.angle>0) {
            ball.angle = ball.normaliseAngle(-ball.angle);
        }
    }
    
    // if bottom of screen reached, lose the game!
    if (ball.centre.yPos+ball.radius>=height) {
        running = false;
        bootbox.alert("Game over - the ball fell off the bottom!", initialise);
    }

    // bounce off left and right walls:
    if (ball.centre.xPos-ball.radius<=0) {
        // wobble avoidance:
        if (Math.abs(ball.angle)>Math.PI/2) {
            ball.angle = ball.normaliseAngle(Math.PI - ball.angle);
        }
    }
    
    if (ball.centre.xPos+ball.radius>=width) {
        // wobble avoidance
        if (Math.abs(ball.angle)<=Math.PI/2) {
            ball.angle = ball.normaliseAngle(Math.PI - ball.angle);
        }
    }

    // bounce off blocks, and destroy hit block
    // first we'll run over every block, and check for a hit:
    blocks.data.forEach(function(block) {
        if (ball.centre.xPos+ball.radius>=block.xPos &&
        ball.centre.xPos-ball.radius<=block.xPos+block.width &&
        ball.centre.yPos+ball.radius>=block.yPos &&
        ball.centre.yPos-ball.radius<=block.yPos+block.height) {
            // first make sure the block is removed from the screen!
            block.stillThere = false;
            // now work out new angle for ball. It depends on whether it hit the block from above/below
            // or left/right.
            if ((ball.centre.yPos<block.yPos && !hitBlockAbove)
                || (ball.centre.yPos>block.yPos+block.height && !hitBlockBelow)) {
                // ball hitting from above or below. We use "hitBlockAbove" and "hitBlockBelow" to make
                // sure the ball still bounces after hitting 2 blocks
                ball.angle = ball.normaliseAngle(-ball.angle);
                if (ball.centre.yPos<block.yPos) {
                    hitBlockAbove = true;
                }
                if (ball.centre.yPos>block.yPos+block.height) {
                    hitBlockBelow = true;
                }
            }
            else if ((ball.centre.xPos<block.xPos && !hitBlockLeft)
                || (ball.centre.xPos>block.xPos+block.width && !hitBlockRight)) {
                // hitting from right or left:
                ball.angle = ball.normaliseAngle(Math.PI - ball.angle);
                if (ball.centre.xPos<block.xPos) {
                    hitBlockLeft = true;
                }
                if (ball.centre.xPos>block.xPos+block.width) {
                    hitBlockRight = true;
                }
            }
        }
    });

    // update array of blocks:
    blocks.data = blocks.data.filter(block => block.stillThere);
    if (blocks.data.length == 0) {
        clearCanvas();
        drawStuff();
        running = false;
        bootbox.alert("Congratulations - level complete!", function() {
            if (currentLevel == levels.length) {
                bootbox.alert("Well done, you've completed all currently available levels!", quit);
            }
            else {
                currentLevel++;
                initialise();
            }
        });
    }
}


function timer() {
    prevTime = time;
    time = Date.now();
    timeRemaining -= (time - prevTime);
    if (timeRemaining<1000) {
        ctx.font = "24px Arial";
        var minsLeft = Math.floor(timeRemaining/60000);
        var leftoverSeconds = Math.floor((timeRemaining - minsLeft*60000)/1000);
        var timeString = minsLeft + ":" + (Math.floor(leftoverSeconds)/100).toFixed(2).slice(2);
        ctx.fillStyle = "red";
        ctx.fillText(timeString, 30, 30);
        running = false;
        bootbox.alert("Game over - time ran out!", initialise);
    }
    else {
        ctx.font = "24px Arial";
        var minsLeft = Math.floor(timeRemaining/60000);
        var leftoverSeconds = Math.floor((timeRemaining - minsLeft*60000)/1000);
        var timeString = minsLeft + ":" + (leftoverSeconds/100).toFixed(2).slice(2);
        if (timeRemaining < 31000) {
            ctx.fillStyle = "red";
        }
        else {
            ctx.fillStyle = "black";
        }
        ctx.fillText(timeString, 30, 30);
    }
}


function gameLoop() {
    if (running) {
        clearCanvas();
        timer();
        if (running) {
            drawStuff();
            moveStuff();
            hitDetection();
            requestAnimationFrame(gameLoop);
        }
    }
}


function startGame() {
    currentLevel = 1;
    makeBlocks();
    timeRemaining = (levels[currentLevel-1].time+1)*1000;
    time = Date.now();
    initialise();
}


function quit() {
    drawStuff();
    running = false;
}


function helpText() {
    bootbox.alert({
        message: "<p>This is a version of the classic Breakout game. The object is simply to clear the screen of all the coloured blocks before the time runs out.</p>"
        + "<p>At the start of each level, press the <strong>space bar</strong> to launch the ball upwards - after first moving the paddle to your preferred starting location.</p>"
        + "<p>After that, the only controls are the <strong>left</strong> and <strong>right arrow keys</strong>, which move the paddle left and right along the bottom of the screen. If the ball hits the bottom, you lose.</p>"
        + "<p>The angle that the ball bounces back at depends on which part of the paddle it hits - the nearer the edge, the sharper the angle.</p>"
        + "<p>And that's really all there is to it!</p>"
    });
}