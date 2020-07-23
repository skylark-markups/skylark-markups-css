define([
	"skylark-langx/langx",
    "./css",
    "./primitives/parser-lib"
], function(langx,css, parserlib) {
	var Parser = css.Parser = parserlib.css.Parser;
	langx.mixin(Parser,parserlib.css);

	return Parser ;
});