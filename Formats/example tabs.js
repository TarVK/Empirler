if(typeof(module)=="undefined") var module = {}; //support node as well as client side transpiling
module.exports = (function(Empirler, callback){
    var Syntax = Empirler.Syntax;
    var RuleSet = Empirler.RuleSet;
    var Rule = Empirler.Rule;
    
    //the rules to use
    var ruleSet = new RuleSet([
        new Rule({ //The editor is setup to treat tab inputs as 4 spaces, but you could obviously adapt this to real tabs
            n: "indent",
            o: /^( +)/,
            d: {match:/^@0/, reset:/$/}, //@0 will be replaced by capture group 0 of the opening, thus only matching the same number of spaces
            c: {match:/^/, not:/^@0/, offset:1}, //offset says that the closing should be at least 1 character removed from the deletion and start. otherwise this element would close after doing its own deletion.
            f: false, //also wrap if no closing is found
            or: function(m){
                return "<div class=tab style=margin-left:"+(m.length*10)+"px>\n"
            },
            cr: "</div>\n",
        }),
        new Rule({ 
            n: "newLine",
            o: /\n/,
            or: "<br>\n"
        })
    ]);
    
    //the completed syntax (rules and post processor)
    var syntax = new Syntax({
        ruleSet: ruleSet,
        postProcessor: function(input, content, callback){
            callback = arguments[arguments.length-1];
            
            var groupVisualisation = true; //if set to true, adds some styling to visualise what is going on
            
            if(groupVisualisation)
                callback([ //add some styling to the page in order to show how the data is grouped
                    "<style>",
                    "   .tab{",
                    "       margin: 2px;",
                    "       padding: 3px;",
                    "       width: fit-content;",
                    "       border: 1px solid black;",
                    "   }",
                    "</style>",
                    "<div class=tab>",
                    content,
                    "</div>"].join("\n")
                );
            else 
                callback(content);
        }
    });
    callback(syntax);
});