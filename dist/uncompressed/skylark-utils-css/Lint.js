define([
    "./css",
    "./primitives/csslint"
], function(css, CSSLint) {

	return css.Lint = CSSLint;
});