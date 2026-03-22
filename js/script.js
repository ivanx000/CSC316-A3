import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const COURT = {
  width: 50,
  halfLength: 47,
  hoopX: 25,
  hoopY: 5.25,
};

const ZONE_COLOR = {
  rim: "var(--rim)",
  paint: "var(--paint)",
  mid: "var(--mid)",
  corner3: "var(--corner3)",
  wing3Left: "var(--wing3left)",
  wing3Right: "var(--wing3right)",
  topKey3: "var(--topkey3)",
};

const ZONE_LABEL = {
  rim: "At Rim",
  paint: "Paint",
  mid: "Mid-Range",
  corner3: "Corner 3",
  wing3Left: "Left Wing 3",
  wing3Right: "Right Wing 3",
  topKey3: "Top of Key 3",
};

const zoneOrder = ["rim", "paint", "mid", "corner3", "wing3Left", "wing3Right", "topKey3"];
const twoPointZones = ["rim", "paint", "mid"];
const threePointZones = ["corner3", "wing3Left", "wing3Right", "topKey3"];

const viz = d3.select("#viz");
const tooltip = d3.select("body").append("div").attr("id", "tooltip");

const margin = { top: 24, right: 24, bottom: 24, left: 24 };
const innerWidth = 980;
const innerHeight = (innerWidth * COURT.halfLength) / COURT.width;
const width = innerWidth + margin.left + margin.right;
const height = innerHeight + margin.top + margin.bottom;

const xScale = d3
  .scaleLinear()
  .domain([0, COURT.width])
  .range([margin.left, width - margin.right]);

const yScale = d3
  .scaleLinear()
  .domain([0, COURT.halfLength])
  .range([margin.top, height - margin.bottom]);

const svg = viz
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("role", "img")
  .attr(
    "aria-label",
    "Half basketball court showing made shot locations and animated trajectories"
  );

const courtLayer = svg.append("g").attr("class", "court-layer");
const arcLayer = svg.append("g").attr("class", "arc-layer");
const shotLayer = svg.append("g").attr("class", "shot-layer");

drawCourt();

let profiles = [];
let shotData = [];
let currentPlayer = "";
let currentPlayerAttempts = [];
let currentPlayerMadeShots = [];
let prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const playerSelect = d3.select("#playerSelect");
const resetButton = d3.select("#resetView");
const zoneFilters = d3.selectAll(".zone-filter");

bootstrap().catch((error) => {
  console.error(error);
  d3.select("#emptyHelp").text("Could not load player data.");
});

async function bootstrap() {
  profiles = await d3.json("data/player_profiles.json");
  shotData = profiles.flatMap((profile) => createShotsForPlayer(profile));

  playerSelect
    .selectAll("option.player")
    .data(profiles)
    .join("option")
    .attr("class", "player")
    .attr("value", (d) => d.name)
    .text((d) => `${d.name} (${d.team})`);

  playerSelect.on("change", (event) => {
    const player = event.target.value;
    renderSelection(player);
  });

  resetButton.on("click", () => {
    playerSelect.property("value", "");
    renderSelection("");
  });

  zoneFilters.on("change", () => {
    if (!currentPlayer) {
      return;
    }
    applyZoneFilters();
  });

  renderSelection("");
}

function renderSelection(playerName) {
  currentPlayer = playerName;
  arcLayer.selectAll("*").interrupt().remove();
  shotLayer.selectAll("*").interrupt().remove();

  if (!playerName) {
    currentPlayerAttempts = [];
    currentPlayerMadeShots = [];
    d3.select("#distChart").selectAll("*").remove();
    d3.select("#emptyHelp").style("opacity", 1);
    d3.select("#chartHelp").style("opacity", 1);
    setStats(null, [], [], []);
    return;
  }

  d3.select("#emptyHelp").style("opacity", 0.2);

  currentPlayerAttempts = shotData.filter((d) => d.player === playerName);
  currentPlayerMadeShots = currentPlayerAttempts.filter((d) => d.made);

  if (prefersReducedMotion) {
    drawStaticShots(currentPlayerMadeShots);
  } else {
    animateShots(currentPlayerMadeShots);
  }

  applyZoneFilters();
}

function getEnabledZones() {
  const enabled = new Set();
  zoneFilters.each(function collectZoneState() {
    const input = d3.select(this);
    if (input.property("checked")) {
      enabled.add(input.attr("data-zone"));
    }
  });
  return enabled;
}

function applyZoneFilters() {
  const enabledZones = getEnabledZones();
  const visibleShots = currentPlayerMadeShots.filter((d) => enabledZones.has(d.zone));

  shotLayer
    .selectAll("circle")
    .style("display", (d) => (enabledZones.has(d.zone) ? null : "none"));

  arcLayer
    .selectAll("path")
    .style("display", (d) => (enabledZones.has(d.zone) ? null : "none"));

  setStats(currentPlayer, currentPlayerMadeShots, currentPlayerAttempts, visibleShots);
  drawDistributionChart(visibleShots);
}

function drawCourt() {
  const lines = courtLayer.append("g").attr("class", "court-lines");
  const soft = courtLayer.append("g").attr("class", "court-lines soft");

  const courtRight = COURT.width;

  lines
    .append("rect")
    .attr("x", xScale(0))
    .attr("y", yScale(0))
    .attr("width", xScale(courtRight) - xScale(0))
    .attr("height", yScale(COURT.halfLength) - yScale(0));

  lines
    .append("line")
    .attr("x1", xScale(0))
    .attr("x2", xScale(courtRight))
    .attr("y1", yScale(COURT.halfLength))
    .attr("y2", yScale(COURT.halfLength));

  lines
    .append("rect")
    .attr("x", xScale(17))
    .attr("y", yScale(0))
    .attr("width", xScale(33) - xScale(17))
    .attr("height", yScale(19) - yScale(0));

  soft
    .append("circle")
    .attr("cx", xScale(25))
    .attr("cy", yScale(19))
    .attr("r", xScale(31) - xScale(25));

  lines
    .append("path")
    .attr("d", describeArc(COURT.hoopX, COURT.hoopY, 4, 22, 158));

  lines
    .append("circle")
    .attr("cx", xScale(COURT.hoopX))
    .attr("cy", yScale(COURT.hoopY))
    .attr("r", xScale(COURT.hoopX + 0.75) - xScale(COURT.hoopX));

  lines
    .append("line")
    .attr("x1", xScale(22))
    .attr("x2", xScale(28))
    .attr("y1", yScale(4))
    .attr("y2", yScale(4));

  lines
    .append("line")
    .attr("x1", xScale(3))
    .attr("x2", xScale(3))
    .attr("y1", yScale(0))
    .attr("y2", yScale(14));

  lines
    .append("line")
    .attr("x1", xScale(47))
    .attr("x2", xScale(47))
    .attr("y1", yScale(0))
    .attr("y2", yScale(14));

  lines
    .append("path")
    .attr("d", describeArc(COURT.hoopX, COURT.hoopY, 23.75, 22.8, 157.2));

  lines
    .append("path")
    .attr("d", describeArc(COURT.hoopX, COURT.hoopY, 6, 0, 180));
}

function drawStaticShots(playerShots) {
  shotLayer
    .selectAll("circle")
    .data(playerShots, (d) => d.id)
    .join("circle")
    .attr("class", "shot-dot")
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", (d) => radiusByShot(d))
    .attr("fill", (d) => ZONE_COLOR[d.zone])
    .on("mousemove", showTooltip)
    .on("mouseleave", hideTooltip);
}

function animateShots(playerShots) {
  const arcs = arcLayer
    .selectAll("path")
    .data(playerShots, (d) => d.id)
    .join("path")
    .attr("class", "shot-arc")
    .attr("d", (d) => shotArcPath(d))
    .attr("stroke", (d) => ZONE_COLOR[d.zone]);

  arcs.each(function animatePath(d, i) {
    const path = d3.select(this);
    const node = path.node();
    if (!node) {
      return;
    }

    const length = node.getTotalLength();
    path
      .attr("stroke-dasharray", length)
      .attr("stroke-dashoffset", length)
      .attr("opacity", 0.85)
      .transition()
      .delay(i * 24)
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0)
      .transition()
      .duration(420)
      .attr("opacity", 0.22);
  });

  shotLayer
    .selectAll("circle")
    .data(playerShots, (d) => d.id)
    .join("circle")
    .attr("class", "shot-dot")
    .attr("cx", xScale(COURT.hoopX))
    .attr("cy", yScale(COURT.hoopY))
    .attr("r", 0)
    .attr("fill", (d) => ZONE_COLOR[d.zone])
    .on("mousemove", showTooltip)
    .on("mouseleave", hideTooltip)
    .transition()
    .delay((_, i) => i * 24 + 280)
    .duration(620)
    .ease(d3.easeBackOut.overshoot(1.2))
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", (d) => radiusByShot(d));
}

function showTooltip(event, d) {
  const result = d.made ? "Made" : "Missed";
  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX + 12}px`)
    .style("top", `${event.clientY - 10}px`)
    .html(`${d.player}<br>${ZONE_LABEL[d.zone]} (${result})<br>${d.distance.toFixed(1)} ft<br>Shot Clock: ${d.shotClock}s`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function drawDistributionChart(shots) {
  const chartContainer = d3.select("#distChart");
  chartContainer.selectAll("*").remove();

  if (shots.length === 0) {
    d3.select("#chartHelp").style("opacity", 1);
    return;
  }

  d3.select("#chartHelp").style("opacity", 0.2);

  const zoneCounts = d3.rollup(
    shots,
    (v) => v.length,
    (d) => d.zone
  );

  const chartData = zoneOrder
    .map((zone) => ({
      zone,
      label: ZONE_LABEL[zone],
      count: zoneCounts.get(zone) || 0,
      color: ZONE_COLOR[zone],
    }))
    .filter((d) => d.count > 0);

  const zoneShots = d3.group(shots, (d) => d.zone);

  const node = chartContainer.node();
  const bounds = node ? node.getBoundingClientRect() : { width: 320, height: 520 };
  const chartWidth = Math.max(280, Math.floor(bounds.width));
  const chartHeight = Math.max(420, Math.floor(bounds.height));
  const radius = Math.min(chartWidth, chartHeight) * 0.43;

  const svg = chartContainer
    .append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`);

  const g = svg
    .append("g")
    .attr("transform", `translate(${chartWidth / 2},${chartHeight / 2})`);

  const pie = d3
    .pie()
    .sort(null)
    .value((d) => d.count);

  const arc = d3
    .arc()
    .innerRadius(radius * 0.45)
    .outerRadius(radius);

  const labelArc = d3
    .arc()
    .innerRadius(radius * 1.08)
    .outerRadius(radius * 1.08);

  const slices = g
    .selectAll(".zone-slice")
    .data(pie(chartData))
    .join("path")
    .attr("class", "zone-slice")
    .attr("d", arc)
    .attr("fill", (d) => d.data.color)
    .attr("stroke", "rgba(255, 236, 216, 0.35)")
    .attr("stroke-width", 1.2)
    .attr("opacity", 0.86)
    .on("mousemove", (event, d) => showZoneTooltip(event, d, totalShots, zoneShots))
    .on("mouseleave", hideTooltip);

  slices.append("title").text((d) => `${d.data.label}: ${d.data.count}`);

  g.selectAll(".donut-label")
    .data(pie(chartData))
    .join("text")
    .attr("class", "donut-label")
    .attr("transform", (d) => `translate(${labelArc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("font-weight", 600)
    .attr("fill", "rgba(255, 236, 216, 0.6)")
    .text((d) => d.data.count >= 3 ? d.data.label.split(" ")[0] : "");

  const totalShots = d3.sum(chartData, (d) => d.count);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("y", -4)
    .attr("font-size", "12px")
    .attr("fill", "rgba(255, 236, 216, 0.62)")
    .text("Shown");

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 18)
    .attr("font-size", "24px")
    .attr("font-weight", 700)
    .attr("fill", "rgba(255, 236, 216, 0.96)")
    .text(totalShots);
}

function showZoneTooltip(event, pieSlice, totalShots, zoneShots) {
  const zone = pieSlice.data.zone;
  const shots = zoneShots.get(zone) ?? [];
  const count = pieSlice.data.count;
  const pct = totalShots ? (count / totalShots) * 100 : 0;
  const avgDistance = shots.length ? d3.mean(shots, (d) => d.distance) : 0;
  const avgShotClock = shots.length ? d3.mean(shots, (d) => d.shotClock) : 0;

  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX + 12}px`)
    .style("top", `${event.clientY - 10}px`)
    .html(
      `${pieSlice.data.label}<br>` +
      `Shown shots: ${count} (${pct.toFixed(1)}%)<br>` +
      `Avg distance: ${avgDistance.toFixed(1)} ft<br>` +
      `Avg shot clock: ${avgShotClock.toFixed(1)}s`
    );
}

function setStats(playerName, madeShots, allAttempts, shownShots = madeShots) {
  if (!playerName) {
    d3.select("#playerName").text("No player selected");
    d3.select("#shotCount").text("-");
    d3.select("#avgDistance").text("-");
    d3.select("#topZone").text("-");
    d3.select("#fgPct").text("-");
    d3.select("#threePct").text("-");
    return;
  }

  const fgAttempts = allAttempts.length;
  const fgMakes = madeShots.length;
  const threeAttempts = allAttempts.filter((d) => isThreePointZone(d.zone)).length;
  const threeMakes = madeShots.filter((d) => isThreePointZone(d.zone)).length;

  const zoneCounts = d3.rollup(
    shownShots,
    (v) => v.length,
    (d) => d.zone
  );

  const topZone = [...zoneCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  d3.select("#playerName").text(playerName);
  d3.select("#shotCount").text(shownShots.length);
  d3
    .select("#avgDistance")
    .text(shownShots.length ? `${d3.mean(shownShots, (d) => d.distance).toFixed(1)} ft` : "-");
  d3.select("#topZone").text(topZone ? ZONE_LABEL[topZone] : "-");

  const fgPct = fgAttempts ? (fgMakes / fgAttempts) * 100 : 0;
  const threePct = threeAttempts ? (threeMakes / threeAttempts) * 100 : 0;

  d3.select("#fgPct").text(`${fgPct.toFixed(1)}%`);
  d3.select("#threePct").text(`${threePct.toFixed(1)}%`);
}

function isThreePointZone(zone) {
  return threePointZones.includes(zone);
}

function createShotsForPlayer(profile) {
  const random = mulberry32(seedFromName(profile.name));
  const shots = [];
  let madeThreeCount = 0;

  for (let i = 0; i < profile.shotCount; i += 1) {
    const zone = weightedZonePick(profile.weights, random);
    const shot = generateShot(zone, random);
    const distance = Math.hypot(shot.x - COURT.hoopX, shot.y - COURT.hoopY);
    const isThreePoint = isThreePointZone(zone);

    if (isThreePoint) {
      madeThreeCount += 1;
    }

    const shotClock = Math.round(random() * 24) + 1;
    shots.push({
      id: `${profile.name}-make-${i}`,
      player: profile.name,
      team: profile.team,
      zone,
      shotType: isThreePoint ? "3PT" : "2PT",
      made: true,
      x: shot.x,
      y: shot.y,
      distance,
      arcSeed: random(),
      shotClock,
    });
  }

  const totalAttempts = Math.max(profile.shotCount, Math.round(profile.shotCount / profile.fgPct));
  const totalMisses = Math.max(0, totalAttempts - profile.shotCount);

  const threeAttemptsTarget = Math.max(madeThreeCount, Math.round(madeThreeCount / profile.threePtPct));
  const threeMisses = Math.max(0, threeAttemptsTarget - madeThreeCount);
  let twoMisses = Math.max(0, totalMisses - threeMisses);

  const missingMisses = totalMisses - (threeMisses + twoMisses);
  if (missingMisses > 0) {
    twoMisses += missingMisses;
  }

  const threePointWeights = weightsForZones(profile.weights, threePointZones);
  const twoPointWeights = weightsForZones(profile.weights, twoPointZones);

  for (let i = 0; i < threeMisses; i += 1) {
    const zone = weightedPickFromList(threePointZones, threePointWeights, random);
    const shot = generateShot(zone, random);
    const distance = Math.hypot(shot.x - COURT.hoopX, shot.y - COURT.hoopY);

    const missShotClock3 = Math.round(random() * 24) + 1;
    shots.push({
      id: `${profile.name}-miss3-${i}`,
      player: profile.name,
      team: profile.team,
      zone,
      shotType: "3PT",
      made: false,
      x: shot.x,
      y: shot.y,
      distance,
      arcSeed: random(),
      shotClock: missShotClock3,
    });
  }

  for (let i = 0; i < twoMisses; i += 1) {
    const zone = weightedPickFromList(twoPointZones, twoPointWeights, random);
    const shot = generateShot(zone, random);
    const distance = Math.hypot(shot.x - COURT.hoopX, shot.y - COURT.hoopY);

    const missShotClock2 = Math.round(random() * 24) + 1;
    shots.push({
      id: `${profile.name}-miss2-${i}`,
      player: profile.name,
      team: profile.team,
      zone,
      shotType: "2PT",
      made: false,
      x: shot.x,
      y: shot.y,
      distance,
      arcSeed: random(),
      shotClock: missShotClock2,
    });
  }

  return shots;
}

function generateShot(zone, random) {
  if (zone === "rim") {
    return samplePolar(
      random,
      COURT.hoopX,
      COURT.hoopY,
      0.7,
      4.4,
      24,
      156
    );
  }

  if (zone === "paint") {
    return {
      x: jitter(random, 17.5, 32.5),
      y: jitter(random, 5.8, 18.5),
    };
  }

  if (zone === "mid") {
    return samplePolar(
      random,
      COURT.hoopX,
      COURT.hoopY,
      8,
      21.8,
      20,
      160
    );
  }

  if (zone === "corner3") {
    const left = random() > 0.5;
    return {
      x: left ? jitter(random, 1.2, 3.6) : jitter(random, 46.4, 48.8),
      y: jitter(random, 0.4, 13.8),
    };
  }

  if (zone === "wing3Left") {
    return samplePolar(
      random,
      COURT.hoopX,
      COURT.hoopY,
      22,
      25.6,
      122,
      157
    );
  }

  if (zone === "wing3Right") {
    return samplePolar(
      random,
      COURT.hoopX,
      COURT.hoopY,
      22,
      25.6,
      23,
      58
    );
  }

  return samplePolar(
    random,
    COURT.hoopX,
    COURT.hoopY,
    22,
    25.6,
    62,
    118
  );
}

function weightsForZones(allWeights, zones) {
  const scoped = zones.map((zone) => allWeights[zone] ?? 0);
  const sum = d3.sum(scoped);

  if (!sum) {
    return zones.map(() => 1 / zones.length);
  }

  return scoped.map((w) => w / sum);
}

function weightedPickFromList(zones, weights, random) {
  const roll = random();
  let cumulative = 0;

  for (let i = 0; i < zones.length; i += 1) {
    cumulative += weights[i];
    if (roll <= cumulative) {
      return zones[i];
    }
  }

  return zones[zones.length - 1];
}

function samplePolar(random, cx, cy, rMin, rMax, degMin, degMax) {
  let guard = 0;

  while (guard < 30) {
    const radius = jitter(random, rMin, rMax);
    const theta = (jitter(random, degMin, degMax) * Math.PI) / 180;

    const x = cx + radius * Math.cos(theta);
    const y = cy + radius * Math.sin(theta);

    if (x >= 0.8 && x <= 49.2 && y >= 0.2 && y <= COURT.halfLength - 0.5) {
      return { x, y };
    }

    guard += 1;
  }

  return {
    x: Math.min(49, Math.max(1, cx)),
    y: Math.min(COURT.halfLength - 1, Math.max(1, cy + 15)),
  };
}

function weightedZonePick(weights, random) {
  const roll = random();
  let cumulative = 0;

  for (const zone of zoneOrder) {
    cumulative += weights[zone] ?? 0;
    if (roll <= cumulative) {
      return zone;
    }
  }

  return "mid";
}

function shotArcPath(shot) {
  const p0 = [xScale(COURT.hoopX), yScale(COURT.hoopY)];
  const p2 = [xScale(shot.x), yScale(shot.y)];

  const mx = (p0[0] + p2[0]) / 2;
  const my = (p0[1] + p2[1]) / 2;

  const lift = Math.min(44, 10 + shot.distance * 0.48 + shot.arcSeed * 8);
  const lateralDrift = (xScale(shot.x) - xScale(COURT.hoopX)) * 0.08;

  const cx = mx - lateralDrift;
  const cy = my - lift;

  return `M ${p0[0]} ${p0[1]} Q ${cx} ${cy} ${p2[0]} ${p2[1]}`;
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const points = [];
  const step = 2;

  for (let angle = startAngle; angle <= endAngle; angle += step) {
    const rad = (angle * Math.PI) / 180;
    points.push({
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    });
  }

  const lastAngle = points.length ? startAngle + (points.length - 1) * step : startAngle;
  if (lastAngle < endAngle) {
    const rad = (endAngle * Math.PI) / 180;
    points.push({
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    });
  }

  return d3
    .line()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))(points);
}

function radiusByZone(zone) {
  if (zone === "rim") {
    return 6.2;
  }
  if (zone === "paint") {
    return 5.8;
  }
  if (zone === "mid") {
    return 5.4;
  }
  if (zone === "corner3") {
    return 5.2;
  }
  if (zone === "topKey3") {
    return 5.2;
  }
  return 5.3;
}

function radiusByShot(shot) {
  const base = radiusByZone(shot.zone);
  const maxDistance = 28;
  const normalized = Math.max(0, Math.min(1, shot.distance / maxDistance));
  const bonus = normalized * 2.4;
  return base + bonus;
}

function jitter(random, min, max) {
  return min + (max - min) * random();
}

function seedFromName(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    h ^= name.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed;
  return function random() {
    t += 0x6d2b79f5;
    let k = Math.imul(t ^ (t >>> 15), 1 | t);
    k ^= k + Math.imul(k ^ (k >>> 7), 61 | k);
    return ((k ^ (k >>> 14)) >>> 0) / 4294967296;
  };
}
