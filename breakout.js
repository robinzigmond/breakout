var running = false;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const width = 1000;
const height = 500;

var paddle = {
    width: 100,
    height: 20,
    speed: 3
};
paddle.startXPos = paddle.xPos = (width - paddle.width)/2;
paddle.yPos = height - paddle.height;

var ball = {
    radius: 10,
    angle: Math.PI/4,
    speed: 3
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
    e.preventDefault();
    if (e.keyCode == 39) {
        paddle.goingEast = true;
    }
    else if (e.keyCode == 37) {
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

var colours = ["red", "green", "blue", "yellow"];

var blocks = {
    rowHeight: 15,
    unitWidth: 20,
    heightOffset: 50
}

// abstract array of arrays to code for blocks
// each inner array codes for a complete row of blocks.
// A string of 1s, 2s etc. represents a complete block,
// which will be coloured according to its number
blocks.pattern = [
    [1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1],
    [3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3],
    [1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1],
    [3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3],
    [1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1],
    [3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3,4,4,4,4,3,3,3,3]
]

function makeBlocks() {
    // use above array to compute actual block positions:
    blocks.data = [];
    blocks.pattern.forEach(function(row, rowNo) {
        var lastEntry;
        row.forEach(function(entry, colNo) {
            if (entry>0) {
                if (entry == lastEntry) {
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
                        stillThere: true // used later to track block hits by the ball
                    });
                }
                lastEntry = entry;
            }
        })
    });
}


function initialise() {
    ball.centre = {
        xPos: paddle.startXPos + paddle.width/2,
        yPos: (height - paddle.height - ball.radius)
    };
    ball.angle = Math.PI/4;
    paddle.xPos = paddle.startXPos;
    paddle.goingEast = paddle.goingWest = false;
    makeBlocks();
}


function clearCanvas() {
    // clears everything from canvas, before redrawing
    ctx.clearRect(0, 0, width, height);
}


function drawStuff() {
    // draw paddle
    ctx.fillStyle = "brown";
    ctx.fillRect(paddle.xPos, paddle.yPos, paddle.width, paddle.height);

    // draw ball
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ball.centre.xPos, ball.centre.yPos, ball.radius, 0, 2*Math.PI);
    ctx.fill();

    // draw blocks
    blocks.data.forEach(function(block) {
        ctx.fillStyle = block.colour;
        ctx.fillRect(block.xPos, block.yPos, block.width, block.height);
    });
}


function moveStuff() {
    // compute new positions of ball and paddle

    // paddle:
    if (paddle.goingEast) {
        paddle.xPos += paddle.speed;
    }
    if (paddle.goingWest) {
        paddle.xPos -= paddle.speed;
    }

    // ball:
    ball.centre.xPos += Math.cos(ball.angle)*ball.speed;
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
            if (ball.angle<0) { 
                // avoid "wobbling" by not changing direction if ball is already going upwards
                ball.angle = ball.normaliseAngle(-ball.angle);
            }
        }
    }

    // bounce off top of screen:
    if (ball.centre.yPos-ball.radius<=0) {
        ball.angle = ball.normaliseAngle(-ball.angle);
    }
    
    // if bottom of screen reached, lose the game!
    if (ball.centre.yPos+ball.radius>=height) {
        alert("game over!");
        quit();
    }

    // bounce off left and right walls:
    if (ball.centre.xPos-ball.radius<=0 || ball.centre.xPos+ball.radius>=width) {
        ball.angle = ball.normaliseAngle(Math.PI - ball.angle);
    }

    // bounce off blocks, and destroy hit block. A complicated business!

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
            }
            else {
                // hitting from right or left (rare):
                ball.angle = ball.normaliseAngle(Math.PI - ball.angle);
            }
        }
    });
    // update array of blocks:
    blocks.data = blocks.data.filter(block => block.stillThere);
}


function gameLoop() {
    if (running) {
        clearCanvas();
        drawStuff();
        moveStuff();
        hitDetection();
        requestAnimationFrame(gameLoop);
    }
}


function startGame() {
    initialise();
    running = true;
    gameLoop();
}


function quit() {
    running = false;
}