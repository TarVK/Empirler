if(typeof(module)=="undefined") var module = {}; //support node as well as client side transpiling
module.exports = (function(Empirler, callback){
    var Syntax = Empirler.Syntax;
    var RuleSet = Empirler.RuleSet;
    var Rule = Empirler.Rule;
    
    //bbcode setup
    var getAttribute = function(match, name, validateRegex){
        var text = match.match[1]||"";;
        var regex = new RegExp("\\s"+name+"=('((\\\\.|[^'])*)'|\"((\\\\.|[^\"])*)\"|[^\\s\"]*)(\\s|$)", "i");
        var match = text.match(regex);
        if(match)
            if(match[2]!=null) match = match[2];
            else if(match[4]!=null) match = match[4];
            else match = match[1];
        
        if(validateRegex)
            return match&&match.match(validateRegex)? match: null;
        
        return match!=null? match: !!text.match(RegExp("(\\s|^)"+name+"(\\s|$)", "i"));
    };
    var getAtrributes = function(match){
        var regex = /\b(\w[^=]+)=?/g;
        var m;
        var attributes = [];
        while((m = regex.exec(match))){
            var key = m[1];
            var val = getAttribute({match:[0, match]}, key);
            
            attributes.push([key, val]);
            regex.lastIndex += (val.length||1);
        }
        return attributes;
    };
    var bb = [{
        normal: ["bb","BBcode"],
        selfClosing: ["cbb", "closingBBcode"],
        openingMatcher: function(data){
            return {
                match:new RegExp("\\["+data+"(\\s(?:\\s*(?:=|\"(?:\\\\.|[^\"])*\"|'(?:\\\\.|[^'])*'|[^\\] =\"']*))*)?\\]", "i"),
                getData: getAttribute, //get data is a special method and can be accessed through the node itself
                getAttributes: getAtrributes //aby other defined mathods must be accessed through node.startMatch.exp.method
            };
        },
        deletionMatcher: function(data){
            return {match:/^( ){1,4}/, reset:/$/};
        },
        closingMatcher: function(data){
            return {
                match:new RegExp("\\[\\/"+data+"(\\s(?:\\s*(?:=|\"(?:\\\\.|[^\"])*\"|'(?:\\\\.|[^'])*'|[^\\] =\"']*))*)?\\]", "i"),
                getData: getAttribute,
                getAttributes: getAtrributes
            };
        },
        openingReplacement: "",
        closingReplacement: ""
    }];
    
    //the rules to use
    var ruleSet = new RuleSet([
        new Rule({ //example rule
            name: "bold",
            bb: "b",
            or: "<b>",
            cr: "</b>"
        }, bb), new Rule({ //example rule2
            name: "margin",
            bb: ["m", "magin"],
            or: function(){
                console.log(this);
                return "<span style=margin-left:"+(this.getData("amount", /\d+/)||0)+"px;>"; //the regex is optional, will return false if retreived value doesn't match regex
            },
            cr: "</span>"
        }, bb),
    ]);
    
    //the completed syntax
    var syntax = new Syntax({
        ruleSet: ruleSet
    });
    callback(syntax);
});