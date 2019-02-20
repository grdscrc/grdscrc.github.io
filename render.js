var canvas = document.querySelector("canvas#snake");
var ctx = canvas.getContext("2d");
var WIDTH = canvas.getAttribute('width'), HEIGHT = canvas.getAttribute('height');
var BOX_WIDTH = WIDTH/20, BOX_HEIGHT = HEIGHT/20;

function draw() {
  ctx.fillStyle = "rgb(200,0,0)";

  for(var i = 0; i < SNAKE_LENGTH; ++i) {
    ctx.fillRect((WIDTH/2 - (i * BOX_WIDTH)), HEIGHT/2, BOX_WIDTH, BOX_HEIGHT);
  }
}

document.onreadystatechange = function () {
  draw();
};
