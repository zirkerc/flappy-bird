"use strict";
/**
 * Game Engine
 * Runs each update frame
 *  - Drawing images
 *  - Updating physics (no gravity)
 *  - Collisions
 */
class GameEngine {
    hitObjs;

    /**
     * @returns center of the canvas
     */
    getCenter() {
        return {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };
    }

    // Container for all game objects
    gameObjects;

    // debugging flags
    debug = false;
    disableDrawing = false;

    paused = false;

    // 2D canvas references
    canvas;
    ctx;

    params;

    // Frame stats
    lastFrameTime;
    frameNumber;

    /**
     * Get the existing canvas or create a new one
     * Setup aspect ratio
     * Start the frame loop
     * @param {*} params 
     */
    constructor(params) {
        let canvas = document.getElementsByTagName("canvas")[0];
        // If there isn't a canvas create one;
        if (canvas == null) {
            this.canvas = document.createElement("canvas");
            document.body.appendChild(this.canvas);
        }
        else {
            this.canvas = canvas;
        }

        // store base parameters
        this.params = {
            aspectRatio: 1,
            width: window.innerWidth,
            height: window.innerHeight,
            ...params
        };

        // Calculate aspect ratio as full screen if not provided
        if (params?.aspectRatio == null) {
            this.params.aspectRatio = this.params.width / this.params.height;
        }

        // Set canvas width and height from the aspect ratio
        if (this.params.aspectRatio >= 1) {
            this.canvas.width = this.params.width;
            this.params.height = this.canvas.height = this.canvas.width / this.params.aspectRatio;
        }
        else {
            this.canvas.height = this.params.height;
            this.params.width = this.canvas.width = this.canvas.height * this.params.aspectRatio;
        }
        console.log("Params", this.params);

        // Initialize the base containers and references
        this.ctx = this.canvas.getContext("2d");
        this.gameObjects = [];
        this.frameNumber = 0;
        this.lastFrameTime = Date.now();
        this.hitObjs = new Set();

        // Start the game loop
        this.run();
    }

    /**
     * Run each frame
     * 
     * Calls update for each game object
     * 
     * Draws each game object
     * 
     * Check for collisions between game objects
     */
    run() {
        this.frameNumber++;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.params.backgroundColor) {
            this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = this.params.backgroundColor;
            this.ctx.fill();
        }

        if (!this.paused) {
            // Update Loop
            this.gameObjects.forEach(gameObject => {
                gameObject.update({
                    engine: this,
                    deltaTime: Date.now() - this.lastFrameTime,
                    frameNumber: this.frameNumber
                });
            });
        }

        // Draw stuff
        if (!this.disableDrawing) {
            this.gameObjects.forEach(gameObject => {
                gameObject.draw(this.ctx);
            });
        }

        if (!this.paused) {
            // Physics & Collision
            this.hitObjs = new Set();
            let hits = new Set();
            this.gameObjects.forEach(gameObject => {

                // Only check game objects that have a collider that is enabled and not static
                if (!gameObject.isStatic && gameObject.collider != null && gameObject.enabled && gameObject.collider.enabled) {
                    this.gameObjects.forEach(gameObjectToCheck => {

                        // Check against all other enabled colliders
                        if (gameObjectToCheck.collider != null && gameObjectToCheck.enabled && gameObjectToCheck.collider.enabled && !hits.has(gameObjectToCheck.id + "-" + gameObject.id) && this.overlaps(gameObject, gameObjectToCheck)) {
                            // The 2 hit so mark the interaction
                            hits.add(gameObject.id + "-" + gameObjectToCheck.id);

                            // hold that each object was hit this frame
                            this.hitObjs.add(gameObject);
                            this.hitObjs.add(gameObjectToCheck);

                            // Call onOverlap for the 2 objects
                            gameObject.onOverlap(gameObjectToCheck);
                            gameObjectToCheck.onOverlap(gameObject);
                        }
                    });
                }
            });
        }

        if (this.debug) {
            // Draw Colliders and collisions
            this.gameObjects.filter(go => go.enabled).forEach(go => {
                go.drawDebug(this.ctx, this.hitObjs.has(go));
            });
        }

        this.lastFrameTime = Date.now();

        // Request the next frame
        requestAnimationFrame(this.run.bind(this));
    }

    /**
     * Checks if interactions between these 2 types of objects are ignored 
     * @param {*} gameObject1 
     * @param {*} gameObject2 
     * @returns 
     */
    ignoresCollision(gameObject1, gameObject2) {
        if (this.params.ignoreCollisions == null) {
            // No defintions so they are not ignored
            return false;
        }
        else {
            // Ignored if either objects has tags that are ignoring tags from the other object
            return Array.from(gameObject1.tags).some(t => Array.from(this.params.ignoreCollisions?.[t] ?? []).some(tt => gameObject2.tags.has(tt))) ||
                Array.from(gameObject2.tags).some(t => Array.from(this.params.ignoreCollisions?.[t] ?? []).some(tt => gameObject1.tags.has(tt)));
        }
    }

    /**
     * Checks if the 2 objects overlap each other
     * 
     * @param {*} gameObject1 
     * @param {*} gameObject2 
     * @returns 
     */
    overlaps(gameObject1, gameObject2) {
        if (gameObject1 == gameObject2 || this.ignoresCollision(gameObject1, gameObject2)) {
            // don't overlap if it is the same object or they ignore each other
            return false;
        }
        else {
            // Check if colliders overlap
            // true | false | null
            // null means unhandled
            let overlaps = gameObject1.collider.overlaps(gameObject2.collider);
            if (overlaps == null) {
                // If gameObject1 didn't handle it, see if gameObject2 can
                overlaps = gameObject2.collider.overlaps(gameObject1.collider);
                if (overlaps == null) {
                    // Default, Check if bounding boxes overlap
                    let bb1 = gameObject1.collider.boundingBox(gameObject1.position);
                    let bb2 = gameObject2.collider.boundingBox(gameObject2.position);

                    // See if the 2 bounding boxes overlap
                    overlaps = bb1.y + bb1.height >= bb2.y &&
                        bb1.y <= bb2.y + bb2.height &&
                        bb1.x + bb1.width >= bb2.x &&
                        bb1.x <= bb2.x + bb2.width;
                }
            }
            return overlaps;
        }
    }

    /**
     * Adds a game object to the game engine
     * @param {*} gameObject 
     * @returns 
     */
    addGameObject(gameObject) {
        this.gameObjects.push(gameObject);
        return gameObject;
    }
}

/**
 * Base object type for the engine 
 */
class GameObject {
    static IdCount = 0;

    callbacks;
    enabled;

    // Identifiers
    id;
    name;

    // Starting position and velocity
    position = Vector.Zero();
    velocity = Vector.Zero();
    prevPosition = Vector.Zero();

    // Default collider doesn't collide with anything
    collider = new NoCollider();

    // Image to draw
    image;

    tags;
    isStatic = true;
    initialized;

    constructor(callbacks) {

        // Setup basic values, id, tags
        this.callbacks = callbacks;
        this.id = ++GameObject.IdCount;
        this.name = this.id.toString();
        this.tags = new Set([this.constructor.name]);
        this.enabled = true;
        this.initialized = false;
    }

    /**
     * Runs Physics and frame updates
     * @param {*} frame 
     */
    update(frame) {
        if (this.enabled) {
            // Initialize on the first frame
            if (!this.initialized) {
                this.initialized = true;
                if (this.callbacks?.init) {
                    this.callbacks.init.call(this);
                }
            }

            // Calls update callback
            if (this.callbacks?.update) {
                this.callbacks.update.call(this, frame);
            }
            // Store previous position
            this.prevPosition = { ...this.position };

            // Apply velocity
            this.position.y -= this.velocity.y * frame.deltaTime;
            this.position.x += this.velocity.x * frame.deltaTime;
        }
    }

    /**
     * Draws the image for the game object
     * @param {*} ctx 
     */
    draw(ctx) {
        if (this.enabled) {
            // Call draw callback
            if (this.callbacks?.draw) {
                this.callbacks.draw.call(this, ctx);
            }

            // Draw the object
            if (this.image && this.image.enabled) {
                this.image.draw(this, ctx);
            }
        }
    }

    /**
     * Draw debug data
     * 
     * @param {*} ctx 
     * @param {*} hasOverlapThisFrame 
     */
    drawDebug(ctx, hasOverlapThisFrame) {
        ctx.save();
        ctx.beginPath();

        // Draw a circle at the object position
        ctx.arc(this.position.x, this.position.y, 10, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw the collider's debug
        if (this.collider && this.collider.enabled) {
            this.collider.drawDebug(ctx, this.position, hasOverlapThisFrame);
        }
        ctx.restore();
    }

    /**
     * Called when this object overlaps with another
     * @param {*} other 
     */
    onOverlap(other) {
        if (this.callbacks?.onOverlap) {
            this.callbacks.onOverlap.call(this, other);
        }
    }
}

/**
 * Class to draw a sprite from a sprite sheet
 */
class Sprite {
    // Sprite Sheet
    img;

    // Index for sprite data
    spriteIndex;

    // Array of sprite locations in the sprite sheet
    spriteData;

    // image offset from object position
    offset;

    enabled;

    // Rotation in degrees of the image
    rotation;

    constructor(img, spriteData) {
        this.spriteIndex = 0;
        this.img = img;
        this.spriteData = spriteData;
        this.offset = Vector.Zero();
        this.enabled = true;
        this.rotation = 0;
    }

    /**
     * 
     * @param {*} gameObject 
     * @param {*} ctx 
     */
    draw(gameObject, ctx) {
        // Get the current sprite data
        let data = this.spriteData[this.spriteIndex];
        ctx.save();

        // Move to the correct world position with the offset
        ctx.translate(gameObject.position.x + this.offset.x,
            gameObject.position.y + this.offset.y
        );

        // Rotate the image
        ctx.rotate(-this.rotation * (Math.PI / 180));

        // Draw the image at the center of the location 
        ctx.drawImage(this.img, data.sourceX, data.sourceY, data.sourceWidth, data.sourceHeight, -data.width / 2, -data.height / 2, data.width, data.height);

        ctx.restore();
    }
}

/**
 * 2D vector (x, y)
 */
class Vector {
    static Zero = () => ({ x: 0, y: 0 });
    static One = () => ({ x: 1, y: 1 });
    x = 0;
    y = 0;
}

/**
 * Collider that always return no collision
 */
class NoCollider {
    boundingBox(pos) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    drawDebug(ctx, pos, hasOverlapThisFrame) {
        // do nothing
    }
    overlaps(other) {
        return false;
    }
    enabled = false;
}

/**
 * Collider representing a Axis Aligned Bounding Box
 */
class BoxCollider {
    width;
    height;
    offset;
    enabled;
    constructor(width, height, offset) {
        this.width = width;
        this.height = height;
        this.offset = offset ?? Vector.Zero();
        this.enabled = true;
    }
    drawDebug(ctx, pos, hasOverlapThisFrame) {
        let bb = this.boundingBox(pos);
        ctx.strokeStyle =
            hasOverlapThisFrame
                ? "red" : "green";
        ctx.strokeRect(bb.x, bb.y, bb.width, bb.height);
    }
    overlaps(other) {
        return null;
    }
    boundingBox(pos) {
        return {
            x: (pos.x + this.offset.x) - this.width / 2,
            y: (pos.y + this.offset.y) - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}

/**
 * Class to work with playing sounds
 */
class Sound {
    audio;
    constructor(src) {

        // Load the sound file
        this.audio = document.createElement("audio");
        this.audio.src = src;
        this.audio.setAttribute("preload", "auto");
        this.audio.setAttribute("controls", "none");
        this.audio.style.display = "none";
        document.body.appendChild(this.audio);
    }
    play() {
        // Plays from current position
        // If it has ended it will start from the beginning
        this.audio.play();
    }
    stop() {
        this.audio.pause();
    }
    reset() {
        // Move the audio the the beginning
        this.audio.currentTime = 0;
    }
    playFromBeginning() {
        // Reset and play
        this.audio.currentTime = 0;
        this.play();
    }
}
