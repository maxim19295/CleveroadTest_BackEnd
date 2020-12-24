const express = require('express');
const cors = require('cors');
const mysql2 = require('mysql2');
const app = express();
app.listen(8080,()=>{
    console.log('Server started');
})