var appwidth = screen.width<768 ? screen.width : 768;
var appheight = 320;
var renderer = PIXI.autoDetectRenderer(appwidth,appheight,{backgroundColor : 0x99ccff});
document.getElementById('canvas').appendChild(renderer.view);

// load asset
var asset_head = {
    h1: PIXI.Texture.fromImage('img/f1.png'),
    h2: PIXI.Texture.fromImage('img/f2.png'),
    h3: PIXI.Texture.fromImage('img/f3.png')
};

var asset_face = {
    f1: PIXI.Texture.fromImage('img/e1.png'),
    f2: PIXI.Texture.fromImage('img/e2.png'),
    f3: PIXI.Texture.fromImage('img/e3.png')
};

var asset_hair = {
    h1: PIXI.Texture.fromImage('img/h1.png'),
    h2: PIXI.Texture.fromImage('img/h2.png'),
    h3: PIXI.Texture.fromImage('img/h3.png')
};

var db = {
    head: 3,
    face: 3,
    hair: 3
}
var pointer = {
    head: 1,
    face: 1,
    hair: 1
}
var container = new PIXI.Container();

var head = new PIXI.Sprite(asset_head['h1']);
head.anchor.set(0.5);
head.position.x = renderer.width/2;
head.position.y = renderer.height/2;

var face = new PIXI.Sprite(asset_face['f1']);
face.anchor.set(0.5);
face.position.x = renderer.width/2;
face.position.y = renderer.height/2;

var hair = new PIXI.Sprite(asset_hair['h1']);
hair.anchor.set(0.5);
hair.position.x = renderer.width/2;
hair.position.y = renderer.height/2;

container.addChild(head);
container.addChild(face);
container.addChild(hair);

animate();
function animate() {
    requestAnimationFrame(animate);
    // render the container
    renderer.render(container);
}

function changeHead() {
    if (pointer.head+1 > db.head) {
        pointer.head = 0;
    }
    pointer.head += 1;
    head.texture = asset_head['h'+pointer.head];
}

function changeFace() {
    if (pointer.face+1 > db.face) {
        pointer.face = 0;
    }
    pointer.face += 1;
    face.texture = asset_face['f'+pointer.face];
}

function changeHair() {
    if (pointer.hair+1 > db.hair) {
        pointer.hair = 0;
    }
    pointer.hair += 1;
    hair.texture = asset_hair['h'+pointer.hair];
}
