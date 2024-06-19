"use strict";
(() => {
    let gameSprites = new Image();
    let spriteSources = [
        "./images/flappy-bird-set.png",
        "./images/flappy-bird-set-2.png",
        "./images/flappy-bird-set-3.png"
    ];
    let spriteSourcesIndex = 0;
    gameSprites.src = spriteSources[spriteSourcesIndex];
    function changeSpriteSource(index) {
        if (index != null) {
            spriteSourcesIndex = index % spriteSources.length;
        }
        else {
            spriteSourcesIndex = (spriteSourcesIndex + 1) % spriteSources.length;
        }
        gameSprites.src = spriteSources[spriteSourcesIndex];
    }
    // Wait for the document to be ready
    document.addEventListener("DOMContentLoaded", function () {
        let engine = new GameEngine({
            aspectRatio: 9 / 16,
            height: 800,
            ignoreCollisions: {
                "ground": new Set(["Pipe"])
            }
        });
        window.engine = engine;
        let scoreSound = new Sound("./audio/sfx_point.wav");
        let hitPipeSound = new Sound("./audio/sfx_hit.wav");
        let gameState = {
            alive: true,
        };
        function bgUpdate(frame) {
            let speed = 6.2;
            this.position.x = -((frame.frameNumber * (speed / 2)) % engine.canvas.width) + (this.name == "bg2" ? (engine.canvas.width * 2 - 1) : engine.canvas.width) - (engine.canvas.width / 2);
        }
        let bgSprite = new Sprite(gameSprites, [{
                sourceX: 0,
                sourceY: 0,
                sourceHeight: 768,
                sourceWidth: 432,
                width: engine.canvas.width,
                height: engine.canvas.height
            }]);
        let background1 = new GameObject({
            update: bgUpdate
        });
        background1.image = bgSprite;
        background1.position = engine.getCenter();
        engine.addGameObject(background1);
        let background2 = new GameObject({
            update: bgUpdate
        });
        background2.image = bgSprite;
        background2.position = engine.getCenter();
        background2.position.x += engine.canvas.width;
        background2.name = "bg2";
        engine.addGameObject(background2);
        let bird = new Bird({
            onOverlap(other) {
                engine.paused = true;
                gameState.alive = false;
                hitPipeSound.play();
            },
        });
        bird.position = engine.getCenter();
        bird.position.x = engine.canvas.width / 4;
        engine.addGameObject(bird);
        document.addEventListener('keydown', handleKey);
        document.addEventListener('touchstart', function (event) {
            handleKey({ key: " " });
        });
        function handleKey(e) {
            switch (e.key) {
                case ' ':
                    if (gameState.alive) {
                        bird.flap();
                    }
                    else {
                        resetGame();
                    }
                    break;
                case 'q':
                    engine.paused = !engine.paused;
                    break;
                case 'd':
                    engine.debug = !engine.debug;
                    break;
                case 'f':
                    engine.disableDrawing = !engine.disableDrawing;
                    if (engine.disableDrawing) {
                        engine.debug = true;
                    }
                    break;
                case 'r':
                    changeSpriteSource();
                    break;
                default:
                    console.log("KEY:", e.key);
            }
        }
        let ground = new GameObject({
            init() {
                this.name = "ground";
                this.tags.add("ground");
                this.position = engine.getCenter();
                this.position.y = engine.canvas.height - 10;
                this.collider = new BoxCollider(engine.canvas.width, 10);
            },
        });
        engine.addGameObject(ground);
        const pipeSpeed = .3;
        const pipeXGap = 400;
        const pipeCount = 5;
        const pipeYRange = 400;
        const pipeYGap = 270;
        const pipeYGapRange = 150;
        let center = engine.getCenter();
        let pipeStart = center.x + pipeXGap;
        let score = 0;
        let highScore = 0;
        let pipes = [];
        function resetGame() {
            changeSpriteSource(0);
            score = 0;
            bird.position = engine.getCenter();
            bird.position.x = engine.canvas.width / 4;
            bird.velocity.y = 0;
            pipes.forEach(pipe => {
                pipe.reset();
            });
            gameState.alive = true;
            engine.paused = false;
        }
        for (let i = 0; i < pipeCount; i++) {
            let y = center.y + (Math.random() * pipeYRange) - (pipeYRange / 2);
            let yGap = pipeYGap + (Math.random() * pipeYGapRange) - (pipeYGapRange / 2);
            let top = engine.addGameObject(new Pipe(0, {
                init() {
                    this.name = this.constructor.name + " Top " + (i + 1);
                    this.position.x = pipeStart + pipeXGap * i;
                    this.position.y = y - (yGap / 2);
                },
            }));
            let bottom = engine.addGameObject(new Pipe(180, {
                init() {
                    this.name = this.constructor.name + " Bottom " + (i + 1);
                    this.position.x = pipeStart + pipeXGap * i;
                    this.position.y = y + (yGap / 2);
                },
            }));
            let manager = engine.addGameObject(new PipeManager(pipeSpeed, center, { x: pipeXGap, y: pipeYGap }, pipeYRange, pipeYGapRange, i, pipeCount, top, bottom, {
                update(frame) {
                    if (this.position.x <= bird.position.x && this.prevPosition.x > bird.prevPosition.x) {
                        score++;
                        scoreSound.play();
                        highScore = Math.max(score, highScore);
                        if (score % 10 == 0) {
                            changeSpriteSource();
                        }
                    }
                },
            }));
            manager.reset();
            pipes.push(manager);
        }
        engine.addGameObject(new GameObject({
            init() {
                this.name = "Score Manager";
                this.position = engine.getCenter();
                this.position.y = 80;
            },
            draw(ctx) {
                // ctx.textAlign = "start";
                // ctx.font = "50px Arial";
                // ctx.fillText(`Score: ${score}`, 10, 80);
                ctx.textAlign = "center";
                ctx.font = "50px Arial";
                ctx.fillStyle = "white";
                ctx.fillText(`${score}`, this.position.x, this.position.y);
                ctx.textAlign = "end";
                ctx.fillText(`High: ${highScore}`, engine.canvas.width - 10, 80);
            },
        }));
        resetGame();
    });
    class PipeManager extends GameObject {
        top;
        bottom;
        index;
        startingPoint;
        gameCenter;
        pipeYRange;
        pipeYGap;
        pipeXGap;
        pipeYGapRange;
        pipeStart;
        constructor(speed, center, pipeGaps, pipeYRange, pipeYGapRange, index, pipeCount, top, bottom, callbacks) {
            super(callbacks);
            this.index = index;
            this.pipeXGap = pipeGaps.x;
            this.pipeYGap = pipeGaps.y;
            this.pipeYRange = pipeYRange;
            this.pipeYGapRange = pipeYGapRange;
            this.startingPoint = ((this.pipeXGap - 1) * pipeCount);
            this.pipeStart = center.x + this.pipeXGap;
            this.gameCenter = center;
            let y = center.y + (Math.random() * this.pipeYRange) - (this.pipeYRange / 2);
            let yGap = this.pipeYGap + (Math.random() * pipeYGapRange) - (this.pipeYGapRange / 2);
            this.top = top;
            this.top.name = this.top.constructor.name + " Top " + (this.index + 1);
            this.top.position.x = this.pipeStart + this.pipeXGap * this.index;
            this.top.position.y = y - (yGap / 2);
            this.bottom = bottom;
            this.bottom.name = this.bottom.constructor.name + " Bottom " + (this.index + 1);
            this.bottom.position.x = this.pipeStart + this.pipeXGap * this.index;
            this.bottom.position.y = y + (yGap / 2);
            this.name = "Pipe Manager " + (this.index + 1);
            this.velocity.x = -speed;
            this.position.x = this.pipeStart + this.pipeXGap * this.index;
            this.position.y = y;
        }
        reset() {
            let y = this.gameCenter.y + (Math.random() * this.pipeYRange) - (this.pipeYRange / 2);
            let yGap = this.pipeYGap + (Math.random() * this.pipeYGapRange) - (this.pipeYGapRange / 2);
            this.position.x = this.pipeStart + this.pipeXGap * this.index;
            this.position.y = y;
            this.top.position.x = this.pipeStart + this.pipeXGap * this.index;
            this.top.position.y = y - (yGap / 2);
            this.bottom.position.x = this.pipeStart + this.pipeXGap * this.index;
            this.bottom.position.y = y + (yGap / 2);
        }
        update(frame) {
            super.update(frame);
            this.top.position.x = this.position.x;
            this.bottom.position.x = this.position.x;
            if (this.position.x + this.top.image.spriteData[0].width / 2 <= 0) {
                let y = this.gameCenter.y + (Math.random() * this.pipeYRange) - (this.pipeYRange / 2);
                let yGap = this.pipeYGap + (Math.random() * this.pipeYGapRange) - (this.pipeYGapRange / 2);
                this.position.x += this.startingPoint;
                this.position.y = y;
                this.top.position.y = y - (yGap / 2);
                this.bottom.position.y = y + (yGap / 2);
                this.top.position.x += this.startingPoint;
                this.bottom.position.x += this.startingPoint;
            }
        }
    }
    class Pipe extends GameObject {
        constructor(rotation, callbacks) {
            super(callbacks);
            this.image = new Sprite(gameSprites, [{
                    sourceX: 433,
                    sourceY: 109,
                    sourceWidth: 77,
                    sourceHeight: 588 - 109,
                    width: 77,
                    height: 588 - 109
                }]);
            this.image.rotation = rotation;
            this.image.offset.y = (this.image.spriteData[0].height / 2) * (rotation === 0 ? -1 : 1);
            this.collider = new BoxCollider(this.image.spriteData[0].width, this.image.spriteData[0].height, this.image.offset);
        }
        update(frame) {
            super.update(frame);
        }
    }
    class Bird extends GameObject {
        gravity;
        flapSound;
        constructor(callbacks) {
            super(callbacks);
            this.isStatic = false;
            this.gravity = -0.001;
            this.image = new Sprite(gameSprites, [{
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
            this.collider = new BoxCollider(this.image.spriteData[0].width * .8, this.image.spriteData[0].height * .8);
            this.flapSound = new Sound("./audio/sfx_wing.wav");
        }
        update(frame) {
            this.velocity.y += this.gravity * frame.deltaTime;
            this.image.rotation = (Math.min(Math.max(this.velocity.y, -0.5), 0.5) + 0.5) / 1 * 90 - 45;
            this.image.spriteIndex = Math.floor(frame.frameNumber / 6) % this.image.spriteData.length; //(this.image.spriteIndex + 1) % this.image.spriteData.length;
            super.update(frame);
            let bb = this.collider.boundingBox(this.position);
            let halfHeight = bb.height * .8;
            if (this.position.y > frame.engine.canvas.height - halfHeight) {
                this.position.y = frame.engine.canvas.height - halfHeight;
            }
            if (this.position.y < 0 + halfHeight) {
                this.position.y = 0 + halfHeight;
            }
        }
        // onOverlap(other: GameObject): void {
        //     console.log("Bird Hit", other.name);
        //     super.onOverlap(other);
        // }
        flap() {
            this.velocity.y = .5;
            this.flapSound.playFromBeginning();
        }
    }
})();
