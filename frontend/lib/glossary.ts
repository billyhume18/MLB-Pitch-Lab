// Plain-language stat definitions, condensed from MLB's own Statcast glossary
// (mlb.com/glossary/statcast). Used to power in-app tooltips for staff who
// aren't already fluent in the abbreviations.
export const GLOSSARY: Record<string, string> = {
  'CSW%': 'Called Strike + Whiff %. Share of all pitches that were either taken for a called strike or swung at and missed — a single-number proxy for overall pitch effectiveness.',
  'Whiff%': 'Swings and misses divided by total swings. Measures how often a pitch fools a hitter who decides to swing.',
  'Chase%': 'Percentage of pitches outside the strike zone that the batter swung at.',
  'Zone%': 'Percentage of pitches thrown inside the strike zone.',
  'Hard-Hit%': 'Percentage of batted balls with an exit velocity of 95 mph or higher.',
  'Barrel%': "Percentage of batted balls classified as a 'Barrel' — the launch speed/angle combination historically producing a .500+ batting average and 1.500+ slugging.",
  'xwOBA': 'Expected weighted On-Base Average. Uses exit velocity, launch angle, and (on some contact) sprint speed to estimate the outcome a batted ball "deserved," independent of defense/luck.',
  'xBA': 'Expected Batting Average, using the same exit-velocity/launch-angle model as xwOBA.',
  'FIP': 'Fielding Independent Pitching. An ERA-like estimate built only from strikeouts, walks, hit-by-pitches, and home runs — the outcomes a pitcher controls most directly, excluding balls in play.',
  'xFIP': 'Like FIP, but normalizes home runs to a league-average home-run-per-fly-ball rate instead of the pitcher’s actual total, reducing HR/FB luck/park noise.',
  'WAR': 'Wins Above Replacement. A single-number estimate of total value versus a replacement-level player.',
  'K/9': 'Strikeouts per 9 innings pitched.',
  'BB/9': 'Walks per 9 innings pitched.',
  'K%': 'Strikeouts as a percentage of batters faced.',
  'BB%': 'Walks as a percentage of batters faced.',
  'IVB': 'Induced Vertical Break, in inches. Vertical movement on the pitch from gravity-adjusted spin/seam effects — higher IVB means a pitch drops less than a spinless pitch would.',
  'IHB': 'Induced Horizontal Break, in inches, from the pitcher’s point of view.',
  'Arm Angle': "The angle between a line parallel to the ground and a line from the pitcher's throwing shoulder through the release point.",
  'Release Extension': "How far toward home plate (in feet) a pitcher releases the ball, measured from the pitching rubber.",
  'TTO': 'Times Through the Order — how many times the pitcher has already faced the lineup in that outing (1st, 2nd, 3rd+ time through tends to correlate with declining performance).',
  'Spike': "A workload flag: this outing's pitch count exceeded the pitcher's rolling 3-outing average by more than 30%, an acute:chronic-style overload signal.",
}
