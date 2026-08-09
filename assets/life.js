var winw = window.innerWidth;
var winh = window.innerHeight;
var size = 10;
var boxWidth = size;
var boxHeight = size;

var canvas = document.getElementById("life");
var ctx = canvas.getContext("2d");

var cellsX = Math.floor(winw/boxWidth);
var cellsY = Math.floor(winh/boxHeight);

var rgrid = new Array(cellsX).fill(0).map(()=>new Array(cellsY).fill(0));
var ggrid = new Array(cellsX).fill(0).map(()=>new Array(cellsY).fill(0));
var bgrid = new Array(cellsX).fill(0).map(()=>new Array(cellsY).fill(0));

function resizeCanvas() {
    canvas.width = winw;
    canvas.height = winh;
}

function drawBoard(){
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (false) { // toggle to display lines
        var boxesQX = 0, boxesQY = 0;
        ctx.strokeStyle = "white";
        while(boxesQX * boxWidth < winw) {
            ctx.beginPath();
            ctx.moveTo(boxesQX*boxWidth, 0);
            ctx.lineTo(boxesQX*boxWidth, winh);
            ctx.stroke();
            boxesQX += 1;
        }
        while(boxesQY * boxHeight < winh) {
            ctx.beginPath();
            ctx.moveTo(0, boxesQY * boxHeight);
            ctx.lineTo(winw, boxesQY * boxHeight);
            ctx.stroke();
            boxesQY += 1;
        }
    }

    for(let x = 0; x < cellsX; x+=1){
        for(let y = 0; y < cellsY; y+=1){
            if (alive(rgrid[x][y]) || alive(ggrid[x][y]) || alive(bgrid[x][y])) {
                var r = rgrid[x][y];
                var g = ggrid[x][y];
                var b = bgrid[x][y];
                ctx.fillStyle = `rgb(${r*255} ${g*255} ${b*255})`;
                ctx.fillRect(x*boxWidth+(boxWidth/10),
                    y*boxHeight+(boxHeight/10),
                    boxWidth-(boxWidth/5),
                    boxHeight-(boxHeight/5));
            }
        }
    }
}

function updateGrid(grid){
    var grid2 = new Array(cellsX).fill(0).map(()=>new Array(cellsY).fill(0));
    for(let x = 0; x < cellsX; x+=1){
        for(let y = 0; y < cellsY; y+=1){
            grid2[x][y] = grid[x][y];
            var n = neighbors(x, y).map(([a,b]) => grid[a][b]);
            var living = n.reduce((a, e) => alive(e)?a+=1:a);
            if (!alive(grid[x][y]) && living === 3){
                grid2[x][y] = 1;
            }
            if (alive(grid[x][y]) && living !== 2 && living !== 3){
                grid2[x][y] = 0;
            }
        }
    }
    for(let x = 0; x < cellsX; x+=1){
        for(let y = 0; y < cellsY; y+=1){
            grid[x][y] = grid2[x][y];
        }
    }
    return grid;
}

function alive(cell){
    return cell === 1;
}

function neighbors(x, y){
    var n = [];
    if (x>=1) {
        n.push([x-1,y]);
        if (y>=1) { n.push([x-1,y-1]); }
        if (y<cellsY-1) { n.push([x-1,y+1]); }
    }
    if (x<cellsX-1) {
        n.push([x+1,y]);
        if (y>=1) { n.push([x+1,y-1]); }
        if (y<cellsY-1) { n.push([x+1,y+1]); }
    }
    if (y>=1) n.push([x,y-1]);
    if (y<cellsY-1) n.push([x,y+1]);
    return n;
}

function randomizeGrid(grid){
    for(let x = 0; x < cellsX; x+=1){
        for(let y = 0; y < cellsY; y+=1){
            grid[x][y] = Math.random() < 0.25 ? 1 : 0;
        }
    }
    return grid;
}

resizeCanvas();
rgrid = randomizeGrid(rgrid);
ggrid = randomizeGrid(ggrid);
bgrid = randomizeGrid(bgrid);
drawBoard();

setInterval(function () {
    rgrid = updateGrid(rgrid);
    ggrid = updateGrid(ggrid);
    bgrid = updateGrid(bgrid);
    drawBoard();
}, 200);
