all : index.html style.css snake.html

index.html : index.pug
	        pug -P index.pug

style.css : style.scss
	        sass style.scss style.css

snake.html : snake.pug
	        pug -P snake.pug

