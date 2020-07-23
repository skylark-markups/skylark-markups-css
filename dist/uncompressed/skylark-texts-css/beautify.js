define([
    "./css",
    "./primitives/beautify-css"
], function(css, beautifyCss) {

	return css.beautify = beautifyCss.css_beautify;
});