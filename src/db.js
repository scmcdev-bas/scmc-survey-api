// Import the MySQL module
const mysql = require("mysql");

// Config for connecting to MySQL
const config = {
  host: "203.156.30.249",
  user: "testscmc",
  password: "scmcP@zzw0rd12*",
  database: "scmc-survey"
};

// Create a connection pool
const pool = mysql.createPool(config);

// Connect to the MySQL server
pool.getConnection((err, connection) => {
  if (err) {
    console.error("MySQL Connection Error:", err);
  } else {
    console.log("Connected to MySQL Server!");
    connection.release();
  }
});

// Error handling for the connection pool
pool.on("error", (err) => {
  console.error("MySQL Pool Error:", err);
});

module.exports = pool;
