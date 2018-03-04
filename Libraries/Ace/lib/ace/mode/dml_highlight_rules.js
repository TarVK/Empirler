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
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;
var TexHighlightRules = require("./tex_highlight_rules").TexHighlightRules;
var HtmlHighlightRules = require("./html_highlight_rules").HtmlHighlightRules;
var JavaScriptHighlightRules = require("./javascript_highlight_rules").JavaScriptHighlightRules;
var languages = [
    ["js", "js-", JavaScriptHighlightRules],
    ["html", "html-", require("./html_highlight_rules").HtmlHighlightRules],
    ["css", "css-", require("./css_highlight_rules").CssHighlightRules],
    ["java", "java-", require("./java_highlight_rules").JavaHighlightRules],
    ["php", "php-", require("./php_highlight_rules").PhpHighlightRules],
    ["ruby", "ruby-", require("./ruby_highlight_rules").RubyHighlightRules],
    ["ahk", "ahk-", require("./autohotkey_highlight_rules").AutoHotKeyHighlightRules],
    ["python", "python-", require("./python_highlight_rules").PythonHighlightRules],
    ["c\\+\\+", "cpp-", require("./c_cpp_highlight_rules").c_cppHighlightRules],
    ["c#", "cSharp-", require("./csharp_highlight_rules").CSharpHighlightRules],
    ["json", "json-", require("./json_highlight_rules").JsonHighlightRules],
    ["sql", "sql-", require("./sql_highlight_rules").SqlHighlightRules],
];

try{
    if(Typo && !dictionary)
        var dictionary = new Typo("en_US", false, false, { dictionaryPath: dictionaryPath||"/Libraries/Typo/dictionaries" });
}catch(e){};
var spellCheck = function(token, word, state, smth, input){
    try{
        if(typeof(window)!="undefined" && window.selectedText && window.selectedText.line==input && window.selectedText.word==word) return token;
        
        if(!dictionary || typeof(window)=="undefined" || window.spellCheckDisabled) return token;
        var spelledCorrectly = dictionary.check(word) || word.match(/\d|^[a-zA-Z]-[^\s]*|^[A-Z]+$/);
        return spelledCorrectly?token:token+".misspelled";
    }catch(e){}
    return token
};
    
var dmlHighlightRules = function(normalize) {
    // http://www.w3.org/TR/REC-dml/#NT-NameChar
    // NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
    // NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
    var tagRegex = "[_:a-zA-Z\xc0-\uffff][-_:.a-zA-Z0-9\xc0-\uffff]*";

    this.$rules = {
        start : [
            {include: "characterEscape"},
            {
                token : "string.link",
                regex : "(?:\\[(.*?)\\]\\[(https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|www\\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9]\\.[^\\s]{2,}|www\\.[a-zA-Z0-9]\\.[^\\s]{2,})\\])|(?:\\[(https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|www\\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9]\\.[^\\s]{2,}|www\\.[a-zA-Z0-9]\\.[^\\s]{2,})\\]\\[(.*?)\\])"
            },
            {include : "dmlTag"},
            {
                token : "constant.language.escape",
                regex : "`$"
            },
            {
                token : "support.type.header.opening",
                regex : "\\`?#+",
                next : [
                    {
                        token : "endline",
                        regex : "$",
                        next : "start"
                    },
                    {defaultToken: "support.type.header"}
                ]
            },{
                token : "variable.bullet.opening",
                regex : "\\*\\*+",
                next : [
                    {
                        token : "endline",
                        regex : "$",
                        next : "start"
                    },
                    {defaultToken: "variable.bullet"}
                ]
            },{
                token : "string",
                regex : "\\*[^* ]",
                next : [
                    {include: "characterEscape"},
                    {token : "string", regex: "\\*", next: "start"},
                    {defaultToken: "string.bold"}
                ]
            },{
                token : "string",
                regex : "(?:^| )~",
                next : [
                    {include: "characterEscape"},
                    {token : "string", regex: "~", next: "start"},
                    {defaultToken: "string.strikeThrough"}
                ]
            },{
                token : "string",
                regex : "\\|",
                next : [
                    {include: "characterEscape"},
                    {token : "string", regex: "\\|", next: "start"},
                    {defaultToken: "string.italic"}
                ]
            },{
                token : "string",
                regex : "_",
                next : [
                    {include: "characterEscape"},
                    {token : "string", regex: "_", next: "start"},
                    {defaultToken: "string.underline"}
                ]
            },{
                token : "string",
                regex : "(?:https:\\/\\/)?(?:www\\.)?(?:youtube\\.com\\/watch\\?.*v=|youtu\\.be\\/|youtube.com\\/embed\\/)([^&\\r\\n ]+)[^\\r\\n ]*"
            },{
                token : "string",
                regex : "^>.+$"
            },{
                token : "support.type.header",
                regex : "----"
            },{
                token : "comment",
                regex : "\\[\\[",
                next : [
                    {
                        token : "comment",
                        regex : "$",
                        next : "start"
                    },
                    {defaultToken: "comment"}
                ]
            }, 
            {include : "spellCheck"}
        ],
        
        characterEscape : [{token : "constant.language.escape", regex: "\\\\."}],
        
        spellCheck : [{
            token : spellCheck.bind(null, "text"),
            regex : "(?:\\w|[-'])+",
        }],
        attributeSpellCheck : [{
            token : spellCheck.bind(null, "string.attribute-value.dml"),
            regex : "(?:\\w|[-'])+"
        }],


        dmlTag : [{
            token : ["meta.tag.punctuation.dmlTag-open.dml", "meta.tag.punctuation.end-dmlTag-open.dml", "meta.tag.dmlTag-name.dml"],
            regex : "(?:(\\[)|(\\[/))((?:" + tagRegex + ":)?" + tagRegex + ")",
            next: [
				{include: "dmlTag_attributes"},
				{
					token : "meta.tag.punctuation.dmlTag-close.dml", 
					regex : "/?\\]", 
					next : "start"
				}
			]
        }],
		
        dmlTag_attributes : [
            {
                include : "dmlTag_whitespace"
            }, {
                token : "entity.other.attribute-name.dml",
                regex : "[-_a-zA-Z0-9:.]+"
            }, {
                token : "keyword.operator.attribute-equals.dml",
                regex : "=",
				push : [{
					include: "tag_whitespace"
				},
                {include: "characterEscape"},
                {
					token : spellCheck.bind(null, "string.unquoted.attribute-value.dml"),
					// regex : "[^\\[\\]=`\\s]",
					regex : "[^\\]'\"\\s\\\\]+"
				}, {
					token : "empty",
					regex : "",
					next : "pop"
				}]
            }, 
			{include: "dmlTag_attribute_value"} 
        ],

        dmlTag_whitespace : [
            {token : "text.dmlTag-whitespace.dml", regex : "\\s+"}
        ],
        
        dmlTag_attribute_value: [
            {
                token : "string.attribute-value.dml",
                regex : "'",
                push : [
                    {token : "constant.language.escape", regex: "\\\\."},
                    {token : "string.attribute-value.dml", regex: "'", next: "pop"},
                    {defaultToken : "string.attribute-value.dml"}
                ]
            }, {
                token : "string.attribute-value.dml",
                regex : '"',
                push : [
                    {token : "constant.language.escape", regex: "\\\\."},
                    {token : "string.attribute-value.dml", regex: '"', next: "pop"},
                    {include : "attributeSpellCheck"},
                    {defaultToken : "string.attribute-value.dml"}
                ]
			}
        ],
    };

    this.embedBBRules(HtmlHighlightRules, "html-", "html");
	this.embedBBRules(JavaScriptHighlightRules, "node-", "node");
    this.embedBBRules(TexHighlightRules, "tex-", "latex");
    this.embedBBRules(TextHighlightRules, "yt-", "yt");
    this.embedBBRules(TextHighlightRules, "img-", "img");
	this.embedBBRules(TextHighlightRules, "l-", "l");
	this.embedBBRules(TextHighlightRules, "li-", "literal");
	this.embedBBRules(TextHighlightRules, "ldf-", "linkDictionary");
	this.embedBBRules(TextHighlightRules, "ld-", "ld");
    this.embedLanguages(languages);
    // this.embedBBRules(JavaScriptHighlightRules, "html-", "html");
    if (this.constructor === dmlHighlightRules)
        this.normalizeRules();
};


(function() {
    this.embedTagRules = function(HighlightRules, prefix, tag){
        this.$rules.tag.unshift({
            token : ["meta.tag.punctuation.tag-open.xml", "meta.tag." + tag + ".tag-name.xml"],
            regex : "(<)(" + tag + "(?=\\s|>|$))",
            next: [
                {include : "attributes"},
                {token : "meta.tag.punctuation.tag-close.xml", regex : "/?>", next : prefix + "start"}
            ]
        });

        this.$rules[tag + "-end"] = [
            {include : "attributes"},
            {token : "meta.tag.punctuation.tag-close.xml", regex : "/?>",  next: "start",
                onMatch : function(value, currentState, stack) {
                    stack.splice(0);
                    return this.token;
            }}
        ];

        this.embedRules(HighlightRules, prefix, [{
            token: ["meta.tag.punctuation.end-tag-open.xml", "meta.tag." + tag + ".tag-name.xml"],
            regex : "(</)(" + tag + "(?=\\s|>|$))",
            next: tag + "-end"
        }, {
            token: "string.cdata.xml",
            regex : "<\\!\\[CDATA\\["
        }, {
            token: "string.cdata.xml",
            regex : "\\]\\]>"
        }]);
    };
    
    //modified version of dml embedTagRules
    this.embedBBRules = function(HighlightRules, prefix, tag){
        this.$rules.dmlTag.unshift({
            token : ["meta.tag.punctuation.dmlTag-open.dml", "meta.tag." + tag + ".dmlTag-name.dml"],
            regex : "(\\[)(" + tag + "(?=\\s|\\]|$))",
            next: [
                {include : "dmlTag_attributes"},
                {token : "meta.tag.punctuation.dmlTag-close.dml", regex : "/?\\]", next : prefix + "start"}
            ]
        });

        this.$rules[tag + "-end"] = [
            {include : "attributes"},
            {token : "meta.tag.punctuation.dmlTag-close.dml", regex : "/?\\]",  next: "start",
                onMatch : function(value, currentState, stack) {
                    stack.splice(0);
                    return this.token;
            }}
        ];

        this.embedRules(HighlightRules, prefix, [{
            token: ["meta.tag.punctuation.end-dmlTag-open.dml", "meta.tag." + tag + ".dmlTag-name.dml"],
            regex : "(\\[/)(" + tag + "(?=\\s|\\]|$))",
            next: tag + "-end"
        // }, {
        //     token: "string.cdata.dml",
        //     regex : "\\[\\!\\[CDATA\\["
        // }, {
        //     token: "string.cdata.dml",
        //     regex : "\\]\\]\\]"
        }]);
    };
	
	//embed language
    this.embedLanguages = function(map){
		var tags = ["code", "c"];
		var attr = "language";
		
		//default language
		var defaultLanguage = "text-";
		map.unshift(["text", "text-", TextHighlightRules]);
		var language = defaultLanguage;
		
		//create bbcode 
		var closeMode = 0;
		for(var j=0; j<tags.length; j++){
		    var tag = tags[j];
		    
		    //get language matcher map
	    	var langs = [{include: "dmlTag_whitespace"},
				{
					token : "keyword.operator.attribute-equals.dml",
					regex : "=",
				}];
		    for(var i=0; i<map.length; i++){
    			var m = map[i];
    		    (function(m, j){
        			var f = function(value, currentState, stack){
        				language = m[1];
        				closeMode = j;
        				return this.token;
        			};
        			langs.push({
        				token : "string.unquoted.attribute-value.dml",
        				regex : m[0]+"(?=\\s|\\]|$)",
        				next : "pop",
        				onMatch : f
        			});
        			langs.push({
        				token : "string.attribute-value.dml",
        				regex : "(?=\"|')"+m[0]+"(?=\"|')",
        				next : "pop",
        				onMatch : f
        			});
    		    })(m, j);
    		}
    		langs.push({
    			token : "string.attribute-value.dml",
    			next : "pop",
    			regex : "[^\\]\\s]*",
    		});
    		
    		//create specifik tag opening for the language
    		var t = this;
    		(function(j, tag){
                t.$rules.dmlTag.unshift({
                    token : ["meta.tag.punctuation.dmlTag-open.dml", "meta.tag." + tag + ".dmlTag-name.dml"],
                    regex : "(\\[)(" + tag + "(?=\\s|\\]|$))",
                    next: [
        				{
        					token : "entity.other.attribute-name.dml",
        					regex : attr,
        					push : langs
        				},
        				{include : "dmlTag_attributes"},
        				{
        				    token : "meta.tag.punctuation.dmlTag-close.dml", 
        				    regex : "/?\\]", 
        				    next : function(){
        				        var lang = language;
        				        language = defaultLanguage;
        				        return j+"-"+lang+"start";
        				    },
        				}
        			]
                });
    		})(j, tag);
		}
		

		this.$rules["codeTag-end"] = [
			{include : "dmlTag_attributes"},
			{token : "meta.tag.punctuation.dmlTag-close.dml", regex : "/?\\]",  next: "start",
				onMatch : function(value, currentState, stack) {
					stack.splice(0);
					return this.token;
			}}
		];
		for(var i=0; i<map.length; i++){
			var m = map[i];
			
			
	        var rules = [];
			for(var j=0; j<tags.length; j++){
		        var tag = tags[j];
		        
		        var t = this;
	            this.embedRules(m[2], j+"-"+m[1], [{
    				token : ["meta.tag.punctuation.end-dmlTag-open.dml", "meta.tag." + tag + ".dmlTag-name.dml"],
    				regex : "(\\[/)(" + tag + "(?=\\s|\\]|$))",
    				next: "codeTag-end"
    			}]);
			}
		}
		
		//createshorthand notation code
		this.$rules.start.push({
	       token : "string",
	       regex : "```\\s*\w*",
	       next: "3-"+defaultLanguage+"start"
	    });
		for(var i=0; i<map.length; i++){
		    var m = map[i];
		    this.$rules.start.unshift({
		       token : "string",
		       regex : "```\\s*"+m[0]+"(?=\\s|\\]|$)",
		       next: "3-"+m[1]+"start"
		    });
		    this.embedRules(m[2], "3-"+m[1], [{
				token : "string",
				regex : "```",
				next: "start"
			}]);
		}
		
		//createshorthand notation inlinecode
		this.$rules.start.push({
	       token : "string",
	       regex : "`",
	       next: "4-"+defaultLanguage+"start"
	    });
		for(var i=0; i<map.length; i++){
		    var m = map[i];
		    this.$rules.start.unshift({
		       token : "string",
		       regex : "`\\s*"+m[0]+"(?=\\s|\\]|$)",
		       next: "4-"+m[1]+"start"
		    });
		    this.embedRules(m[2], "4-"+m[1], [{
				token : "string",
				regex : "`",
				next: "start"
			}]);
		}
    };
}).call(TextHighlightRules.prototype);

oop.inherits(dmlHighlightRules, TextHighlightRules);

exports.dmlHighlightRules = dmlHighlightRules;
});