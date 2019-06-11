define([
    "skylark-langx/langx",
    "./css",
    "./Parser"
], function(langx, css, Parser) {

	var Parsing = langx.klass({
		"init" : function(options) {

			this._ordered = (options && options.ordered) || false;
		},

		"begin" : function() {
			var ordered = this._ordered,
				stack = this._stack = [];
			if (ordered) {
				stack.push([]);
			} else {
				stack.push({});
			}

			this._result = null;

		},

		"end" : function(error) {
	    	var stack = this._stack;
	    	this._stack = null;

	    	if (error || stack.length !== 1) {
	    		throw new Error("parse error");
	    	} else {
				this._result =  stack[0];
	    	}


	    	return this._result;
		},

		"beginBlock" : function(rule) {
	    	this._stack.push(rule);
		},

		"endBlock" : function(order) {
	    	var ordered = order && this._orderd,
	    		stack = this._stack,
	    		rule = stack.pop(),
	    		top = stack[stack.length-1],
                values = top.values || top;
	    	if (langx.isArray(values)){
	    		var obj = {};
	    		obj[rule.name] = rule.values;
	    		values.push(obj);
	    	} else {
	    		values[rule.name] = rule.values;
	    	}
		},

		"prop" : function(name,value,important) {
			if (important) {
				value = value + " !important";
			}
	    	var stack = this._stack,
	    		top = stack[stack.length-1];
    		top.values[name] = value;
		},

		"result" : function() {
			return this._result;
		}

	});


	function toJSON(css,order) {
		
	    var parser = new Parser({ 
	    					starHack: false,
	                        ieFilters: false,
	                        strict: false
	                     }),
	   	    sheet = new Parsing(order);
  
	    parser.addListener("startstylesheet", function(){
	    	sheet.begin();
	    });
	    
	    parser.addListener("endstylesheet", function(){
	    	sheet.end();
	    });
	    
	    parser.addListener("charset", function(event){
			sheet.beginBlock({
	    		name : "@charset",
	    		values :event.charset
	    	});
	    	sheet.endBlock();
	    });
	    
	    parser.addListener("namespace", function(event){
	    	var key = "@Namespace";
	    	if (event.prefix) {
	    		key = key + " " + event.prefix;
	    	}
	    	sheet.beginBlock({
	    		name : key,
	    		values : "\"" + event.uri + "\""
	    	});
	    	sheet.endBlock();
	    });
	    
	    parser.addListener("startfontface", function(event){
	    });
	    
	    parser.addListener("endfontface", function(event){
	    });
	    
	    parser.addListener("startkeyframes", function(event){
	    	sheet.beginBlock({
	    		name : "@keyframes " + event.name,
	    		values :{}
	    	});
	    });
	    
	    parser.addListener("startkeyframerule", function(event){
			var selectors = "";	        
	        for (var i=0,len=event.keys.length; i < len; i++){
	        	var selector = event.keys[i].text;
	        	if (selectors) {
	        		selectors = selectors + "," + selector
	        	} else {
	        		selectors = selector;
	        	}
	        }
	    	sheet.beginBlock({
	    		name : selectors,
	    		values :{}
	    	});
	    });
	    
	    parser.addListener("endkeyframerule", function(event){
	    	sheet.endBlock(false);
	    });    
	    
	    parser.addListener("endkeyframes", function(event){
	    	sheet.endBlock(false);
	    });
	    
	    parser.addListener("startpage", function(event){
	        log("Starting page with ID=" + event.id + " and pseudo=" + event.pseudo);
            var key = "@page";
            if (event.pseudo) {
                key = key + " " + event.pseudo;
            }
            sheet.beginBlock({
                name : key,
                values :{}
            });
	    });
	    
	    
	    parser.addListener("endpage", function(event){
	        log("Ending page with ID=" + event.id + " and pseudo=" + event.pseudo);
            sheet.endBlock(false);
	    });

	    parser.addListener("startpagemargin", function(event){
	        log("Starting page margin " + event.margin);
            sheet.beginBlock({
                name : "@page-margin",
                values :{}
            });
	    });
	    
	    
	    parser.addListener("endpagemargin", function(event){
	        log("Ending page margin " + event.margin);
            sheet.endBlock(false);
	    });

        parser.addListener("starttopcenter", function(event){
            //log("Starting top center " + event.center);
            sheet.beginBlock({
                name : "@top-center",
                values :{}
            });
        });
        
        
        parser.addListener("endtopcenter", function(event){
            //log("Ending Top Center " + event.center);
            sheet.endBlock(false);
        });
	    
	    parser.addListener("import", function(event){
	        log("Importing " + event.uri + " for media types [" + event.media + "]");
            var key = "@import " + event.uri;
            if (event.media) {
                key = key + " " + event.media;
            }
            sheet.beginBlock({
                name : key,
                values : ""
            });
            sheet.endBlock(true);
	    });
	    
	    parser.addListener("startrule", function(event){
			var selectors = "";	        
	        for (var i=0,len=event.selectors.length; i < len; i++){
	            var selector = event.selectors[i];
	            
	            if (selectors) {
	            	selectors = selectors + "," + selector.text;
	            } else {
	            	selectors = selector.text;
	            }
	        }

	    	sheet.beginBlock({
	    		name : selectors,
	    		values :{}
	    	});
	    });
	    
	    parser.addListener("endrule", function(event){
	    	sheet.endBlock(true);
	    });
	    
	    parser.addListener("property", function(event){

	        sheet.prop(event.property.text,event.value.text,event.important);
	    });
	    
	    parser.addListener("startmedia", function(event){
	    	sheet.beginBlock({
	    		name : "@media " + event.media,
	    		values :{}
	    	});

	    });
	    
	    parser.addListener("endmedia", function(event){
	    	sheet.endBlock(true);
	    });    


	    parser.addListener("error", function(event){
	    	sheet.end(false);
	    });

        parser.parse(document.getElementById("input").value);

	    return sheet.result();

	}

	return css.toJSON = toJSON;
});