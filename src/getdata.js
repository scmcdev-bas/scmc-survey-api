const jwt = require("jsonwebtoken");
const pool = require("./db");
const secretKey = "newSecretKey";
const moment = require("moment");

const calculate = (result) => {
  let data = result[0];

  let dataset = [
    { name: "5", valuepercentage: 0, value: data?.Score5 || 0 },
    { name: "4", valuepercentage: 0, value: data?.Score4 || 0 },
    { name: "3", valuepercentage: 0, value: data?.Score3 || 0 },
    { name: "2", valuepercentage: 0, value: data?.Score2 || 0 },
    { name: "1", valuepercentage: 0, value: data?.Score1 || 0 },
    { name: "No data", valuepercentage: 0, value: data?.nodata || 0 },
  ];

  let scorelength = data?.scorelength || 0;
  let exportdata = [scorelength, dataset];

  for (let item of dataset) {
    if (scorelength > 0) {
      item.valuepercentage = (item.value * 100) / scorelength;
    }
  }

  return exportdata;
};

const getDataSetAdmin = (req, res) => {
  console.log("work");
  const token = req.body.token;
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      res.status(200).json({ success: false, message: "Invalid token" });
    } else {
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error connecting to database: ", err);
          res.status(500).json({ error: "Error connecting to the database." });
          return;
        }

        try {
          const currentDate = moment().format("YYYY-MM-DD");

          const query = `SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, 
          SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE 0 END) AS Score5, 
          SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE 0 END) AS Score4, 
          SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE 0 END) AS Score3, 
          SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE 0 END) AS Score2, 
          SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE 0 END) AS Score1 
          FROM IVR_SURVEY_TRANS 
          JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID 
          WHERE SURVEY_TOPIC <> '' 
          AND  SURVEY_DATETIME >= ? 
          AND SURVEY_DATETIME <= DATE_ADD(?, INTERVAL 1 DAY) 
          GROUP BY SURVEY_TOPIC;`;

          connection.query(
            query,
            [currentDate, currentDate],
            (error, result) => {
              console.log("result", result);
              if (error) {
                console.error(error);
                res.status(400).json({ error: "Error while querying data." });
              } else {
                res.status(200).json(result);
              }
              connection.release(); // Release the connection back to the pool
            }
          );
        } catch (error) {
          console.error(error);
          res
            .status(500)
            .json({ error: "Error while processing the request." });
        }
      });
    }
  });
};

const getDataSet = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      const username = decoded.userName;
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error connecting to database: ", err);
          res.status(500).json({ error: "Error connecting to the database." });
          return;
        }

        const currentDate = moment().format("YYYY-MM-DD");

        try {
          // Fetch user permissions
          const permissionQuery = `
            SELECT USER_PERMISSION.USER_PERMISSION
            FROM USER_PASSWORD
            JOIN USER_PERMISSION ON USER_PASSWORD.USER_ID = USER_PERMISSION.USER_ID
            WHERE USER_PASSWORD.USERNAME = ?;
          `;

          connection.query(
            permissionQuery,
            [username],
            (error, permissionResult) => {
              if (error) {
                console.error(error);
                res
                  .status(400)
                  .json({ error: "Error while querying permissions." });
                connection.release(); // Release the connection back to the pool
              } else {
                const userPermissions = permissionResult.map(
                  (row) => row.USER_PERMISSION
                );

                let query;
                let queryParams;

                query = `SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, 
                SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE 0 END) + SUM(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 5 THEN 1 ELSE 0 END) AS Score5, 
                SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE 0 END) + SUM(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 4 THEN 1 ELSE 0 END) AS Score4, 
                SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE 0 END) + SUM(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 3 THEN 1 ELSE 0 END) AS Score3, 
                SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE 0 END) + SUM(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 2 THEN 1 ELSE 0 END) AS Score2, 
                SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE 0 END) + SUM(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 1 THEN 1 ELSE 0 END) AS Score1,
                SUM(CASE WHEN IVR_SURVEY_TRANS.Score = 98 THEN 1 ELSE 0 END) + SUM(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 98 THEN 1 ELSE 0 END) AS nodata
                FROM IVR_SURVEY_TRANS 
                WHERE SURVEY_TOPIC <> '' 
                AND SURVEY_DATETIME >= ? 
                AND SURVEY_DATETIME <= DATE_ADD(?, INTERVAL 1 DAY)
                ${
                  userPermissions.length > 0
                    ? `AND IVR_SURVEY_TRANS.SURVEY_TOPIC IN (?)`
                    : ""
                }
                GROUP BY SURVEY_TOPIC;`;

                queryParams = [currentDate, currentDate, userPermissions];

                connection.query(query, queryParams, (error, result) => {
                  if (error) {
                    console.error(error);
                    res
                      .status(400)
                      .json({ error: "Error while querying data." });
                  } else {
                    console.log(result);
                    res.status(200).json(result);
                  }
                });
              }
            }
          );
        } catch (error) {
          console.error(error);
          res
            .status(500)
            .json({ error: "Error while processing the request." });
        } finally {
          connection.release(); // Release the connection back to the pool
        }
      });
    }
  });
};

const getDataSet2 = async (req, res) => {
  try {
    const { topics, startDate, endDate } = req.body;

    const topicParams = {
      T1115: topics.includes("1115") ? "1115" : null,
      ATM: topics.includes("ATM") ? "ATM" : null,
      CreditCard: topics.includes("CreditCard") ? "CreditCard" : null,
      MYMO: topics.includes("MYMO") ? "MYMO" : null,
    };
    const query = `
          SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name,
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS 'SCORE : 5',
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS 'SCORE : 4',
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS 'SCORE : 3',
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS 'SCORE : 2',
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS 'SCORE : 1'
          FROM IVR_SURVEY_TRANS
          JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID
          WHERE (SURVEY_TOPIC = ? OR SURVEY_TOPIC = ? OR SURVEY_TOPIC = ? OR SURVEY_TOPIC = ?)
            AND SURVEY_TOPIC <> '' AND
            IVR_SURVEY_TRANS.SURVEY_DATETIME >= ? AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= DATE_ADD(?, INTERVAL 1 DAY)
          GROUP BY SURVEY_TOPIC;
        `;

    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error connecting to database: ", err);
        res.status(500).json({ error: "Error connecting to the database." });
        return;
      }

      const values = Object.values(topicParams).concat([startDate, endDate]);
      connection.query(query, values, (error, result) => {
        if (error) {
          console.error(error);
          res.status(400).json({ error: "Error while querying data." });
        } else {
          res.status(200).json(result);
        }
        connection.release(); // Release the connection back to the pool
      });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error while connecting to the database." });
  }
};

const getDataSetPercentage = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      const username = decoded.userName;
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error connecting to database:", err);
          res.status(500).json({ error: "Error connecting to the database." });
          return;
        }

        try {
          // Fetch user permissions
          const permissionQuery = `
            SELECT USER_PERMISSION.USER_PERMISSION
            FROM USER_PASSWORD
            JOIN USER_PERMISSION ON USER_PASSWORD.USER_ID = USER_PERMISSION.USER_ID
            WHERE USER_PASSWORD.USERNAME = ?;
          `;

          connection.query(
            permissionQuery,
            [username],
            (error, permissionResult) => {
              if (error) {
                console.error(error);
                res
                  .status(400)
                  .json({ error: "Error while querying permissions." });
                connection.release(); // Release the connection back to the pool
              } else {
                const userPermissions = permissionResult.map(
                  (row) => row.USER_PERMISSION
                );

                const currentDate = moment().format("YYYY-MM-DD");

                let query;
                let queryParams;

                query = `
                SELECT
                  COUNT(IVR_SURVEY_TRANS.Score) AS scorelength,
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 5 THEN 1 ELSE NULL END) AS Score5, 
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 4 THEN 1 ELSE NULL END) AS Score4, 
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 3 THEN 1 ELSE NULL END) AS Score3, 
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 2 THEN 1 ELSE NULL END) AS Score2, 
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 1 THEN 1 ELSE NULL END) AS Score1,
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 98 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 98 THEN 1 ELSE NULL END) AS nodata
                FROM IVR_SURVEY_TRANS 
                WHERE SURVEY_TOPIC <> '' 
                AND SURVEY_DATETIME >= ? 
                AND SURVEY_DATETIME <= DATE_ADD(?, INTERVAL 1 DAY)
                ${
                  userPermissions.length > 0
                    ? `AND IVR_SURVEY_TRANS.SURVEY_TOPIC IN (?)`
                    : ""
                }
                ;`;

                queryParams = [currentDate, currentDate, userPermissions];

                connection.query(query, queryParams, (error, result) => {
                  if (error) {
                    console.error(error);
                    res
                      .status(400)
                      .json({ error: "Error while querying data." });
                  } else {
                    res.status(200).json(calculate(result));
                  }
                });
              }
            }
          );
        } catch (error) {
          console.error(error);
          res
            .status(500)
            .json({ error: "Error while processing the request." });
        } finally {
          connection.release(); // Release the connection back to the pool
        }
      });
    }
  });
};

const getDataSetPercentageAdmin = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err) => {
    if (err) {
      console.error("Invalid token:", err);
      res.status(200).json(false, "Invalid token");
    } else {
      try {
        const currentDate = moment().format("YYYY-MM-DD");

        pool.getConnection((err, connection) => {
          if (err) {
            console.error("Error while getting connection from pool:", err);
            res.status(500).json("Error while getting connection from pool.");
          } else {
            connection.query(
              "SELECT COUNT(Score) AS scorelength, " +
                "SUM(CASE WHEN Score = 98 THEN 1 ELSE 0 END) +  SUM(CASE WHEN Score_2 = 98 THEN 1 ELSE 0 END)AS nodata, " +
                "SUM(CASE WHEN Score = 5 THEN 1 ELSE 0 END) +  SUM(CASE WHEN Score_2 = 5 THEN 1 ELSE 0 END) AS Score5, " +
                "SUM(CASE WHEN Score = 4 THEN 1 ELSE 0 END) +  SUM(CASE WHEN Score_2 = 4 THEN 1 ELSE 0 END) AS Score4, " +
                "SUM(CASE WHEN Score = 3 THEN 1 ELSE 0 END) +  SUM(CASE WHEN Score_2 = 3 THEN 1 ELSE 0 END) AS Score3, " +
                "SUM(CASE WHEN Score = 2 THEN 1 ELSE 0 END) +  SUM(CASE WHEN Score_2 = 2 THEN 1 ELSE 0 END) AS Score2, " +
                "SUM(CASE WHEN Score = 1 THEN 1 ELSE 0 END) +  SUM(CASE WHEN Score_2 = 1 THEN 1 ELSE 0 END) AS Score1 " +
                "FROM IVR_SURVEY_TRANS " +
                "WHERE SURVEY_DATETIME >= ? AND SURVEY_DATETIME <= DATE_ADD(?, INTERVAL 1 DAY)",
              [currentDate, currentDate],
              (error, result) => {
                console.log(result);
                connection.release(); // Release the connection back to the pool
                if (error) {
                  console.error(error);
                  res.status(400).json("Error while querying data.");
                } else {
                  const newResult = calculate(result);
                  res.json(newResult);
                }
              }
            );
          }
        });
      } catch (error) {
        console.log(error);
        res.status(500).json("Error while connecting to the database.");
      }
    }
  });
};

const getAgent = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      try {
        const query =
          "SELECT EMP_ID, EMP_FIRSTNAME, DIVISION_ID FROM EMPLOYEE WHERE ROLE_ID = '3' AND DIVISION_ID = ?";

        pool.getConnection((err, connection) => {
          if (err) {
            console.error("Error while getting connection from pool:", err);
            res.status(500).json("Error while getting connection from pool.");
          } else {
            connection.query(query, [req.body.supervisor], (error, result) => {
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
      } catch (error) {
        console.log(error);
        res.status(500).json("Error while connecting to the database");
      }
    }
  });
};

const getSupervisor = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (decoded.userRole === "agent") {
      res.status(200).json([]);
      return;
    }
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error connecting to database:", err);
          res.status(500).json("Error connecting to database");
          return;
        }
        console.log(decoded.userRole);
        if (decoded.userRole === "supervisor") {
          try {
            const query =
              "SELECT EMP_ID, EMP_FIRSTNAME, DIVISION_ID FROM EMPLOYEE WHERE ROLE_ID = '2' AND DIVISION_ID = ?";
            connection.query(query, [decoded.DIVISION_ID], (error, result) => {
              if (error) {
                console.log(error);
                res.status(400).json("Error while querying data.");
              } else {
                res.status(200).json(result);
              }
              connection.release(); // Release the connection back to the pool
            });
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connecting to the database");
          }
        } else if (decoded.userRole === "manager") {
          try {
            const query =
              "SELECT EMP_ID, EMP_FIRSTNAME, DIVISION_ID FROM EMPLOYEE WHERE ROLE_ID = '2'";
            connection.query(query, (error, result) => {
              if (error) {
                console.log(error);
                res.status(400).json("Error while querying data.");
              } else {
                res.status(200).json(result);
              }
              connection.release(); // Release the connection back to the pool
            });
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connecting to the database");
          }
        }
      });
    }
  });
};
const deleteQueus = (req, res) => {
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
          const queusId = req.body.queusId;
          const query = `DELETE FROM QUEUS_NAME WHERE QUEUS_ID = ?`;

          connection.query(query, [queusId], (error, result) => {
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
const getQueusName = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error connecting to database:", err);
          res.status(500).json("Error connecting to database");
          return;
        }
        try {
          const query =
            "SELECT SURVEY_TOPIC AS QUEUS_TITLE FROM IVR_SURVEY_TRANS GROUP BY SURVEY_TOPIC";
          connection.query(query, (error, result) => {
            if (error) {
              console.log(error);
              res.status(400).json("Error while querying data.");
            } else {
              res.status(200).json(result);
            }
            connection.release(); // Release the connection back to the pool
          });
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connecting to the database");
        }
      });
    }
  });
};
const newQueus = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      const questionName = req.body.questionName;
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error connecting to database:", err);
          res.status(500).json("Error connecting to database");
          return;
        }
        try {
          const query = "INSERT INTO QUEUS_NAME (QUEUS_TITLE) VALUES (?);";
          connection.query(query, [questionName], (error, result) => {
            if (error) {
              console.log(error);
              res.status(400).json("Error while querying data.");
            } else {
              res.status(200).json("Insert data succesful");
            }
            connection.release(); // Release the connection back to the pool
          });
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connecting to the database");
        }
      });
    }
  });
};
const getPointReport = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", err);
      res.status(200).json({ success: false, message: "Invalid token" });
      return;
    }

    const username = decoded.userName;
    console.log(username);

    const data = req.body;
    const value1 = req.body.value1;
    const value2 = req.body.value2;
    const value3 = req.body.value3;
    const value4 = req.body.value4;
    const value5 = req.body.value5;
    const Noinput = req.body.noData;
    const topic = req.body.reportTopic;
    const cusTel = req.body.cusTel;
    const DIVISION = req.body.supervisor;
    const agent = req.body.agent;
    const startDate = req.body.startDateTime;
    const endDate = req.body.endDateTime;

    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting connection from pool:", err);
        res.status(500).json({ error: "Error getting connection from pool" });
        return;
      }

      const permissionQuery = `
        SELECT USER_PERMISSION.USER_PERMISSION
        FROM USER_PASSWORD
        JOIN USER_PERMISSION ON USER_PASSWORD.USER_ID = USER_PERMISSION.USER_ID
        WHERE USER_PASSWORD.USERNAME = ?;
      `;

      connection.query(
        permissionQuery,
        [username],
        (error, permissionResult) => {
          connection.release(); // Release the connection back to the pool

          if (error) {
            console.error(error);
            res.status(400).json("Error while querying data.");
            return;
          }

          const userPermissions = permissionResult.map(
            (row) => row.USER_PERMISSION
          );

          const topicConditions = userPermissions.map(
            (permission) => `IVR_SURVEY_TRANS.SURVEY_TOPIC = ?`
          );
          const topicParams = [...userPermissions, topic];

          const surveyQuery = `
              SELECT 
                DATE_FORMAT(IVR_SURVEY_TRANS.SURVEY_DATETIME, '%Y-%m-%d') AS Date,
                TIME_FORMAT(IVR_SURVEY_TRANS.SURVEY_DATETIME, '%H:%i:%s') AS Time,
                IVR_SURVEY_TRANS.AGENT_ID,
                RESERVE_1 AS EMP_FIRSTNAME,
                IVR_SURVEY_TRANS.SCORE,
                IVR_SURVEY_TRANS.MSISDN,
                IVR_SURVEY_TRANS.PLACE,
                IVR_SURVEY_TRANS.ROUTE_POINT,
                IVR_SURVEY_TRANS.SURVEY_TOPIC
                FROM IVR_SURVEY_TRANS
                WHERE
                IVR_SURVEY_TRANS.SURVEY_DATETIME BETWEEN ? AND ?
                AND RESERVE_1 LIKE CONCAT('%', ?, '%')
                ${
                  topic === ""
                    ? ""
                    : `AND (IVR_SURVEY_TRANS.SURVEY_TOPIC = ? OR ${topicConditions.join(
                        " OR "
                      )})`
                }
                  AND IVR_SURVEY_TRANS.MSISDN LIKE CONCAT('%', ?, '%')
                AND IVR_SURVEY_TRANS.SCORE IN (?, ?, ?, ?, ?, ?)
  ORDER BY IVR_SURVEY_TRANS.SURVEY_DATETIME DESC;
`;

          const queryParams = [
            startDate,
            endDate,
            agent,
            topic,
            cusTel,
            value1,
            value2,
            value3,
            value4,
            value5,
            Noinput,
            ...topicParams,
          ];

          connection.query(surveyQuery, queryParams, (error, result) => {
            if (error) {
              console.log(error);
              res.status(400).json({ error: "Error while querying data." });
            } else {
              res.status(200).json(result);
            }
          });
        }
      );
    });
  });
};

const searchFromId = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error getting connection from pool:", err);
          res.status(500).json({ error: "Error getting connection from pool" });
        } else {
          const agentID = req.body.agentID;
          const query = "SELECT EMP_FIRSTNAME FROM EMPLOYEE WHERE EMP_ID = ?";

          connection.query(query, [agentID], (error, result) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
              console.log(error);
              res.status(400).json("Error while querying data.");
            } else {
              const data = result.recordset;
              res.status(200).json(data);
            }
          });
        }
      });
    }
  });
};

const getSummaryPointReport = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", err);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting connection from pool:", err);
        return res.status(500).json({
          success: false,
          error: "Error getting connection from pool",
        });
      }

      try {
        const username = decoded.userName;

        // First Query: Retrieve user permissions
        const permissionQuery = `
          SELECT USER_PERMISSION.USER_PERMISSION
          FROM USER_PASSWORD
          JOIN USER_PERMISSION ON USER_PASSWORD.USER_ID = USER_PERMISSION.USER_ID
          WHERE USER_PASSWORD.USERNAME = ?;
        `;

        connection.query(
          permissionQuery,
          [username],
          (error, permissionResult) => {
            if (error) {
              console.error("Error while querying permissions:", error);
              connection.release();
              return res
                .status(400)
                .json({ error: "Error while querying permissions." });
            }

            const userPermissions = permissionResult.map(
              (row) => row.USER_PERMISSION
            );

            // Second Query: Use user permissions in the main data query
            const data = req.body;
            const query = `
            SELECT 
              RESERVE_1 AS EMP_FIRSTNAME, 
              SUM(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN 1 ELSE 0 END) AS sumscore, 
              AVG(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN CAST(IVR_SURVEY_TRANS.Score AS DECIMAL) ELSE NULL END) AS avgscore, 
              COUNT(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN IVR_SURVEY_TRANS.Score END) AS scorelength, 
              COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = '98' THEN 1 ELSE NULL END) AS nodata, 
              SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '5' THEN 1 ELSE 0 END) AS Score5, 
              SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '4' THEN 1 ELSE 0 END) AS Score4, 
              SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '3' THEN 1 ELSE 0 END) AS Score3, 
              SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '2' THEN 1 ELSE 0 END) AS Score2, 
              SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '1' THEN 1 ELSE 0 END) AS Score1 
            FROM 
              IVR_SURVEY_TRANS 
            WHERE 
              IVR_SURVEY_TRANS.SURVEY_DATETIME BETWEEN ? AND ?
              AND IVR_SURVEY_TRANS.SURVEY_TOPIC LIKE ?
              AND RESERVE_1 LIKE ?
              AND IVR_SURVEY_TRANS.Score <> '98'
              ${
                userPermissions.length > 0
                  ? `AND IVR_SURVEY_TRANS.SURVEY_TOPIC IN (?)`
                  : ""
              }
            GROUP BY 
              RESERVE_1 
            ORDER BY 
              RESERVE_1;
          `;

            const queryParams = [
              data.startDateTime,
              data.endDateTime,
              `%${data.reportTopic}%`,
              `%${data.agent}%`,
            ];

            if (userPermissions.length > 0) {
              queryParams.push(userPermissions);
            }

            connection.query(query, queryParams, (error, result) => {
              connection.release(); // Release the connection back to the pool

              if (error) {
                console.error("Error while querying data:", error);
                return res
                  .status(400)
                  .json({ error: "Error while querying data." });
              }

              res.status(200).json(result);
            });
          }
        );
      } catch (error) {
        console.error("Error processing request:", error);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    });
  });
};

const insertAgent = (req, res) => {
  jwt.verify(req.query.token, secretKey, async (err) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      try {
        const name = req.query.USERNAME;

        const file = req.file;

        if (!file) {
          res.status(400).json({ message: "File to upload not found." });
          return;
        }

        const workbook = xlsx.readFile(file.path);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const connection = await pool.getConnection();
        const transaction = new sql.Transaction(connection);

        try {
          await transaction.begin();

          for (const row of data) {
            const date = new Date();
            const formattedDate = date
              .toISOString()
              .replace("T", " ")
              .substring(0, 19);
            await transaction
              .request()
              .query(
                `INSERT INTO EMPLOYEE (EMP_FIRSTNAME,EMP_LASTNAME, ROLE_ID, DIVISION_ID,CREATE_BY,INSERT_DATE) VALUES ('${row.EMP_FIRSTNAME}', '${row.EMP_LASTNAME}', '${row.ROLE_ID}', '${row.DIVISION_ID}', '${name}', '${formattedDate}')`
              );
          }

          await transaction.commit();
          res.status(200).json({ message: "Upload data success." });
        } catch (error) {
          console.error(error);
          await transaction.rollback();
          res.status(500).json({ message: "Error while insert data." });
        } finally {
          connection.release(); // Release the connection back to the pool
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({
          message: "Error while processing the file. Please check your file.",
        });
      }
    }
  });
};

const getDataForSearchGharp = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", err);
      res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      const username = decoded.userName;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;

      pool.getConnection((err, connection) => {
        if (err) {
          console.log(err);
          res.status(500).json("Error while connecting to the database.");
        } else {
          // Fetch user permissions
          const permissionQuery = `
            SELECT USER_PERMISSION.USER_PERMISSION
            FROM USER_PASSWORD
            JOIN USER_PERMISSION ON USER_PASSWORD.USER_ID = USER_PERMISSION.USER_ID
            WHERE USER_PASSWORD.USERNAME = ?;
          `;

          connection.query(
            permissionQuery,
            [username],
            (error, permissionResult) => {
              if (error) {
                console.error(error);
                res.status(400).json("Error while querying permissions.");
                connection.release(); // Release the connection back to the pool
              } else {
                const userPermissions = permissionResult.map(
                  (row) => row.USER_PERMISSION
                );

                let query;
                let params;

                query = `
                SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name,
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 5 THEN 1 ELSE NULL END) AS Score5,
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 4 THEN 1 ELSE NULL END) AS Score4,
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 3 THEN 1 ELSE NULL END) AS Score3,
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 2 THEN 1 ELSE NULL END) AS Score2,
                  COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) + COUNT(CASE WHEN IVR_SURVEY_TRANS.Score_2 = 1 THEN 1 ELSE NULL END) AS Score1
                FROM IVR_SURVEY_TRANS
                WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= ? AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATE_ADD(?, INTERVAL 1 DAY)
                      AND SURVEY_TOPIC <> ''
                      ${
                        userPermissions.length > 0
                          ? `AND IVR_SURVEY_TRANS.SURVEY_TOPIC IN (?)`
                          : ""
                      }
                GROUP BY SURVEY_TOPIC`;

                params = [startDate, endDate, userPermissions];

                connection.query(query, params, (error, result) => {
                  console.log(result);
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while querying data.");
                  } else {
                    res.status(200).json(result);
                  }
                  connection.release(); // Release the connection back to the pool
                });
              }
            }
          );
        }
      });
    }
  });
};

const getDataForSearchPercentage = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", err);
      res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      const username = decoded.userName;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;

      pool.getConnection((err, connection) => {
        if (err) {
          console.log(err);
          res.status(500).json("Error while connecting to the database.");
        } else {
          // Fetch user permissions
          const permissionQuery = `
            SELECT USER_PERMISSION.USER_PERMISSION
            FROM USER_PASSWORD
            JOIN USER_PERMISSION ON USER_PASSWORD.USER_ID = USER_PERMISSION.USER_ID
            WHERE USER_PASSWORD.USERNAME = ?;
          `;

          connection.query(
            permissionQuery,
            [username],
            (error, permissionResult) => {
              if (error) {
                console.error(error);
                res.status(400).json("Error while querying permissions.");
                connection.release(); // Release the connection back to the pool
              } else {
                const userPermissions = permissionResult.map(
                  (row) => row.USER_PERMISSION
                );

                let query;
                let params;

                query = `
                SELECT COUNT(Score) AS scorelength,
                       COUNT(CASE WHEN Score = 98 THEN 1 ELSE NULL END) AS nodata,
                       COUNT(CASE WHEN Score = 5 THEN 1 ELSE NULL END) AS Score5,
                       COUNT(CASE WHEN Score = 4 THEN 1 ELSE NULL END) AS Score4,
                       COUNT(CASE WHEN Score = 3 THEN 1 ELSE NULL END) AS Score3,
                       COUNT(CASE WHEN Score = 2 THEN 1 ELSE NULL END) AS Score2,
                       COUNT(CASE WHEN Score = 1 THEN 1 ELSE NULL END) AS Score1,
                       COUNT(CASE WHEN Score = 98 THEN 1 ELSE NULL END) AS nodata
                FROM IVR_SURVEY_TRANS
                WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= ? AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATE_ADD(?, INTERVAL 1 DAY)
                ${
                  userPermissions.length > 0
                    ? `AND IVR_SURVEY_TRANS.SURVEY_TOPIC IN (?)`
                    : ""
                }`;

                params = [startDate, endDate, userPermissions];

                connection.query(query, params, (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while querying data.");
                  } else {
                    console.log("calculate(result)", calculate(result));
                    res.json(calculate(result));
                  }
                  connection.release(); // Release the connection back to the pool
                });
              }
            }
          );
        }
      });
    }
  });
};
const getPermissioingList = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:", err);
      res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      try {
        const permissionQuery = `
          SELECT SURVEY_TOPIC FROM IVR_SURVEY_TRANS GROUP BY SURVEY_TOPIC;
        `;
        pool.query(permissionQuery, (error, result) => {
          if (error) {
            console.log(error);
            res
              .status(500)
              .json({ success: false, message: "Error querying permissions." });
          } else {
            const surveyTopics = result.map((row) => row.SURVEY_TOPIC);
            res.json({ success: true, surveyTopics });
          }
        });
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json({ success: false, message: "Internal server error." });
      }
    }
  });
};

module.exports = {
  getDataSet,
  getDataSet2,
  getDataSetPercentage,
  getDataSetPercentageAdmin,
  getAgent,
  getSupervisor,
  getPointReport,
  searchFromId,
  getSummaryPointReport,
  insertAgent,
  getDataForSearchGharp,
  getDataForSearchPercentage,
  getDataSetAdmin,
  getQueusName,
  newQueus,
  deleteQueus,
  getPermissioingList
};
