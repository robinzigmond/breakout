document.getElementById("level").innerText=currentLevel;
document.getElementById("num-levels").innerText=levels.length;

var running = false;
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
    angle: Math.PI/4,
    speed: 3,
    xAccel: 0,
    paddleHit: false,
    lastPaddleHit: false
};
ball.xSpeed = ball.speed*Math.cos(ball.angle);
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
    ball.speed = 3;
    ball.angle = Math.PI/4;
    ball.xSpeed = ball.speed*Math.cos(ball.angle);
    ball.xAccel = 0;
    paddle.xPos = paddle.startXPos;
    paddle.goingEast = paddle.goingWest = false;
    makeBlocks();
    timeRemaining = (levels[currentLevel-1].time+1)*1000;  // add extra second to get starting time displayed 
                                                           // correctly. It is taken off at the end!
    time = Date.now();
    timer();
}


function clearCanvas() {
    // clears everything from canvas, before redrawing
    ctx.clearRect(0, 0, width, height);
}


function drawStuff() {
    // draw paddle
    ctx.fillStyle = "brown";
    //ctx.strokeStyle = "black";
    ctx.fillRect(paddle.xPos+paddle.height/2, paddle.yPos, paddle.width-paddle.height, paddle.height);
    ctx.beginPath();
    ctx.arc(paddle.xPos+paddle.height/2, paddle.yPos+paddle.height/2, paddle.height/2, Math.PI/2, 3*Math.PI/2);
    //ctx.stroke()
    ctx.fill();
    ctx.beginPath();
    ctx.arc(paddle.xPos+paddle.width-paddle.height/2, paddle.yPos+paddle.height/2, paddle.height/2, -Math.PI/2, Math.PI/2);
    //ctx.stroke();
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
    if (ball.paddleHit) {
        ball.xSpeed += ball.xAccel;
        ball.speed = ball.xSpeed/Math.cos(ball.angle);
        ball.angle = Math.acos(ball.xSpeed/ball.speed) * Math.sign(ball.angle);
    }

    ball.centre.xPos += ball.xSpeed;
    ball.centre.yPos -= Math.sin(ball.angle)*ball.speed;
    
}


function hitDetection() {
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
                ball.angle = ball.normaliseAngle(-ball.angle);
                ball.xSpeed = ball.speed*Math.cos(ball.angle);
            }
            // change x-acceleration of the ball - but only once!
            // magnitude of change based on distance from centre of paddle
            if (!ball.lastPaddleHit) {
                ball.xAccel = paddle.sensitivity*(paddle.xPos - paddle.prevXPos)*
                Math.abs(ball.centre.xPos - (paddle.xPos + paddle.width/2));
            }
        }
        else {
            ball.paddleHit = false;
        }
    }
    else {
        ball.paddleHit = false;
    }

    // bounce off top of screen:
    if (ball.centre.yPos-ball.radius<=0) {
        // more "wobble avoidance":
        if (ball.angle>0) {
            ball.angle = ball.normaliseAngle(-ball.angle);
            ball.xSpeed = ball.speed*Math.cos(ball.angle);
        }
    }
    
    // if bottom of screen reached, lose the game!
    if (ball.centre.yPos+ball.radius>=height) {
        alert("Game over - the ball fell off the bottom!");
        quit();
    }

    // bounce off left and right walls:
    if (ball.centre.xPos-ball.radius<=0) {
        // wobble avoidance:
        if (Math.abs(ball.angle)>Math.PI/2) {
            ball.angle = ball.normaliseAngle(Math.PI - ball.angle);
            ball.xSpeed = ball.speed*Math.cos(ball.angle);
        }
    }
    
    if (ball.centre.xPos+ball.radius>=width) {
        // wobble avoidance
        if (Math.abs(ball.angle)<=Math.PI/2) {
            ball.angle = ball.normaliseAngle(Math.PI - ball.angle);
            ball.xSpeed = ball.speed*Math.cos(ball.angle);
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
            if (ball.centre.yPos<block.yPos || ball.centre.yPos>block.yPos+block.height) {
                // ball hitting from above or below:
                ball.angle = ball.normaliseAngle(-ball.angle);
                ball.xSpeed = ball.speed*Math.cos(ball.angle);
            }
            else {
                // hitting from right or left (rare):
                ball.angle = ball.normaliseAngle(Math.PI - ball.angle);
                ball.xSpeed = ball.speed*Math.cos(ball.angle);
            }
        }
    });

    ball.lastPaddleHit = ball.paddleHit;

    // update array of blocks:
    blocks.data = blocks.data.filter(block => block.stillThere);
    if (blocks.data.length == 0) {
        clearCanvas();
        drawStuff();
        alert("Congratulations - level complete!");
        if (currentLevel == levels.length) {
            alert("Well done, you've completed all currently available levels!");
            quit();
        }
        else {
            currentLevel++;
            initialise();
        }
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
        alert("Game over - time ran out!");
        quit();
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
    initialise();
    running = true;
    gameLoop();
}


function quit() {
    drawStuff();
    running = false;
}