/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var lang = require("../lib/lang");
var TextMode = require("./text").Mode;
var HtmlMode = require("./html").Mode;
var JavaScriptMode = require("./javascript").Mode;
var CssMode = require("./css").Mode;

var dmlHighlightRules = require("./dml_highlight_rules").dmlHighlightRules;
var dmlBehaviour = require("./dml_behaviour").dmlBehaviour;
var dmlFoldMode = require("./dml_folding").FoldMode;
// var dmlFoldMode = require("./folding/html").FoldMode;

var WorkerClient = require("../worker/worker_client").WorkerClient;
// var voidElements = [];
// var optionalEndTags = [];
var voidElements = ["area", "base", "br", "col", "embed", "hr", "img", "input", "keygen", "link", "meta", "menuitem", "param", "source", "track", "wbr"];
var optionalEndTags = ["li", "dt", "dd", "p", "rt", "rp", "optgroup", "option", "colgroup", "td", "th"];

var Mode = function(options) {
	this.fragmentContext = options && options.fragmentContext;
	this.HighlightRules = dmlHighlightRules;
	this.$behaviour = new dmlBehaviour();
	this.foldingRules = new dmlFoldMode(this.voidElements, lang.arrayToMap(optionalEndTags));
   
	this.createModeDelegates({
        "html-": HtmlMode,
		"node-": JavaScriptMode,
		// "html-js-": JavaScriptmode,
        // "html-css-": cssmode
	});
};

oop.inherits(Mode, TextMode);

(function() {

    // this.voidElements = lang.arrayToMap([]);
	this.voidElements = lang.arrayToMap(voidElements);
	this.lineCommentStart = "[[";
	
    //this.blockComment = {start: "<!--", end: "-->"};

    // this.createWorker = function(session) {
        // var worker = new WorkerClient(["ace"], "ace/mode/xml_worker", "Worker");
        // worker.attachToDocument(session.getDocument());

        // worker.on("error", function(e) {
            // session.setAnnotations(e.data);
        // });

        // worker.on("terminate", function() {
            // session.clearAnnotations();
        // });

        // return worker;
    // };
    
    this.$id = "ace/mode/dml";
}).call(Mode.prototype);

exports.Mode = Mode;
});