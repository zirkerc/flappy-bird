"use strict";
(() => {
    // Create Image for the game Sprites
    let gameSprites = new Image();
    gameSprites.src = "../images/flappy-bird-set.png";

    // Wait for the document to be ready
    document.addEventListener("DOMContentLoaded", function () {
        // Create  Game Engine to run everything
        let engine = new GameEngine({
            aspectRatio: 9 / 16,
            height: 800,
        });

        // Background
        engine.addGameObject(new GameObject({
            init() {
                this.name = "Background";
                this.position = engine.getCenter();
                this.image = new Sprite(gameSprites, [{
                    sourceX: 0,
                    sourceY: 0,
                    sourceHeight: 768,
                    sourceWidth: 432,
                    width: engine.canvas.width,
                    height: engine.canvas.height
                }]);
            }
        }));

        // Flappy
        let flappy = engine.addGameObject(new Bird({
            init() {
                this.name = "Flappy";

                // Position flappy on the left side of the screen in the center
                this.position = engine.getCenter();
                this.position.x = engine.canvas.width / 4;
            },
            onOverlap(other) {
                // Pause the game when flappy hits something
                engine.paused = true;
            },
        }));

        // Ground & Ceiling
        engine.addGameObject(new GameObject({
            init() {
                this.name = "Ground";
                this.position = engine.getCenter();
                this.position.y = engine.canvas.height - 10;
                this.collider = new BoxCollider(engine.canvas.width, 10);
            },
        }));
        engine.addGameObject(new GameObject({
            init() {
                this.name = "Ceiling";
                this.position = engine.getCenter();
                this.position.y = 10;
                this.collider = new BoxCollider(engine.canvas.width, 10);
            },
        }));


        // Score

        // TODO: Phase 3 - Add a score counter
        // TODO: Phase 3 - Add a score game object to draw the score

        // Pipes
        let pipeGroups = [];

        // Pipe numbers
        const numberOfPipes = 5;
        const pipeSpeed = .3; // How fast the pipes are moving 
        const pipeXGap = 400; // How much space between the pipes horizontally
        const pipeYRange = 400; // The Range for random pipe the center
        const pipeYGap = 270; // Basic vertical gap between the pipes
        const pipeYGapRange = 150; // Range for random pipe gap 
        const gameCenter = engine.getCenter(); // Center of the play area
        const pipeStart = gameCenter.x + pipeXGap; // Starting position for the pipes
        const startingPoint = ((pipeXGap - 1) * numberOfPipes); // Starting point once the pipe has moved off screen


        // Make a top, bottom, and manager for pipe
        for (let i = 0; i < numberOfPipes; i++) {
            let top = engine.addGameObject(new Pipe(0));
            let bottom = engine.addGameObject(new Pipe(180));

            // The manager moves the top and bottom together and 
            // wraps the pipes around after moving off screen
            let manager = engine.addGameObject(new GameObject({
                init() {
                    // Make the Pipes move
                    this.velocity.x = -pipeSpeed;
                },
                update(frame) {
                    // When the pipe is at the edge, move it back to the starting position
                    repositionIfPastScreenEdge(this, top, bottom);

                    // Move the top and bottom with the manager
                    top.position.x = this.position.x;
                    bottom.position.x = this.position.x;

                    // TODO: Phase 3 - Check if the pipe passed flappy and add 1 to the score
                    // This is a little tricky.  We want to know if we JUST passed flappy
                },
            }));
            // keep track of the pipe so we can reset them later
            pipeGroups.push({ manager, top, bottom });
        }

        function repositionIfPastScreenEdge(manager, top, bottom) {
            // If the pipe is past the edge of the screen reset it to be used again
            if (manager.position.x + top.width / 2 <= 0) {

                // Pick a new y center and gap
                let y = gameCenter.y + (Math.random() * pipeYRange) - (pipeYRange / 2);
                let yGap = pipeYGap + (Math.random() * pipeYGapRange) - (pipeYGapRange / 2);

                // position the pipe back at the start
                manager.position.x += startingPoint;
                manager.position.y = y;

                // position the top and bottom around the center point
                top.position.y = y - (yGap / 2);
                bottom.position.y = y + (yGap / 2);
            }
        }

        /**
         * Reset the game to the starting state
         *
         * Score
         * flappy
         * pipes
         *
         * Start the engine
         */
        function resetGame() {
            // Reset Score

            // TODO: Phase 3 - Reset the score

            // Reset Flappy to the center
            flappy.position.y = gameCenter.y;

            // Reset flappy velocity
            flappy.velocity = Vector.Zero();

            // Reset the pipes starting positions
            pipeGroups.forEach((pipe, index) => {
                let y = gameCenter.y + (Math.random() * pipeYRange) - (pipeYRange / 2);
                let yGap = pipeYGap + (Math.random() * pipeYGapRange) - (pipeYGapRange / 2);

                pipe.manager.position.x = pipeStart + pipeXGap * index;
                pipe.manager.position.y = y;

                pipe.top.position.x = pipeStart + pipeXGap * index;
                pipe.top.position.y = y - (yGap / 2);

                pipe.bottom.position.x = pipeStart + pipeXGap * index;
                pipe.bottom.position.y = y + (yGap / 2);
            });

            // start the engine
            engine.paused = false;
        }

        // Reset everything to start the game
        resetGame();

        // Handle user input
        document.addEventListener('keydown', handleKey);
        document.addEventListener('touchstart', function (event) {
            handleKey({ key: " " });
        });
        function handleKey(e) {
            console.log("KEY:", e.key);
            switch (e.key) {
                case ' ':
                    if (engine.paused) {
                        // If the game isn't running, reset and lets play!
                        resetGame();
                    }
                    else {
                        // If the game is running, flappy needs to flap!
                        flappy.flap();
                    }
                    break;
                case 'd':
                case 'D':
                    // Toggle the engines debug mode
                    engine.debug = !engine.debug;
                    break;
                case 'f':
                case 'F':
                    // Toggle the engines image drawing
                    engine.disableDrawing = !engine.disableDrawing;

                    // Also enable toggle debug mode
                    engine.debug = engine.disableDrawing;
                    break;
            }
        }
    });

    /**
     * Special Class for the Bird
     *
     * Sets up the sprite & collider
     *
     * Adds Gravity & animations
     */
    class Bird extends GameObject {
        gravity;
        constructor(callbacks) {
            super(callbacks);

            // This game object should collide with other game objects
            this.isStatic = false;

            // Set up gravity
            this.gravity = -0.001;

            // Set up sprite positions
            let sprite = new Sprite(gameSprites, [{
                sourceX: 433,
                sourceY: 0,
                sourceWidth: 51,
                sourceHeight: 36,
                width: 51,
                height: 36
            }, {
                sourceX: 433,
                sourceY: 36,
                sourceWidth: 51,
                sourceHeight: 36,
                width: 51,
                height: 36
            }, {
                sourceX: 433,
                sourceY: 72,
                sourceWidth: 51,
                sourceHeight: 36,
                width: 51,
                height: 36
            }
            ]);
            this.image = sprite;

            // Add a collider slightly smaller than the sprite size;
            this.collider = new BoxCollider(sprite.spriteData[0].width * .8, sprite.spriteData[0].height * .8);
        }
        update(frame) {
            // Add acceleration from gravity
            this.velocity.y += this.gravity * frame.deltaTime;

            // Change sprite index to animate the bird
            this.image.spriteIndex = Math.floor(frame.frameNumber / 6) % this.image.spriteData.length;

            // Call the normal GameObject update
            super.update(frame);
        }
        flap() {
            // To flap, set the velocity to make it go up   
            this.velocity.y = -this.gravity * 500;
        }
    }

    /**
     * Class for a pipe
     *
     * Rotates it as needed
     */
    class Pipe extends GameObject {
        width;
        constructor(rotation, callbacks) {
            super(callbacks);

            // Set up the sprite
            let sprite = new Sprite(gameSprites, [{
                sourceX: 433,
                sourceY: 109,
                sourceWidth: 77,
                sourceHeight: 588 - 109,
                width: 77,
                height: 588 - 109
            }]);

            // Rotate the image.  Should be 0 or 180 degrees
            sprite.rotation = rotation;

            // Offset the sprite so the edge of the pipe is right at the position
            sprite.offset.y = (sprite.spriteData[0].height / 2) * (rotation === 0 ? -1 : 1);
            this.image = sprite;
            this.width = sprite.spriteData[0].width;

            // Add a collider for the pipe
            this.collider = new BoxCollider(sprite.spriteData[0].width, sprite.spriteData[0].height, sprite.offset);
        }
    }
})();
