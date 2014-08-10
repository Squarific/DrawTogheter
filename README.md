# DrawTogheter #

## Demo ##

http://squarific.com/drawTogheter

## Donate ##

If you want to see new feature or help keep the server up (+/- 40 dollar/month)
then you can help by donating with bitcoins: [148a4MsNDoRh7cpCidxUNwM63eQr1UNtkb](bitcoin://148a4MsNDoRh7cpCidxUNwM63eQr1UNtkb)

## How to use ##

### Server ###


Install `node`, `npm` and the following npm modules: `mysql`, `socket.io`.

Edit the mysql data in main.js and run the databse.sql file on your database.

Then you can startup the server using `node main.js` after you cd into the server folder.

### Client ###


In index.html you have to change the server both in the socket.io script tag and in the `new  DrawTogheter()` call.

If you want to make your own interface you can initialize the client yourself.

Just include the DrawTogheter.js, the polyfill and the socket.io script, then
you can intitialize using `var name = new DrawTogheter(containerElement, serverString)`

#### Example ####

    containerElement = document.getElementById('drawRegion');
    serverString = 'http://127.0.0.1:8475'; //8475 is the default port
    var drawTogheter = new DrawTogheter(containerElement, serverString);
