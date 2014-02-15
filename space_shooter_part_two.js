/***************
 * PART TWO - Create the player controlled ship and it's
 * properties (move and shoot)
 ***************/

/* NOTES TO REMEMBER
 * 1. Drawing to the canvas is expensive. Try to reuse as much as the image as you can for each frame.
 */
 
/* RESOURCES
 * 1. http://gamedev.tutsplus.com/tutorials/implementation/object-pools-help-you-reduce-lag-in-resource-intensive-games/
 * 2. http://gameprogrammingpatterns.com/object-pool.html
 * 3. http://www.slideshare.net/ernesto.jimenez/5-tips-for-your-html5-games
 * 4. http://www.kontain.com/fi/entries/94636/ (quote on performace)
 * 5. http://code.bytespider.eu/post/21438674255/dirty-rectangles
 * 6. http://www.html5rocks.com/en/tutorials/canvas/performance/
 */

	
/**
 * Initialize the Game and start it.
 */
var game = new Game();

function init() {
	if(game.init())
		game.start();
}


/**
 * Define an object to hold all our images for the game so images
 * are only ever created once. This type of object is known as a 
 * singleton.
 */
var imageRepository = new function() {
	// Define images
	this.background = new Image();
	this.spaceship = new Image();
	this.topwall = new Image();
	this.botwall = new Image();

	// Ensure all images have loaded before starting the game
	var numImages = 2;
	var numLoaded = 0;
	function imageLoaded() {
		numLoaded++;
		if (numLoaded === numImages) {
			window.init();
		}
	}
	this.background.onload = function() {
		imageLoaded();
	}
	this.spaceship.onload = function() {
		imageLoaded();
	}
	
	// Set images src
	this.background.src = "imgs/bg.png";
	this.spaceship.src = "imgs/ship.png";
	this.topwall.src = "imgs/wall_top.png";
	this.botwall.src = "imgs/wall_bot.png";
}


/**
 * Creates the Drawable object which will be the base class for
 * all drawable objects in the game. Sets up defualt variables
 * that all child objects will inherit, as well as the defualt
 * functions. 
 */
function Drawable() {
	this.init = function(x, y, width, height) {
		// Defualt variables
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
	
	this.speed = 0;
	this.canvasWidth = 0;
	this.canvasHeight = 0;
	
	// Define abstract function to be implemented in child objects
	this.draw = function() {
	};
	this.move = function() {
	};
}

function Pool(maxSize) {
	var size = maxSize; // Max bullets allowed in the pool
	var pool = [];
	
	/*
	 * Populates the pool array with the given object
	 */
	this.init = function(object) {
		if (object == "wall") {
			for (var i = 0; i < size; i++) {
				// Initalize the object
				var wall = new Wall("wall");
				wall.init(0,0, imageRepository.topwall.width, imageRepository.topwall.height);
				wall.init(0,0, imageRepository.botwall.width, imageRepository.botwall.height);
				pool[i] = wall;
			}
		}
	};
	
	/*
	 * Grabs the last item in the list and initializes it and
	 * pushes it to the front of the array.
	 */
	this.get = function(x, y, speed) {
		if(!pool[size - 1].alive) {
			pool[size - 1].spawn(x, y, speed);
			pool.unshift(pool.pop());
		}
	};
	
	/*
	 * Used for the ship to be able to get two bullets at once. If
	 * only the get() function is used twice, the ship is able to
	 * fire and only have 1 bullet spawn instead of 2.
	 */
	this.getTwo = function(x1, y1, speed1, x2, y2, speed2) {
		if(!pool[size - 1].alive && !pool[size - 2].alive) {
			this.get(x1, y1, speed1);
			this.get(x2, y2, speed2);
		}
	};
	
	/*
	 * Draws any in use Bullets. If a bullet goes off the screen,
	 * clears it and pushes it to the front of the array.
	 */
	this.animate = function() {
		for (var i = 0; i < size; i++) {
			// Only draw until we find a bullet that is not alive
			if (pool[i].alive) {
				if (pool[i].draw()) {
					pool[i].clear();
					pool.push((pool.splice(i,1))[0]);
				}
			}
			else
				break;
		}
	};
}





/**
 * Creates the Background object which will become a child of
 * the Drawable object. The background is drawn on the "background"
 * canvas and creates the illusion of moving by panning the image.
 */
function Background() {
	this.speed = 1; // Redefine speed of the background for panning
	
	// Implement abstract function
	this.draw = function() {
		// Pan background
		this.x -= this.speed;
		this.context.drawImage(imageRepository.background, this.x, this.y);
		
		// Draw another image at the top edge of the first image
		this.context.drawImage(imageRepository.background, this.x + this.canvasWidth, this.y);

		// If the image scrolled off the screen, reset
		if (this.x <= -this.canvasWidth)
			this.x = 0;
	};
}
// Set Background to inherit properties from Drawable
Background.prototype = new Drawable();

function Wall() {
	this.speed = 1; // Redefine speed of the background for panning
	topwall = new Object();
	botwall = new Object();

	this.spawn = function(x)
	{
		this.topwall.x = this.shipCanvas.width;
		this.botwall.x = this.shipCanvas.width;
		this.topwall.y = 0;
		this.botwall.y = this.shipCanvas.height;
			
	}
	// Implement abstract function
	this.draw = function() {
		// Pan background
		this.x -= this.speed;
		this.context.drawImage(imageRepository.topwall, this.topwall.x, this.topwall.y);
		this.context.drawImage(imageRepository.botwall, this.botwall.x, this.botwall.y);
		
		// Draw another image at the top edge of the first image
		//this.context.drawImage(imageRepository.background, this.x + this.canvasWidth, this.y);

		// If the image scrolled off the screen, reset
		if (this.x <= -this.canvasWidth)
			this.x = 0;
	};
}
// Set Background to inherit properties from Drawable
Wall.prototype = new Drawable();


/**
 * Create the Ship object that the player controls. The ship is
 * drawn on the "ship" canvas and uses dirty rectangles to move
 * around the screen.
 */
function Ship() {
	this.speed = 3;
	this.gravity = 2;
	this.velocity = 1;
	this.delta = 0.1;
	var counter = 0;
	var jumping = 0;
	this.wallPool = new Pool(30);
	this.wallPool.init("wall");

	/*
	velocity = velocity + gravity*delta_time/2
position = position + velocity*delta_time
velocity = velocity + gravity*delta_time/2
*/
	
	this.draw = function() {
		this.context.drawImage(imageRepository.spaceship, this.x, this.y);
	};
	this.move = function() {
		counter++;
		this.draw();
		// Determine if the action is move action
		if (KEY_STATUS.space) {
			this.context.clearRect(this.x, this.y, this.width, this.height);
			this.velocity = -6;
			//this.wallPool.get(this.x+this.width/2, this.y+this.height, -2.5);
		}
		this.context.clearRect(this.x, this.y, this.width, this.height);
		this.y += this.velocity;
		this.velocity += (this.gravity * this.delta);
		this.draw();
	};
}
Ship.prototype = new Drawable();


 /**
 * Creates the Game object which will hold all objects and data for
 * the game.
 */
function Game() {
	/*
	 * Gets canvas information and context and sets up all game
	 * objects. 
	 * Returns true if the canvas is supported and false if it
	 * is not. This is to stop the animation script from constantly
	 * running on browsers that do not support the canvas.
	 */
	this.init = function() {
		// Get the canvas elements
		this.bgCanvas = document.getElementById('background');
		this.shipCanvas = document.getElementById('ship');
		this.mainCanvas = document.getElementById('main');
		
		// Test to see if canvas is supported. Only need to
		// check one canvas
		if (this.bgCanvas.getContext) {
			this.bgContext = this.bgCanvas.getContext('2d');
			this.shipContext = this.shipCanvas.getContext('2d');
			this.mainContext = this.mainCanvas.getContext('2d');
		
			// Initialize objects to contain their context and canvas
			// information
			Background.prototype.context = this.bgContext;
			Background.prototype.canvasWidth = this.bgCanvas.width;
			Background.prototype.canvasHeight = this.bgCanvas.height;
			
			Ship.prototype.context = this.shipContext;
			Ship.prototype.canvasWidth = this.shipCanvas.width;
			Ship.prototype.canvasHeight = this.shipCanvas.height;
			

			Wall.prototype.context = this.mainContext;
			Wall.prototype.canvasWidth = this.mainCanvas.width;
			Wall.prototype.canvasHeight = this.mainCanvas.height;
			// Initialize the background object
			this.background = new Background();
			this.background.init(0,0); // Set draw point to 0,0
			
			// Initialize the ship object
			this.ship = new Ship();
			// Set the ship to start near the bottom middle of the canvas
			var shipStartX = this.shipCanvas.width/2 - imageRepository.spaceship.width + 30;
			var shipStartY = this.shipCanvas.height/2 - imageRepository.spaceship.height + 30;
			this.ship.init(shipStartX, shipStartY, imageRepository.spaceship.width,
			               imageRepository.spaceship.height);


			return true;
		} else {
			return false;
		}
	};
	
	// Start the animation loop
	this.start = function() {
		this.ship.draw();
		animate();
	};
}


/**
 * The animation loop. Calls the requestAnimationFrame shim to
 * optimize the game loop and draws all game objects. This
 * function must be a gobal function and cannot be within an
 * object.
 */
function animate() {
	requestAnimFrame( animate );
	game.background.draw();
	game.ship.move();
}


// The keycodes that will be mapped when a user presses a button.
// Original code by Doug McInnes
KEY_CODES = {
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
}

// Creates the array to hold the KEY_CODES and sets all their values
// to false. Checking true/flase is the quickest way to check status
// of a key press and which one was pressed when determining
// when to move and which direction.
KEY_STATUS = {};
for (code in KEY_CODES) {
  KEY_STATUS[KEY_CODES[code]] = false;
}
/**
 * Sets up the document to listen to onkeydown events (fired when
 * any key on the keyboard is pressed down). When a key is pressed,
 * it sets the appropriate direction to true to let us know which
 * key it was.
 */
document.onkeydown = function(e) {
  // Firefox and opera use charCode instead of keyCode to
  // return which key was pressed.
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  if (KEY_CODES[keyCode]) {
	e.preventDefault();
	KEY_STATUS[KEY_CODES[keyCode]] = true;
  }
}
/**
 * Sets up the document to listen to ownkeyup events (fired when
 * any key on the keyboard is released). When a key is released,
 * it sets teh appropriate direction to false to let us know which
 * key it was.
 */
document.onkeyup = function(e) {
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  if (KEY_CODES[keyCode]) {
    e.preventDefault();
    KEY_STATUS[KEY_CODES[keyCode]] = false;
  }
}


/**	
 * requestAnim shim layer by Paul Irish
 * Finds the first API that works to optimize the animation loop, 
 * otherwise defaults to setTimeout().
 */
window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       || 
			window.webkitRequestAnimationFrame || 
			window.mozRequestAnimationFrame    || 
			window.oRequestAnimationFrame      || 
			window.msRequestAnimationFrame     || 
			function(/* function */ callback, /* DOMElement */ element){
				window.setTimeout(callback, 1000 / 180);
			};
})();