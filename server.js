const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve Phaser from node_modules
app.use(
  "/phaser",
  express.static(path.join(__dirname, "node_modules/phaser/dist"))
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = 1234;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
