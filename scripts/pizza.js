const gameContainer = document.getElementById("gameContainer");
const canvas = document.getElementById("gameCanvas");
const timerDisplay = document.getElementById("timerDisplay");
const pizzaCountDisplay = document.getElementById("pizzaCountDisplay");
const blockCountDisplay = document.getElementById("blockCountDisplay");
const positionXDisplay = document.getElementById("positionXDisplay");
const PositionYDisplay = document.getElementById("PositionYDisplay");
const lengthDisplay = document.getElementById("lengthDisplay");
const widthDisplay = document.getElementById("widthDisplay");

const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let trials = 0;
const maxTrials = 15;
const breakDuration = 10; // 30 seconds
let breakTime = breakDuration;
let blockScores = [];
blockScores.push(1);
let onBreak = false;

let data = []; // Data for each frame will be stored here
let frameCount = 0; // Frame counter

let gameStarted = false;
let carMoved = false; 
let blockStartTime = new Date().getTime();
let elapsedTime = 0;
let timerInterval = null;
let bestTime = [];

let speed = (canvas.offsetWidth + canvas.offsetHeight)/2 * 0.004;
const maxBlocks = 15;

const identifier = localStorage.getItem('identifier');
pizzaCountDisplay.textContent = `Pizzas: 0/${maxTrials}`; // Increment the trial count and update the pizza count display to show the total number of trials
blockCountDisplay.textContent = `Block: ${blockScores.length}/${maxBlocks}`; 

let sliceStartTime = null; // Time when the car first hits the pizza slice
const sliceCollectDuration = 500; // Time in ms the car has to stay on the slice to collect it
let sliceTimer = null; // Timer for collecting pizza slice

let previousTimestamp = performance.now();
let frameTime;
let frameRate;

let lastMovementTime = null; // Time of the last car movement

let positionXMet = 100;
let positionYMet = 100;
let lengthMet = 100;
let widthMet = 100;

// The rectangle object
const rectangle = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  width: 50,
  height: 50,
  speed: 6,
};

const target = {
    x: 0,
    y: 0,
    width: 50,
    height: 50,
};

const keys = {};

// Key mappings
const mapping =  { w: 'left', s: 'right', j: 'up', l: 'down' };

function setTargetPosition() {
  target.width = Math.random() * canvas.width/10;
  target.height = Math.random() * canvas.height/10;

  target.x = Math.random() * (canvas.width - target.width);
  target.y = Math.min(Math.random() * (canvas.height - target.height), canvas.height*0.90 - target.height);
}

// Draw the players rectangle on the canvas
function drawRectangle() {

  // Draw the rectangle 
  ctx.beginPath();
  ctx.rect(rectangle.x,rectangle.y, rectangle.width, rectangle.height);
  ctx.strokeStyle = 'red'; 
  ctx.lineWidth = 2;
  ctx.stroke();

}
// Draw the target rectangle on the canvas
function drawTarget() {
  // Draw the rectangle for the target
  ctx.beginPath();
  ctx.rect(target.x, target.y, target.width, target.height);
  ctx.strokeStyle = 'blue'; 
  ctx.lineWidth = 2;
  ctx.stroke();

  if (sliceStartTime !== null) {
    const timePassed = new Date().getTime() - sliceStartTime;
    const rectWidth = (1 - timePassed / sliceCollectDuration) * (target.width * 2); // The width decreases as time passes
    ctx.fillStyle = 'red';
    ctx.fillRect(target.x + target.width/2 - rectWidth / 2, target.y - 20, rectWidth, 10);
  }
}  

function collectTarget() {

  if (positionXMet && positionYMet && lengthMet && widthMet) {
    if (sliceStartTime === null) {
      sliceStartTime = new Date().getTime();
      sliceTimer = setTimeout(() => {
        pizzaCountDisplay.textContent = `Pizzas: ${++trials}/${maxTrials}`; // Increment the trial count and update the pizza count display to show the total number of trials
        setTargetPosition();
        if (trials >= maxTrials) {
          startBreak();
          pizzaCountDisplay.style.backgroundColor = 'red';
          pizzaCountDisplay.style.animation = 'blink 1s infinite';
          timerDisplay.style.backgroundColor = 'red';
          timerDisplay.style.animation = 'blink 1s infinite';
        }
        sliceStartTime = null;
        clearTimeout(sliceTimer);
        sliceTimer = null;
      }, sliceCollectDuration);
    } 
  } else {
    // If the rectangle moves away from the target or changes its dimension before the timer has ended, reset the timer
    sliceStartTime = null;
    if (sliceTimer) {
      clearTimeout(sliceTimer);
      sliceTimer = null;
    }
  }
}

// The conditions that you use to check whether dimensions are met can be adjusted according to your needs
function checkDimensions() {
  positionXMet = Math.abs(rectangle.x - target.x) <= 14;
  positionYMet = Math.abs(rectangle.y - target.y) <= 14;
  lengthMet = Math.abs(rectangle.width - target.width) <= 10;
  widthMet = Math.abs(rectangle.height - target.height) <= 10;
  return [positionXMet, positionYMet, lengthMet, widthMet];
}

function drawDimensionRectangles() {
  const dimensionStatus = checkDimensions();

  if (dimensionStatus[0]) positionXDisplay.style.backgroundColor = 'green';
  else positionXDisplay.style.backgroundColor = 'red';

  if (dimensionStatus[1]) PositionYDisplay.style.backgroundColor = 'green';
  else PositionYDisplay.style.backgroundColor = 'red';

  if (dimensionStatus[2]) lengthDisplay.style.backgroundColor = 'green';
  else lengthDisplay.style.backgroundColor = 'red';

  if (dimensionStatus[3]) widthDisplay.style.backgroundColor = 'green';
  else widthDisplay.style.backgroundColor = 'red';

}

// Key event handlers for ending the break (Space key)
function handleKeyDown(event) {
  keys[event.key] = true;
  if (onBreak && event.key === " " && breakTime <= 0 && blockScores.length - 1 < maxBlocks) {
      onBreak = false;
      breakTime = breakDuration;
      pizzaCountDisplay.style.backgroundColor = '';
      pizzaCountDisplay.style.animation = '';
      timerDisplay.style.backgroundColor = '';
      timerDisplay.style.animation = '';
      blockCountDisplay.textContent = `Block: ${blockScores.length}/${maxBlocks}`; // Increment the trial count and update the pizza count display to show the total number of trials
      blockStartTime = new Date().getTime(); // Reset the game start time
      startTimer(); // Restart the timer
      pizzaCountDisplay.textContent = `Pizzas: 0/${maxTrials}`; // Increment the trial count and update the pizza count display to show the total number of trials
      window.removeEventListener("keydown", handleKeyDown);
      window.addEventListener("keydown", handleKeyDown); // Reattach handleKeyDown event listener
      window.addEventListener("keyup", handleKeyUp);
  }
}

// Key event handler to make sure the car only stops when the key is released
function handleKeyUp(event) {
  keys[event.key] = false;
}

// Move the circle in the specified direction
function moveRectangle(direction) {
  speed = (canvas.offsetWidth + canvas.offsetHeight)/2  * 0.5 * frameTime;;
  switch (direction) {
      case 'left':
          rectangle.x -= speed;
          break;
      case 'right':
          rectangle.x += speed;
          break;
      case 'up':
          rectangle.y -= speed;
          break;
      case 'down':
          rectangle.y += speed;
          break;
  }
  // If both directions are being pressed at the same time, update the direction accordingly

  carMoved = true;
}

// Draw the instructions on the canvas.
function drawInstructions() {
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Match the Rectangles Game", canvas.width / 2, canvas.height / 2 - 180);
  ctx.fillText("Your task is to match the red rectangle as fast as possible to the blue rectangle.", canvas.width / 2, canvas.height / 2 - 130);
  ctx.fillText('Control the position of the rectangle with "w", "s", "j", and "l".', canvas.width / 2, canvas.height / 2 - 80);
  ctx.fillText('Control the width and height with "a", "d", "i", and "k".', canvas.width / 2, canvas.height / 2 - 30);
  ctx.fillText("The faster you are, the better! Can you get the highscore?", canvas.width / 2, canvas.height / 2 + 20);
  // Draw the Start Game button
  ctx.fillText("Press Space to continue", canvas.width / 2, canvas.height / 2 + 100);
  // Draw the car and pizza images
}

// Start the break
function startBreak() {
  onBreak = true;
  stopTimer(); // Stop the timer
  blockScores.push(1);
  trials = 0;
  frameCount = 0;

  sendPizzaDataToServer(data);
  data = []; // Reset data
  const breakInterval = setInterval(() => {
    breakTime -= 1;
    if (breakTime <= 0) {
      clearInterval(breakInterval);
      window.addEventListener("keydown", handleKeyDown);
    }
  }, 1000);
}

// Draw the break info
function drawBreakInfo() {
  // Reset the position, velocity and acceleration
  rectangle.x = canvas.width / 2;
  rectangle.y = canvas.height / 2;
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Time needed to deliver all pizzas: ${formatTime(bestTime.slice(-1))}`, canvas.width / 2, canvas.height / 2 - 50);
  ctx.fillText(`Your fastest deliver time this session: ${formatTime(Math.min(...bestTime))}`, canvas.width / 2, canvas.height / 2);
  ctx.fillText(`Break Time Remaining: ${breakTime}s`, canvas.width / 2, canvas.height / 2 + 50);
  
  if (breakTime <= 0) {
    ctx.fillText("Press Space to continue", canvas.width / 2, canvas.height / 2 + 100);
  }
}

// Draw the break info
function drawFinishedInfo() {
  // Reset the position, velocity and acceleration
  rectangle.x = canvas.width / 2;
  rectangle.y = canvas.height / 2;

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Time needed to deliver all pizzas: ${formatTime(bestTime.slice(-1))}`, canvas.width / 2, canvas.height / 2 - 50);
  ctx.fillText(`Your fastest deliver time this session: ${formatTime(Math.min(...bestTime))}`, canvas.width / 2, canvas.height / 2);
  ctx.fillText(`You finished all blocks for today. See you tomorrow!`, canvas.width / 2, canvas.height / 2 + 50);
  
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function startTimer() {
  timerInterval = setInterval(function() {
    const currentTime = new Date().getTime();
    elapsedTime = Math.floor((currentTime - blockStartTime) / 1000); // Calculate elapsed time in seconds
    timerDisplay.textContent = `Time: ${formatTime(elapsedTime)}`; // Update the timer display
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval); // This will stop the timer
  bestTime.push(elapsedTime); 
  timerInterval = null; // Reset interval
  timerDisplay.textContent = `Time: ${formatTime(elapsedTime)}`; // Update the timer display
  elapsedTime = 0; // Reset elapsed time
}

/*
function sendPizzaDataToServer(data) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/save_pizza_data', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(data));
}
*/
// The main game loop
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  frameCount += 1;
  const currentTimestamp = performance.now();
  const deltaTime = currentTimestamp - previousTimestamp; // Delta time in milliseconds
  
  // Convert deltaTime from milliseconds to seconds before pushing
  frameTime = deltaTime / 1000;
    
  // Save the current timestamp for the next frame
  previousTimestamp = currentTimestamp;
  // Save data if either the car moved, or if it's been at least 6 seconds since the last save
  /*
  if (carMoved || (lastMovementTime && currentTimestamp - lastMovementTime < 6000)) {
    data.push({
      frame: frameCount,
      cursorPositionX: rectangle.x, 
      cursorPositionY: rectangle.y ,
      targetPositionX:target.x,
      targetPositionY: target.y,
      targetNumber: trials,
      blockNumber: blockScores.length,
      identifier: identifier,
      canvasWidth: canvas.offsetWidth,  
      canvasHeight: canvas.offsetHeight,
      date: new Date().toISOString().slice(0, 19).replace('T', ' '), // This line adds a timestamp in SQL datetime format
      frameTime: frameTime
    });
  }
*/
  if (carMoved) {
    lastMovementTime = currentTimestamp;
    carMoved = false; // Reset the carMoved flag after adding data
  }

  if (onBreak) {
    if (blockScores.length > maxBlocks) {
      drawFinishedInfo();
    }
    else {
      drawBreakInfo();
      }
  } else {
      if (trials >= maxTrials) {
          window.removeEventListener("keydown", handleKeyDown);
          window.removeEventListener("keyup", handleKeyUp);
          startBreak();
        }
      if (breakTime < breakDuration) {
          drawBreakInfo();
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Update circle position based on pressed keys and current mapping
          if (keys['w'] && rectangle.x > 0) moveRectangle(mapping.w);
          if (keys['s'] && rectangle.x + rectangle.width < canvas.width) moveRectangle(mapping.s);
          if (keys['j'] && rectangle.y > 0) moveRectangle(mapping.j);
          if (keys['l'] && rectangle.y + rectangle.height < canvas.height) moveRectangle(mapping.l);

          if (keys['a']) {rectangle.height -= 1;}
          if (keys['d'] && rectangle.y + rectangle.height < canvas.height) {rectangle.height += 1;}
          if (keys['i'] && rectangle.x + rectangle.width < canvas.width) {rectangle.width += 1;}
          if (keys['k']) {rectangle.width -= 1;}

           // Apply a minimum limit of 1 to width
          rectangle.width = Math.max(rectangle.width, 1);

          // Apply a minimum limit of 1 to height
          rectangle.height = Math.max(rectangle.height, 1);

          drawDimensionRectangles();
          collectTarget();
          drawRectangle();
          drawTarget();

      }
  }
  requestAnimationFrame(update);
}

// Handle a mouse click on the canvas to start the game loop.
window.addEventListener('keydown', function(event) {
  // Check if the click is within the bounds of the Start Game button.
  if (!gameStarted && event.code === 'Space') {
    gameStarted = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    setTargetPosition();
    update();
    blockStartTime = new Date().getTime();
    startTimer();
  }
});

// Start the first screen. Draw the instructions on the canvas. 
drawInstructions();

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);