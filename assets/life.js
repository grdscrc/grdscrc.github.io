var winw = window.innerWidth;
var winh = window.innerHeight;
var size = 10;
var boxWidth = size;
var boxHeight = size;

var canvas = document.getElementById("life");
var ctx = canvas.getContext("2d");

var cellsX = Math.floor(winw/boxWidth);
var cellsY = Math.floor(winh/boxHeight);

var rgrid = new Int8Array(cellsX * cellsY).fill(0);
var ggrid = new Int8Array(cellsX * cellsY).fill(0);
var bgrid = new Int8Array(cellsX * cellsY).fill(0);

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
            if (alive(rgrid[x + cellsX * y]) || alive(ggrid[x + cellsX * y]) || alive(bgrid[x + cellsX * y])) {
                var r = rgrid[x + cellsX * y];
                var g = ggrid[x + cellsX * y];
                var b = bgrid[x + cellsX * y];
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
            grid2[x + cellsX * y] = grid[x + cellsX * y];
            var living  = livingNeighbors(grid, x, y);
            if (!alive(grid[x + cellsX * y]) && living === 3){
                grid2[x + cellsX * y] = 1;
            }
            if (alive(grid[x + cellsX * y]) && living !== 2 && living !== 3){
                grid2[x + cellsX * y] = 0;
            }
        }
    }
    [grid, grid2] = [grid2, grid];
    return grid;
}

function alive(cell){
    return cell === 1;
}

function livingNeighbors(grid, x, y){
    var n = 0;
    if (x>=1) {
        n += grid[x-1 + cellsX * y];
        if (y>=1) { n += grid[x-1 + cellsX * (y-1)]; }
        if (y<cellsY-1) { n += grid[x-1 + cellsX * (y+1)]; }
    }
    if (x<cellsX-1) {
        n += grid[x+1 + cellsX * y];
        if (y>=1) { n += grid[x+1 + cellsX * (y-1)]; }
        if (y<cellsY-1) { n += grid[x+1 + cellsX * (y+1)]; }
    }
    if (y>=1) n += grid[x + cellsX * (y-1)];
    if (y<cellsY-1) n += grid[x + cellsX * (y+1)];
    return n;
}

function randomizeGrid(grid){
    for(let x = 0; x < cellsX; x+=1){
        for(let y = 0; y < cellsY; y+=1){
            grid[x + cellsX * y] = Math.random() < 0.25 ? 1 : 0;
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
