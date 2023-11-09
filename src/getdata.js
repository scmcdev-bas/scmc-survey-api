const jwt = require("jsonwebtoken");
const fs = require("fs");
const { sql, pool, secretKey } = require("./db");

const getDataSet = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      if (decoded.userRole === "supervisor") {
        try {
          const currentDate = new Date()
            .toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
            .split(", ")[0];
          const request = new sql.Request(pool);
          request
            .input("currentDate", sql.NVarChar, currentDate)
            .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
            .query(
              "SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE SURVEY_TOPIC <> '' AND EMPLOYEE.DIVISION_ID = @DIVISION_ID AND SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate) GROUP BY SURVEY_TOPIC;",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
      } else if (decoded.userRole === "manager") {
        try {
          const currentDate = new Date()
            .toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
            .split(", ")[0];
          const request = new sql.Request(pool);
          request
            .input("currentDate", sql.NVarChar, currentDate)
            .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
            .query(
              "SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE SURVEY_TOPIC <> '' AND  SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate) GROUP BY SURVEY_TOPIC;",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
      }
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
    console.log(endDate);
    const query = `
          SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name,
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS 'SCORE : 5',
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS 'SCORE : 4',
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS 'SCORE : 3',
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS 'SCORE : 2',
            COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS 'SCORE : 1'
          FROM IVR_SURVEY_TRANS
          JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID
          WHERE (SURVEY_TOPIC = @T1115 OR SURVEY_TOPIC = @ATM OR SURVEY_TOPIC = @CreditCard OR SURVEY_TOPIC = @MYMO)
            AND SURVEY_TOPIC <> '' AND
            IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= DATEADD(day, 1, @endDate)
          GROUP BY SURVEY_TOPIC;
        `;

    const pool = await sql.connect(config);
    const request = pool.request();

    for (const paramName in topicParams) {
      const paramValue = topicParams[paramName];
      request.input(paramName, sql.NVarChar, paramValue);
    }
    request.input("startDate", sql.DateTime, startDate);
    request.input("endDate", sql.DateTime, endDate);

    const result = await request.query(query);
    res.status(200).json(result.recordset);
    console.log(result.recordset);
  } catch (error) {
    console.log(error);
    res.status(500).json("Error while connecting to the database.");
  }
};

const getDataSetPercentage = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      res.status(200).json(false, "Invalid token");
    } else {
      try {
        const currentDate = new Date()
          .toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
          .split(", ")[0];
        const request = new sql.Request(pool);
        request
          .input("currentDate", sql.NVarChar, currentDate)
          .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
          .query(
            "SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE SURVEY_TOPIC <> '' AND  SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate) GROUP BY SURVEY_TOPIC;",
            (error, result) => {
              if (error) {
                console.log(error);
                res.status(400).json("Error while query data.");
              } else {
                res.status(200).json(result.recordset);
              }
            }
          );
      } catch (error) {
        console.log(error);
        res.status(500).json("Error while connect database.");
      }
    }
  });
};

const getDataSetPercentageAdmin = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      try {
        const request = new sql.Request(pool);
        const currentDate = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
        request
          .input("currentDate", sql.NVarChar, currentDate)
          .query(
            "SELECT COUNT(Score) AS scorelength, COUNT(CASE WHEN Score = 98 THEN 1 ELSE NULL END)  AS nodata, COUNT(CASE WHEN Score = 5 THEN 1 ELSE NULL END)  AS Score5, COUNT(CASE WHEN Score = 4 THEN 1 ELSE NULL END)  AS Score4, COUNT(CASE WHEN Score = 3 THEN 1 ELSE NULL END)  AS Score3, COUNT(CASE WHEN Score = 2 THEN 1 ELSE NULL END)  AS Score2, COUNT(CASE WHEN Score = 1 THEN 1 ELSE NULL END)  AS Score1 FROM IVR_SURVEY_TRANS WHERE  SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate)",
            (error, result) => {
              if (error) {
                console.log(error);
                res.status(400).json("Error while query data.");
              } else {
                res.json(calculate(result));
              }
            }
          );
      } catch (error) {
        console.log(error);
        res.status(500).json("Error while connect database.");
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
        const request = new sql.Request(pool);
        request
          .input("DIVISION_ID", sql.NVarChar, req.body.supervisor)
          .query(
            "SELECT EMP_ID,EMP_FIRSTNAME,DIVISION_ID FROM EMPLOYEE WHERE ROLE_ID = '3' AND DIVISION_ID = @DIVISION_ID",
            (error, result) => {
              if (error) {
                console.log(error);
                res.status(400).json("Error while query data.");
              } else {
                res.status(200).json(result.recordset);
              }
            }
          );
      } catch (error) {
        console.log(error);
        res.status(500).json("Error while connect database");
      }
    }
  });
};

const getSupervisor = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      if (decoded.userRole === "supervisor") {
        try {
          const request = new sql.Request(pool);
          request
            .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
            .query(
              "SELECT EMP_ID,EMP_FIRSTNAME,DIVISION_ID FROM EMPLOYEE WHERE ROLE_ID = '2' AND DIVISION_ID = @DIVISION_ID",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database");
        }
      } else if (decoded.userRole === "manager") {
        try {
          const request = new sql.Request(pool);
          request.query(
            "SELECT EMP_ID,EMP_FIRSTNAME,DIVISION_ID FROM EMPLOYEE WHERE ROLE_ID = '2'",
            (error, result) => {
              if (error) {
                console.log(error);
                res.status(400).json("Error while query data.");
              } else {
                res.status(200).json(result.recordset);
              }
            }
          );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database");
        }
      }
    }
  });
};

const getPointReport = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      const request = new sql.Request(pool);
      data = req.body;
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
      if (decoded.userRole === "supervisor") {
        try {
          request
            .input("value1", sql.NVarChar, value1)
            .input("value2", sql.NVarChar, value2)
            .input("value3", sql.NVarChar, value3)
            .input("value4", sql.NVarChar, value4)
            .input("value5", sql.NVarChar, value5)
            .input("Noinput", sql.NVarChar, Noinput)
            .input("topic", sql.NVarChar, topic)
            .input("start", sql.NVarChar, data.startDate)
            .input("end", sql.NVarChar, data.endDate)
            .input("cusTel", sql.NVarChar, cusTel)
            .input("DIVISION", sql.NVarChar, decoded.DIVISION_ID)
            .input("agent", sql.NVarChar, agent)
            .input("startDate", sql.NVarChar, startDate)
            .input("endDate", sql.NVarChar, endDate)
            .query(
              "SELECT DISTINCT CONVERT(varchar(10), IVR_SURVEY_TRANS.SURVEY_DATETIME, 111) AS Date, RIGHT(CONVERT(varchar(19), IVR_SURVEY_TRANS.SURVEY_DATETIME, 120), 8) AS Time, IVR_SURVEY_TRANS.AGENT_ID, EMPLOYEE.EMP_FIRSTNAME, DIVISION.DIVISION_NAME, IVR_SURVEY_TRANS.SCORE, IVR_SURVEY_TRANS.MSISDN, IVR_SURVEY_TRANS.PLACE, IVR_SURVEY_TRANS.ROUTE_POINT, IVR_SURVEY_TRANS.SURVEY_TOPIC, EMPLOYEE2.EMP_FIRSTNAME AS SUPERVISOR FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID JOIN DIVISION ON DIVISION.DIVISION_ID = EMPLOYEE.DIVISION_ID JOIN EMPLOYEE AS EMPLOYEE2 ON EMPLOYEE.DIVISION_ID = EMPLOYEE2.DIVISION_ID AND EMPLOYEE2.ROLE_ID = '2' WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= @endDate AND DIVISION.DIVISION_ID = @DIVISION  AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @AGENT + '%' AND IVR_SURVEY_TRANS.SURVEY_TOPIC LIKE '%' + @topic + '%' AND IVR_SURVEY_TRANS.MSISDN LIKE '%' + @cusTel + '%' AND (IVR_SURVEY_TRANS.SCORE LIKE @value1 OR IVR_SURVEY_TRANS.SCORE LIKE @value2 OR IVR_SURVEY_TRANS.SCORE LIKE @value3 OR IVR_SURVEY_TRANS.SCORE LIKE @value4 OR IVR_SURVEY_TRANS.SCORE LIKE @value5 OR IVR_SURVEY_TRANS.SCORE LIKE @Noinput)",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  let data = result.recordset;
                  res.status(200).json(data);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
      } else if (decoded.userRole === "manager") {
        try {
          request
            .input("value1", sql.NVarChar, value1)
            .input("value2", sql.NVarChar, value2)
            .input("value3", sql.NVarChar, value3)
            .input("value4", sql.NVarChar, value4)
            .input("value5", sql.NVarChar, value5)
            .input("Noinput", sql.NVarChar, Noinput)
            .input("topic", sql.NVarChar, topic)
            .input("start", sql.NVarChar, data.startDate)
            .input("end", sql.NVarChar, data.endDate)
            .input("cusTel", sql.NVarChar, cusTel)
            .input("DIVISION", sql.NVarChar, DIVISION)
            .input("agent", sql.NVarChar, agent)
            .input("startDate", sql.NVarChar, startDate)
            .input("endDate", sql.NVarChar, endDate)
            .query(
              "SELECT DISTINCT CONVERT(varchar(10), IVR_SURVEY_TRANS.SURVEY_DATETIME, 111) AS Date, RIGHT(CONVERT(varchar(19), IVR_SURVEY_TRANS.SURVEY_DATETIME, 120), 8) AS Time, IVR_SURVEY_TRANS.AGENT_ID, EMPLOYEE.EMP_FIRSTNAME, DIVISION.DIVISION_NAME, IVR_SURVEY_TRANS.SCORE, IVR_SURVEY_TRANS.MSISDN, IVR_SURVEY_TRANS.PLACE, IVR_SURVEY_TRANS.ROUTE_POINT, IVR_SURVEY_TRANS.SURVEY_TOPIC, EMPLOYEE2.EMP_FIRSTNAME AS SUPERVISOR FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID JOIN DIVISION ON DIVISION.DIVISION_ID = EMPLOYEE.DIVISION_ID JOIN EMPLOYEE AS EMPLOYEE2 ON EMPLOYEE.DIVISION_ID = EMPLOYEE2.DIVISION_ID AND EMPLOYEE2.ROLE_ID = '2' WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= @endDate AND DIVISION.DIVISION_ID LIKE '%' + @DIVISION + '%' AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @AGENT + '%' AND IVR_SURVEY_TRANS.SURVEY_TOPIC LIKE '%' + @topic + '%' AND IVR_SURVEY_TRANS.MSISDN LIKE '%' + @cusTel + '%' AND (IVR_SURVEY_TRANS.SCORE LIKE @value1 OR IVR_SURVEY_TRANS.SCORE LIKE @value2 OR IVR_SURVEY_TRANS.SCORE LIKE @value3 OR IVR_SURVEY_TRANS.SCORE LIKE @value4 OR IVR_SURVEY_TRANS.SCORE LIKE @value5 OR IVR_SURVEY_TRANS.SCORE LIKE @Noinput)",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  let data = result.recordset;

                  res.status(200).json(data);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
      }
    }
  });
};
const searchFromId = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      try {
        const request = new sql.Request(pool);
        const agentID = req.body.agentID;
        request
          .input("agentID", sql.NVarChar, agentID)
          .query(
            "SELECT EMP_FIRSTNAME FROM EMPLOYEE WHERE EMP_ID = @agentID",
            (error, result) => {
              if (error) {
                console.log(error);
                res.status(400).json("Error while query data.");
              } else {
                const data = result.recordset;
                res.status(200).json(data);
              }
            }
          );
      } catch (error) {
        console.log(error);
        res.status(500).json("Error while connect Database.");
      }
    }
  });
};

const getSummaryPointReport = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      const request = new sql.Request(pool);
      data = req.body;
      if (decoded.userRole === "supervisor") {
        try {
          const request = new sql.Request(pool);
          data = req.body;
          request
            .input("supervisor", sql.NVarChar, decoded.DIVISION_ID)
            .input("agent", sql.NVarChar, data.agent)
            .input("reportTopic", sql.NVarChar, data.reportTopic)
            .input("startDate", sql.NVarChar, data.startDateTime)
            .input("endDate", sql.NVarChar, data.endDateTime)
            .query(
              "SELECT EMPLOYEE.EMP_FIRSTNAME, SUM(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN CAST(IVR_SURVEY_TRANS.Score AS INT) ELSE 0 END) AS sumscore, AVG(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN CAST(IVR_SURVEY_TRANS.Score AS FLOAT) ELSE NULL END) AS avgscore, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN IVR_SURVEY_TRANS.Score END) AS scorelength, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = '98' THEN 1 ELSE NULL END) AS nodata, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '5' THEN 1 ELSE 0 END) AS Score5, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '4' THEN 1 ELSE 0 END) AS Score4, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '3' THEN 1 ELSE 0 END) AS Score3, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '2' THEN 1 ELSE 0 END) AS Score2, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '1' THEN 1 ELSE 0 END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= @endDate AND EMPLOYEE.DIVISION_ID = @supervisor AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @agent + '%' AND IVR_SURVEY_TRANS.SURVEY_TOPIC LIKE '%' + @reportTopic + '%' GROUP BY EMPLOYEE.EMP_FIRSTNAME ORDER BY EMPLOYEE.EMP_FIRSTNAME;",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connec database.");
        }
      } else if (decoded.userRole === "manager") {
        try {
          const request = new sql.Request(pool);
          data = req.body;
          request
            .input("supervisor", sql.NVarChar, data.supervisor)
            .input("agent", sql.NVarChar, data.agent)
            .input("reportTopic", sql.NVarChar, data.reportTopic)
            .input("startDate", sql.NVarChar, data.startDateTime)
            .input("endDate", sql.NVarChar, data.endDateTime)
            .query(
              "SELECT EMPLOYEE.EMP_FIRSTNAME, SUM(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN 1 ELSE 0 END) AS sumscore, AVG(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN IVR_SURVEY_TRANS.Score ELSE NULL END) AS avgscore, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN IVR_SURVEY_TRANS.Score END) AS scorelength, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = '98' THEN 1 ELSE NULL END) AS nodata, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '5' THEN 1 ELSE 0 END) AS Score5, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '4' THEN 1 ELSE 0 END) AS Score4, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '3' THEN 1 ELSE 0 END) AS Score3, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '2' THEN 1 ELSE 0 END) AS Score2, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '1' THEN 1 ELSE 0 END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= @endDate AND EMPLOYEE.DIVISION_ID LIKE '%' + @supervisor + '%' AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @agent + '%' AND IVR_SURVEY_TRANS.SURVEY_TOPIC LIKE '%' + @reportTopic + '%' GROUP BY EMPLOYEE.EMP_FIRSTNAME ORDER BY EMPLOYEE.EMP_FIRSTNAME;",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connec database.");
        }
      }
    }
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

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
          const request = new sql.Request(transaction);
          for (const row of data) {
            const date = new Date();
            const formattedDate = date
              .toISOString()
              .replace("T", " ")
              .substring(0, 19);
            await request.query(
              `INSERT INTO EMPLOYEE (EMP_FIRSTNAME,EMP_LASTNAME, ROLE_ID, DIVISION_ID,CREATE_BY,INSERT_DATE) VALUES ('${row.EMP_FIRSTNAME}', '${row.EMP_LASTNAME}', '${row.ROLE_ID}', '${row.DIVISION_ID}', '${name}', '${formattedDate}')`
            );
          }

          await transaction.commit();
          res.status(200).json({ message: "Upload data success." });
        } catch (error) {
          console.error(error);
          await transaction.rollback();
          res.status(500).json({ message: "Error while insert data." });
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
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;
      const request = new sql.Request(pool);
      data = req.body;
      if (decoded.userRole === "supervisor") {
        try {
          const startDate = req.body.startDate;
          const endDate = req.body.endDate;
          const request = new sql.Request(pool);
          request
            .input("startDate", sql.NVarChar, startDate)
            .input("endDate", sql.NVarChar, endDate)
            .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
            .query(
              "SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE  IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATEADD(day, 1, @endDate) AND SURVEY_TOPIC <> '' AND  EMPLOYEE.DIVISION_ID = @DIVISION_ID GROUP BY SURVEY_TOPIC",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
      } else if (decoded.userRole === "manager") {
        try {
          const startDate = req.body.startDate;
          const endDate = req.body.endDate;
          const request = new sql.Request(pool);
          request
            .input("startDate", sql.NVarChar, startDate)
            .input("endDate", sql.NVarChar, endDate)
            .query(
              "SELECT SURVEY_TOPIC AS name, COUNT(CASE WHEN Score = 5 THEN 1 ELSE NULL END) AS 'Score5', COUNT(CASE WHEN Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS WHERE  IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATEADD(day, 1, @endDate) AND SURVEY_TOPIC <> ''GROUP BY SURVEY_TOPIC",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
      }
    }
  });
};

const getDataForSearchPercentage = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;
      const request = new sql.Request(pool);

      if (decoded.userRole === "supervisor") {
        try {
          request
            .input("startDate", sql.NVarChar, startDate)
            .input("endDate", sql.NVarChar, endDate)
            .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
            .query(
              "SELECT COUNT(IVR_SURVEY_TRANS.Score) AS scorelength, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 98 THEN 1 ELSE NULL END)  AS nodata, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END)  AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END)  AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END)  AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END)  AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END)  AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATEADD(day, 1, @endDate) AND DIVISION_ID = @DIVISION_ID",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.json(calculate(result));
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
      } else if (decoded.userRole === "manager") {
        try {
          request
            .input("startDate", sql.NVarChar, startDate)
            .input("endDate", sql.NVarChar, endDate)
            .query(
              "SELECT COUNT(Score) AS scorelength, COUNT(CASE WHEN Score = 98 THEN 1 ELSE NULL END)  AS nodata, COUNT(CASE WHEN Score = 5 THEN 1 ELSE NULL END)  AS Score5, COUNT(CASE WHEN Score = 4 THEN 1 ELSE NULL END)  AS Score4, COUNT(CASE WHEN Score = 3 THEN 1 ELSE NULL END)  AS Score3, COUNT(CASE WHEN Score = 2 THEN 1 ELSE NULL END)  AS Score2, COUNT(CASE WHEN Score = 1 THEN 1 ELSE NULL END)  AS Score1 FROM IVR_SURVEY_TRANS WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATEADD(day, 1, @endDate) ",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.json(calculate(result));
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
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
};
