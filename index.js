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
        const apartmentCollection = db.collection("apartments");
        const requestCollection = db.collection("requests");
        const reportCollection = db.collection("reports");


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
       * ===================================================
       *  Users APIs 
       * ===================================================
       * */

        app.get('/api/v1/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/api/v1/new-user', async (req, res) => {
            const data = req.body;
            const result = await userCollection.insertOne(data);
            res.send(result);
        })

        app.get('/api/v1/users/:email', async (req, res) => {
            const email = req.params?.email;
            const result = await userCollection.findOne({ email: email });
            res.send(result);
        })

        app.patch('/api/v1/update-user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body.data;
            const updateDoc = {
                $set: {
                    name: data?.name,
                    email: data?.email,
                    phone: data?.phone,
                    role: data?.role
                }
            }
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        app.delete('/api/v1/delete-user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        app.put('/api/v1/update-profile/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const data = req.body.data;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: data?.name,
                    address: data?.address,
                    phone: data?.phone,
                    age: data?.age,
                    gender: data?.gender,
                    region: data?.region,
                    role: data?.role
                }
            }
            const result = await userCollection.updateOne(query, updateDoc, options);
            res.send(result);
        })

        app.put('/api/v1/userLoginActivity/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const data = req.body.data;
            const updateDoc = {
                $push: { login_activity: { "date": data } }
            }
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result);
        })


        /**
          * ===================================================
          *  Resident/Employee's request APIs 
          * ===================================================
          * */


        app.post('/api/v1/requests', async (req, res) => {
            const data = req.body;
            const result = await requestCollection.insertOne(data);
            res.send();
        })

        app.get('/api/v1/requests', async (req, res) => {
            const result = await requestCollection.find().toArray();
            res.send(result);
        })

        app.get('/api/v1/request/:email', async (req, res) => {
            const email = req.params.email;
            const result = await requestCollection.findOne({ email });
            res.send(result);
        })

        app.patch('/api/v1/requests/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body.req;
            const updateDoc = {
                $set: { 'status': data }
            }
            const result = await requestCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        /**
          * ===================================================
          *  Apartments APIs 
          * ===================================================
          * */

        app.get('/api/v1/apartments', async (req, res) => {
            const result = await apartmentCollection.find().toArray();
            res.send(result);
        })

        app.get('/api/v1/apartments/:email', async (req, res) => {
            const email = req.params.email;
            const result = await apartmentCollection.findOne({ email });
            res.send(result);
        })

        app.put('/api/v1/apartments/:id', async (req, res) => {
            const id = req.params?.id;
            const query = { _id: new ObjectId(id) };
            const device = req.body.data;
            const updateDoc = { $push: { devices: device } }
            const result = await apartmentCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        app.put('/api/v1/apartments/members/:id', async (req, res) => {
            const id = req.params?.id;
            const query = { _id: new ObjectId(id) };
            const member = req.body.data;
            const updateDoc = { $set: { members: member } };
            const result = await apartmentCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        app.put('/api/v1/apartments/wifi/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body.data;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    router: { name: data.name, brand: data.brand, img: data.img, status: data.status },
                    wifi: data.wifi
                }
            }
            const result = await apartmentCollection.updateOne(query, updateDoc, options);
            res.send(result);
        })

        app.put('/api/v1/apartments/ac/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body.data;
            const options = { upsert: true };
            const updateDoc = { $set: { ac: data } };
            const result = await apartmentCollection.updateOne(query, updateDoc, options);
            res.send(result);
        })

        app.put('/api/v1/apartments/cctv/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body.data;
            const options = { upsert: true };
            const updateDoc = { $set: { cctv: data } };
            const result = await apartmentCollection.updateOne(query, updateDoc, options);
            res.send(result);
        })

        app.put('/api/v1/apartments/total/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body.data;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    "energy_usage": [
                        { "duration": "week", "electricity": data?.electricity1, "water": data?.water1, "gas": data?.gas1 },
                        { "duration": "month", "electricity": data?.electricity2, "water": data?.water2, "gas": data?.gas2 },
                        { "duration": "year", "electricity": data?.electricity3, "water": data?.water3, "gas": data?.gas3 },
                    ]
                }
            }
            const result = await apartmentCollection.updateOne(query, updateDoc, options);
            res.send(result);
        })

        app.put('/api/v1/apartments/weekly/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body.data;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    "usageData": [
                        { "day": "Monday", "electricity": data?.electricity1, "water": data?.water1, "gas": data?.gas1 },
                        { "day": "Tuesday", "electricity": data?.electricity2, "water": data?.water2, "gas": data?.gas2 },
                        { "day": "Wednesday", "electricity": data?.electricity3, "water": data?.water3, "gas": data?.gas3 },
                        { "day": "Thursday", "electricity": data?.electricity4, "water": data?.water4, "gas": data?.gas4 },
                        { "day": "Friday", "electricity": data?.electricity5, "water": data?.water5, "gas": data?.gas5 },
                        { "day": "Saturday", "electricity": data?.electricity6, "water": data?.water6, "gas": data?.gas6 },
                        { "day": "Sunday", "electricity": data?.electricity7, "water": data?.water7, "gas": data?.gas7 }
                    ]
                }
            }
            const result = await apartmentCollection.updateOne(query, updateDoc, options);
            res.send(result);
        })

        app.put('/api/v1/apartments/del-device/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body.index;
            const unsetDoc = {
                $unset: { [`devices.${data}`]: 1 }
            }
            await apartmentCollection.updateOne(query, unsetDoc);
            const pullDoc = {
                $pull: { "devices": null }
            }
            const result = await apartmentCollection.updateOne(query, pullDoc);
            res.send(result);
        })

        app.put('/api/v1/apartments/device-switch/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body;
            const updateDoc = {
                $set: { [`devices.${data?.index}.status`]: data?.value }
            }
            const result = await apartmentCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        app.put('/api/v1/apartments/simple-switch/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body;
            const updateDoc = {
                $set: { [`${data?.name}.status`]: data?.value }
            }
            const result = await apartmentCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        app.patch('/api/v1/apartments/actemp/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const temp = req.body.tempControl;
            const updateDoc = {
                $set: { "ac.temp": temp }
            }
            const result = await apartmentCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        app.patch('/api/v1/apartments/acmode/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const mode = req.body.newMode;
            const updateDoc = {
                $set: { "ac.mode": mode }
            }
            const result = await apartmentCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        /**
             * =============================
             * Notification APIs
             * =============================
             */
        /* Get all notifications */
        // post notification data
        app.post('/api/v1/notifications', async (req, res) => {
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
        app.get("/api/v1/notifications/:id", async (req, res) => {
            const id = req.params;
            const query = { _id: new ObjectId(id) }
            const result = await notificationCollection.findOne(query)
            res.send(result)
        })

        // for users delete data collection
        app.post("/api/v1/trash", async (req, res) => {
            const body = req.body;
            const result = await trashCollection.insertOne(body)
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



        /***
         * =======================
         *       EMPLOYEE API
         * =======================
         * 
         */

        // get the reports data
        app.get('/api/v1/reports', async (req, res) => {
            const result = await reportCollection.find().toArray()
            res.send(result)
        })

        // reports specific data
        app.get('/api/v1/reports/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await reportCollection.findOne(query)
            res.send(result)
        })


        // when problem solved change the status
        app.patch('/api/v1/reports/:id', async (req, res) => {
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