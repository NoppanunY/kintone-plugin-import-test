alert("Alert from github")

function clicked(){
    alert("Function from github")
}

(function(){
    kintone.events.on('app.record.index.show', function(event) {
        alert("Alert from github")
    });
})()
 
