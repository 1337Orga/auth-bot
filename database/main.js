
const mongoose = require('mongoose');
const config = require ("../config.js")
async function connect() {
  try {
    await mongoose.connect(config.mongodb, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true
    });
    console.log("Je me suis connecter au mongodb avec succées !")
  } catch (e) {
    console.log(e)
  }
};

connect();
