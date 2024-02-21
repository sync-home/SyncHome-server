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
    origin: ["http://localhost:3000", "https://synchome.vercel.app"],
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
        const notificationCollection = db.collection('notifications');
        const reportCollection = db.collection('reports')


        /**
         * ===================================================
         *  Auth APIs 
         * ===================================================
         * */

        /* Middleware JWT implementation */
        const verifyToken = async (req, res, next) => {
            try {
                // console.log('the token to be verified: ', req?.cookies);
                const token = req?.cookies?.["SyncHome-token"];
                console.log('token from browser cookie: ', token);

                if (!token) return res.status(401).send({ message: 'Unauthorized access' })

                jsonwebtoken.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                    // console.log(err);
                    if (err) {
                        // console.log(err);
                        return res.status(401).send({ message: 'You are not authorized' })
                    }

                    // console.log('Decoded token: ', decoded);
                    req.user = decoded;
                    next();
                })
            } catch (error) {
                // console.log(error);
                res.status(500).send({ message: error?.message || error?.errorText });
            }
        }

        /* verify admin after verify token */
        const verifyEmployee = async (req, res, next) => {
            const currentUser = req?.query;
            const { email } = req?.user;

            if (currentUser?.email !== email) return res.status(403).send({ message: 'Forbidden access.' })
            console.log(email);

            const theUser = await userCollection.findOne({ email })
            console.log('is Employee : ', theUser);

            const isEmployee = theUser?.role === 'employee'
            if (!isEmployee) res.status(403).send({ message: 'Access Forbidden' })

            next();
        }

        const verifyAdmin = async (req, res, next) => {
            const currentUser = req?.query;
            const { email } = req?.user;

            if (currentUser?.email !== email) return res.status(403).send({ message: 'Forbidden access.' })

            // console.log(email);

            const theUser = await userCollection.findOne({ email })
            // console.log('isAdmin : ', theUser);

            const isAdmin = theUser?.role === 'admin'
            if (!isAdmin) res.status(403).send({ message: 'Access Forbidden' })

            next();
        }

        const setTokenCookie = async (req, res, next) => {
            const user = req?.body;

            if (user?.email) {
                const token = jsonwebtoken.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' })

                // console.log('Token generated: ', token);
                res
                    .cookie('SyncHome-token', token, {
                        // domain: [ "http://localhost:3000", "https://synchome.vercel.app" ],
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                        // secure: true,
                        // sameSite: 'none'
                    })

                req["SyncHome-token"] = token;

                // console.log('Token Created: ', req[ "SyncHome-token" ]);
                next();
            } else {
                res.status(400).send({ success: false, message: 'Unknown error occurred' })
            }
        }

        /* Create JWT */
        app.post('/api/v1/auth/jwt', setTokenCookie, (req, res) => {
            try {
                const token = req["SyncHome-token"];

                // console.log('token in cookie: ', token);

                if (!token) return res.status(400).send({ success: false, message: 'Unknown error occurred' })

                // console.log('User sign in successfully.');
                res.send({ success: true })
            } catch (error) {
                res.send({ error: true, message: error.message })
            }

        })

        /**
         * =============================
         * Users APIs
         * =============================
         */

        /* check role of the current user */
        /* get user info using signed in user email' */
        app.get('/api/v1/user-role/:email', async (req, res) => {
            try {
                const email = req.params?.email
                const result = await userCollection.findOne({ email });

                // console.log('user: ', result);
                res.send({ role: result?.role })
            } catch (error) {
                // console.log({ 'status': error?.code, message: error?.message });
                res.status(500).send({ 'status': error?.code, message: error?.message })
            }
        })

        /* Get all users */
        app.get('/api/v1/all-users', verifyToken, verifyAdmin, async (_req, res) => {
            try {
                const result = await userCollection.find({}).toArray();

                // console.log('All users: ', result);
                res.send(result)
            } catch (error) {
                res.status(500).send({ 'status': error?.code, message: error?.message })
            }
        })

        /* Get a user by his id */
        app.get('/api/v1/users/:id', async (req, res) => {
            try {
                const id = req.params?.id
                const result = await userCollection.findOne({ _id: new ObjectId(id) });

                // console.log('user: ', result);
                res.send(result)
            } catch (error) {
                // console.log({ 'status': error?.code, message: error?.message });
                res.status(500).send({ 'status': error?.code, message: error?.message })
            }
        })

        /* get user info using signed in user email' */
        app.get('/api/v1/user-by-email/:email', async (req, res) => {
            try {
                const email = req.params?.email
                const result = await userCollection.findOne({ email });

                // console.log('user: ', result);
                res.send(result)
            } catch (error) {
                // console.log({ 'status': error?.code, message: error?.message });
                res.status(500).send({ 'status': error?.code, message: error?.message })
            }
        })

        /* Create a user */
        app.post('/api/v1/new-user', async (req, res) => {
            try {
                const user = req.body
                const result = await userCollection.insertOne(user);

                // console.log('new user: ', result);
                res.send(result)
            } catch (error) {
                // console.log({ 'status': error?.code, message: error?.message });
                res.status(500).send({ status: error?.code, message: error?.message })
            }
        })


        /***
         * =============================
         * Employee Apis
         * =============================
         */

        // get the reports data
        app.get('/reports', async (req, res) => {
            const result = await reportCollection.find().toArray()
            res.send(result)
        })

        // reports specific data
        app.get('/reports/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await reportCollection.findOne(query)
            res.send(result)
        })


        // when problem solved change the status
        app.patch('/reports/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: 'solved'
                }
            }
            const result = await reportCollection.updateOne(query, updatedDoc)
            res.send(result)
        })


        /**
         * =============================
         * Resident APIs
         * =============================
         */
        //report post api
        app.post('/api/v1/report', async (req, res) => {
            const report = req.body;
            try {
                const result = await reportCollection.insertOne(report);
                res.json({ success: true, message: 'Report submitted successfully', data: result.ops });
            } catch (error) {
                console.error('Error:', error);
                res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
        });

        /**
         * =============================
         * Resident APIs Endpoints
         * =============================
         */
        


        /**
         * =============================
         * Notification APIs
         * =============================
         */

        // post notification data
        app.post('/api/v1/notifications', async(req,res) => {
            const user = req.body;
            const result = await notificationCollection.insertOne(user)
            res.send(result)
        })

        /* Get all notifications */
        app.get('/api/v1/notifications', async (_req, res) => {
            try {
                const result = await notificationCollection.find({}).toArray();

                // console.log('notifications: ', result);
                res.send(result)
            } catch (error) {
                // console.log({ 'status': error?.code, message: error?.message });
                res.status(500).send({ status: error?.code, message: error?.message })
            }
        })

        // get specific data from notification
        app.get("/api/v1/notifications/:id", async(req, res) => {
            const id = req.params;
            const query = {_id : new ObjectId(id)}
            const result = await notificationCollection.findOne(query)
            res.send(result)
        })

        /* Delete a notification by Id */
        app.delete('/api/v1/remove-notification/:id', async (req, res) => {
            try {
                const { id } = req?.params;
                const result = await notificationCollection.deleteOne({ _id: new ObjectId(id) });

                // console.log('deleted notification: ', id);
                res.send(result)
            } catch (error) {
                // console.log({ status: error?.code, message: error?.message });
                res.status(500).send({ status: error?.code, message: error?.message })
            }
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
    console.log(`SyncHome server is running on http://localhost:${port}`);
})