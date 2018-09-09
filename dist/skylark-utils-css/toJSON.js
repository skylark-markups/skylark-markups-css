/**
 * skylark-utils-css - The skylark css utility library.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0-beta
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["skylark-langx/langx","./css","./Parser"],function(e,n,t){function r(e,n){var r=new t({starHack:!1,ieFilters:!1,strict:!1}),i=new a(n);return r.addListener("startstylesheet",function(){i.begin()}),r.addListener("endstylesheet",function(){i.end()}),r.addListener("charset",function(e){i.beginBlock({name:"@charset",values:e.charset}),i.endBlock()}),r.addListener("namespace",function(e){var n="@Namespace";e.prefix&&(n=n+" "+e.prefix),i.beginBlock({name:n,values:'"'+e.uri+'"'}),i.endBlock()}),r.addListener("startfontface",function(e){}),r.addListener("endfontface",function(e){}),r.addListener("startkeyframes",function(e){i.beginBlock({name:"@keyframes "+e.name,values:{}})}),r.addListener("startkeyframerule",function(e){for(var n="",t=0,r=e.keys.length;t<r;t++){var a=e.keys[t].text;n=n?n+","+a:a}i.beginBlock({name:n,values:{}})}),r.addListener("endkeyframerule",function(e){i.endBlock(!1)}),r.addListener("endkeyframes",function(e){i.endBlock(!1)}),r.addListener("startpage",function(e){log("Starting page with ID="+e.id+" and pseudo="+e.pseudo)}),r.addListener("endpage",function(e){log("Ending page with ID="+e.id+" and pseudo="+e.pseudo)}),r.addListener("startpagemargin",function(e){log("Starting page margin "+e.margin)}),r.addListener("endpagemargin",function(e){log("Ending page margin "+e.margin)}),r.addListener("import",function(e){log("Importing "+e.uri+" for media types ["+e.media+"]")}),r.addListener("startrule",function(e){for(var n="",t=0,r=e.selectors.length;t<r;t++){var a=e.selectors[t];n=n?n+","+a.text:a.text}i.beginBlock({name:n,values:{}})}),r.addListener("endrule",function(e){i.endBlock(!0)}),r.addListener("property",function(e){i.prop(e.property.text,e.value.text,e.important)}),r.addListener("startmedia",function(e){i.beginBlock({name:"@media "+e.media,values:{}})}),r.addListener("endmedia",function(e){i.endBlock(!0)}),r.addListener("error",function(e){i.end(!1)}),r.parse(document.getElementById("input").value),i.result()}var a=e.klass({init:function(e){this._ordered=e&&e.ordered||!1},begin:function(){var e=this._ordered,n=this._stack=[];e?n.push([]):n.push({}),this._result=null},end:function(e){var n=this._stack;if(this._stack=null,e||1!==n.length)throw new Error("parse error");return this._result=n[0],this._result},beginBlock:function(e){this._stack.push(e)},endBlock:function(n){var t=(n&&this._orderd,this._stack),r=t.pop(),a=t[t.length-1];if(e.isArray(a)){var i={};i[r.name]=r.values,a.push(i)}else a[r.name]=r.values},prop:function(e,n,t){t&&(n+=" !important");var r=this._stack,a=r[r.length-1];a[e]=n},result:function(){return this._result}});return n.toJSON=r});
//# sourceMappingURL=sourcemaps/toJSON.js.map
