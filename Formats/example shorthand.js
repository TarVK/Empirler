if(typeof(module)=="undefined") var module = {}; //support node as well as client side transpiling
module.exports = (function(Empirler, callback){
    var Syntax = Empirler.Syntax;
    var RuleSet = Empirler.RuleSet;
    var Rule = Empirler.Rule;
    
    //shorthand notation definition
    var sh = [{
        normal: ["tag"],
        selfClosing: ["sTag"], //you can leave this out if you don't want to allow for self closing rules
        openingMatcher: function(data){
            return { //return what would usually be defined in the rule's opening field
                match: new RegExp("<(\!)?"+data+"(\!)?>"),  //a simple tag with possibily a exclamation mark at the start and end
                getData: function(match, data){ //match is the Match object, data is the specified data that someone wants
                    match = match.match; //get the actual regex match itself
                    if(data=="start"){
                        return match[1]!=undefined;
                    }else{
                        return match[2]!=undefined;
                    }
                }
            };
        },
        closingMatcher: function(data){
            return "</"+data+">"; //return a simple matcher
        },
        openingReplacement: "", //the default replacement for a rule if no replacement is defined
        closingReplacement: "" 
    }];
    
    //the rules to use
    var ruleSet = new RuleSet([
        new Rule({ //rule making use of the tag shorthand
            name: "test",
            tag: "test",
            openingReplacement: "#",
            closingReplacement: "#"
        }, sh),
        new Rule({ //rule making use of the tag shorthand
            name: "some_tag", //name doesn't affect behaviour
            tag: "tag",
            openingReplacement: function(){
                if(this.getData("start")) return "<!";
                else                 return "<";
            },
            closingReplacement: function(){
                if(this.getData("end")) return "!>";
                else                 return ">";
            },
        }, sh),
    ]);
    
    //the completed syntax (in this case only consisting of the actual rules)
    var syntax = new Syntax({ruleSet: ruleSet});
    //pre and postProcessor are optional and thus can be left out
    callback(syntax);
});