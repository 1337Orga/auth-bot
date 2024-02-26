const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Database = new Schema({
  id: String,
  data: { type: Array }
});

module.exports = mongoose.model('Database', Database);
