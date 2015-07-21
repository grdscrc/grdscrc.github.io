all : index.html style.css

index.html : index.jade
	        jade -P index.jade

style.css : style.scss
	        sass style.scss style.css

