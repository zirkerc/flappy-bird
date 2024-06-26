"use strict";
(() => {
    let gameSprites = new Image();
    gameSprites.src = "./images/flappy-bird-set.png";
    // Wait for the document to be ready
    document.addEventListener("DOMContentLoaded", function () {
        let engine = new GameEngine({
            aspectRatio: 9 / 16,
            height: 800,
        });
        window.engine = engine;
        let scoreSound = new Sound("./audio/sfx_point.wav");
        let hitPipeSound = new Sound("./audio/sfx_hit.wav");
        let gameState = {
            alive: true,
        };
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
        let flappy = engine.addGameObject(new Bird({
            init() {
                this.name = "Flappy";
                this.position = engine.getCenter();
                this.position.x = engine.canvas.width / 4;
            },
            onOverlap(other) {
                engine.paused = true;
                gameState.alive = false;
                hitPipeSound.play();
            },
        }));
        document.addEventListener('keydown', handleKey);
        document.addEventListener('touchstart', function (event) {
            handleKey({ key: " " });
        });
        function handleKey(e) {
            switch (e.key) {
                case ' ':
                    if (gameState.alive) {
                        flappy.flap();
                    }
                    else {
                        resetGame();
                    }
                    break;
                case 'Q':
                case 'q':
                    engine.paused = !engine.paused;
                    break;
                case 'D':
                case 'd':
                    engine.debug = !engine.debug;
                    break;
                case 'F':
                case 'f':
                    engine.disableDrawing = !engine.disableDrawing;
                    if (engine.disableDrawing) {
                        engine.debug = true;
                    }
                    break;
                default:
                    console.log("KEY:", e.key);
            }
        }
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
        const pipeSpeed = .3;
        const pipeXGap = 400;
        const pipeCount = 5;
        const pipeYRange = 400;
        const pipeYGap = 270;
        const pipeYGapRange = 150;
        let center = engine.getCenter();
        let score = 0;
        let pipes = [];
        function resetGame() {
            score = 0;
            flappy.position = engine.getCenter();
            flappy.position.x = engine.canvas.width / 4;
            flappy.velocity.y = 0;
            pipes.forEach(pipe => {
                pipe.reset();
            });
            gameState.alive = true;
            engine.paused = false;
        }
        for (let i = 0; i < pipeCount; i++) {
            let top = engine.addGameObject(new Pipe(0));
            let bottom = engine.addGameObject(new Pipe(180));
            let manager = engine.addGameObject(new PipeManager(pipeSpeed, center, { x: pipeXGap, y: pipeYGap }, pipeYRange, pipeYGapRange, i, pipeCount, top, bottom, {
                update(frame) {
                    if (this.position.x <= flappy.position.x && this.prevPosition.x > flappy.prevPosition.x) {
                        score++;
                        scoreSound.play();
                    }
                },
            }));
            pipes.push(manager);
        }
        engine.addGameObject(new GameObject({
            init() {
                this.name = "Score";
                this.position = engine.getCenter();
                this.position.y = 80;
            },
            draw(ctx) {
                ctx.textAlign = "center";
                ctx.font = "50px Arial";
                ctx.fillStyle = "white";
                ctx.fillText(`${score}`, this.position.x, this.position.y);
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
            this.top = top;
            this.bottom = bottom;
            this.velocity.x = -speed;
            this.reset();
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
            if (this.position.x + this.top.width / 2 <= 0) {
                let y = this.gameCenter.y + (Math.random() * this.pipeYRange) - (this.pipeYRange / 2);
                let yGap = this.pipeYGap + (Math.random() * this.pipeYGapRange) - (this.pipeYGapRange / 2);
                this.position.x += this.startingPoint;
                this.position.y = y;
                this.top.position.y = y - (yGap / 2);
                this.bottom.position.y = y + (yGap / 2);
            }
            this.top.position.x = this.position.x;
            this.bottom.position.x = this.position.x;
        }
    }
    class Pipe extends GameObject {
        width;
        constructor(rotation, callbacks) {
            super(callbacks);
            let sprite = new Sprite(gameSprites, [{
                    sourceX: 433,
                    sourceY: 109,
                    sourceWidth: 77,
                    sourceHeight: 588 - 109,
                    width: 77,
                    height: 588 - 109
                }]);
            sprite.rotation = rotation;
            sprite.offset.y = (sprite.spriteData[0].height / 2) * (rotation === 0 ? -1 : 1);
            this.width = sprite.spriteData[0].width;
            this.collider = new BoxCollider(sprite.spriteData[0].width, sprite.spriteData[0].height, sprite.offset);
            this.image = sprite;
        }
    }
    class Bird extends GameObject {
        gravity;
        flapSound;
        constructor(callbacks) {
            super(callbacks);
            this.isStatic = false;
            this.gravity = -0.001;
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
            this.collider = new BoxCollider(sprite.spriteData[0].width * .8, sprite.spriteData[0].height * .8);
            this.image = sprite;
            this.flapSound = new Sound("./audio/sfx_wing.wav");
        }
        update(frame) {
            this.velocity.y += this.gravity * frame.deltaTime;
            this.image.rotation = (Math.min(Math.max(this.velocity.y, -0.5), 0.5) + 0.5) / 1 * 90 - 45;
            this.image.spriteIndex = Math.floor(frame.frameNumber / 6) % this.image.spriteData.length; //(this.image.spriteIndex + 1) % this.image.spriteData.length;
            super.update(frame);
        }
        flap() {
            this.velocity.y = -this.gravity * 500;
            this.flapSound.playFromBeginning();
        }
        drawDebug(ctx, hasOverlapThisFrame) {
            super.drawDebug(ctx, hasOverlapThisFrame);
            let velY = this.velocity.y;
            let velX = .3;
            let posY = this.position.y;
            let posX = this.position.x;
            ctx.beginPath();
            ctx.lineJoin = "bevel";
            ctx.moveTo(posX, posY);
            let p = [{ posX, posY }];
            for (let i = 0; i < 100; i++) {
                let dt = 10;
                velY += dt * this.gravity;
                posY -= dt * velY;
                posX += dt * velX;
                ctx.lineTo(posX, posY);
                p.push({ posX, posY });
            }
            ctx.stroke();
        }
    }
})();
