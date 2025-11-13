const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;

// index.js
const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const verifyFireBaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];

  try {
    const decode = await admin.auth().verifyIdToken(token);
    req.token_email = decode.email;
    next();
  } catch {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@fast-cluster.usibdwl.mongodb.net/?appName=Fast-Cluster`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

async function run() {
  try {
    // await client.connect();

    const db = client.db("eco_db");
    const challengesCollection = db.collection("challenges");
    const userChallengesCollection = db.collection("userChallenges");
    const recentTipsCollection = db.collection("recentTips");
    const eventsCollection = db.collection("events");

    // get all challenges with filter
    app.get("/challenges", async (req, res) => {
      const filterQuery = req.query.filter;

      let query = {};

      if (filterQuery) {
        const filters = JSON.parse(filterQuery);

        if (filters.category) {
          query.category = filters.category;
        }

        if (filters.Participants) {
          query.participants = { $gte: Number(filters.Participants) };
        }
      }

      const cursor = challengesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Active Challenges from database
    app.get("/active/challenges", async (req, res) => {
      const today = new Date();
      const query = { startDate: { $lte: today }, endDate: { $gte: today } };
      const cursor = challengesCollection.find().limit(4);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get specific challenge from database
    app.get("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await challengesCollection.findOne(query);
      res.send(result);
    });

    // add challenge to database
    app.post("/challenges", verifyFireBaseToken, async (req, res) => {
      const data = req.body;

      const newChallenge = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await challengesCollection.insertOne(newChallenge);
      res.send(result);
    });

    // update challenge to database
    app.patch("/challenges/:id", verifyFireBaseToken, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updateData,
      };
      const options = {};
      const result = await challengesCollection.updateOne(
        query,
        update,
        options
      );
      res.send(result);
    });

    // delete specific challenge
    app.delete("/challenges/:id", verifyFireBaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await challengesCollection.deleteOne(query);
      res.send(result);
    });

    // add userChallenge to database
    app.post("/challenge/join/:id", verifyFireBaseToken, async (req, res) => {
      const joinChallenge = req.body;
      const challengeId = joinChallenge.challengeId;
      const existing = await userChallengesCollection.findOne({
        challengeId: challengeId,
        userId: joinChallenge.userId,
      });

      if (existing) {
        return res
          .status(400)
          .send({ message: "You have already joined this challenge" });
      }

      const result = await userChallengesCollection.insertOne(joinChallenge);

      // participants count
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $inc: {
          participants: 1,
        },
      };
      const options = {};
      const participantsCounted = await challengesCollection.updateOne(
        query,
        update,
        options
      );
      res.send({ result, participantsCounted });
    });

    // hero banner apis
    app.get("/featured/challenges", async (req, res) => {
      const cursor = challengesCollection
        .find()
        .sort({ participants: -1 })
        .limit(5);
      const result = await cursor.toArray();
      res.send(result);
    });

    // hero banner apis
    app.get("/featured/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await challengesCollection.findOne(query);
      res.send(result);
    });

    // get myActivities from database
    app.get("/myActivities", verifyFireBaseToken, async (req, res) => {
      const userEmail = req.query.userId;
      const filter = {};
      if (userEmail) {
        if (userEmail !== req.token_email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        filter.userId = userEmail;
      }
      const cursor = userChallengesCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });

    // update specific activity to database
    app.patch("/myActivities/:id", verifyFireBaseToken, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: updateData,
      };
      const options = {};
      const result = await userChallengesCollection.updateOne(
        filter,
        update,
        options
      );
      res.send(result);
    });

    // get recentTips from database
    app.get("/tips", async (req, res) => {
      const cursor = recentTipsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get recentTips from database
    app.get("/recent/tips", async (req, res) => {
      const cursor = recentTipsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(5);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get Events from database
    app.get("/events", async (req, res) => {
      const cursor = eventsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get upcomingEvents from database
    app.get("/upcoming/events", async (req, res) => {
      const cursor = eventsCollection.find().sort({ date: 1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
