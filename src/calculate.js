const calculate = (result) => {
    let data = result.recordset[0];
    let dataset = [
      {
        name: "5",
        valuepercentage:
          data.scorelength !== 0 ? (data.Score5 * 100) / data.scorelength : 0,
        value: data.Score5,
      },
      {
        name: "4",
        valuepercentage:
          data.scorelength !== 0 ? (data.Score4 * 100) / data.scorelength : 0,
        value: data.Score4,
      },
      {
        name: "3",
        valuepercentage:
          data.scorelength !== 0 ? (data.Score3 * 100) / data.scorelength : 0,
        value: data.Score3,
      },
      {
        name: "2",
        valuepercentage:
          data.scorelength !== 0 ? (data.Score2 * 100) / data.scorelength : 0,
        value: data.Score2,
      },
      {
        name: "1",
        valuepercentage:
          data.scorelength !== 0 ? (data.Score1 * 100) / data.scorelength : 0,
        value: data.Score1,
      },
      {
        name: "No data",
        valuepercentage:
          data.scorelength !== 0 ? (data.nodata * 100) / data.scorelength : 0,
        value: data.nodata,
      },
    ];
  
    let scorelength = data.scorelength;
    let exportdata = [scorelength, dataset];
    return exportdata;
  };
  
  module.exports = calculate;
  