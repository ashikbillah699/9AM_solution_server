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
        const notificationCollection = client.db("taskFlowDB").collection("notification");

        // post User data 
        app.post('/user', async (req, res) => {
            try {
                const { userName, photoURL, email, password, shopName } = req.body;

                if (!userName || !email || !password || !shopName || !Array.isArray(shopName) || shopName.length === 0) {
                    return res.status(400).json({ message: 'Invalid input data' });
                }

                const conflict = await userCollection.findOne({
                    shopName: { $in: shopName }
                });

                if (conflict) {
                    return res.status(400).json({ message: 'One or more Shop Names already taken!' });
                }

                const result = await userCollection.insertOne({ userName, photoURL, email, password, shopName });
                return res.status(200).json({ message: 'User created successfully', insertedId: result.insertedId });

            } catch (error) {
                console.error('Server error:', error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
        });



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
        app.delete('/task/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await taskCollection.deleteOne(query);
            res.send(result);
        })

        // notification
        app.post('/notifications/:email', async (req, res) => {
            const task = req.body;
            const result = await taskCollection.insertOne(task);

            if (task.assignedEmail) {
                const notification = {
                    receiverEmail: task.assignedEmail,
                    message: `You have been assigned a new task: "${task.title}"`,
                    taskId: result.insertedId,
                    isRead: false,
                    createdAt: new Date()
                };
                await notificationCollection.insertOne(notification);
            }
            res.send(result);
        });

        // show notification
        app.get('/notifications', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.status(400).send({ message: 'Email is required' });
            }
            const notifications = await notificationCollection
                .find({ receiverEmail: email })
                .sort({ createdAt: -1 })
                .toArray();
            res.send(notifications);
        });

        // update notification isRate
        app.put('/notification/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    isRead: true
                }
            }
            const result = await notificationCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // insert task
        app.post('/task', async (req, res) => {
            const reciveData = req.body;
            const result = await taskCollection.insertOne(reciveData);
            res.send(result);
        })

        // get All tasks
        app.get('/tasks', async (req, res) => {
            const result = await taskCollection.find().toArray();
            res.send(result)
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