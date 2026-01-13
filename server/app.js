require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", require("./routes/auth"));
app.use("/firm", require("./routes/firm"));
app.use("/client", require("./routes/client"));
app.use("/documents", require("./routes/documents"));

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
