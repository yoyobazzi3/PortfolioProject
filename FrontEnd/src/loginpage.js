document.addEventListener("DOMContentLoaded", function(){
    const submitUsername = document.getElementById("submit-username");
    const helloDiv = document.getElementById("hellodiv")
    submitUsername.addEventListener("click", function(){
        console.log("Hello World");
        const hello = document.createAttribute("p")
        helloDiv.textContent = "Welcome Diva :)"
    });
});