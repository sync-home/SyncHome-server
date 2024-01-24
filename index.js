require('dotenv').config()
const express = require('express');
const cors = require('cors');
const jsonwebtoken = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// const stripe = require("stripe")(process.env.Payment_SECRET);

/* All require statements must in top portion to access desired components / functions */

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
// console.log('DB_NAME: ', process.env.DB_NAME);

const app = express();

app.use(cors({
    origin: [ "http://localhost:5173", "https://synchome.vercel.app" ],
    credentials: true
}));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const db = client.db(process.env.DB_NAME);
        const userCollection = db.collection('users');


        /* Get all users */
        app.get('/api/v1/all-users', async (_req, res) => {
            try {
                const result = await userCollection.find({}).toArray();

                console.log('All users: ', result);
                res.send(result)
            } catch (error) {
                res.status(404).send({ 'status': error?.code, message: error?.message })
            }

            /* Get a user by his id */
            app.get('/api/v1/users/:id', async (req, res) => {
                try {
                    const id = req.params?.id
                    const result = await userCollection.findOne({ _id: new ObjectId(id) });

                    console.log('user: ', result);
                    res.send(result)
                } catch (error) {
                    res.status(404).send({ 'status': error?.code, message: error?.message })
                }
            })

        })

    } catch (error) {
        console.log(error);
    }
}
run().catch(console.dir);

app.get('/', (_req, res) => {
    res.send('SyncHome App is running');
})

app.listen(port, () => {
    console.log(`SyncHome server is running on ${port}`);
})