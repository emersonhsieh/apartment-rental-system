var express = require('express');
var app = express();
var mongoose = require('mongoose');

const PORT_NUMBER = 3000;

mongoose.connect('mongodb://localhost/tenantData');

app.use(express.static(__dirname + 'client/'));
app.use('/scripts', express.static(__dirname + 'node_modules/'));

app.get('/app/users', function(req, res) {
    res.send('hi');
});

app.listen(PORT_NUMBER);