var snake = [];
var SNAKE_LENGTH = 5;

function init() {
  for(var i = 0; i < SNAKE_LENGTH; ++i) {
    ctx.fillRect((WIDTH/2 - (i * BOX_WIDTH)), HEIGHT/2, BOX_WIDTH, BOX_HEIGHT);
    snake.push();
  }
}

document.onreadystatechange = function () {
  init();
};
