var express = require('express');
var commissioning = require('./app.js');
var app = express();

app.use(commissioning({
  uuid: '1af9942c-f1f5-4f50-ae25-92833b654ead'
}));

app.listen(80);
