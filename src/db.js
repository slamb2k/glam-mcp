import { MongoClient } from 'mongodb';

class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect(uri, dbName) {
    try {
      this.client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      await this.client.connect();
      console.log('Connected successfully to MongoDB');
      
      this.db = this.client.db(dbName);
      return this.db;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }

  getCollection(name) {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection(name);
  }

  getDb() {
    return this.db;
  }
}

export default new Database();