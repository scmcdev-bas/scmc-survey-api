const jwt = require("jsonwebtoken");
const pool = require("./db");
const secretKey = "newSecretKey";
const searchAgentData = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      pool.getConnection((connectionError, connection) => {
        if (connectionError) {
          console.error(connectionError);
          res
            .status(500)
            .json({ error: "Error while connecting to the database." });
        } else {
          const agentname = req.body.search;
          const query = `SELECT EMPLOYEE.EMP_ID AS agentID, EMPLOYEE.EMP_FIRSTNAME as AGENT_NAME, DIVISION.DIVISION_NAME , EMPLOYEE2.EMP_FIRSTNAME  as SUPERVISOR_NAME FROM EMPLOYEE JOIN DIVISION ON EMPLOYEE.DIVISION_ID = DIVISION.DIVISION_ID JOIN EMPLOYEE AS EMPLOYEE2 ON EMPLOYEE.DIVISION_ID = EMPLOYEE2.DIVISION_ID AND EMPLOYEE2.ROLE_ID = '2' WHERE EMPLOYEE.ROLE_ID = '3' AND EMPLOYEE.EMP_FIRSTNAME LIKE CONCAT('%', ?, '%')`;

          connection.query(query, [agentname], (error, result) => {
            connection.release(); // Release the connection back to the pool
            if (error) {
              console.log(error);
              res.status(400).json("Error while querying data.");
            } else {
              const data = result;
              res.status(200).json(data);
            }
          });
        }
      });
    }
  });
};

const searchManagerData = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      pool.getConnection((connectionError, connection) => {
        if (connectionError) {
          console.error(connectionError);
          res
            .status(500)
            .json({ error: "Error while connecting to the database." });
        } else {
          const managername = req.body.search;
          const query = `SELECT EMPLOYEE.EMP_ID AS agentID, EMPLOYEE.EMP_FIRSTNAME as AGENT_NAME,DIVISION.DIVISION_ID, DIVISION.DIVISION_NAME FROM EMPLOYEE JOIN DIVISION ON EMPLOYEE.DIVISION_ID = DIVISION.DIVISION_ID WHERE EMPLOYEE.ROLE_ID = '2' AND EMPLOYEE.EMP_FIRSTNAME LIKE CONCAT('%', ?, '%')`;

          connection.query(query, [managername], (error, result) => {
            connection.release(); // Release the connection back to the pool
            if (error) {
              console.log(error);
              res.status(400).json("Error while querying data.");
            } else {
              res.status(200).json(result);
            }
          });
        }
      });
    }
  });
};

const searchUser = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      pool.getConnection((connectionError, connection) => {
        if (connectionError) {
          console.error(connectionError);
          res
            .status(500)
            .json({ error: "Error while connecting to the database." });
        } else {
          const userName = req.body.searchUsername;
          const userFullname = req.body.searchName;
          const userRole = req.body.searchRole;
          const query = `SELECT USER_PASSWORD.INSERT_DATE, USER_PASSWORD.USERNAME, EMPLOYEE.EMP_FIRSTNAME, ROLE.ROLE_NAME 
                         FROM USER_PASSWORD 
                         JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = USER_PASSWORD.EMP_ID 
                         JOIN ROLE ON ROLE.ROLE_ID = EMPLOYEE.ROLE_ID 
                         WHERE USER_PASSWORD.USERNAME LIKE CONCAT('%', ?, '%') 
                         AND EMPLOYEE.EMP_FIRSTNAME LIKE CONCAT('%', ?, '%') 
                         AND ROLE.ROLE_ID LIKE CONCAT('%', ?, '%')`;

          connection.query(
            query,
            [userName, userFullname, userRole],
            (error, result) => {
              connection.release(); // Release the connection back to the pool
              if (error) {
                console.log(error);
                res.status(400).json("Error while querying data.");
              } else {
                const data = result;
                data.forEach((obj) => {
                  const date = new Date(obj.INSERT_DATE);
                  const dateString = date.toISOString().split("T")[0];
                  obj.INSERT_DATE = dateString;
                });
                res.status(200).json(data);
              }
            }
          );
        }
      });
    }
  });
};
const deleteAgent = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err) => {
    if (err) {
      console.error("Invalid token:", err);
      res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      pool.getConnection((connectionError, connection) => {
        if (connectionError) {
          console.error("Error connecting to the database:", connectionError);
          res.status(500).json({ error: "Error connecting to the database." });
        } else {
          const AGENT_ID = req.body.AGENT_ID;
          const query = `DELETE FROM EMPLOYEE WHERE EMP_ID = ?`;

          connection.query(query, [AGENT_ID], (error, result) => {
            connection.release(); // Release the connection back to the pool
            if (error) {
              console.error("Error while deleting data:", error);
              res.status(400).json({ error: "Error while deleting data." });
            } else {
              const data = result;
              res.status(200).json(data);
            }
          });
        }
      });
    }
  });
};


module.exports = {
  searchAgentData,
  searchManagerData,
  searchUser,
  deleteAgent
};
