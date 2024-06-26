(() => {

    // Create Image for the game Sprites
    let gameSprites = new Image();
    gameSprites.src = "../images/flappy-bird-set.png";

    // TODO: Phase Extra - Change Sprite Sheet
    let spriteSources = [
        "../images/flappy-bird-set.png",
        "../images/flappy-bird-set-3.png"
    ]
    let spriteSourcesIndex = 0;
    gameSprites.src = spriteSources[spriteSourcesIndex];

    function changeSpriteSource(index?: number) {
        if (index != null) {
            spriteSourcesIndex = index % spriteSources.length;
        } else {
            spriteSourcesIndex = (spriteSourcesIndex + 1) % spriteSources.length;
        }
        gameSprites.src = spriteSources[spriteSourcesIndex];
    }
    // Wait for the document to be ready
    document.addEventListener("DOMContentLoaded", function () {
        // Create  Game Engine to run everything
        let engine = new GameEngine({
            aspectRatio: 9 / 16,
            height: 800,
        });

        // TODO: Phase Extra - Sound
        let scoreSound = new Sound("../audio/sfx_point.wav");
        let hitPipeSound = new Sound("../audio/sfx_hit.wav");

        // Background
        // Phase Extra - Make Background Move
        let bgSpeed = 6.2;
        function updateBg(bg: GameObject, frame: UpdateFrame, name: string) {
            bg.position.x = -((frame.frameNumber * (bgSpeed / 2)) % engine.canvas.width) + (name == "bg2" ? (engine.canvas.width * 2 - 1) : engine.canvas.width) - (engine.canvas.width / 2);

        }
        engine.addGameObject(new GameObject({
            init() {
                this.name = "bg1";
                this.position = engine.getCenter();
                this.image = new Sprite(gameSprites, [{
                    sourceX: 0,
                    sourceY: 0,
                    sourceHeight: 768,
                    sourceWidth: 432,
                    width: engine.canvas.width,
                    height: engine.canvas.height
                }])
            },
            update(frame) {
                updateBg(this, frame, "bg1");
            },
        }));

        engine.addGameObject(new GameObject({
            init() {
                this.name = "bg2";
                this.position = engine.getCenter();

                this.position.x += engine.canvas.width;
                this.image = new Sprite(gameSprites, [{
                    sourceX: 0,
                    sourceY: 0,
                    sourceHeight: 768,
                    sourceWidth: 432,
                    width: engine.canvas.width,
                    height: engine.canvas.height
                }])
            },
            update(frame) {
                updateBg(this, frame, "bg2");
            },
        }));


        // Flappy
        let flappy = engine.addGameObject(new Bird({
            init() {
                this.name = "Flappy";

                // Position flappy on the left side of the screen in the center
                this.position = engine.getCenter();
                this.position.x = engine.canvas.width / 4;
            },
            onOverlap(other: GameObject) {
                // TODO: Phase Extra - Coins
                if (other instanceof Modifier) {
                    other.activate();
                } else {
                    // Pause the game when flappy hits something
                    engine.paused = true;

                    // TODO: Phase Extra - Sound
                    hitPipeSound.play();
                }
            },
        }));

        // Ground & Ceiling
        engine.addGameObject(new GameObject({
            init() {
                this.name = "Ground";
                this.position = engine.getCenter();
                this.position.y = engine.canvas.height - 10;
                this.collider = new BoxCollider(engine.canvas.width, 10)
            },
        }));
        engine.addGameObject(new GameObject({
            init() {
                this.name = "Ceiling";
                this.position = engine.getCenter();
                this.position.y = 10;
                this.collider = new BoxCollider(engine.canvas.width, 10)
            },
        }));

        // Score
        let score = 0;

        engine.addGameObject(new GameObject({
            init() {
                this.name = "Score";

                // Position the Score text
                this.position = engine.getCenter();
                this.position.y = 80;
            },
            draw(ctx) {
                // Draw the score text
                ctx.textAlign = "center";
                ctx.font = "50px Arial";
                ctx.fillStyle = "white";
                ctx.fillText(`${score}`, this.position.x, this.position.y);
            },
        }));


        // Pipes

        let pipeGroups: { manager: GameObject, top: GameObject, bottom: GameObject }[] = [];


        // Pipe numbers
        const numberOfPipes = 5;
        const pipeSpeed = .3;   // How fast the pipes are moving 
        const pipeXGap = 400;   // How much space between the pipes horizontally
        const pipeYRange = 400; // The Range for random pipe the center
        const pipeYGap = 270;   // Basic vertical gap between the pipes
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

                    // Check if the pipe passed flappy
                    if (this.position.x <= flappy.position.x && this.prevPosition.x > flappy.prevPosition.x) {
                        score++;

                        // TODO: Phase Extra - Sound
                        scoreSound.play();


                        // TODO: Phase Extra - Change Sprite Sheet
                        if (score % 10 == 0) {
                            changeSpriteSource();
                        }
                    }

                },
            }));

            // keep track of the pipe so we can reset them later
            pipeGroups.push({ manager, top, bottom });
        }

        function repositionIfPastScreenEdge(manager: GameObject, top: Pipe, bottom: Pipe) {
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
                bottom.position.y = y + (yGap / 2)
            }
        }


        let modifiers: Modifier<any>[] = [];
        // TODO: Phase Extra - Coins
        let coins = 0;
        let coinImage = new Image();
        coinImage.src = "../images/coin.png";
        let coinWidth = 50;

        let coin = engine.addGameObject(new Modifier({
            init() {
                this.name = "coin";
                this.velocity.x = -pipeSpeed;

                this.position.y = gameCenter.y;
                //this.position.x = startingPoint + (pipeXGap / 2);
                this.position.x = pipeStart + (pipeXGap * 1.5);
                this.image = new Sprite(coinImage, [{
                    sourceX: 0,
                    sourceY: 0,
                    sourceHeight: 3520,
                    sourceWidth: 3520,
                    height: coinWidth,
                    width: coinWidth
                }]);
                this.collider = new BoxCollider(coinWidth, coinWidth);
            },
            update(frame) {
                this.tryToWrap(coinWidth, gameCenter.y, pipeYRange, startingPoint)

                // If the pipe is past the edge of the screen reset it to be used again
                // if (this.position.x + coinWidth / 2 <= 0) {

                //     // Pick a new y center and gap
                //     let y = gameCenter.y + (Math.random() * pipeYRange) - (pipeYRange / 2);

                //     // position the pipe back at the start
                //     this.position.x += startingPoint;

                //     this.position.y = y;

                //     this.collider.enabled = true;
                //     if (this.image) {
                //         this.image.enabled = true;
                //     }
                // }
            },
            onActivate() {
                coins++;
                this.collider.enabled = false;
                if (this.image) {
                    this.image.enabled = false;
                }
            },
            reset() {
                coins = 0;
                this.position.x = pipeStart + (pipeXGap * 1.5);
                this.show(true);
            },
        }));
        modifiers.push(coin);

        engine.addGameObject(new GameObject({
            init() {
                this.name = "Coins UI";

                // Position the Score text
                this.position = engine.getCenter();
                this.position.y = (this.position.y * 2) - 80;
            },
            draw(ctx) {
                // Draw the score text
                ctx.textAlign = "center";
                ctx.font = "50px Arial";
                ctx.fillStyle = "white";
                ctx.fillText(`${coins}`, this.position.x, this.position.y);
            },
        }));

        // TODO: Phase Extra - Increase Speed
        let speedBoostModifierImage = new Image();
        speedBoostModifierImage.src = "../images/speed-boost.png";
        let speedModifier = engine.addGameObject(new Modifier({
            init() {
                this.velocity.x = -pipeSpeed;

                this.position.y = gameCenter.y;
                this.position.x = pipeStart + (pipeXGap * 3.5);
                this.image = new Sprite(speedBoostModifierImage, [{
                    sourceX: 0,
                    sourceY: 0,
                    sourceHeight: 420,
                    sourceWidth: 417,
                    height: coinWidth,
                    width: coinWidth
                }]);
                this.collider = new BoxCollider(coinWidth, coinWidth);
            },
            update(frame) {
                this.tryToWrap(coinWidth, gameCenter.y, pipeYRange, startingPoint)
            },
            onActivate() {
                pipeGroups.forEach(group => group.manager.velocity.x *= 1.1);
                this.show(false);
            },
            reset() {
                this.position.x = pipeStart + (pipeXGap * 3.5);
                this.show(true);
            }
        }));
        modifiers.push(speedModifier);


        // TODO: Phase Extra - Change Gravity
        let gravityModifierImage = new Image();
        gravityModifierImage.src = "../images/gravity.png";
        let gravityModifier = engine.addGameObject(new Modifier<{ start: number }>({
            init() {
                this.velocity.x = -pipeSpeed;

                this.position.y = gameCenter.y;
                this.position.x = pipeStart + (pipeXGap * 5.5);
                this.image = new Sprite(gravityModifierImage, [{
                    sourceX: 0,
                    sourceY: 0,
                    sourceHeight: 360,
                    sourceWidth: 360,
                    height: coinWidth,
                    width: coinWidth
                }]);
                this.collider = new BoxCollider(coinWidth, coinWidth);
                this.data = {
                    start: 0
                };
            },
            update(frame) {
                this.tryToWrap(coinWidth, gameCenter.y, pipeYRange, startingPoint);
                if (this.data.start + 5000 < Date.now()) {
                    flappy.gravity = -Math.abs(flappy.gravity);

                }
            },
            onActivate() {
                flappy.gravity = Math.abs(flappy.gravity);
                this.data.start = Date.now();
                this.show(false);
            },
            reset() {
                this.position.x = pipeStart + (pipeXGap * 5.5);
                this.show(true);
            }
        }));
        modifiers.push(gravityModifier);

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
            score = 0;

            // Reset Flappy to the center
            flappy.position.y = gameCenter.y;

            // Reset flappy velocity
            flappy.velocity = Vector.Zero();

            // TODO: Phase Extra - Invert Gravity
            flappy.gravity = Math.abs(flappy.gravity) * -1;

            // Reset the pipes starting positions
            pipeGroups.forEach((pipe, index) => {

                let y = gameCenter.y + (Math.random() * pipeYRange) - (pipeYRange / 2);
                let yGap = pipeYGap + (Math.random() * pipeYGapRange) - (pipeYGapRange / 2);

                pipe.manager.velocity.x = -pipeSpeed;
                pipe.manager.position.x = pipeStart + pipeXGap * index;
                pipe.manager.position.y = y;

                pipe.top.position.x = pipeStart + pipeXGap * index;
                pipe.top.position.y = y - (yGap / 2);

                pipe.bottom.position.x = pipeStart + pipeXGap * index;
                pipe.bottom.position.y = y + (yGap / 2)
            });

            // TODO: Phase Extra - Change Sprite Sheet
            changeSpriteSource(0);

            // TODO: Phase Extra - Coins
            // TODO: Phase Extra - Modifiers
            modifiers.forEach(m => m.reset());

            // start the engine
            engine.paused = false;
        }

        // Reset everything to start the game
        resetGame();

        // Handle user input
        document.addEventListener('keydown', handleKey);
        document.addEventListener('touchstart', function (event) {
            handleKey({ key: " " })
        });
        function handleKey(e: { key: string }) {

            console.log("KEY:", e.key);
            switch (e.key) {
                case ' ':
                    if (engine.paused) {
                        // If the game isn't running, reset and lets play!
                        resetGame();
                    } else {
                        // If the game is running, flappy needs to flap!
                        flappy.flap();
                    }
                    break;

                // TODO: Phase Extra - Flappy Noise Dive
                case 'v':
                case 'V':
                    if (!engine.paused) {
                        // If the game is running, flappy needs to dive!
                        flappy.dive();
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
        declare image: Sprite;

        gravity: number;

        // TODO: Phase Extra - Sound
        flapSound: Sound;
        constructor(callbacks?: GameObjectCallbacks) {
            super(callbacks);
            // This game object should collide with other game objects
            this.isStatic = false;

            // Set up gravity
            this.gravity = -0.001;

            // Set up sprite positions
            let sprite = new Sprite(
                gameSprites,
                [{
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
                ]
            );
            this.image = sprite;

            // Add a collider slightly smaller than the sprite size;
            this.collider = new BoxCollider(sprite.spriteData[0].width * .8, sprite.spriteData[0].height * .8);

            // TODO: Phase Extra - Sound
            this.flapSound = new Sound("../audio/sfx_wing.wav");

        }

        update(frame: UpdateFrame): void {
            // Add acceleration from gravity
            this.velocity.y += this.gravity * frame.deltaTime;

            // TODO: Phase Extra - Rotate the image to match it's velocity
            this.image.rotation = (Math.min(Math.max(this.velocity.y, -0.5), 0.5) + 0.5) / 1 * 90 - 45;

            // Change sprite index to animate the bird
            this.image.spriteIndex = Math.floor(frame.frameNumber / 6) % this.image.spriteData.length;

            // Call the normal GameObject update
            super.update(frame);
        }

        flap() {
            // To flap, set the velocity to make it go up   
            this.velocity.y = -this.gravity * 500;

            // TODO: Phase Extra - Sound
            this.flapSound.playFromBeginning();
        }

        // TODO: Phase Extra - Flappy Nose Dive
        dive() {
            // To dive, set the velocity to make it go down   
            this.velocity.y = Math.min(this.velocity.y, this.gravity * 200);
        }
    }

    /**
     * Class for a pipe
     * 
     * Rotates it as needed
     */
    class Pipe extends GameObject {
        width: number;
        constructor(rotation: number, callbacks?: GameObjectCallbacks) {
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

    // TODO: Phase Extra - Modifiers
    class Modifier<T = unknown> extends GameObject {

        activate: (this: Modifier<T>) => void;
        reset: (this: Modifier<T>) => void;
        data: T;
        constructor(callbacks: GameObjectCallbacksTyped<Modifier<T>> & { reset?: (this: Modifier<T>) => void, onActivate?: (this: Modifier<T>) => void }) {
            super(callbacks as GameObjectCallbacks);
            this.activate = callbacks.onActivate ?? (() => { });
            this.reset = callbacks.reset ?? (() => { });
            this.data = {} as T;
        }

        tryToWrap(width: number, centerY: number, yRange: number, startingX: number) {
            // If the pipe is past the edge of the screen reset it to be used again
            if (this.position.x + width / 2 <= 0) {

                // Pick a new y center and gap
                let y = centerY + (Math.random() * yRange) - (yRange / 2);

                // position the pipe back at the start
                this.position.x += startingX;

                this.position.y = y;

                this.show(true);
            }
        }
        show(value: boolean) {
            this.collider.enabled = value;
            if (this.image) {
                this.image.enabled = value;
            }
        }
    }
})();
