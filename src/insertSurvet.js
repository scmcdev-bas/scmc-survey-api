const jwt = require("jsonwebtoken");
const pool = require("./db"); // Assuming you have a pool object for your database connection
const moment = require("moment");
const config = require('../config');

const insertSurvey = async (req, res, next) => {
  const apikey = req.headers["api_key"];

  try {
    if (!apikey) {
      return res.status(401).json({ message: "API key is not entered" });
    }

    if (config.api_key !== apikey) {
      return res.status(403).json({ message: "This API key is invalid" });
    }

    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error connecting to database: ", err);
        return res.status(500).json({ error: "Error connecting to the database." });
      }

      try {
        const data = req.body; 
        console.log('data',data)
        const query = `INSERT INTO IVR_SURVEY_TRANS
          (SURVEY_DATETIME, TRANS_ID, ROUTE_POINT, AGENT_ID, PLACE, LAST_MENU,
            MSISDN, LANGUAGE, SCORE, SCORE_2, INSERT_DATE, SURVEY_TOPIC, NO_MATCH_SCORE)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

        connection.query(
          query,
          [
            data.SURVEY_DATETIME,
            data.TRANS_ID,
            data.ROUTE_POINT,
            data.AGENT_ID,
            data.PLACE,
            data.LAST_MENU,
            data.MSISDN,
            data.LANGUAGE,
            data.SCORE,
            data.SCORE_2,
            moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
            data.SURVEY_TOPIC,
            data.NO_MATCH_SCORE,
          ],
          (error, result) => {
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
        res.status(500).json({ error: "Error while processing the request." });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  insertSurvey,
};
