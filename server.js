var config = require('../chillhub.json');
var express = require('express');
var commissioning = require('./app.js');
var app = express();

app.use(commissioning(config));
app.listen(80);
