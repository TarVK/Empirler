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
                console.log(this, arguments); //if you click the </> button in the top right of the code area you can toggle the console
                this.input.fields.push(text);
                return text.toUpperCase(); //callback only has to be used if return isn't used
            }
        })
    ]);
    
    //the completed syntax (rules and pre and post processor)
    var syntax = new Syntax({
        ruleSet: ruleSet,
        preProcessor: function(input, callback){
            callback = arguments[arguments.length-1]; //arguments might differ, but callback is always the last argument
            
            //assign data to be tracked during the transpiling, rules can acces this data
            input.fields = []; 
            
            //if you want to alter the input text, you can do input.text = 'text'
            
            callback();
        },
        postProcessor: function(input, content, callback){
            callback = arguments[arguments.length-1]; //arguments might differ, but callback is always the last argument
            
            var output = "test\n" + content;
            
            console.log(input.fields);
                
            callback(output);
        }
    });
    //pre and postProcessor are optional and thus can be left out
    callback(syntax);
});