const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId,  } = require('mongodb');

const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.es8es.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//verify jwt token
function verifyJWT(req, res, next) {

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorization access' })
  }
  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next()
  });
}

async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db('tools-manufacturer').collection('tools')
    const reviewsCollection = client.db('tools-manufacturer').collection('reviews')
    const ordersCollection = client.db('tools-manufacturer').collection('order')
    const usersCollection = client.db('tools-manufacturer').collection('users')
    const profileCollection = client.db('tools-manufacturer').collection('profile')

    app.get('/tools', async (req, res) => {
      const quary = {}
      const tools = await toolsCollection.find(quary).toArray()
      res.send(tools)
    }),
//payment intent api
    app.post('/create-paymetn-intent',verifyJWT,async(req,res)=>{
      const order=req.body;
      const price=order.total;
      const amount=price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_type:['card']
      })
      res.send({clientSecret:paymentIntent.client_secret})

    })

    app.post('/tools', async (req, res) => {
      const newTools =req.body
      const tools = await toolsCollection.insertOne(newTools);
      res.send(tools)
    }),

      app.get('/tools/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const toools = await toolsCollection.findOne(query)
        res.send(toools)
      })


    app.get('/users', async (req, res) => {
      const users = await usersCollection.find().toArray()
      res.send(users)
    })


    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };

      const updateDoc = {
        $set: user
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options)
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '6h' })
      res.send({ result, token })
    });

    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    });

    app.put('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({ email: requester });

      if (requesterAccount === 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' }
        };
        const result = await usersCollection.updateOne(filter, updateDoc)
        res.send({ result })
      }
      else {
        res.status(403).send({ message: "forbidden" })
      }

    });


    app.post('/reviews', async (req, res) => {
      const newReview = req.body
      const review = await reviewsCollection.insertOne(newReview)
      res.send(review)
    })
    app.get('/reviews', async (req, res) => {
      const review = await reviewsCollection.find({}).toArray()
      res.send(review)
    });

    app.post('/order', async (req, res) => {
      const newOrders = req.body
      const order = await ordersCollection.insertOne(newOrders)
      res.send(order)
    });

    app.get('/order/:email',async (req, res) => {
      const email = req.params.email;

      const filter = { email: email };
      const orders = await ordersCollection.find(filter).toArray();
      res.send(orders);

    }
    );

 

    app.get('/p-order/:id',verifyJWT, async (req, res) => {
      const id = req.params.id;
   
      const query = { _id: ObjectId(id) }
      const payment = await ordersCollection.findOne(query)
      res.send(payment)
    })


    app.post('/profile',verifyJWT, async (req, res) => {
      const newUserProfile =req.body
      const profile = await profileCollection.insertOne(newUserProfile);
      res.send(profile)
    }),

    app.get('/profile/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const profile = await profileCollection.find(filter).toArray()
      res.send(profile)
    })




  } finally {

  }
}
run().catch(console.dir);

//optional
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`manufacuturing web site ${port}`)
})