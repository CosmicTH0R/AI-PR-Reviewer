// This file contains intentionally poor code for the AI bot to review!

function calculateTotalPrice(items) {
    var total = 0;
    
    // Using a regular for loop instead of for...of or reduce
    for (var i = 0; i < items.length; i++) {
        // Missing null checks on items[i] and items[i].price
        total = total + items[i].price;
    }
    
    // hardcoded currency and logging instead of returning
    console.log("The total is $" + total);
}

// Global variable pollution
adminUser = "admin";
secretKey = "123456789"; 

function authenticate(user, pass) {
    if(user == adminUser && pass == secretKey) {
        return true;
    }
    return false;
}

// Added to generate a new commit hash and trigger the webhook
function badlyNamedFunc() {
    var x = 10;
    if (x = 5) { // intentional assignment instead of equality
        console.log("x is 5!");
    }
}
