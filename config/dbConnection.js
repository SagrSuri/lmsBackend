import mongoose from "mongoose";

mongoose.set('strictQuery', false);  //losing commands //ignore if not exist data

const connectionToDB = async () => {
   try {
     const { connection } = await mongoose.connect(
       process.env.MONGODB_URL || "mongodb://localhost:27017/lmsBackend"
     );
     if (connection) {
       console.log(`connected to MongoDB ${connection.host}`);
     }
   } catch (e) {
    console.log('ERROR ++++++++++++++++>>>>' , e)
    process.exit(1);
   }
}

export default connectionToDB;