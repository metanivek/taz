import utils from "../utils.js";

describe("calculateYearDateRanges", () => {
  test("simple year range", () => {
    const startYear = 2019;
    const currentYear = () => 2020;

    expect(utils.calculateYearDateRanges(startYear, currentYear)).toStrictEqual(
      [
        {
          year: 2019,
          start: "2019-01-01",
          end: "2020-01-01",
        },
        {
          year: 2020,
          start: "2020-01-01",
          end: "2021-01-01",
        },
      ]
    );
  });
});
