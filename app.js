const express = require('express');
const cors = require('cors');
const sql = require('mysql2');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator')
const fileUpload = require('express-fileupload');
const app = express();
app.use(fileUpload({}));
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.listen(8080,()=>{
    console.log('Server started');
})
const conn = sql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    database: 'cleveroadBD',
    password:''
});
conn.connect((err)=>{
    if(err){
        console.log(err);
    }
    else console.log('Success');
})
app.post('/api/login',
[
    check('email', 'Incorrect email').isEmail(),
    check('password', 'Required password')
      .exists()
  ]
,(req,res)=>{
    try{
    const {email, password} = req.body;
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(422).json({
        field: errors.array()[0].param,
        message: 'Wrong email or password'
      })
    }
    const query = `SELECT * FROM users WHERE email='${email}' AND password='${password}';`;
    conn.query(query,(err,result)=>{
        if(result.length>0){
            const token=jwt.sign({
                email
            },'ExamplePrivateKey',{expiresIn: '1h'});
            return res.json({token});
        }
        res.status(404).json({message: 'No matches'})

    })
}
    catch(error){
        res.status(500).json({message: error.message})
    }
})

app.post('/api/register',
[
    check('email', 'Incorrect email').isEmail(),
    check('password', 'Required password')
      .exists()
  ],
(req,res)=>{
    try{const {phone, name, email, password} = req.body;
    if (!errors.isEmpty()) {
        return res.status(422).json({
          field: errors.array()[0].param,
          message: 'Wrong email or password'
        })
      }
    const query = `SELECT COUNT(*) FROM users WHERE email='${email}'`;
    conn.query(query,(err,result)=>{
        if(result[0]['COUNT(*)']===1){
            res.status(401).json({message: 'The user already exists'})
        }
        else{
            const query = phone ? `INSERT INTO users (phone,name,email,password) VALUES ('${phone}','${name}','${email}','${password}')` : `INSERT INTO users (name,email,password) VALUES ('${name}','${email}','${password}')`;
            conn.query(query,(err,result)=>{
                if(result){const token=jwt.sign({
                email
            },'ExamplePrivateKey',{expiresIn: '1h'});
            return res.json({token})}
            else{
                return res.status(500).json({message: 'error in DB request'})
            }
        })
        }
    })}
    catch(err){
        res.status(500).json({message: err.message})
    }
})
app.get('/api/me',(req,res)=>{
    try{
        const token = req.headers['authorization'];
    if(!token){
        return res.status(401).json({message: 'Unauthorized (undefined token)'})
    }
    const {email} = jwt.verify(token,'ExamplePrivateKey');
    const query = `SELECT * FROM users WHERE email='${email}'`;
    conn.query(query,(err,result)=>{
        if(result.length>0){
            res.json({id: result.id, name: result.name, email: result.email})
        }
        else{
            res.status(401).json({message: 'Unautorized (not found in bd)'})
        }})
    }
    catch(err){
        res.status(500).json({message: err.message})
    }
})
app.get('/api/items',async (req,res)=>{
    try{const query = 'SELECT * FROM goods';
    conn.query(query,(err,result)=>{
            let resultGoods = result;
            for(let i = 0; i<resultGoods.length;i++){
                const query = `SELECT * FROM users WHERE id='${resultGoods[i].user_id}'`;
                conn.query(query,(err,result)=>{
                    if(result.length>0){resultGoods[i]={...resultGoods[i], user: {...result[0]}}
                    if(i===resultGoods.length-1){
                        res.json(resultGoods);
                    } 
                }
                });
            }
            
            
    })}
    catch(err){
        res.status(500).json({message: 'Internal server error'})
    }

})

app.get('/api/items/:id',(req,res)=>{
    try{const id = parseInt(req.params.id);
    const query = `SELECT * FROM goods WHERE id='${id}'`;
    conn.query(query,(err,result)=>{
        if(result){
            if(result.length>0){
                let resultGoods = result[0];
                const query = `SELECT * FROM users WHERE id='${resultGoods.user_id}'`;
                conn.query(query,(err,result)=>{
                    if(result.length>0){console.log(result[0]);
                    if(result.length>0){resultGoods={...resultGoods, user: {...result[0]}}}
                    res.json(resultGoods);
                    }
                });
            }
            else{
                res.status(404).json({message: 'Not found'})
            }
        }
        else{
            res.status(500).json({message: 'DB Error'})
        }
    })}
    catch(err){
        res.status(500).json({message: 'Internal server error'})
    }
})

app.put('/api/items/:id',
[
    check('title', 'Title should contain at least 3 characters').isLength({min: 3})
  ],
(req,res)=>{
    try {
        const id = parseInt(req.params.id);
        const title = req.body.title || null;
        const price = req.body.price || null;
        if (!errors.isEmpty()) {
            return res.status(422).json({
              field: errors.array()[0].param,
              message: errors.array()[0].msg
            })
          }
        const token = req.headers['authorization'];
    if(!token){
        return res.status(401).json({message: 'Unauthorized (undefined token)'})
    }
    const {email} = jwt.verify(token,'ExamplePrivateKey');
    const query = `SELECT id FROM users WHERE email='${email}'`;
    conn.query(query,(err,result)=>{
        if(result.length>0){
            const query = `SELECT id FROM goods WHERE user_id='${result[0].id}';`;
            conn.query(query,(err,result)=>{
                if(result.length>0){
                    if(result[0].id===id){
                const additionalString = title && price ? `title='${title}', price='${price}'` : title ? `title='${title}'` : price ? `price='${price}'` : '';
                const query = `UPDATE goods SET ${additionalString} WHERE id='${id}'`;
                conn.query(query,(err,result)=>{
                    if(result){const query = `SELECT * from goods WHERE id='${id}'`;
                    conn.query(query,(err,result)=>{
                        const result1 = {...result};
                        const query = `SELECT * from users WHERE id = '${result1[0].user_id}'`;
                        conn.query(query,(err,result)=>{
                            if(result){
                                res.json({...result1[0], user: {...result[0]}})
                            }
                        })
                    })}
                    else{
                        res.status(404).json({message: 'Not found'})
                    }
                })}
                else{
                    res.status(403).json({message: 'Forbidden'})
                }
                }
                else{
                    res.status(500).json({message: 'Invalid request in DB'})
                }
            })
        }
        else{
            res.status(401).json({message: 'Unauthorized'})
        }
    })
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

app.delete('/api/items/:id',(req,res)=>{
    try{
        const id = parseInt(req.params.id);
        const token = req.headers['authorization'];
    if(!token){
        return res.status(401).json({message: 'Unauthorized (undefined token)'})
    }
    const {email} = jwt.verify(token,'ExamplePrivateKey');
    const query = `SELECT id FROM users WHERE email='${email}'`;
    conn.query(query,(err,result)=>{
        if(result.length>0){
            const query = `SELECT id FROM goods WHERE user_id='${result[0].id}' AND id='${id}'`;
            conn.query(query,(err,result)=>{
                if(result.length>0){
                    const query = `DELETE FROM goods WHERE id='${id}'`;
                    conn.query(query,(err,result)=>{
                        res.json(null);
                    })
                }
                else{
                    res.status(403).json({message: 'Forbidden'})
                }
            })
        }
        else{
            res.status(401).json({message: 'Unautorized'})
        }
    })
}
    catch(err){
        res.status(500).json({message: err.message})
    }
})

app.post('/api/items',
[
    check('title', 'Title is required').exists(),
    check('price','Price is required').exists()
  ],
(req,res)=>{
    if (!errors.isEmpty()) {
        return res.status(422).json({
          field: errors.array()[0].param,
          message: errors.array()[0].msg
        })
      }
    const token = req.headers['authorization'];
    if(!token){
        return res.status(401).json({message: 'Unauthorized (undefined token)'})
    }
    const {email} = jwt.verify(token,'ExamplePrivateKey');
    const {title, price} = req.body;
    const query = `SELECT * FROM users WHERE email='${email}';`;
    conn.query(query,(err,result)=>{
        if(result.length>0){
            const resultUser = result[0];
            const query = `INSERT INTO goods(title, price, user_id) VALUES ('${title}', '${price}', '${result[0].id}');`;
            conn.query(query,(err,result)=>{
                if(result){
                    const query = `SELECT * FROM goods ORDER BY id DESC LIMIT 1;`;
                    conn.query(query,(err,result)=>{
                        if(result){
                            res.json({...result[0], user: {...resultUser}})
                        }
                        else{
                            return res.status(500).json('Error request in DB')
                        }
                    })
                }
            })
        }
        else{
            res.status(401).json({message: 'Unauthorized'});
        }
    })
   
})

app.post('/api/items/:id/images',(req,res)=>{
    try{const id = parseInt(req.params.id);
    if(req.file){
        if(req.file.size>50000){
            return res.status(422).json({field: 'image', message: `the file ${req.file.name} too big`})
        }
    }
    const token = req.headers['authorization'];
    if(!token){
        return res.status(401).json({message: 'Unauthorized (undefined token)'})
    }
    const {email} = jwt.verify(token,'ExamplePrivateKey');
    const query = `SELECT * FROM users WHERE email=${email};`;
    conn.query(query,(err,result)=>{
        const resultUser = result;
        if(result.length>0){
            query = `SELECT * FROM goods WHERE user_id='${result[0].id}' AND id='${id}';`;
            conn.query(query,(err,result)=>{
                if(result>0){
                    const resultGood = result[0];
                    req.files.goodImage.mv('public/images/'+req.files.goodImage.name);
                    const imgString = `http://localhost:8080/public/images/${req.files.goodImage.name}`;
                    const query = `UPDATE goods SET img='${imgString}' WHERE id=${id}`;
                    conn.query(query,(err,result)=>{
                        if(result){
                            res.json({...resultGood, user: {...resultUser}})
                        }
                        else{
                            res.status(500).json({message: 'Error in DB'})
                        }
                    })

                }
                else{
                    res.status(403).json({message: 'Forbidden'})
                }
            })
        }
        else{
            res.status(401).json({message: 'Unauthorized'})
        }
    })}
    catch(err){
        res.status(500).json({message: err.message})
    }
})
