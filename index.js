const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config(); //to access env
const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());


//db
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3nhngvm.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//jwt token validation
function verifyJWT(req, res, next){
    const authHeader= req.headers.authorization;

if(!authHeader){
   return res.status(401).send({message: 'unauthorized access'});
}
const token = authHeader.split(' ')[1];

jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
    if(err){
      return  res.status(403).send({message: 'Forbidden access'})
 
    }
    req.decoded = decoded;
    next();
})
}


async function run(){
try{
    //service collection
const serviceCollection = client.db('wheelz').collection('services');
//orders collection
const orderCollection = client.db('wheelz').collection('orders');

// jwt api SENDING
app.post('/jwt',(req,res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'})
    res.send({token})
})

//all services api
app.get('/services', async(req, res) => {
    const query = {}
    const cursor = serviceCollection.find(query);
    const services = await cursor.toArray();
    res.send(services);
});

//services by id api
app.get('/services/:id', async(req, res) =>{
    const id = req.params.id;
    const query = {_id: ObjectId(id)};
    const service = await serviceCollection.findOne(query);
    res.send(service);
})

//getting orders api
app.get('/orders',verifyJWT, async(req,res)=>{

    const decoded = req.decoded;
    // console.log('inside',decoded);
if(decoded.email !== req.query.email){
    res.status(403).send({message: 'unauthorized access'})
}
 

    let query = {};
    if(req.query.email){
        query = {
          email: req.query.email
        }
    }
    const cursor = orderCollection.find(query);
    const orders = await cursor.toArray();
    res.send(orders);
})


//orders api > create data that why used post
app.post('/orders', verifyJWT, async(req,res) => {
    const order = req.body;
    const result = await orderCollection.insertOne(order);
    res.send(result);
});

//patch to update
app.patch('/orders/:id', verifyJWT, async(req, res) => {
    const id = req.params.id;
    const status = req.body.status;
    const query = {_id: ObjectId(id)}
    const updateDoc ={
        $set:{
            status: status
        }
    }
    const result = await orderCollection.updateOne(query, updateDoc);
    res.send(result);
})

//deleting an order
app.delete('/orders/:id',verifyJWT, async(req, res) =>{
    const id = req.params.id;
    const query = {_id: ObjectId(id)}
    const result = await orderCollection.deleteOne(query);
    res.send(result);
})


}
finally{

}
}
run().catch(error => console.error(error));

app.get('/', (req, res) => {
    res.send('wheelz server is running')
})

app.listen(port, () => {
    console.log(`wheelz server running on ${port}`);
})
