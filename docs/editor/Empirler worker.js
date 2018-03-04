if(self.location.host.indexOf("github")!=-1){ //fix the base location for github hosted site
    var parts = window.location.pathname.split("/");
    parts.shift();
    var projectPage = parts.shift();
    self.importScripts("/"+projectPage+"/Empirler.js");
    self.importScripts("/"+projectPage+"/Libraries/js-console/jsConsole.sf.js");
}else{
    self.importScripts("/Empirler.js");
    self.importScripts("/Libraries/js-console/jsConsole.sf.js");
}

//setup empirler and error handeling
{
    window = self;
    Empirler.onWarning = function(e, returnText){
        if(e instanceof Error)
            console.print("error", e.stack, -1, e);
        else{
            var e = new Error(e);
            console.print("error", e.stack, 0, e);
        }
        return returnText;
    };
    Empirler.onError = function(e, returnText){
        if(e instanceof Error)
            console.print("error", e.stack, -1, e);
        else{
            var e = new Error(e);
            console.print("error", e.stack, 0, e);
        }
        return returnText;
    };
}

//set up empirler interaction
{
    var syntaxMode;
    var keepOffset = false;
    initialized = false;
    var unInitCalls = []; //the calls before empirler was initialized
    Empirler.runAsynchronous = true;
    function transpile(code, oneFile, callback){
        if(initialized){
            Empirler.embedFiles = oneFile;
            Empirler.compile(code, "site browser", callback);
        }else{
            unInitCalls.push(arguments);
        }
    }
    function setSyntax(code, callback){
        initialized = false;
        if(code==null){
            callbacK();
            return; //only indicate that the syntax is not defined yet   
        }
        
        try{
            var initFunc = eval(code+"\n//@ sourceURL="+fileName.replace(/\s/,"_")+"\n//# sourceURL="+fileName.replace(/\s/,"_"));
        }catch(e){
            console.print("error", e.stack, -1, e);
            if(callback) callback(null, e.stack);
        }
        
        var callbackReceived = false;
        if(typeof(initFunc)=="function"){
            try{
                initFunc(Empirler, function(syntax){
                    if(!callbackReceived){ //only allow for 1 callback
                        callbackReceived = true;
                        
                        Empirler.setSyntax(syntax, function(){
                            keepOffset = false;
                            initialized = true;
                            for(var i=0; i<unInitCalls.length; i++){
                                transpile.apply(window, unInitCalls[i]);
                            }
                            unInitCalls = [];
                            if(callback) callback();
                        });
                    }
                });
            }catch(e){
                console.print("error", e.stack, -1, e);
                if(callback) callback(null, e.stack);
            }
        }else{
            if(callback) callback(null, "Provided code doesn't have the proper structure");
        }
    }
}

//intercept file request made by empirler for the usage of local files
{
    var externalFiles = {};
    var fileName = "";
    var open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(type, path, aSync){
        var args = [].slice.call(arguments);
        var ap = Empirler.paths.absoluteFormatsPath;
        if(ap == path.substring(0, ap.length)){
            var file = path.substring(ap.length+1);
            if(externalFiles[file]){
                var content = externalFiles[file];
                Object.defineProperty(this, "responseText", {value:content});
                Object.defineProperty(this, "status", {value:200});
                Object.defineProperty(this, "readyState", {value:4});
                this.send = function(){
                    if(this.onreadystatechange)
                        this.onreadystatechange.call(this);
                }
                return;
            }
        }
        return open.apply(this, args);
    };
}

//setup worker interaction
{
    onmessage = function(e){
        if(jsConsoleOnMessage.apply(self, arguments)) return; //call caught by js console
        
        var data = e.data;
        if(data.func=="transpile"){
            transpile(data.text, data.oneFile, function(result, error){
                if(error) postMessage({UID:data.UID, error:error});
                else    postMessage({UID:data.UID, result:result});
            });
        }else if(data.func=="setSyntax"){
            externalFiles = data.extraFiles;
            fileName = data.name;
            setSyntax(data.text, function(result, error){
                if(error) postMessage({UID:data.UID, error:error});
                else    postMessage({UID:data.UID, result:result});
            });
        }
    }
}
