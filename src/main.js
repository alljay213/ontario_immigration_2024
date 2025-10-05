// D3 Line chart for monthly Ontario immigration by category (wide CSV)
// CSV schema: Month,Economic,Family Sponsorship,Refugee,Other
const csvPath = "./data/ontario_immigration_2024_wide.csv";

const CATEGORY_KEYS = ["Economic", "Family Sponsorship", "Refugee", "Other"];
const COLORS = d3
  .scaleOrdinal()
  .domain(CATEGORY_KEYS)
  .range(["#1565c0", "#2e7d32", "#c62828", "#8e24aa"]); // blue, green, red, purple

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const svg = d3.select("#line-chart");
const width = +svg.attr("width");
const height = +svg.attr("height");
const m = { top: 28, right: 24, bottom: 44, left: 60 };
const innerW = width - m.left - m.right;
const innerH = height - m.top - m.bottom;

const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
const gx = g
  .append("g")
  .attr("class", "axis x")
  .attr("transform", `translate(0,${innerH})`);
const gy = g.append("g").attr("class", "axis y");
const linesG = g.append("g").attr("class", "lines");
const ptsG = g.append("g").attr("class", "points");
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

d3.csv(csvPath, d3.autoType)
  .then((raw) => {
    const data = raw
      .filter((d) => d.Month && MONTHS.includes(d.Month))
      .sort((a, b) => MONTHS.indexOf(a.Month) - MONTHS.indexOf(b.Month));

    const x = d3.scalePoint().domain(MONTHS).range([0, innerW]).padding(0.5);
    const yMax = d3.max(data, (d) => d3.max(CATEGORY_KEYS, (k) => +d[k] || 0));
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

    gx.call(d3.axisBottom(x));
    gy.call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",d")));

    const series = CATEGORY_KEYS.map((key) => ({
      key,
      values: data.map((d) => ({ month: d.Month, value: +d[key] || 0 })),
    }));

    const line = d3
      .line()
      .x((d) => x(d.month))
      .y((d) => y(d.value));

    // initial draw
    draw(series);

    // legend with toggle
    const state = new Map(CATEGORY_KEYS.map((k) => [k, true]));
    const legend = d3.select("#legend");
    legend
      .selectAll(".item")
      .data(CATEGORY_KEYS)
      .join("div")
      .attr("class", "item")
      .on("click", (e, key) => {
        state.set(key, !state.get(key));
        e.currentTarget.classList.toggle("off");
        redraw();
      })
      .each(function (key) {
        d3.select(this)
          .append("span")
          .attr("class", "swatch")
          .style("background-color", COLORS(key));
        d3.select(this).append("span").text(key);
      });

    function draw(activeSeries) {
      linesG
        .selectAll(".line")
        .data(activeSeries, (s) => s.key)
        .join(
          (enter) =>
            enter
              .append("path")
              .attr("class", "line")
              .attr("stroke", (s) => COLORS(s.key))
              .attr("d", (s) => line(s.values)),
          (update) =>
            update
              .attr("stroke", (s) => COLORS(s.key))
              .attr("d", (s) => line(s.values)),
          (exit) => exit.remove()
        );

      const flat = activeSeries.flatMap((s) =>
        s.values.map((v) => ({ key: s.key, ...v }))
      );
      ptsG
        .selectAll("circle.pt")
        .data(flat, (d) => d.key + d.month)
        .join(
          (enter) =>
            enter
              .append("circle")
              .attr("class", "pt")
              .attr("r", 3.5)
              .attr("cx", (d) => x(d.month))
              .attr("cy", (d) => y(d.value))
              .attr("fill", (d) => COLORS(d.key))
              .on("mouseenter", (event, d) => {
                tooltip
                  .style("opacity", 1)
                  .html(
                    `<strong>${d.month} 2024</strong><br>${d.key}: ${d3.format(
                      ","
                    )(d.value)}`
                  )
                  .style("left", event.pageX + 10 + "px")
                  .style("top", event.pageY - 24 + "px");
              })
              .on("mouseleave", () => tooltip.style("opacity", 0)),
          (update) =>
            update.attr("cx", (d) => x(d.month)).attr("cy", (d) => y(d.value)),
          (exit) => exit.remove()
        );
    }

    function redraw() {
      const activeKeys = CATEGORY_KEYS.filter((k) => state.get(k));
      const filtered = series.filter((s) => state.get(s.key));
      const ymax2 =
        d3.max(data, (d) => d3.max(activeKeys, (k) => +d[k] || 0)) || 1;
      y.domain([0, ymax2]).nice();
      gy.call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",d")));
      draw(filtered);
    }
  })
  .catch((err) => console.error("CSV load error:", err));
