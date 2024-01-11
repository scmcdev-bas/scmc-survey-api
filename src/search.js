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
          const query = `SELECT EMPLOYEE.EMP_ID AS agentID, EMPLOYEE.EMP_FIRSTNAME as AGENT_NAME,EMPLOYEE.EMP_LASTNAME AS AGENT_LASTNAME, DIVISION.DIVISION_NAME ,DIVISION.DIVISION_ID, EMPLOYEE2.EMP_FIRSTNAME  as SUPERVISOR_NAME FROM EMPLOYEE JOIN DIVISION ON EMPLOYEE.DIVISION_ID = DIVISION.DIVISION_ID JOIN EMPLOYEE AS EMPLOYEE2 ON EMPLOYEE.DIVISION_ID = EMPLOYEE2.DIVISION_ID AND EMPLOYEE2.ROLE_ID = '2' WHERE EMPLOYEE.ROLE_ID = '3' AND EMPLOYEE.EMP_FIRSTNAME LIKE CONCAT('%', ?, '%')`;

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
          const query = `
          SELECT EMPLOYEE.EMP_ID AS agentID,
                 EMPLOYEE.EMP_FIRSTNAME AS AGENT_NAME,
                 EMPLOYEE.EMP_LASTNAME,
                 DIVISION.DIVISION_ID,
                 DIVISION.DIVISION_NAME
          FROM EMPLOYEE
          JOIN DIVISION ON EMPLOYEE.DIVISION_ID = DIVISION.DIVISION_ID
          WHERE (EMPLOYEE.ROLE_ID = '2' OR EMPLOYEE.ROLE_ID = '1')
            AND EMPLOYEE.EMP_FIRSTNAME LIKE CONCAT('%', ?, '%')
        `;
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
const searchTeam = (req, res) => {
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
          const search = req.body.search;
          const query = `
          SELECT
    DIVISION.DIVISION_ID,
    DIVISION.DIVISION_NAME,
    IFNULL(
        GROUP_CONCAT(CONCAT(EMPLOYEE.EMP_FIRSTNAME, ' ', EMPLOYEE.EMP_LASTNAME) ORDER BY EMPLOYEE.EMP_FIRSTNAME, EMPLOYEE.EMP_LASTNAME SEPARATOR ', '),
        '-'
    ) AS NAME
FROM DIVISION
LEFT JOIN EMPLOYEE ON EMPLOYEE.DIVISION_ID = DIVISION.DIVISION_ID AND EMPLOYEE.ROLE_ID != 3
WHERE (DIVISION.DIVISION_ID LIKE CONCAT('%', ?, '%') OR DIVISION.DIVISION_NAME LIKE CONCAT('%', ?, '%'))
GROUP BY DIVISION.DIVISION_ID, DIVISION.DIVISION_NAME
ORDER BY DIVISION.DIVISION_ID;


        `;
          connection.query(query, [search, search], (error, result) => {
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
            if (error) {
              console.error("Error while deleting data:", error);
              res.status(400).json({ error: "Error while deleting data." });
            } else {
              const query = `DELETE FROM USER_PASSWORD WHERE EMP_ID = ?`;

              connection.query(query, [AGENT_ID], (error, result) => {
                connection.release();
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
    }
  });
};
const deleteUser = (req, res) => {
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
          console.log(AGENT_ID);
          const query = `DELETE FROM USER_PASSWORD WHERE USERNAME = ?`;

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
const deleteTeam = (req, res) => {
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
          const teamID = req.body.teamID;
          console.log(teamID);
          const query = `DELETE FROM DIVISION WHERE DIVISION_ID = ?`;

          connection.query(query, [teamID], (error, result) => {
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

const editTeam = (req, res) => {
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
          const teamID = req.body.teamID;
          const newTeamName = req.body.newTeamName;
          console.log(teamID);
          const query = `UPDATE DIVISION SET DIVISION_NAME = ?  WHERE DIVISION_ID = ?`;

          connection.query(query, [newTeamName, teamID], (error, result) => {
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

const editAgent = (req, res) => {
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
          const newName = req.body.newName;
          const newLastName = req.body.newLastName;
          const newDiviosion = req.body.newDiviosion;
          const agentID = req.body.agentID;

          const query = `UPDATE EMPLOYEE SET EMP_FIRSTNAME = ?, EMP_LASTNAME = ?, DIVISION_ID = ? WHERE EMP_ID = ?;`;

          connection.query(query, [newName,newLastName,newDiviosion, agentID], (error, result) => {
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
const newTeam = (req, res) => {
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
          const newTeamId = req.body.newTeamId;
          const newTeamName = req.body.newTeamName;
          console.log(newTeamId);

          const selectQuery = `SELECT DIVISION_ID FROM DIVISION  WHERE DIVISION_ID = ?`;

          connection.query(selectQuery, [newTeamId], (error, result) => {
            console.log(result);
            if (error) {
              console.error("Error while executing SELECT query:", error);
              res
                .status(500)
                .json({ error: "Error while executing SELECT query." });
            } else {
              if (result.length === 0) {
                const insertQuery = `INSERT INTO DIVISION (DIVISION_ID, DIVISION_NAME) VALUES (?, ?);`;
                connection.query(
                  insertQuery,
                  [newTeamId, newTeamName],
                  (error, result) => {
                    connection.release();
                    if (error) {
                      console.error("Error while inserting data:", error);
                      res
                        .status(400)
                        .json({ error: "Error while inserting data." });
                    } else {
                      const data = result;
                      res.status(200).json(data);
                    }
                  }
                );
              } else {
                connection.release();
                res.status(409).json({ error: "Team ID is used." });
              }
            }
          });
        }
      });
    }
  });
};

const getNoAgentData = (req, res) => {
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
          const query = `
          SELECT
          IVR_SURVEY_TRANS.AGENT_ID,
          IVR_SURVEY_TRANS.SURVEY_DATETIME AS latestSURVEY_DATETIME
      FROM
          IVR_SURVEY_TRANS
      LEFT JOIN
          EMPLOYEE ON IVR_SURVEY_TRANS.AGENT_ID = EMPLOYEE.EMP_ID
      WHERE
          EMPLOYEE.EMP_ID IS NULL
          AND (IVR_SURVEY_TRANS.AGENT_ID, IVR_SURVEY_TRANS.SURVEY_DATETIME) IN (
          SELECT AGENT_ID, MAX(SURVEY_DATETIME) AS maxSURVEY_DATETIME
          FROM IVR_SURVEY_TRANS
          GROUP BY AGENT_ID
    );

        `;
          connection.query(query, (error, result) => {
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
module.exports = {
  searchAgentData,
  searchManagerData,
  searchUser,
  deleteAgent,
  deleteUser,
  getNoAgentData,
  searchTeam,
  deleteTeam,
  editTeam,
  newTeam,
  editAgent
};
