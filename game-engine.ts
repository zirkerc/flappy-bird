interface GameEngineParameters {
    aspectRatio: number;
    width: number;
    height: number;
    backgroundColor?: string;
    ignoreCollisions?: Record<string, Set<string>>;
}
class GameEngine {
    hitObjs: Set<GameObject>;
    getCenter(): Vector {
        return {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        }
    }
    gameObjects: GameObject[]


    debug: boolean = false;
    disableDrawing: boolean = false;
    paused: boolean = false;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    params: GameEngineParameters;
    lastFrameTime: number;
    frameNumber: number;
    constructor(params?: Partial<GameEngineParameters>) {
        let canvas = document.getElementsByTagName("canvas")[0];

        // If there isn't a canvas create one;
        if (canvas == null) {
            this.canvas = document.createElement("canvas");
            document.body.appendChild(this.canvas);
        } else {
            this.canvas = canvas;
        }

        this.params = {
            aspectRatio: 1,
            width: window.innerWidth,
            height: window.innerHeight,
            ...params
        }
        // Calculate aspect ratio as full screen if not provided
        if (params?.aspectRatio == null) {
            this.params.aspectRatio = this.params.width / this.params.height;
        }

        // Set canvas width and height from the aspect ratio
        if (this.params.aspectRatio >= 1) {
            this.canvas.width = this.params.width;
            this.params.height = this.canvas.height = this.canvas.width / this.params.aspectRatio;
        } else {
            this.canvas.height = this.params.height;
            this.params.width = this.canvas.width = this.canvas.height * this.params.aspectRatio;
        }

        console.log("Params", this.params);
        this.ctx = this.canvas.getContext("2d")!;



        this.gameObjects = [];
        this.frameNumber = 0;
        this.lastFrameTime = Date.now();
        this.hitObjs = new Set();
        this.run();
    }

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
            this.hitObjs = new Set<GameObject>();
            let hits = new Set<string>();
            this.gameObjects.forEach(gameObject => {
                if (!gameObject.isStatic && gameObject.collider != null && gameObject.enabled && gameObject.collider.enabled) {
                    this.gameObjects.forEach(gameObjectToCheck => {
                        if (gameObjectToCheck.collider != null && gameObjectToCheck.enabled && gameObjectToCheck.collider.enabled && !hits.has(gameObjectToCheck.id + "-" + gameObject.id) && this.overlaps(gameObject, gameObjectToCheck)) {
                            hits.add(gameObject.id + "-" + gameObjectToCheck.id);
                            this.hitObjs.add(gameObject);
                            this.hitObjs.add(gameObjectToCheck);
                            //console.log("Collision:", gameObject.name, gameObjectToCheck.name);
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

        requestAnimationFrame(this.run.bind(this))
    }

    ignoresCollision(gameObject1: GameObject, gameObject2: GameObject) {

        if (this.params.ignoreCollisions == null) {
            return false;
        } else {
            return Array.from(gameObject1.tags).some(t => Array.from(this.params.ignoreCollisions?.[t] ?? []).some(tt => gameObject2.tags.has(tt))) ||
                Array.from(gameObject2.tags).some(t => Array.from(this.params.ignoreCollisions?.[t] ?? []).some(tt => gameObject1.tags.has(tt)))
        }
    }

    overlaps(gameObject1: GameObject, gameObject2: GameObject) {
        if (gameObject1 == gameObject2 || this.ignoresCollision(gameObject1, gameObject2)) {
            return false;
        } else {
            let overlaps = gameObject1.collider!.overlaps(gameObject2.collider!);
            if (overlaps == null) {
                overlaps = gameObject2.collider!.overlaps(gameObject1.collider!);
                if (overlaps == null) {
                    let bb1 = gameObject1.collider!.boundingBox(gameObject1.position);
                    let bb2 = gameObject2.collider!.boundingBox(gameObject2.position);
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

    addGameObject<T extends GameObject>(gameObject: T) {
        this.gameObjects.push(gameObject);
        return gameObject;
    }
}

interface GameObjectCallbacks {
    update?: (this: GameObject, frame: UpdateFrame) => void;
    draw?: (this: GameObject, ctx: CanvasRenderingContext2D) => void;
    onOverlap?: (this: GameObject, other: GameObject) => void;
    init?: (this: GameObject) => void;

}

class GameObject {
    static IdCount: number = 0;

    enabled: boolean;
    id: number;
    name: string;
    position: Vector = Vector.Zero();
    velocity: Vector = Vector.Zero();
    prevPosition: Vector = Vector.Zero();
    //rotation: number = 0;
    collider: Collider = new NoCollider();

    image?: Drawable;
    tags: Set<string>;

    isStatic: boolean = true;
    initialized: any;

    constructor(private callbacks?: GameObjectCallbacks) {
        this.id = ++GameObject.IdCount;
        this.name = this.id.toString();
        this.tags = new Set([this.constructor.name]);
        this.enabled = true;
        this.initialized = false;
    }
    update(frame: UpdateFrame) {
        if (this.enabled) {

            // Initialize on the first frame
            if (!this.initialized) {
                this.initialized = true;
                if (this.callbacks?.init) {
                    this.callbacks.init.call(this);
                }
            }
            if (this.callbacks?.update) {
                this.callbacks.update.call(this, frame);
            }
            this.prevPosition = { ...this.position };
            this.position.y -= this.velocity.y * frame.deltaTime;
            this.position.x += this.velocity.x * frame.deltaTime;
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (this.enabled) {
            if (this.callbacks?.draw) {
                this.callbacks.draw.call(this, ctx);
            }
            if (this.image && this.image.enabled) {
                this.image.draw(this, ctx);
            }
        }
    }
    drawDebug(ctx: CanvasRenderingContext2D, hasOverlapThisFrame: boolean) {
        ctx.save();

        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 10, 0, 2 * Math.PI);
        ctx.stroke();

        if (this.collider && this.collider.enabled) {
            this.collider.drawDebug(ctx, this.position, hasOverlapThisFrame);
        }
        ctx.restore();
    }
    onOverlap(other: GameObject) {
        if (this.callbacks?.onOverlap) {
            this.callbacks.onOverlap.call(this, other);
        }
    }
}

interface UpdateFrame {
    engine: GameEngine;
    deltaTime: number;
    frameNumber: number;
}

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Collider {
    boundingBox(pos: Vector): BoundingBox;
    overlaps(other: Collider): boolean | null;
    drawDebug(ctx: CanvasRenderingContext2D, pos: Vector, hasOverlapThisFrame: boolean): void;
    enabled: boolean;
}

interface Drawable {
    enabled: boolean;
    draw(gameObject: GameObject, ctx: CanvasRenderingContext2D): void;
}

interface SpriteData {
    width: number;
    height: number;
    sourceX: number;
    sourceY: number;
    sourceWidth: number;
    sourceHeight: number;
}

class Sprite implements Drawable {
    img: any;
    spriteIndex: number;
    spriteData: SpriteData[];
    offset: Vector;
    enabled: boolean;
    rotation: number;

    constructor(img: any, spriteData: SpriteData[]) {
        this.spriteIndex = 0;
        this.img = img;
        this.spriteData = spriteData;
        this.offset = Vector.Zero();
        this.enabled = true;
        this.rotation = 0;
    }
    draw(gameObject: GameObject, ctx: CanvasRenderingContext2D): void {
        let data = this.spriteData[this.spriteIndex];
        ctx.save();
        ctx.translate(
            gameObject.position.x + this.offset.x,// + (data.width / 2),
            gameObject.position.y + this.offset.y// + (data.height / 2)
        );
        ctx.rotate(-this.rotation * (Math.PI / 180))
        ctx.drawImage(this.img, data.sourceX, data.sourceY, data.sourceWidth, data.sourceHeight, -data.width / 2, -data.height / 2, data.width, data.height);
        ctx.restore();
    }

}

class Vector {
    static Zero = () => ({ x: 0, y: 0 });
    static One = () => ({ x: 1, y: 1 });

    x: number = 0;
    y: number = 0;
}

class NoCollider implements Collider {
    boundingBox(pos: Vector): BoundingBox {
        return { x: 0, y: 0, width: 0, height: 0 }
    }
    drawDebug(ctx: CanvasRenderingContext2D, pos: Vector, hasOverlapThisFrame: boolean): void {
        // do nothing
    }
    overlaps(other: Collider): boolean {
        return false;
    }
    enabled: boolean = false;

}

class BoxCollider implements Collider {
    offset: Vector;
    enabled: boolean;
    constructor(private width: number, private height: number, offset?: Vector) {
        this.offset = offset ?? Vector.Zero();
        this.enabled = true;
    }
    drawDebug(ctx: CanvasRenderingContext2D, pos: Vector, hasOverlapThisFrame: boolean): void {
        let bb = this.boundingBox(pos);

        ctx.strokeStyle =
            hasOverlapThisFrame//hitObjs.has(go) 
                ? "red" : "green";
        ctx.strokeRect(bb.x, bb.y, bb.width, bb.height);

    }

    overlaps(other: Collider): boolean | null {
        return null;
    }
    boundingBox(pos: Vector): BoundingBox {
        return {
            x: (pos.x + this.offset.x) - this.width / 2,
            y: (pos.y + this.offset.y) - this.height / 2,
            width: this.width,
            height: this.height
        }
    }
}

// class CompositeCollider implements Collider {

//     enabled: boolean;
//     constructor(private colliders: Collider[]) {
//         this.enabled = true;
//     }
//     drawDebug(ctx: CanvasRenderingContext2D, pos: Vector, hasOverlapThisFrame: boolean): void {
//         this.colliders.forEach(c => c.drawDebug(ctx, pos, hasOverlapThisFrame));
//     }
//     overlaps(other: Collider) {
//         return this.colliders.some(c => c.overlaps(other));
//     }
//     boundingBox(pos: Vector): BoundingBox {
//         throw new Error("Method not implemented.");
//     }

// }

class Sound {
    audio: HTMLAudioElement;
    constructor(src: string) {
        this.audio = document.createElement("audio");
        this.audio.src = src;
        this.audio.setAttribute("preload", "auto");
        this.audio.setAttribute("controls", "none");
        this.audio.style.display = "none";
        document.body.appendChild(this.audio);
    }

    play() {
        this.audio.play();
    }
    stop() {
        this.audio.pause();
    }
    reset() {
        this.audio.currentTime = 0;
    }
    playFromBeginning() {
        this.audio.currentTime = 0;
        this.play();
    }
}