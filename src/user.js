const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const pool = require("./db");
const secretKey = "newSecretKey";

const login = (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);

  try {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error connecting to database: ", err);
        res.status(500).json({ error: "Error connecting to database." });
        return;
      }

      const newPassword = Buffer.from(password).toString("base64");
      const query = `SELECT USER_PASSWORD.USERNAME
      , USER_PASSWORD.PASSWORD, 
      ROLE.ROLE_NAME
        FROM USER_PASSWORD 
        JOIN ROLE ON USER_PASSWORD.ROLE = ROLE.ROLE_ID 
        WHERE USER_PASSWORD.USERNAME = ?`;

      connection.query(query, [username], (error, results, fields) => {
        connection.release();
        console.log(results);

        if (error) {
          console.error("Error while querying data: ", error);
          res.status(500).json({ error: "Error while querying data." });
        } else {
          if (results.length === 1) {
            const storedPassword = results[0].PASSWORD;
            console.log(newPassword, " ", storedPassword);
            if (newPassword === storedPassword) {
              var userPermission = "";
              if (results[0].ROLE_NAME === "admin") {
                userPermission = "admin";
              } else {
                userPermission = "user";
              }
              const token = jwt.sign(
                {
                  userName: results[0].USERNAME,
                  userRole: results[0].ROLE_NAME,
                  userPermission: userPermission,
                  userID: results[0].EMP_ID,
                },
                secretKey
              );
              const response = {
                data: userPermission,
                token: token,
              };
              console.log(response);
              res.status(200).json(response);
            } else if (username === "" || password === "") {
              res
                .status(401)
                .json({ error: "Please enter your Username and Password" });
            } else {
              console.log(error);
              res.status(401).json({ error: "Invalid Username or Password" });
              const logMessage = `${new Date().toISOString()}: มีการพยายามเข้าสู่ระบบด้วยชื่อผู้ใช้งาน ${username} ได้เข้าสู่ระบบ \n`;
              fs.writeFileSync("request.log", logMessage, { flag: "a+" });
            }
          } else {
            console.log("No user found with this username.");
            res.status(401).json({ error: "Invalid Username or Password" });
          }
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred." });
    console.error("An error occurred: ", error);
  }
};

const changePassword = (req, res) => {
  const { newPassword, password } = req.body;
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", req.body.token);
      res.status(200).json({ success: false, error: "Invalid token" });
    } else {
      try {
        pool.getConnection((err, connection) => {
          if (err) {
            console.error("Error connecting to database: ", err);
            res.status(500).json({ error: "Error connecting to database." });
            return;
          }

          const username = decoded.userName;
          const hashedPassword = Buffer.from(password).toString("base64");
          const hashedNewPassword = Buffer.from(newPassword).toString("base64");

          const selectQuery = `
            SELECT USER_PASSWORD.USERNAME, USER_PASSWORD.PASSWORD, ROLE.ROLE_NAME, EMPLOYEE.DIVISION_ID, EMPLOYEE.EMP_ID
            FROM USER_PASSWORD
            JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = USER_PASSWORD.EMP_ID
            JOIN ROLE ON EMPLOYEE.ROLE_ID = ROLE.ROLE_ID
            WHERE USER_PASSWORD.USERNAME = ?`;

          connection.query(
            selectQuery,
            [username],
            (error, results, fields) => {
              if (error) {
                console.error("Error while querying data: ", error);
                connection.release();
                res.status(500).json({ error: "Error while querying data." });
                return;
              }

              if (results.length === 1) {
                const storedPassword = results[0].PASSWORD;
                console.log(hashedPassword, " ", storedPassword);

                if (hashedPassword === storedPassword) {
                  const updateQuery = `
                  UPDATE USER_PASSWORD
                  SET PASSWORD = ?
                  WHERE USERNAME = ?`;

                  connection.query(
                    updateQuery,
                    [hashedNewPassword, username],
                    (updateError, updateResults, updateFields) => {
                      connection.release();

                      if (updateError) {
                        console.error("Error updating password: ", updateError);
                        res
                          .status(500)
                          .json({ error: "Error updating password." });
                      } else {
                        res.status(200).json({ success: true });
                      }
                    }
                  );
                } else {
                  console.error("Invalid Password");
                  connection.release();
                  res.status(401).json({ error: "Invalid Password" });
                }
              } else {
                connection.release();
                res.status(404).json({ error: "User not found" });
              }
            }
          );
        });
      } catch (error) {
        res.status(500).json({ error: "An error occurred." });
        console.error("An error occurred: ", error);
      }
    }
  });
};

const addUser = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.log(err);
      res.status(200).json({ success: false, error: "Invalid token" });
    } else {
      const data = req.body;

      try {
        // Get the current date
        const moment = require("moment");
        const currentDate = moment().format("YYYY-MM-DD HH:mm:ss.SSS");

        // Create a connection
        pool.getConnection((connectionError, connection) => {
          if (connectionError) {
            console.error(connectionError);
            res
              .status(500)
              .json({ error: "Error while connecting to the database." });
          } else {
            const query1 = "SELECT * FROM USER_PASSWORD WHERE USERNAME = ?";
            connection.query(query1, [data.username], (error1, results1) => {
              if (error1) {
                console.log(error1);

                connection.release();
                res.status(500).json({ error: "Error while querying data." });
              } else {
                if (results1.length === 0) {
                  const query3 =
                    "INSERT INTO USER_PASSWORD (USERNAME, ROLE, PASSWORD, INSERT_DATE,NAME) VALUES (?, ?, ?, ?,?)";
                  connection.query(
                    query3,
                    [
                      data.username,
                      data.role,
                      Buffer.from(data.password).toString("base64"),
                      currentDate,
                      data.userFullname,
                    ],
                    (insertError, insertResults) => {
                      connection.release(); // Release the connection back to the pool
                      if (insertError) {
                        console.error(insertError);
                        res.status(400).json({
                          message: "Error while inserting data.",
                        });
                      } else {
                        res
                          .status(201)
                          .json({ message: "Success", success: "true" });
                      }
                    }
                  );
                } else {
                  connection.release();
                  res
                    .status(201)
                    .json({ message: "This user is already in use." });
                }
              }
            });
          }
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Error while querying data." });
      }
    }
  });
};

const verifyAdmin = (req, res) => {
  const token = req.body.token;
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", token);
      res.status(401).json({ success: false, message: "Invalid token" });
    } else if (decoded.userPermission !== "admin") {
      res.status(401).json({ success: false, message: "Not an admin user" });
    } else {
      res.status(200).json({ success: true, userName: decoded.userName });
    }
  });
};

const verifyUser = (req, res) => {
  const token = req.body.token;
  console.log(token);
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", token);
      res.status(401).json({ success: false, message: "Invalid token" });
    } else if (decoded.userPermission !== "user") {
      res.status(401).json({ success: false, message: "Not an user user" });
    } else {
      res.status(200).json({ success: true, userName: decoded.userName });
    }
  });
};

const verifyLogin = (req, res) => {
  const token = req.body.token;
  if (!token) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", err);
      res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      if (decoded.userRole === "admin") {
        res.status(200).json({ success: true, role: "admin" });
      } else if (decoded.userRole === "user") {
        res.status(200).json({ success: true, role: "user" });
      } else {
        res.status(200).json({ success: true, userName: decoded.userName });
      }
    }
  });
};
const editPermission = (req, res) => {
  const token = req.body.token;
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", err);
      res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      const USERNAME = req.body.AGENT_ID;

      const userQuery = `
        SELECT USER_ID FROM USER_PASSWORD WHERE USERNAME = ?;
      `;

      pool.query(userQuery, [USERNAME], (error, result) => {
        if (error) {
          console.log(error);
          res.status(500).json({
            success: false,
            message: "Error querying permissions.",
          });
        } else {
          const userId = result[0].USER_ID;
          const deletePermissionQuery = `
            DELETE FROM USER_PERMISSION
            WHERE USER_ID = ?;`;
          pool.query(deletePermissionQuery, [userId], (error, result) => {
            if (error) {
              console.log(error);
              res.status(500).json({
                success: false,
                message: "Error deleting permissions.",
              });
            } else {
              const permissions = req.body.PERMISSION;

              // Iterate over the permissions array and execute insert query for each permission
              permissions.forEach((permission) => {
                const insertNewPermissionQuery = `
                  INSERT INTO USER_PERMISSION
                  (USER_ID, USER_PERMISSION)
                  VALUES (?, ?)`;
                pool.query(
                  insertNewPermissionQuery,
                  [userId, permission],
                  (error, result) => {
                    if (error) {
                      console.log(error);
                      res.status(500).json({
                        success: false,
                        message: "Error inserting permissions.",
                      });
                    }
                  }
                );
              });

              res.status(200).json({
                success: true,
                message: "Permissions updated successfully.",
              });
            }
          });
        }
      });
    }
  });
};

module.exports = {
  login,
  addUser,
  verifyAdmin,
  verifyUser,
  verifyLogin,
  changePassword,
  editPermission,
};
