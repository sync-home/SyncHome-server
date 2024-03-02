require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jsonwebtoken = require("jsonwebtoken");
const cookieParser = require('cookie-parser')

const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require("mongodb");
const port = process.env.PORT || 5000;

const app = express();
app.use(cookieParser(process.env.ACCESS_TOKEN_SECRET));

app.use(
  cors({
    origin: [ "http://localhost:3000", "https://synchome.vercel.app" ],
    credentials: true,
  })
);
app.use(express.static("public"));
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db(process.env.DB_NAME);
    const userCollection = db.collection('users');
    const notificationCollection = db.collection('notifications');
    const apartmentCollection = db.collection("apartments");
    const requestCollection = db.collection("requests");
    const reportCollection = db.collection("reports");
    const washingMachineCollection = db.collection("washing");
    const communityEventCollection = db.collection("events");
    const trashCollection = db.collection("trash");

    /**
    * ===================================================
    *  Auth APIs
    * ===================================================
    * */

    /* Middleware JWT implementation */
    const verifyToken = async (req, res, next) => {
      try {
        const token = req?.cookies?.SyncHomeToken;
        // console.log("token from browser cookie: ", token);

        /* check the cookie set to the user's browser correctly */
        if (!token)
          return res.status(401).send({
            message: "Unauthorized access"
          });

        jsonwebtoken.verify(
          token,
          process.env.ACCESS_TOKEN_SECRET,
          (err, decoded) => {
            if (err) {
              return res
                .status(401)
                .send({
                  message: "You are not authorized"
                });

            }
            /* Attached to the req */
            /*  */
            req.user = decoded;
            next();
          }
        );
      } catch (error) {
        res.status(500).send({
          message: error?.message || error?.errorText
        });
      }
    };

    /* verify admin after verify token */
    const verifyEmployee = async (req,
      res,
      next) => {
      const currentUser = req?.query;
      const {
        email
      } = req?.user;

      if (currentUser?.email !== email)
        return res.status(403).send({
          message: "Forbidden access."
        });

      const theUser = await userCollection.findOne({
        email
      });

      const isEmployee = theUser?.role === "employee";
      if (!isEmployee) res.status(403).send({
        message: "Access Forbidden"
      });

      next();
    };

    const verifyAdmin = async (req, res, next) => {
      const currentUser = req?.query;
      const {
        email
      } = req?.user;

      if (currentUser?.email !== email)
        return res.status(403).send({
          message: "Forbidden access."
        });

      // console.log(email);

      const theUser = await userCollection.findOne({
        email
      });
      // console.log('isAdmin : ', theUser);

      const isAdmin = theUser?.role === "admin";
      if (!isAdmin) res.status(403).send({
        message: "Access Forbidden"
      });

      next();
    };

    const setTokenCookie = async (req, res, next) => {
      const user = req?.body;

      /* Create cookie for the current user */
      if (user?.email) {
        const token = jsonwebtoken.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "24h",
        });

        /* set cookie to the user's browser */
        res.cookie("SyncHomeToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== "production",
          sameSite: process.env.NODE_ENV === "production" ? "Strict" : "None",
        });

        req.SyncHomeToken = token;
        next();
      } else {
        res
          .status(400)
          .send({
            error: true, message: "Unknown error occurred"
          });
      }
    };

    /* Create JWT */
    app.post("/api/v1/auth/jwt", setTokenCookie, async (req, res) => {
      try {
        const token = await req.cookies?.SyncHomeToken;

        // console.log('token in cookie: ', req.cookies, token);

        if (!token)
          return res
            .status(400)
            .send({
              error: true, message: "Unknown error occurred"
            });

        // console.log('Token set: ', token);
        res.send({
          error: false, message: 'User verified'
        });
      } catch (error) {
        res.status(500).send({
          error: true, message: 'Internal server error'
        });
      }
    });

    /* clear JWT */
    app.post('/api/v1/auth/logout', (_req, res) => {
      try {
        // console.log(req?.body);
        res.clearCookie('SyncHomeToken', {
          maxAge: 0,
          httpOnly: true,
          secure: process.env.NODE_ENV !== "production",
          sameSite: process.env.NODE_ENV === "production" ? "Strict" : "None",
        }).send({ error: false, message: "Logout successfully." })
      } catch (error) {
        res.status(500).send({
          error: true, message: 'Internal server error'
        });
      }
    })

    /**
    * =============================
    * Users APIs
    * =============================
    */

    app.patch('/api/v1/update-user/:id',
      async (req, res) => {
        try {

          const id = req.params.id;
          const query = {
            _id: new ObjectId(id)
          };
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
        } catch (error) {
          res.status(500).send({
            error: true, message: 'Internal server error'
          });
        }
      })

    app.delete('/api/v1/delete-user/:id',
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = {
            _id: new ObjectId(id)
          };
          const result = await userCollection.deleteOne(query);
          res.send(result);
        } catch (error) {
          res.status(500).send({
            error: true, message: 'Internal server error'
          });
        }
      })

    app.put('/api/v1/update-profile/:email',
      async (req, res) => {
        try {

          const email = req.params.email;
          const query = {
            email
          };
          const data = req.body.data;
          const options = {
            upsert: true
          };
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
        } catch (error) {
          res.status(500).send({
            error: true, message: 'Internal server error'
          });
        }
      })

    app.put('/api/v1/userLoginActivity/:email',
      async (req, res) => {
        try {
          const email = req.params.email;
          const query = {
            email
          };
          const data = req.body.data;
          const updateDoc = {
            $push: {
              login_activity: {
                "date": data
              }
            }
          }
          const result = await userCollection.updateOne(query, updateDoc);
          res.send(result);
        } catch (error) {
          res.status(500).send({
            error: true, message: 'Internal server error'
          });
        }
      })

    /* check role of the current user */
    /* get user info using signed in user email' */
    app.get("/api/v1/user-role/:email",
      async (req, res) => {
        try {
          const email = req.params?.email;
          const result = await userCollection.findOne({
            email
          });
          
          res.send({
            role: result?.role
          });
        } catch (error) {
          // console.log({ 'status': error?.code, message: error?.message });
          res.status(500).send({
            status: error?.code, message: error?.message
          });
        }
      });

    /* Get all users */
    app.get(
      "/api/v1/users",
      verifyToken,
      verifyAdmin,
      async (_req, res) => {
        try {
          const result = await userCollection.find({}).toArray();

          // console.log('All users: ', result);
          res.send(result);
        } catch (error) {
          res.status(500).send({
            error: true, message: 'Internal server error'
          });
        }
      }
    );

    /* get user info using signed in user email' */
    app.get("/api/v1/users/:email",
      async (req, res) => {
        try {
          const email = req.params?.email;
          const result = await userCollection.findOne({
            email
          });

          // console.log('user: ', result);
          res.send(result);
        } catch (error) {
          // console.log({ 'status': error?.code, message: error?.message });
          res.status(500).send({
            status: error?.code, message: error?.message
          });
        }
      });

    /* Create a user */
    app.post("/api/v1/new-user",
      async (req, res) => {
        try {
          const user = req.body;
          const result = await userCollection.insertOne(user);

          // console.log('new user: ', result);
          res.send(result);
        } catch (error) {
          // console.log({ 'status': error?.code, message: error?.message });
          res.status(500).send({
            status: error?.code, message: error?.message
          });
        }
      });

    /***
    * =============================
    * Employee Apis
    * =============================
    */

    // get the reports data
    app.get("/api/v1/reports",
      async (req, res) => {
        const result = await reportCollection.find().toArray();
        res.send(result);
      });

    // reports specific data
    app.get("/api/v1/reports/:id",
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const result = await reportCollection.findOne(query);
        res.send(result);
      });

    // when problem solved change the status
    app.patch("/api/v1/reports/:id",
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const updatedDoc = {
          $set: {
            status: "solved",
          },
        };
        const result = await reportCollection.updateOne(query, updatedDoc);
        res.send(result);
      });

    //Resident APIs

    /* report post api */
    app.post("/api/v1/report",
      async (req, res) => {
        const report = req.body;
        try {
          const result = await reportCollection.insertOne(report);
          res.send(result);
        } catch (error) {
          res.status(500).send({
            status: error?.code, message: error?.message
          });
        }
      });

    /* find specific report filtering by email */
    app.get("/api/v1/report",
      async (req, res) => {
        try {
          const email = req.query.email;
          const result = await reportCollection.find({
            email: email
          }).toArray();
          res.send(result);
        } catch (error) {
          res.status(500).send({
            status: error?.code, message: error?.message
          });
        }
      });

    /* washing post request */
    app.post("/api/v1/washing-machine",
      async (req, res) => {
        const washing = req.body;

        try {
          const result = await washingMachineCollection.insertOne(washing);
          res.send(result);
        } catch (error) {
          res.status(500).send({
            status: error?.code, message: error?.message
          });
        }
      });

    /*washing get request */
    app.get("/api/v1/washing-machine",
      async (req, res) => {
        try {
          const email = req.query.email;
          const result = await washingMachineCollection
            .find({
              email: email
            })
            .toArray();
          res.send(result);
        } catch (error) {
          res.status(500).send({
            status: error?.code, message: error?.message
          });
        }
      });

    /* find specific report filtering by email */
    app.get("/api/v1/events", async (req, res) => {
      try {
        const result = await communityEventCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ status: error?.code, message: error?.message });
      }
    });

    //Resident APIs Endpoints

    /**
    * =============================
    * Notification APIs
    * =============================
    */

    // post notification data
    app.post("/api/v1/notifications",
      async (req, res) => {
        const user = req.body;
        const result = await notificationCollection.insertOne(user);
        res.send(result);
      });

    /* Get all notifications */
    app.get("/api/v1/notifications",
      async (_req, res) => {
        try {
          const result = await notificationCollection.find({}).toArray();

          // console.log('notifications: ', result);
          res.send(result);
        } catch (error) {
          // console.log({ 'status': error?.code, message: error?.message });
          res.status(500).send({
            status: error?.code, message: error?.message
          });
        }
      });

    // get specific data from notification
    app.get("/api/v1/notifications/:id",
      async (req, res) => {
        const id = req.params;
        const query = {
          _id: new ObjectId(id)
        };
        const result = await notificationCollection.findOne(query);
        res.send(result);
      });

    // for users delete data collec
    app.post("/api/v1/trash",
      async (req, res) => {
        const body = req.body;
        const result = await trashCollection.insertOne(body);
        res.send(result);
      });

    /* Delete a notification by Id */
    app.delete("/api/v1/remove-notification/:id",
      async (req, res) => {
        try {
          const {
            id
          } = req?.params;
          const result = await notificationCollection.deleteOne({
            _id: new ObjectId(id),
          });

          // console.log('deleted notification: ', id);
          res.send(result);
        } catch (error) {
          res.status(500).send({
            status: error?.code, message: error?.message
          });
        }
      });

    /**
    * ===================================================
    *  Resident/Employee's request APIs
    * ===================================================
    * */

    app.post('/api/v1/requests',
      async (req, res) => {
        const data = req.body;
        const result = await requestCollection.insertOne(data);
        res.send();
      })

    app.get('/api/v1/requests',
      async (req, res) => {
        const result = await requestCollection.find().toArray();
        res.send(result);
      })

    app.get('/api/v1/request/:email',
      async (req, res) => {
        const email = req.params.email;
        const result = await requestCollection.findOne({
          email
        });
        res.send(result);
      })

    app.patch('/api/v1/requests/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const data = req.body.req;
        const updateDoc = {
          $set: {
            'status': data
          }
        }
        const result = await requestCollection.updateOne(query, updateDoc);
        res.send(result);
      })

    /**
    * ===================================================
    *  Apartments APIs
    * ===================================================
    * */

    app.get('/api/v1/apartments',
      async (req, res) => {
        const result = await apartmentCollection.find().toArray();
        res.send(result);
      })

    app.get('/api/v1/apartments/:email',
      async (req, res) => {
        const email = req.params.email;
        const result = await apartmentCollection.findOne({
          email
        });
        res.send(result);
      })

    app.put('/api/v1/apartments/:id',
      async (req, res) => {
        const id = req.params?.id;
        const query = {
          _id: new ObjectId(id)
        };
        const device = req.body.data;
        const updateDoc = {
          $push: {
            devices: device
          }
        }
        const result = await apartmentCollection.updateOne(query, updateDoc);
        res.send(result);
      })

    app.put('/api/v1/apartments/members/:id',
      async (req, res) => {
        const id = req.params?.id;
        const query = {
          _id: new ObjectId(id)
        };
        const member = req.body.data;
        const updateDoc = {
          $set: {
            members: member
          }
        };
        const result = await apartmentCollection.updateOne(query, updateDoc);
        res.send(result);
      })

    app.put('/api/v1/apartments/wifi/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const data = req.body.data;
        const options = {
          upsert: true
        };
        const updateDoc = {
          $set: {
            router: {
              name: data.name,
              brand: data.brand,
              img: data.img,
              status: data.status
            },
            wifi: data.wifi
          }
        }
        const result = await apartmentCollection.updateOne(query, updateDoc, options);
        res.send(result);
      })

    app.put('/api/v1/apartments/ac/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const data = req.body.data;
        const options = {
          upsert: true
        };
        const updateDoc = {
          $set: {
            ac: data
          }
        };
        const result = await apartmentCollection.updateOne(query, updateDoc, options);
        res.send(result);
      })

    app.put('/api/v1/apartments/cctv/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const data = req.body.data;
        const options = {
          upsert: true
        };
        const updateDoc = {
          $set: {
            cctv: data
          }
        };
        const result = await apartmentCollection.updateOne(query, updateDoc, options);
        res.send(result);
      })

    app.put('/api/v1/apartments/total/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const data = req.body.data;
        const options = {
          upsert: true
        };
        const updateDoc = {
          $set: {
            "energy_usage": [ {
              "duration": "week",
              "electricity": data?.electricity1,
              "water": data?.water1,
              "gas": data?.gas1
            },
            {
              "duration": "month",
              "electricity": data?.electricity2,
              "water": data?.water2,
              "gas": data?.gas2
            },
            {
              "duration": "year",
              "electricity": data?.electricity3,
              "water": data?.water3,
              "gas": data?.gas3
            },
            ]
          }
        }
        const result = await apartmentCollection.updateOne(query, updateDoc, options);
        res.send(result);
      })

    app.put('/api/v1/apartments/weekly/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const data = req.body.data;
        const options = {
          upsert: true
        };
        const updateDoc = {
          $set: {
            "usageData": [ {
              "day": "Monday",
              "electricity": data?.electricity1,
              "water": data?.water1,
              "gas": data?.gas1
            },
            {
              "day": "Tuesday",
              "electricity": data?.electricity2,
              "water": data?.water2,
              "gas": data?.gas2
            },
            {
              "day": "Wednesday",
              "electricity": data?.electricity3,
              "water": data?.water3,
              "gas": data?.gas3
            },
            {
              "day": "Thursday",
              "electricity": data?.electricity4,
              "water": data?.water4,
              "gas": data?.gas4
            },
            {
              "day": "Friday",
              "electricity": data?.electricity5,
              "water": data?.water5,
              "gas": data?.gas5
            },
            {
              "day": "Saturday",
              "electricity": data?.electricity6,
              "water": data?.water6,
              "gas": data?.gas6
            },
            {
              "day": "Sunday",
              "electricity": data?.electricity7,
              "water": data?.water7,
              "gas": data?.gas7
            } ]
          }
        }
        const result = await apartmentCollection.updateOne(query, updateDoc, options);
        res.send(result);
      })

    app.put('/api/v1/apartments/del-device/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const data = req.body.index;
        const unsetDoc = {
          $unset: {
            [ `devices.${data}` ]: 1
          }
        }
        await apartmentCollection.updateOne(query, unsetDoc);
        const pullDoc = {
          $pull: {
            "devices": null
          }
        }
        const result = await apartmentCollection.updateOne(query, pullDoc);
        res.send(result);
      })

    app.put('/api/v1/apartments/device-switch/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const data = req.body;
        const updateDoc = {
          $set: {
            [ `devices.${data?.index}.status` ]: data?.value
          }
        }
        const result = await apartmentCollection.updateOne(query, updateDoc);
        res.send(result);
      })

    app.put('/api/v1/apartments/simple-switch/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const data = req.body;
        const updateDoc = {
          $set: {
            [ `${data?.name}.status` ]: data?.value
          }
        }
        const result = await apartmentCollection.updateOne(query, updateDoc);
        res.send(result);
      })

    app.patch('/api/v1/apartments/actemp/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const temp = req.body.tempControl;
        const updateDoc = {
          $set: {
            "ac.temp": temp
          }
        }
        const result = await apartmentCollection.updateOne(query, updateDoc);
        res.send(result);
      })

    app.patch('/api/v1/apartments/acmode/:id',
      async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id)
        };
        const mode = req.body.newMode;
        const updateDoc = {
          $set: {
            "ac.mode": mode
          }
        }
        const result = await apartmentCollection.updateOne(query, updateDoc);
        res.send(result);
      })
  } catch (error) {
    console.log(error);
  }
}

run().catch(console.dir);

app.get("/", (_req, res) => {
  res.send("SyncHome App is running");
});

app.listen(port, () => {
  console.log(`SyncHome server is running on http://localhost:${port}`);
});
