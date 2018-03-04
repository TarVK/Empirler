if(typeof(module)=="undefined") var module = {}; //support node as well as client side transpiling
module.exports = (function(Empirler, callback){
    var Syntax = Empirler.Syntax;
    var RuleSet = Empirler.RuleSet;
    var Rule = Empirler.Rule;
    
    //the rules to use
    var ruleSet = new RuleSet([
        new Rule({ //example rule
            name: "test",
            opening: "{",
            openingReplacement: "",
            closing: "}",
            closingReplacement: "",
            dataReplacement: function(text, callback){
                return text.toUpperCase(); //callback only has to be used if return isn't used
            }
        })
    ]);
    
    //the completed syntax (rules and pre and post processor)
    var syntax = new Syntax({
        ruleSet: ruleSet,
        postProcessor: function(input, content, callback){
            callback = arguments[arguments.length-1]; //arguments might differ, but callback is always the last argument
            
            Empirler.getFile("tmpl multifile.html", function(file){
                callback(file.replace("[{contentArea}]", content));
            });
        }
    });
    //pre and postProcessor are optional and thus can be left out
    callback(syntax);
});