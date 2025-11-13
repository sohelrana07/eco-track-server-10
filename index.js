const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

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
    await client.connect();

    const db = client.db("eco_db");
    const challengesCollection = db.collection("challenges");
    const userChallengesCollection = db.collection("userChallenges");
    const recentTipsCollection = db.collection("recentTips");
    const eventsCollection = db.collection("events");

    // get all challenges from database
    app.get("/challenges", async (req, res) => {
      const cursor = challengesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Active Challenges from database
    app.get("/active/challenges", async (req, res) => {
      // const today = new Date();
      // const query = { startDate: { $lte: today }, endDate: { $gte: today } };
      const cursor = challengesCollection.find().limit(4);
      const result = await cursor.toArray();
      res.send(result);
    });

    // app.get("/active/challenges", async (req, res) => {
    //   try {
    //     const today = new Date();
    //     today.setHours(0,0,0,0); // time portion ignore

    //     // 1️⃣ সব challenges fetch
    //     const allChallenges = await challengesCollection.find().toArray();

    //     // 2️⃣ filter only active challenges
    //     const activeChallenges = allChallenges
    //       .filter(ch => {
    //         const start = new Date(ch.startDate);
    //         const end = new Date(ch.endDate);

    //         start.setHours(0,0,0,0);
    //         end.setHours(0,0,0,0);

    //         return today >= start && today <= end;
    //       })
    //       .sort((a,b) => new Date(a.startDate) - new Date(b.startDate)) // sort by startDate ascending
    //       .slice(0, 5); // limit 5

    //     res.send(activeChallenges);

    //   } catch(err) {
    //     console.error(err);
    //     res.status(500).send({ message: "Failed to fetch active challenges" });
    //   }
    // });

    // get specific challenge from database
    app.get("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await challengesCollection.findOne(query);
      res.send(result);
    });

    // add challenge to database
    app.post("/challenges", async (req, res) => {
      const newChallenge = req.body;
      const result = await challengesCollection.insertOne(newChallenge);
      res.send(result);
    });

    // update challenge to database
    app.patch("/challenges/:id", async (req, res) => {
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
    app.delete("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await challengesCollection.deleteOne(query);
      res.send(result);
    });

    // add userChallenge to database
    app.post("/challenge/join/:id", async (req, res) => {
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
    app.get("/featured-challenges", async (req, res) => {
      const cursor = challengesCollection
        .find()
        .sort({ participants: -1 })
        .limit(5);
      const result = await cursor.toArray();
      res.send(result);
    });

    // hero banner apis
    app.get("/featured-challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await challengesCollection.findOne(query);
      res.send(result);
    });

    // get myActivities from database
    app.get("/myActivities", async (req, res) => {
      const user = req.query.userId;
      const filter = { userId: user };
      const cursor = userChallengesCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });

    // update specific activity to database
    app.patch("/myActivities/:id", async (req, res) => {
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
    app.get("/recent-tips", async (req, res) => {
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

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
