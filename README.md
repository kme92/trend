A real-time twitter analytics app.

This application consumes the Twitter Public Streaming API and aggregates the data in real-time, down to the second.

The feed is queued in a MongoDB capped collection to allow ordered streaming to end users.

I chose to use the MongoDB aggregation pipeline over MapReduce, due to free hardware limitations, and resulting efficiency concerns.

d3.js is used in creating real-time graphs, and socket.io is used to stream data to end users.

Everything runs on a single Heroku dyno, and I used the free MongoLab addon as the MongoDB service.