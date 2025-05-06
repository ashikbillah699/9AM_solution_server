require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j8csd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const taskCollection = client.db("taskFlowDB").collection("tasks");
        const userCollection = client.db("taskFlowDB").collection("users");

        // insert task
        app.post('/task', async (req, res) => {
            const reciveData = req.body;
            const result = await taskCollection.insertOne(reciveData);
            res.send(result);
        })

        // insert user
        app.post('/user', async (req, res) => {
            const reciveData = req.body;
            const result = await userCollection.insertOne(reciveData);
            res.send(result);
        })

        // get All tasks
        app.get('/tasks', async (req, res) => {
            const result = await taskCollection.find().toArray();
            res.send(result)
        })

        // get All users
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        // update task
        app.put('/task/:id', async (req, res) => {
            const id = req.params.id;
            const updateTask = req.body;
            const query = { _id: new ObjectId(id) }
            const updateData = {
                $set: {
                    title: updateTask.title,
                    description: updateTask.description,
                    dueDate: updateTask.dueDate,
                    priority: updateTask.priority,
                    status: updateTask.status,
                    assignedEmail: updateTask.assignedEmail,
                    userEmail: updateTask.userEmail,
                }
            }
            const result = await taskCollection.updateOne(query, updateData);
            res.send(result)
        })

        // delete task
        app.delete('/task/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await taskCollection.deleteOne(query);
            res.send(result);
        })



        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Welcome to TaskFlow server')
})

app.listen(port, () => {
    console.log(`Task Flow is sitting on port ${port}`)
})