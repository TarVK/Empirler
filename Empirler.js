var Empirler = (function(){
    var Empirler = {};
    var relativeFormatsPath = "Formats"; //server side file request
    var absoluteFormatsPath = "/Formats"; //client side file request
    var relativeLibrariesPath = "Libraries";
    var absoluteLibrariesPath = "/Libraries";
    if(typeof(window)!="undefined" && window.location.host.indexOf("github")!=-1){ //fix the base location for github hosted site
        var parts = window.location.pathname.split("/");
        parts.shift()
        var projectPage = parts.shift();
        absoluteFormatsPath = "/"+projectPage+absoluteFormatsPath;
        relativeFormatsPath = "/"+projectPage+relativeFormatsPath;
    }
    var runAsynchronous = true; //request files asynchronously (fileEmbeding will be async none the less)
    var embedFiles = false; //embed any used files directly into the transpiled code (only works when transpiling to html), requires fetch-base64 and the provided fix to work serverside
    var runServerSide = typeof(require)!="undefined";
    var embedLocation = runServerSide?(__dirname+"/"):""; //the location to embed the files from, only applies server side
    var attemptCrossOriginCalls = true; //use a tool to perform cross origin calls
    var surpressWarnings = false;
    
    //utils
    const regexMatch = /\/(.*)\/(.*)/;
    const indexMatch = /((?:\\.)*)(?:@([0-9]+))?/g;
    function escapeRegex(str) {
        str = str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
        str = str.replace(/\n/g, "\\n");
        str = str.replace(/\r/g, "\\r");
        str = str.replace(/\t/g, "\\t");
        return str;
    }
    function insertData(str, data, func, dontUnEscape){
        if(!func) func = function(inp){return inp};
        str = str.replace(indexMatch, function(m, g1, g2){
            return g1+(g2? func(data[Number(g2)]||""): ""); 
        });
        if(!dontUnEscape)
            str = str.replace(/\\(.)/g, "$1");
        return str;
    }
    
    //advanced regex matcher
    function Matcher(data){
        if(!(data instanceof Array)) data = [data];
        var expressions = [];
        offset = 0;
        for(var i=0; i<data.length; i++){
            var exp = data[i];
            //make sure the exp has the right format
            if(exp instanceof RegExp || exp instanceof Function || typeof(exp)=="string")
                exp = {match: exp};
            else
                exp = Object.assign({}, exp); //clone the object
            if(!exp.rep)    exp.rep = "";
                
            //try to compile the regex if possible
            if(exp.match) exp.match = Matcher.compileExp.call(this, exp.match, null, true);
            if(exp.not) exp.not = Matcher.compileExp.call(this, exp.not, null, true);
            if(exp.reset) exp.reset = Matcher.compileExp.call(this, exp.reset, null, true);
            if(exp.l){
                exp.literal = exp.l;
                delete exp.l;
            }
            if(exp.offset) offset = exp.offset;
            
            //add to data
            expressions.push(exp);
        }
        this.offset = offset;
        this.expressions = expressions;
        this.data = data;
        this.insertionData = [];
    }
    var mp = Matcher.prototype;
    mp.setInsertionData = function(insertionData){
        this.insertionData = insertionData||[]; 
    } 
    mp.exec = function(text, startIndex, insertionData, closingIndex, resetStartIndex){
        //all this assignments are to be used by replacement and regex functions, EG:
        var time = Date.now();
        if(insertionData)
            this.insertionData = insertionData; 
        
        var closest = {index: Infinity};
        var h = closingIndex!=null;
        for(var i=h?closingIndex:0; i<=(h? closingIndex: (this.expressions.length-1)); i++){
            var exp = this.expressions[i];
            
            //get closest match
            if(exp.match){
                var e = Matcher.compileExp.call(this, exp.match, this.insertionData);
                e.lastIndex = startIndex;
                
                var m;
                while((m = e.exec(text))){
                    if(m[0].length==0) e.lastIndex++;
                    
                    //check if the reset regex has been matched before the matched group
                    if(exp.reset && exp.lastMatchIndex){
                        var e2 = Matcher.compileExp.call(this, exp.reset, this.insertionData);
                        e2.lastIndex = exp.lastMatchIndex||0;
                        var im;
                        if((im = e2.exec(text)))
                            if(im.index>m.index){
                                continue;
                            }
                    }
                    
                    //check if it doesn't match the not part
                    if(exp.not){
                        var e3 = Matcher.compileExp.call(this, exp.not, this.insertionData.concat(m));
                        e3.lastIndex = m.index;
                        var im;
                        if((im = e3.exec(text)))
                            if(im.index==m.index){
                                continue;
                            }
                    }
                    
                    //set to closest, if indeed the closest
                    if(m.index<closest.index){
                        closest = {
                            matched: true,
                            match: m,
                            index: m.index,
                            exp: exp,
                            matcher: this,
                            expIndex: i
                        }
                    }
                    
                    //break search for match loop
                    break; 
                }
            }
        }
        
        //return output
        if(closest.index<Infinity){
            //set replacement
            var rep = closest.exp.rep;
            if(rep instanceof Function)
                rep = rep.apply(this, closest.match);
            
            if(!closest.exp.literal)    
                rep = insertData(rep, closest.match);
                
            closest.rep = rep;
                
            return closest;
        }
        return {match:false};
    }
    mp.copy = function(funcCallerObj){
        var regexObj = new Matcher(this.data);//extend(this.data));
        regexObj.funcCallerObj = funcCallerObj;
        return regexObj;
    };
    Matcher.compileExp = function(exp, insertionData, isPreCompile){
        if(exp.compiled) //check if it isn't compiled already
            return exp;
            
        //if the expression is a function returning an expression, call it
        if(exp instanceof Function && isPreCompile) return exp //don't compile yet
        if(exp instanceof Function){
            exp = exp.apply(this.funcCallerObj, insertionData);
        }
        if(typeof(exp)=="string")
            exp = new RegExp(escapeRegex(exp));
        
        //add flags g and m to regex
        var p = exp.toString().match(regexMatch);
        
        //add the insertion data
        if(p[1].indexOf("@")!=-1 && !exp.literal)
            if(isPreCompile)
                return exp;
            else
                p[1] = insertData(p[1], insertionData, escapeRegex, true);
            
        exp = new RegExp(p[1], p[2].replace(/g|m/g,"")+"gm");
        exp.compiled = true;
        return exp;
    }
    
    //replacement template
    function Replacement(data){
        if(!data.text)
            data = {text:data};
        
        this.text = data.text;
        this.literal = data.l||data.literal;
    }
    var rp = Replacement.prototype;
    rp.instantiate = function(insertionData, funcContext, dontInsertDataInFunc, callback){
        var continued = false;
        var executeFunc = function(text){
            insertionData = [].concat(insertionData).concat(afterFunc);
            try{
                text = text.apply(funcContext, insertionData);
                if(typeof(text)=="string") afterFunc(text);
            }catch(e){
                Empirler.onWarning(e);
                afterFunc("");
            };
        };
        
        var afterFunc = function(text){
            if(!continued){
                if(dontInsertDataInFunc || text==null) 
                    callback(text);
                else
                    finish(text);
            }
            continued = true;
        };
        
        var finish = function(text){
            if(!this.literal)
                text = insertData(text, insertionData);
            callback(text);
        };
        
        if(this.text instanceof Function){
            executeFunc(this.text);
        }else{
            finish(this.text);
        }
    }
    
    //syntax
    function Syntax(data){//pageInjection){
        if(data instanceof Array)
            data = {ruleSet: data};
            
        var keys = Object.keys(data);
        for(var i=0; i<keys.length; i++){
            var key = keys[i];
            this[key] = data[key];
        }
        
        this.ruleSet = data.ruleSet||[];
        this.postProcessor = data.postProcessor;
        this.preProcessor = data.preProcessor;
    }
    var sp = Syntax.prototype;
    sp.updatePageElements = function(){
        
        //convert all the inserted elements
        var rules = this.ruleSet.getRules();
        for(var i=0; i<rules.length; i++){
            var rule = rules[i];
            if(rule.instantiate){
                var elements = document.getElementsByClassName("empirler-"+rule.name.replace(/ /g, "_"));
                for(var j=0; j<elements.length; j++){
                    var el = elements[j];
                    var args = [el];
                    for(var m=0; m<100; m++){
                        var val = el.getAttribute(m);
                        try{
                            if(val) args.push(JSON.parse(val));
                            else    break;
                        }catch(e){}
                    }
                    try{
                        rule.instantiate.apply(rule, args);
                    }catch(e){
                        console.error(e);
                    }
                }
            }
        }
    }
    sp.preProcess = function(input, callback){
        if(this.preProcessor){
            this.preProcessor.apply(this, arguments);
        }else{
            callback = arguments[arguments.length-1];
            callback(input);
        }
    };
    sp.postProcess = function(input, content, elementConverter, requiresConverter){
        if(this.postProcessor){
            this.postProcessor.apply(this, arguments);
        }else{
            if(requiresConverter)
                content += elementConverter;
            callback = arguments[arguments.length-1];
            callback(content);
        }
    }
    
    //rule set
    function RuleSet(additionSet, baseSet, removalSet, dontCarryAdditionSet, dontCarryRemovalSet, addAfter){
        if(additionSet){ //check if the additionSet is actually an input object
            var b = additionSet.b!==undefined?additionSet.b:additionSet.baseSet; //null is different from undefined snd should have priority
            var a = additionSet.a||additionSet.addition;
            var r = additionSet.r||additionSet.removal;
            var dca = additionSet.dca||additionSet.dontCarryAddition;
            var dcr = additionSet.dcr||additionSet.dontCarryRemoval;
            var af = additionSet.af||additionSet.addAfter;
        } 
        var isEmpty = additionSet===null;
        if(a || b || r || dca || dcr){ //set variables if baseSet was an input object
            additionSet = a;
            baseSet = b;
            removalSet = r;
            dontCarryAdditionSet = dca;
            dontCarryRemovalSet = dcr;
            addAfter = af;
        }
        
        if(baseSet===null || isEmpty) baseSet = [];
        if(!additionSet) additionSet = [];
        if(!removalSet) removalSet = [];
        if(!dontCarryAdditionSet) dontCarryAdditionSet = [];
        if(!dontCarryRemovalSet) dontCarryRemovalSet = [];
            
        this.additionSet = additionSet;
        this.dontCarryAdditionSet = dontCarryAdditionSet;
        this.baseSet = baseSet;
        this.removalSet = removalSet;
        this.dontCarryRemovalSet = dontCarryRemovalSet;
        this.addAfter = af;
    };
    var rsp = RuleSet.prototype;
    rsp.assemble = function(baseSet){
        var rules = [].concat(this.baseSet||baseSet);
        var carryRules = [].concat(rules);
        var insertIndex = 0;
        //if insertAfter was provided, find element
        if(this.addAfter){
            var This = this;
            if(typeof(this.addAfter)=="object")
                insertIndex = rules.indexOf(this.addAfter);
            else if(typeof(this.addAfter)=="string")
                insertIndex = rules.findIndex(function(r){return r.name==This.addAfter});
            else if(typeof(this.addAfter)=="number")
                insertIndex = this.addAfter;
            insertIndex = Math.max(0, insertIndex);
        }
        
        //add rules
        for(var i=this.additionSet.length-1; i>=0; i--){
            var rule = this.additionSet[i];
            var index;
            if((index = rules.indexOf(rule))!=-1){
                rules.splice(index, 1);
                carryRules.splice(index, 1);
                if(index<insertIndex) insertIndex--;
            }
            rules.splice(insertIndex, 0, rule);
            carryRules.splice(insertIndex, 0, rule);
        }
        //add rules (dont carry)
        for(var i=this.dontCarryAdditionSet.length-1; i>=0; i--){
            var rule = this.dontCarryAdditionSet[i];
            var index;
            if((index = rules.indexOf(rule))!=-1){
                rules.splice(index, 1);
                if(index<insertIndex) insertIndex--;
            }
            rules.splice(insertIndex, 0, rule);
        }
        
        //remove rules (removal works by object, index or name)
        for(var i=0; i<this.removalSet.length; i++){
            var rule = this.removalSet[i];
            
            var indexRule = rule;
            if(typeof(indexRule)=="object")
                indexRule = rules.indexOf(indexRule);
            if(typeof(indexRule)=="string")
                indexRule = rules.findIndex(function(r){return r.name==indexRule});
            if(indexRule>=0 && indexRule<=rules.length)
                rules.splice(indexRule, 1);
                
            var indexCarryRule = rule;
            if(typeof(indexCarryRule)=="object")
                indexCarryRule = carryRules.indexOf(indexCarryRule);
            if(typeof(indexCarryRule)=="string")
                indexCarryRule = carryRules.findIndex(function(r){return r.name==indexCarryRule});
            if(indexCarryRule>=0 && indexCarryRule<=carryRules.length)
                carryRules.splice(indexCarryRule, 1);
        }
        //remove rules (dont carry)
        for(var i=0; i<this.dontCarryRemovalSet.length; i++){
            var rule = this.dontCarryRemovalSet[i];
            if(typeof(rule)=="object")
                rule = rules.indexOf(rule);
            if(typeof(rule)=="string")
                rule = rules.findIndex(function(r){return r.name==rule});
            if(rule>=0 && rule<=rules.length)
                rules.splice(rule, 1);
        }
        return {rules:rules, carryRules:carryRules};
    };
    
    //rule stack
    function RuleStack(ruleSet){
        this.availableRules = [];
        
        this.stack = [];
        
        if(ruleSet){
            this.addAvailableRulesFromRuleSet(ruleSet);
            this.pushRule(ruleSet);
        }
    }
    var rstp = RuleStack.prototype;
    rstp.addAvailableRulesFromArray = function(list){
        if(list && list.length>0)
            for(var i=0; i<list.length; i++){
                var rule = list[i];
                if(this.availableRules.indexOf(rule)==-1)
                    this.availableRules.push(rule);
            }
        return list;
    };
    rstp.addAvailableRulesFromRuleSet = function(ruleSet){
        this.addAvailableRulesFromArray(ruleSet.additionSet);
        this.addAvailableRulesFromArray(ruleSet.dontCarryAdditionSet);
        this.addAvailableRulesFromArray(ruleSet.baseSet);
        this.addAvailableRulesFromArray(ruleSet.removalSet);
        this.addAvailableRulesFromArray(ruleSet.dontCarryRemovalSet);
    };
    rstp.pushRule = function(rule){
        if(rule instanceof RuleSet){
            var ruleSet = rule;
            rule = -1;
        }else{
            var ruleSet = rule.ruleSet;
        }
        var currentRules = this.getCarryRules();
        var assembled = ruleSet.assemble(currentRules);
        assembled.rule = rule;
        this.stack.push(assembled);
    };
    rstp.popRule = function(){
        var el = this.stack.pop();
        return el.rule;
    };
    rstp.getRules = function(){
        var top = this.stack[this.stack.length-1];
        if(top){
            return top.rules;
        }else{
            return [];
        }
    };
    rstp.getCarryRules = function(){
        var top = this.stack[this.stack.length-1];
        if(top){
            return top.carryRules;
        }else{
            return [];
        }
    };
    
    // rules
    function Rule(data, shorthand){
        this.inpData = data;

        //the rule match data
        this.name = data.n||data.name;
        var o = data.o!=null? data.o: data.opening;
        var c = data.c!=null? data.c: data.closing;
        var d = data.d!=null? data.d: data.delete;
        
        //setup the shorthand notation if provided
        var defaultClosingReplacement = "@0";
        var defaultOpeningReplacement = "@0";
        if(shorthand)
            for(var i=0; i<shorthand.length; i++){
                var sh = shorthand[i];
                //retreive the shorthand inputs
                var selfClosing = null;
                var normal = null;
                for(var j=0; j<sh.normal.length; j++){
                    var n = data[sh.normal[j]];
                    if(n) normal = n;
                }
                for(var j=0; j<sh.selfClosing.length; j++){
                    var n = data[sh.selfClosing[j]];
                    if(n) selfClosing = n;
                }
                
                //add default replacement
                var or = sh.or!=null?sh.or:sh.openingReplacement;
                if(selfClosing || normal && or!=null) defaultOpeningReplacement = or;
                var cr = sh.cr!=null?sh.cr:sh.closingReplacement;
                if(normal && cr!=null) defaultClosingReplacement = cr;
                
                //add matchers for the shorthand inputs if found
                if(selfClosing && !(data.c || data.closing)){
                    if(!(o instanceof Array)) o = [o];
                    if(!(selfClosing instanceof Array)) selfClosing = [selfClosing];
                    for(var k=0; k<selfClosing.length; k++){
                        var m = selfClosing[k];
                        o.unshift(sh.openingMatcher(m));
                    }    
                }else if(normal && sh.closingMatcher){
                    if(!o) o = [];
                    if(!(o instanceof Array)) o = [o];
                    if(!c) c = [];
                    if(!(c instanceof Array)) c = [c];
                    if(!d) d = [];
                    if(!(d instanceof Array)) d = [d];
                    
                    if(!(normal instanceof Array)) normal = [normal];
                    for(var k=0; k<normal.length; k++){
                        var m = normal[k];
                        o.unshift(sh.openingMatcher(m));
                        c.unshift(sh.closingMatcher(m));
                        if(sh.deletionMatcher)
                            d.unshift(sh.deletionMatcher(m));    
                    }
                }
            }
        
        //the rule match data p2
        if(o!=null) this.openingMatcher = new Matcher(o);
        if(c!=null) this.closingMatcher = new Matcher(c);
        if(d!=null) this.deletionMatcher = new Matcher(d);
        
        //replacement
        var or = data.or!=null? data.or: data.openingReplacement;
        var cr = data.cr!=null? data.cr: data.closingReplacement;
        var dr = data.contentReplacement;
        dr = data.dr!=null? data.dr: dr;
        dr = data.dataReplacement!=null? data.dataReplacement: dr;
        
        if(o && or==null) or = defaultOpeningReplacement;
        if(c && cr==null) cr = defaultClosingReplacement;
        if(or!=null) this.openingReplacement = new Replacement(or);
        if(cr!=null) this.closingReplacement = new Replacement(cr);
        if(dr!=null) this.contentReplacement = new Replacement(dr);
        
        //set some additional rules
        this.replaceOnly = data.ro||data.replaceOnly||false;
        this.onlyWrapIfFullyMatched = ((data.f!=null)||(data.fully!=null))? (data.f||data.fully): false;// !!c;
        
        //setup rule set
        var rules = data.r===undefined?data.rules:data.r;
        this.ruleSet = rules instanceof RuleSet?rules:new RuleSet(rules);
        
        //set up instantiation code
        this.instantiate = data.i||data.instantiate;
        if(this.instantiate && or==null && cr==null){
            var t = this;
            this.openingReplacement = new Replacement(function(){
                var out = "<div class='empirler-"+t.name.replace(/ /g, "_")+"' ";
                for(var i=0; i<arguments.length; i++){
                    out += i+"='"+JSON.stringify(arguments[i]||"")+"' ";
                }
                return out+">";
            });
            this.closingReplacement = new Replacement("</div>");
        }
    }
    var rp = Rule.prototype;
    rp.getNextMatch = function(node){
        return this.openingMatcher.exec(node.input.text, node.searchIndex);
    };
    rp.getNode = function(node){
        this.openingMatcher.funcCallerObj = node;
        var start = this.openingMatcher.exec(node.input.text, node.searchIndex);
        if(start.matched){
            var startMatch = start.match;
            var childNode;
            var src = node.input;
            if(this.closingMatcher){
                src.cut(startMatch.index, startMatch[0].length, start.rep);
                
                childNode = new WrapperNode(node, start, this);
            }else{
                if(this.replaceOnly){
                    src.cut(startMatch.index, startMatch[0].length, start.rep);
                }else{
                    childNode = new TextNode(node, this, start);
                    if(start.rep)
                        src.cut(startMatch.index+startMatch[0].length, 0, start.rep);
                }
                
            }
            if(this.instantiate){
                node.input.requiresPageUpdate = true;
            }
            return childNode; 
        }
        return null;
    };
    
    //general node
    function Node(parentNode, rule, startMatch){
        this.parentNode = parentNode;
        this.startMatch = startMatch;
        this.rule = rule;
        
        if(parentNode)
            this.input = parentNode.input;              //the src text from which the node takes start to endIndex
        
        this.matchers = {};
        if(this.rule){
            if(this.rule.openingMatcher) this.matchers.opening = this.rule.openingMatcher.copy(this);
            if(this.rule.closingMatcher){
                this.matchers.closing = this.rule.closingMatcher.copy(this);
                if(this.startMatch)
                    this.matchers.closing.setInsertionData(this.startMatch.match);
            } 
            if(this.rule.deletionMatcher){
                this.matchers.deletion = this.rule.deletionMatcher.copy(this);
                if(this.startMatch)
                    this.matchers.deletion.setInsertionData(this.startMatch.match);
            }
        }
    }
    var np = Node.prototype;
    np.assemble = function(callback){
        var This = this;
        
        if(!this.assembling){
            this.assembling = true;
            
            if(this.assembled){
                callback.call(this, this.assembled);
                return;
            }
            this.assembled = "";
            
            var finish = function(){
                delete This.assembling;
                callback.call(This, This.assembled);
            };
            
            if(this.rule){
                //insert the opening replacement
                var openingReplacement = function(){
                    if(This.startMatch && This.rule.openingReplacement && 
                            (!This.rule.onlyWrapIfFullyMatched || This.endMatch))
                        This.rule.openingReplacement.instantiate(This.startMatch.match, This, false, function(text){
                            This.assembled += text;
                            This.input.callback(dataReplacement);
                        });
                    else
                        This.input.callback(dataReplacement);
                };
                    
                //insert the content replacement
                var dataReplacement = function(){
                    var addChildren = function(){
                        This.assembleContent(function(text){
                            This.assembled += text;
                            This.input.callback(closingReplacement);
                        });
                    };
                    if(((This.content) instanceof Array) && This.rule.contentReplacement){
                        This.rule.contentReplacement.instantiate(This.content, This, true, function(rep){
                            if(rep!=null){
                                This.assembled += rep;
                                This.input.callback(closingReplacement);
                            }else{
                                This.input.callback(addChildren);
                            }
                        });
                    }else{
                        This.input.callback(addChildren);
                    }
                };
                
                    
                //insert the closing replacement
                var closingReplacement = function(){
                    if(This.rule.closingReplacement){
                        if(This.endMatch)
                            This.rule.closingReplacement.instantiate(This.endMatch.match, This, false, function(text){
                                This.assembled += text;
                                This.input.callback(finish);
                            });
                        else if(!This.rule.onlyWrapIfFullyMatched){
                            if(!surpressWarnings) console.warn("Closing replacement has been performed despite not having found a closing match for rule: "+This.rule.name);
                            This.rule.closingReplacement.instantiate([], This, false, function(text){
                                This.assembled += text;
                                This.input.callback(finish);
                            });
                        }else
                            This.input.callback(finish);
                    }else
                        This.input.callback(finish);
                };
                this.input.callback(openingReplacement);
            }else{
                this.assembleContent(function(text){
                    This.assembled += text;
                    This.input.callback(finish);
                });
            }
        }else{
            this.assembleContent(function(text){
                callback.call(this, text);
            });
        }
    };
    np.getDeleteRegexList = function(){
        var out = [];
        if(this.parentNode)
            out = this.parentNode.getDeleteRegexList();
        if(this.matchers.deletion){
            this.matchers.deletion.ruleName = this.rule.name;
            out.push(this.matchers.deletion);
        }
        return out;
    };
        //methods to be used when assembling node
    np.getClosingData = function(){
        var args = Array.prototype.slice.call(arguments);
        if(this.endMatch && this.endMatch.exp.getData){
            args.unshift(this.endMatch);
            return this.endMatch.exp.getData.apply(this, args);
        }
    };
    np.getData = function(){
        var args = Array.prototype.slice.call(arguments);
        if(this.startMatch && this.startMatch.exp.getData){
            args.unshift(this.startMatch);
            return this.startMatch.exp.getData.apply(this, args);
        }
    };
    np.cutDown = function(text){
        text = this.trim(text, true);
        var m = text.match(/^(\s*)/);
        if(m)
            text = text.replace(new RegExp("^"+m[0], "gm"), "");
        return text;
    };
    np.trim = function(text, leaveFirstTab){
        if(leaveFirstTab)
            return text.replace(/^(\s*\n)?((.|\s)*?)\s*$/, "$2");
        return text.replace(/^\s*((.|\s)*?)\s*$/, "$1");
    };
    np.filterChildren = function(func, includeText){};
    
    //wrapper Node
    function WrapperNode(parentNode, startMatch, rule){
        Node.call(this, parentNode, rule, startMatch);
        if(typeof(startMatch)!="number"){
            if(startMatch && startMatch.match)
                this.startIndex = startMatch.match.index;   //the start position from which it takes the text
            this.startMatch = startMatch;                   //the data of the startMatch
        }else{
            this.startIndex = startMatch;
        }
        
        this.content = [];                                  //the final content of the node
        this.searchIndex = this.startIndex;                 //the index from which is looked for a next rule match
        this.insertIndex = this.searchIndex;                //the last index from which text was inserted
        
        if(this.rule){
            if(this.rule.closingMatcher){
                this.rule.closingMatcher.funcCallerObj = this;//set the context for the rule's closing expression
            }
                
            this.input.ruleStack.pushRule(this.rule);
            this.splitText();
            this.input.ruleStack.popRule();
        }else
            this.splitText();
    }
    WrapperNode.prototype = Object.assign({}, Node.prototype, {
        splitText: function(inpRules){
            var matchers = this.input.ruleStack.getRules().slice();
            
            //add the element closing matcher
            if(this.matchers.closing)
                matchers.unshift(this.matchers.closing);
                
            //add all the deletion rules
            matchers = this.getDeleteRegexList().concat(matchers);
            
            var lastRemoveIndex = -1;
            
            //execute rules untill done
            for(var m=0; m<10000; m++){ //just a dirty way of making sure there are no infinite loops
                
                //go through all rules, and find the closest
                next = {index:Infinity};
                for(var i=0; i<matchers.length; i++){
                    var matcher = matchers[i];
                    
                    var rule = null;
                    var match = null;
                    var index = null;
                    var matchData = null;
                    if(matcher instanceof Matcher){ //ending matcher or deletion matcher
                        var isClosingMatcher = matcher==this.matchers.closing;
                        
                        //modify start index for the closting matcher, may not be at the start of just removed
                        //group, may not be at start of opening either, otherwise tabs close themselves
                        var startIndex = this.searchIndex;
                        if(isClosingMatcher){
                            startIndex = Math.max(this.startIndex+matcher.offset, startIndex);
                            if(this.matchers.deletion && this.matchers.deletion.lastMatchIndex)
                                startIndex = Math.max(this.matchers.deletion.lastMatchIndex+matcher.offset, startIndex);
                        }
                        matchData = matcher.exec(this.input.text, startIndex, null, 
                            isClosingMatcher? this.startMatch.expIndex: undefined);
                        if(matchData.matched && matchData.match){
                            match = matchData.match;
                            index = match.index;
                        }
                        if(isClosingMatcher){
                            matcher.prevMatchIndex = index;
                        }
                    }else{
                        matchData = matcher.getNextMatch(this);
                        rule = matcher;
                        if(matchData.matched && matchData.match){
                            match = matchData.match;
                            index = match.index;
                        }
                    }
                    if(index)
                        matcher.prevMatchIndex = index;
                    
                    //check if it found a match
                    if(match){
                        //if the match is closer than the current next, set the next to the match
                        if(index<next.index){
                            next = {
                                index: match.index,
                                matcher: matcher,
                                rule: rule,
                                match: match,
                                matchData: matchData
                            };
                        }
                    }
                }
                //stop if the found match doesn't fall within the scope anymore
                if(Math.ceil(next.index)>this.input.length || !next.match)
                    break;
                    
                //excute the rule that is found
                var newIndex;
                if(next.rule){
                    var node = next.rule.getNode(this);
                    if(node){
                        newIndex = node.endIndex!=null?node.endIndex:this.input.length;
                        var preText = this.input.text.substring(this.insertIndex, node.startIndex);
                        if(preText.length>0)
                            this.content.push(preText);
                        node.nodeIndex = this.content.length;
                        this.content.push(node);
                        this.insertIndex = newIndex;
                    }else{
                        newIndex = this.searchIndex;
                    }
                }else if(next.matcher == this.matchers.closing){
                    this.endIndex = next.match.index;
                    this.endMatch = next.matchData;
                    this.input.cut(this.endIndex, next.match[0].length, next.matchData.rep);
                    var preText = this.input.text.substring(this.insertIndex, this.endIndex);
                    if(preText.length>0)
                        this.content.push(preText);
                    this.searchIndex = this.endIndex;
                    this.insertIndex = this.searchIndex;
                    break;
                }else{
                    newIndex = next.index;
                    next.matcher.lastMatchIndex = newIndex;
                    next.matchData.exp.lastMatchIndex = newIndex;
                    this.input.cut(newIndex, next.match[0].length);
                    // this.shiftEearliestEnd(next.match[0].length);
                }
                this.searchIndex = newIndex;
                
                //stop loop if there is no text left
                if(this.searchIndex>this.endIndex || this.searchIndex>this.input.length)
                    break;
            }
            
            if(this.endIndex==null || this.insertIndex!=this.endIndex){
                if(this.endIndex==null) //if no end could be found, end it at the maximum search range
                    this.endIndex = this.input.length;
                    
                //insert the text that is left, if any
                var textLeft = this.input.text.substring(this.insertIndex, this.endIndex);
                if(textLeft.length>0)
                    this.content.push(textLeft);
            }
        },
        getText: function(){
            if(this.endIndex)
                return this.input.text.substring(this.startIndex, this.endIndex);
            return this.input.text.substring(this.startIndex);
        },
        assembleContent: function(callback){
            var This = this;
            var content = "";
            if(this.assembledContent)
                callback.call(this, this.assembledContent);
            else{
                var children = [].concat(this.content);
                function processChild(){
                    if(children.length==0){
                        This.assembledContent = content;
                        callback.call(This, content);
                    }else{
                        var child = children.shift();
                        if(child.assemble){
                            child.assemble(function(text){
                                content += text;
                                processChild();
                            });
                        }else{
                            content += child.toString();
                            This.input.callback(processChild);
                            // processChild();
                        }    
                    }
                }
                processChild();
            }
        },
        filterChildren: function(func, includeText){
            var callback = arguments[arguments.length-1];
            if(typeof(callback)!="function" || arguments.length==1) callback = function(){};
            var This = this;
            
            var index = -1;
            var children = [].concat(this.content);
            var removeChild = function(remove){
                if(remove)
                    This.content.splice(index--, 1);
                filterChild();
            };
            var filterChild = function(){
                index++;
                if(children.length==0){
                    callback.call(This);
                }else{
                    var child = children.shift();
                    var continued = false;
                    if(child.rule!=null || includeText){
                        //either get a callback from the function, or get a boolean response immediately
                        var remove = func.call(child, child, function(remove){
                            if(!continued){
                                continued = true;
                                removeChild(remove);   
                            }
                        });    
                        if(typeof(remove)=="boolean" && !continued){
                            continued = true;
                            removeChild(remove);   
                        }
                    }else{
                        filterChild();
                    }
                }
            };
            filterChild();
        }
    });
    WrapperNode.prototype.constructor = WrapperNode;
    
    //character Node
    function TextNode(parentNode, rule, match){
        Node.call(this, parentNode, rule, match);
        
        this.content = [match.match[0]];
        this.startIndex = match.match.index;
        this.endIndex = this.startIndex+match.match[0].length;
    }
    TextNode.prototype = Object.assign({
        assembleContent: function(callback){
            callback.call(this, "");
        }
    }, Node.prototype);
    TextNode.prototype.constructor = TextNode;
    
    //srcNode
    function SrcNode(text){
        if(!(text instanceof Input)){
            text = new Input(text, Empirler.syntax.ruleSet, this);
        }
        this.input = text;
    }
    SrcNode.prototype = Object.assign({}, WrapperNode.prototype);
    SrcNode.prototype.constructor = SrcNode;
    SrcNode.prototype.split = function(){
        WrapperNode.call(this, null, 0);
    };
    
    
    //text holder
    function Input(text, ruleSet, srcNode){
        this.text = text;
        this.srcText = text;
        this.srcNode = srcNode;
        
        this.ruleStack = new RuleStack(ruleSet);
        this.stackDepth = 0; //tracing the depth of the function stack, to cut it off if needed
        this.stackDepthCutoff = 1000;
    }
    var tp = Input.prototype;
    tp.callback = function(callback){
        if(++this.stackDepth > this.stackDepthCutoff){
            this.stackDepth = 0;
            setTimeout(callback);
        }else{
            callback();
        }
    }
    tp.cut = function(index, length, replacement){
        if(!replacement) replacement = "";
        var oldLength = this.text.length;
        this.text = this.text.substring(0, index)+replacement+this.text.substring(index+length);
        
        return oldLength-this.text.length;
    };
    tp.__defineGetter__("length", function(){
        return this.text.length; 
    });
    
    
    
    //some 'small' file utilities to be used in user functions
    var urlRegex = /^(https?:|www.)/;
    (function(){ 
        if(typeof(self)!="undefined" && self.XMLHttpRequest){
            var cors_api_host = 'cors-anywhere.herokuapp.com';
            var cors_api_url = 'https://' + cors_api_host + '/';
            var slice = [].slice;
            var origin = self.location.protocol + '//' + self.location.host;
            var open = XMLHttpRequest.prototype.open;
            self.XMLHttpRequest.prototype.open = function() {
                var args = slice.call(arguments);
                if(Empirler.attemptCrossOriginCalls){
                    var targetOrigin = /^https?:\/\/([^\/]+)/i.exec(args[1]);
                    if(targetOrigin && targetOrigin[0].toLowerCase() !== origin &&
                        targetOrigin[1] !== cors_api_host) {
                        args[1] = cors_api_url + args[1];
                    }
                }
                return open.apply(this, args);
            };
        }
    })(); //cross origin fix client side
    var getFile = function(relativeBaseFolder, absoluteBaseFolder, file, execute, variable, callback){
        var aSync = Empirler.runAsynchronous;
        text = "";
        if(!Empirler.runServerSide){
            if(!file.match(urlRegex) && absoluteBaseFolder!=null){ //only append path if it isn't an external file
                var path = absoluteBaseFolder.split("/");
                var fileP = file.split("../");
                for(var i=1; i<fileP.length; i++) path.pop();
                file = path.join("/")+"/"+fileP.pop();
            }
            
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open("GET", file, aSync);
            
            var onReceive = function(forced){
                if(xmlHttp.status!=200 && !forced){
                    console.error("file couldn't be found; "+file+" in "+absoluteBaseFolder);
                    return null;  
                }
                text = xmlHttp.responseText;
                if(execute) text = eval(text);
                if(variable) text = window[variable];
                if(callback) callback(text);
            };
            
            if(aSync){
                xmlHttp.onreadystatechange = function(){
                    if(this.readyState==4)
                        onReceive();
                };
            }else{
                onReceive();
            }
            
            xmlHttp.send(null);
        }else{
            var fs = require('fs');
            var path = require('path');
            var p;
            if(relativeBaseFolder!=null)
                p= path.join(__dirname, relativeBaseFolder, file);
            else
                p= path.join(__dirname, file);
            
            if(!file.match(urlRegex)){//get internal file
                if(execute){
                    text = require(p);
                }else{
                    if(aSync){
                        fs.readFile(p, function(err, data){
                            if(err){
                                Empirler.onWarning(err);
                                if(callback) callback();
                            }else{
                                if(callback) callback(data.toString());
                            }
                        });
                        return;
                    }else{
                        try{
                            text = fs.readFileSync(p).toString();
                        }catch(e){
                            Empirler.onWarning(e);
                        }
                    }
                }
            }else{
                if(!execute){ //can't execute external files
                    var http = require("http");
                    http.get(file).on('response', function(response){
                        var body = '';
                        response.on('data', function(chunk){
                            body += chunk;
                        });
                        response.on('end', function(){
                            if(callback) callback(body);
                        });
                    });
                    return;
                }       
            }
            if(callback) callback(text);
        }
    };
    var embedResources = function(text, callback){
        //help variables/functions
        {
            var getFileFromLinkAttribute = function(link, callback){
                if(link[0]=='"' && link[link.length-1]=='"') link = link.substring(1, link.length-1);
                if(link[0]=="'" && link[link.length-1]=="'") link = link.substring(1, link.length-1);
                if(link[0]=="/"){
                    getFile(null, null, link, false, null, function(file){
                        callback({link:link, file:file});
                    });
                }else{
                    Empirler.onWarning("Links must be absolute to be embeded");
                    callback({link:link, file:""});
                }
            };
            var mimeTypes = {jpg:"image/jpeg", png:"image/png", jpeg:"image/jpeg", gif:"image/gif", ttf:"font/ttf", woff:"font/woff", woff2:"font/woff2", otf:"font/otf", eot:"application/vnd.ms-fontobject"};
            var getBase64FromUrl = function(link, parentPath, callback){
                if(link[0]=='"' && link[link.length-1]=='"') link = link.substring(1, link.length-1);
                if(link[0]=="'" && link[link.length-1]=="'") link = link.substring(1, link.length-1);
                
                var linkOr = link;
                if(Empirler.runServerSide){ //add the embed location to parentpath beforehand, so that it can be removed if link contains ../
                    if(parentPath[0]!="/")
                        parentPath = Empirler.embedLocation+parentPath; //relative path
                    if(parentPath.substring(0, __dirname.length)==__dirname) 
                        parentPath = parentPath.substring(__dirname.length);
                }
                
                if(!link.match(urlRegex) && linkOr[0]!="/"){
                    var parts = parentPath.split("/");
                    var linkParts = link.split(/\.\.\//g);
                    for(var i=0; i<linkParts.length; i++) parts.pop();
                    parts.push(linkParts.pop());
                    link = parts.join("/");
                }
                
                var extension = link.split(".").pop();
                var mimeType = mimeTypes[extension]||"text/plain";
                
                if(!Empirler.runServerSide){
                    try{
                        var xmlHttp = new XMLHttpRequest();
                        xmlHttp.open('GET', link, true);
                        xmlHttp.responseType = 'blob';
                        xmlHttp.onload = function(){
                            var fr = new FileReader();
                            fr.onload = function(){
                                callback(this.result);
                            };
                            fr.readAsDataURL(xmlHttp.response);
                        };
                        xmlHttp.send();
                    }catch(e){
                        callback(Empirler.onWarning(e, ""));
                    }
                }else{
                    try{
                        const fetch = require("fetch-base64");
                        if(link[0]!="+" && link[0]!="-"){ //don't execute if it is some js template thing
                            link = link.replace(/^https/, "http");
                            if(!link.match(urlRegex)){
                                if(link[0]=="/")
                                    link = __dirname+"/"+link.split(/\?|#/).shift(); //turn link in valid internal path
                                else
                                    link = Empirler.embedLocation+link.split(/\?|#/).shift(); //turn link in valid internal path
                            }
                            fetch.auto(link).then(function(data){ //got to fix fetch module manually with "const URL = require('url').Url;"
                                callback(data[1]);
                            }).catch(function(reason){
                                callback(Empirler.onWarning(reason, ""));
                            });
                        }else{
                            callback("");
                        }
                    }catch(e){
                        callback(Empirler.onWarning(e, ""));
                    }
                }
            };
            var replaceAsync = function(string, regex, replace, onFinish){
                var start = 0;
                var m;
                var exec = function(){
                    m = regex.exec(string.substring(start));
                    if(m){
                        replace(m, function(replacement){
                            var index = start+m.index;
                            string = string.substring(0, index)+
                                    replacement+
                                    string.substring(index+m[0].length, string.length);
                                    
                            start = index+replacement.length;
                            regex.lastIndex = 0;
                            exec();
                        });
                    }else{
                        onFinish(string);
                    }
                };
                exec();
            };
            
            var scriptRegex = /<script(?:\s*\w+(?:=(?:'(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^ ])+))?)*\s*src=('(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^ ])+)(?:\s*\w+(?:=(?:'(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^ ])+))?)*><\/script>/g;
            var cssRegex = /<link[^>]+(?:rel=(?:"stylesheet"|'stylesheet'|stylesheet)[^>]+href=('(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^ >])+)|href=('(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^ '"])+)[^>]+rel=(?:"stylesheet"|'stylesheet'|stylesheet))(?:\s+[^>]+(?:=(?:'(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^ >])+))?)*>/g;
            var imageRegex = /(<(?:img|link)\s*(?:\w+=(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^ >]*)\s*)*(?:src|href)=)("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^ >]*)((?:\s*\w+=(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^ >]*))*>)/g;
            // var faviconRegex = /<link[^>]+(?:rel=(?:"icon"|'icon'|icon)[^>]+href=('(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^ >])+)|href=('(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^ '"])+)[^>]+rel=(?:"icon"|'icon'|icon))(?:\s+[^>]+(?:=(?:'(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^ >])+))?)*>/g;
            var cssUrlRegex = /url\(('(?:\\.|[^'])+'|"(?:\\.|[^"])+"|(?:[^)])+)\)/g;
        }
        
        //actual embeding
        {
            var convertCss = function(text){
                replaceAsync(text, cssRegex, function(linkMatch, linkReplaceCallback){
                    getFileFromLinkAttribute(linkMatch[1]||linkMatch[2], function(ret){
                        replaceAsync(ret.file, cssUrlRegex, function(urlMatch, urlReplaceCallback){
                            getBase64FromUrl(urlMatch[1], ret.link, function(base64){
                                urlReplaceCallback("url('"+base64+"')");
                            });
                        }, function(css){
                            linkReplaceCallback("<style>"+css+"</style>");
                        });
                    }); 
                }, convertImages);
            };
            var convertImages = function(text){
                replaceAsync(text, imageRegex, function(imageMatch, replaceCallback){
                    getBase64FromUrl(imageMatch[2], "", function(base64){
                        replaceCallback(imageMatch[1]+"'"+(base64||imageMatch[2])+"'"+imageMatch[3]);
                    });
                }, convertJs);
            };
            var convertJs = function(text){
                replaceAsync(text, scriptRegex, function(scriptMatch, replaceCallback){
                    getFileFromLinkAttribute(scriptMatch[1], function(ret){
                        replaceCallback("<script>"+ret.file.replace(/<\/script>/g, "</script\\>")+"</script>");
                    });
                }, callback);
            };
            
            // convertImages(text);
            convertCss(text);
        }
    }
    
    //actual user methods and variables
    Empirler.Syntax = Syntax;
    Empirler.RuleSet = RuleSet;
    Empirler.Rule = Rule;
    Empirler.paths = {
        relativeFormatsPath: relativeFormatsPath, 
        absoluteFormatsPath: absoluteFormatsPath,
        relativeLibrariesPath: relativeLibrariesPath,
        absoluteLibrariesPath: absoluteLibrariesPath,
    };
    Empirler.runServerSide = runServerSide;
    Empirler.embedFiles = embedFiles;
    Empirler.embedLocation = embedLocation;
    Empirler.runAsynchronous = runAsynchronous;
    Empirler.attemptCrossOriginCalls = attemptCrossOriginCalls;
    Empirler.compile = function(text, callback){
        var args = [];
        args.push.apply(args, arguments);
        
        //remove callback from input arguments
        if(typeof(args[args.length-1])=="function")
            callback = args.pop();
        else throw Error("No callback provided");
        
        try{
            if(Empirler.syntax){
                var embedFilesVal = Empirler.embedFiles; //make a copy so that it doesn't matter if changed while compiling
                var srcNode = new SrcNode(text);
                var input = srcNode.input;
                
                //preProcess the text, and do initialisation in the syntaxObject
                var preProcess = function(){
                    args.push(process); //add callback for next step of convertion
                    args.shift();
                    args.unshift(input);
                    Empirler.syntax.preProcess.apply(Empirler.syntax, args);
                };
                
                //main processing depending on rules in syntax
                var process = function(text){
                    srcNode.split();
                    srcNode.assemble(function(text){
                        var assembled = text;
                        postProcess(assembled);
                    });
                };
                
                //post process the text, and do clean up in the syntaxObject
                var postProcess = function(assembled){
                    var empirlerCode = "";
                    var empirlerSyntax = "";
                    var empirlerInit = "";
                    
                    //post process the text
                    var pp = function(){
                        Empirler.syntax.postProcess(input, assembled, 
                            "\n<script\>"+
                                empirlerCode+"\n"+
                                empirlerSyntax+"\n"+
                                empirlerInit+
                            "</script\>",
                            !!input.requiresPageUpdate,
                            embedFiles
                        );    
                    };
                    
                    //get the empirler code if needed before post processing
                    if(!!input.requiresPageUpdate){
                        Empirler.getFile("../Empirler.js", function(code){
                            empirlerCode = code;
                            Empirler.getFile(Empirler.syntax.name+".js", function(code){
                                empirlerSyntax = code.replace(/<\/script>/g, "</script\\>");
                                EmpirlerInit = "Empirler.setSyntax(syntax);\nEmpirler.updatePageElements();";
                                pp();
                            });
                        });
                    }else{
                        pp();
                    }
                };
                
                //embed css and js files instead of their urls if needed
                var embedFiles = function(assembled){
                    if(embedFilesVal){
                        embedResources(assembled, finish);
                    }else{
                        finish(assembled);
                    }    
                };
                
                //clean up and return the assemled code
                var finish = function(assembled){
                    callback(assembled);
                };
                
                //start process
                preProcess();
            }else{
                callback(Empirler.onError("No syntax was defined!", text));
            }
        }catch(e){
            callback(Empirler.onError(e, text));
        }
    };
    Empirler.transpile = Empirler.compile;
    Empirler.onError = function(message, returnText){
        console.error(message);
        return returnText;
    };
    Empirler.onWarning = function(message, returnText){
        console.error(message);
        return returnText;
    };
    var lastSetSyntaxCall;
    Empirler.setSyntax = function(syntax, callback){
        if(typeof(syntax)=="string"){
            var name = syntax;
            lastSetSyntaxCall = name;
            var preRequestErrorTrace = new Error("preFileRequestTrace for '"+syntax+"' request");
            Empirler.getFile(syntax+".js", true, function(setup){
                if(setup && typeof(setup)=="function"){
                    setup(Empirler, function(syntax){
                        syntax.name = name;
                        if(lastSetSyntaxCall == name){ //if this isn't the case, another setSyntax call has already been made
                            Empirler.syntax = syntax;
                            if(callback) callback();
                        }
                    });
                }else{
                    Empirler.onError(preRequestErrorTrace);
                    Empirler.onError("mode '"+syntax+"' couldn't be found");
                    if(callback) callback();
                }
            });
        }else{
            Empirler.syntax = syntax;
            if(callback) callback();
        }
    };
    Empirler.updatePageElements = function(){
        Empirler.syntax.updatePageElements();
    };
    
    Empirler.getLibrary = function(file, execute, variable){
        var callback = arguments[arguments.length-1];
        if(typeof(callback)=="function")
            arguments[arguments.length-1] = null;
        else callback = null;
        
        if(typeof(execute)=="string") variable = execute;
        getFile(
            Empirler.paths.relativeLibrariesPath, 
            Empirler.paths.absoluteLibrariesPath, 
            file, 
            execute==false?false:true, 
            variable, 
            callback);
    };
    Empirler.getFile = function(file, execute){
        var callback = arguments[arguments.length-1];
        if(typeof(callback)=="function")
            arguments[arguments.length-1] = null;
        else callback = null;
        
        getFile(
            Empirler.paths.relativeFormatsPath, 
            Empirler.paths.absoluteFormatsPath, 
            file, 
            execute, 
            null, 
            callback);
    };
    
    
    //export /return Empirler
    if(typeof(module)!="undefined")
        module.exports = Empirler;
    return Empirler;
})()
