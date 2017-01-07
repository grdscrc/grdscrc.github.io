all : index.html style.css

index.html : index.pug
	        pug -P index.pug

style.css : style.scss
	        sass style.scss style.css

