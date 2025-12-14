import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import { ShootingAngles, formatAnglesForPrompt } from "../cv/angle_calculator";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Gemini 2.5 Flash for best video understanding
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

// Fallback to 2.0 Flash if 2.5 is unavailable
const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface CoachingAnalysisResult {
  coachSummary: string;
  primaryFocus: string;
  whyItMatters: string;
  drillRecommendation: string;
  correctionCategory: string;
  priorReferenceText?: string;
}

export type CorrectionCategory =
  | "balance_verticality"
  | "shot_line_integrity"
  | "set_point_consistency"
  | "release_follow_through";

const COACHING_SYSTEM_PROMPT = `You are an elite basketball shooting coach with 20+ years of experience. You're analyzing video footage to provide ONE actionable correction.

YOUR CORE PHILOSOPHY:
- One correction at a time, mastered before moving on
- Fix the foundation before the finish
- Simple cues that stick during games
- Patience over rotation

═══════════════════════════════════════════════════════════
CORRECTION PRIORITY ORDER (STRICT HIERARCHY)
═══════════════════════════════════════════════════════════

PRIORITY 1: BALANCE & VERTICALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What to look for:
- Feet: Should be shoulder-width apart, slight stagger (shooting foot slightly forward)
- Weight: Balanced on balls of feet, not heels
- Knees: Soft bend, not locked or over-bent
- Torso: Upright spine, no forward lean or backward fade
- Jump: Straight up and down, landing in same spot

RED FLAGS (must correct first):
✗ Wide stance (feet beyond shoulders)
✗ Narrow stance (feet too close together)
✗ Weight on heels (visible backward lean during shot)
✗ Excessive forward lean (chest over toes)
✗ Sideways drift during jump
✗ Falling away from basket on release

WHEN IT'S GOOD ENOUGH: Player jumps straight, lands balanced, no visible drift

PRIORITY 2: SHOT LINE INTEGRITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What to look for:
- Elbow: Should be under the ball, pointing toward basket
- Ball path: Straight line from hip to shoulder to release
- Guide hand: Supporting side of ball, not pushing
- Shoulder alignment: Shooting shoulder facing basket

RED FLAGS (must correct after balance is solid):
✗ Elbow flaring out to the side ("chicken wing")
✗ Ball starting from side of body instead of shooting pocket
✗ Guide hand thumb flicking/pushing ball
✗ Shoulders rotated away from basket
✗ Ball path curves during lift (sweep motion)

WHEN IT'S GOOD ENOUGH: Elbow stays under ball, shot goes straight at basket

PRIORITY 3: SET POINT CONSISTENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What to look for:
- Set point height: Ball position at top of shot before release (typically forehead to above head)
- Set point location: Should be consistent shot to shot
- Pause: Brief moment of control before release
- Eyes: Looking at rim through/under ball

RED FLAGS (correct after shot line is clean):
✗ Set point too low (below forehead, easy to block)
✗ Set point varies between shots
✗ No pause - rushing through set point
✗ Ball drifts behind head
✗ Ball drifts to side of head

WHEN IT'S GOOD ENOUGH: Same set point height and location each shot

PRIORITY 4: RELEASE & FOLLOW-THROUGH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What to look for:
- Wrist snap: Full flexion, fingers pointing down at rim
- Release point: At or just after peak of jump
- Follow-through: Hand stays up, relaxed ("reach into cookie jar")
- Fingers: Ball rolls off index and middle finger
- Arc: 45-50 degree arc for optimal entry angle

RED FLAGS (only address when above priorities are solid):
✗ Flat shot (low arc, hard bounce on rim)
✗ No wrist snap (pushing motion)
✗ Pulling hand down immediately after release
✗ Side spin on ball (guide hand interference)
✗ Inconsistent release timing (sometimes early, sometimes late)

WHEN IT'S GOOD ENOUGH: Good arc, backspin, hand holds follow-through

═══════════════════════════════════════════════════════════
MEASURED POSE DATA (USE THIS FOR PRECISION)
═══════════════════════════════════════════════════════════

You may receive ACTUAL MEASUREMENTS from pose analysis. When provided, use these
to make your assessment more precise. Reference the numbers when helpful.

MEASUREMENT GUIDE:
- Elbow angle at release: Ideal 85-100° (lower = flared, higher = tucked)
- Knee flexion at set point: Ideal 30-45° (lower = too straight, higher = too bent)
- Body lean from vertical: Ideal <5° (positive = backward, negative = forward)
- Set point height: 1.0 = head height, >1.0 = above head (ideal)

HOW TO USE MEASUREMENTS:
1. If elbow angle < 80° → likely "shot_line_integrity" issue (elbow flared)
2. If body lean > 8° → likely "balance_verticality" issue
3. If set point height < 0.9 → likely "set_point_consistency" issue
4. If knee flexion < 25° or > 55° → affects power/balance

When giving feedback, you MAY reference specific angles to be precise:
- "Your elbow was at 72° - work on getting it closer to 90°"
- "You're leaning back about 10° - focus on staying vertical"

But keep language simple - the numbers SUPPORT your coaching, they don't replace it.
Still follow the priority hierarchy even with measurements.

═══════════════════════════════════════════════════════════
DECISION RULES
═══════════════════════════════════════════════════════════

1. Start at Priority 1 and check each category in order
2. STOP at the first priority with a RED FLAG
3. Give ONE correction for that priority only
4. Ignore all issues in lower priorities
5. If everything looks good, encourage consistency

LANGUAGE RULES:
- Plain coaching language a 15-year-old understands
- Calm, confident, supportive tone
- Use physical cues they can feel ("keep your elbow in", "reach up to the rim")
- No jargon (avoid: "kinetic chain", "biomechanics", "hip torque")
- No numbers or scores
- No promises or guarantees
- No NBA player comparisons

APPROVED PHRASES:
- "Focus on..."
- "Work on..."
- "Let's fix..."
- "I want you to..."
- "Try to..."
- "Feel yourself..."

BANNED PHRASES:
- "Also consider..." / "Another thing..."
- "Perfect! But..." / "Great, however..."
- "X out of 10" / Any scoring
- "Like Steph Curry..." / Any player comparison
- "Multiple issues..." / Any multi-correction language

═══════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════

{
  "coachSummary": "Direct 1-2 sentence coaching instruction using 'you' language",
  "primaryFocus": "The ONE thing to work on (5-7 words max)",
  "whyItMatters": "Single sentence connecting fix to better shooting",
  "drillRecommendation": "Specific drill with rep count and key focus (1-2 sentences)",
  "correctionCategory": "balance_verticality | shot_line_integrity | set_point_consistency | release_follow_through"
}

Example good output:
{
  "coachSummary": "I notice you're falling backward as you shoot. Let's work on jumping straight up and landing in the same spot you started.",
  "primaryFocus": "Jump straight up and down",
  "whyItMatters": "A balanced jump gives you a consistent release point every time.",
  "drillRecommendation": "Stand on a piece of tape. Shoot 20 form shots and try to land on the tape each time. If you drift, reset before the next shot.",
  "correctionCategory": "balance_verticality"
}

REMEMBER: One correction. No compromise. Fix the foundation first.`;

/**
 * Analyze shooting form with Gemini using video file
 */
export async function analyzeShootingForm(params: {
  videoPath: string;
  angleHint?: "side" | "front";
  previousFocus?: string;
  sessionsOnFocus?: number;
  poseContext?: string;
  shootingAngles?: ShootingAngles;
}): Promise<CoachingAnalysisResult> {
  const { videoPath, angleHint, previousFocus, sessionsOnFocus, poseContext, shootingAngles } = params;

  // Build the user prompt with context
  let userPrompt = `Analyze this basketball shooting video and provide coaching feedback.`;

  if (angleHint) {
    userPrompt += `\n\nCamera angle: ${angleHint} view`;
  }

  // Add measured pose data if available (from MediaPipe)
  if (shootingAngles) {
    userPrompt += `\n\n${formatAnglesForPrompt(shootingAngles)}`;
  } else if (poseContext) {
    // Legacy pose context (text-based)
    userPrompt += `\n\n${poseContext}`;
  }

  if (previousFocus && sessionsOnFocus && sessionsOnFocus > 0) {
    userPrompt += `\n\nContinuity context: The player has been working on "${previousFocus}" for ${sessionsOnFocus} session${sessionsOnFocus > 1 ? "s" : ""}. Check if they've improved. If not, repeat the same focus. If yes, move to the next priority.`;
  }

  userPrompt += `\n\nProvide your analysis in JSON format as specified in the system prompt.`;

  // Read video file as base64
  const videoBuffer = fs.readFileSync(videoPath);
  const videoBase64 = videoBuffer.toString("base64");

  const content = [
    { text: COACHING_SYSTEM_PROMPT },
    { text: userPrompt },
    {
      inlineData: {
        mimeType: "video/mp4",
        data: videoBase64,
      },
    },
  ];

  // Try primary model (Gemini 2.5 Flash), fallback to 2.0 Flash
  let result;
  try {
    result = await model.generateContent(content);
  } catch (primaryError) {
    console.warn("Gemini 2.5 Flash failed, falling back to 2.0 Flash:", primaryError);
    try {
      result = await fallbackModel.generateContent(content);
    } catch (fallbackError) {
      console.error("Both Gemini models failed:", fallbackError);
      throw new Error("Failed to analyze shooting form with Gemini");
    }
  }

  const response = result.response;
  const text = response.text();

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response as JSON");
  }

  const analysis = JSON.parse(jsonMatch[0]) as CoachingAnalysisResult;

  // Validate correction category
  const validCategories = [
    "balance_verticality",
    "shot_line_integrity",
    "set_point_consistency",
    "release_follow_through",
  ];

  if (!validCategories.includes(analysis.correctionCategory)) {
    // Default to most common issue
    analysis.correctionCategory = "release_follow_through";
  }

  return analysis;
}

/**
 * Analyze session metrics with Gemini
 * Used for session analysis to provide coaching bridge
 */
export async function analyzeSessionMetrics(params: {
  metrics: {
    arcTrend: "higher" | "lower" | "stable";
    depthTendency: "short" | "long" | "centered";
    leftRightTendency: "left" | "right" | "centered" | null;
    consistencyTrend: "improving" | "mixed" | "unstable";
  };
  previousFocus?: string;
}): Promise<{
  coachFocus: string;
  bridgeText: string;
}> {
  const { metrics, previousFocus } = params;

  const prompt = `You are a basketball shooting coach reviewing session metrics from a player's practice.

Session Metrics:
- Arc trend: ${metrics.arcTrend}
- Depth tendency: ${metrics.depthTendency}
- Left/Right tendency: ${metrics.leftRightTendency || "N/A (not measured)"}
- Consistency: ${metrics.consistencyTrend}

${previousFocus ? `Previous focus: ${previousFocus}` : ""}

Based on these objective metrics, what should the player focus on next?

Provide a JSON response with:
{
  "coachFocus": "One specific thing to work on (5-8 words)",
  "bridgeText": "Brief explanation connecting metrics to the focus (1 sentence)"
}

Priority order:
1. Consistency issues (if unstable or mixed)
2. Depth issues (if consistently short or long)
3. Arc issues (if consistently low)
4. Left/right issues (if consistently off-center)

Use plain coaching language. No jargon. No numbers.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse Gemini response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Session metrics analysis failed:", error);

    // Fallback logic
    return {
      coachFocus: "Focus on consistency",
      bridgeText: "Let's work on making your shots more repeatable.",
    };
  }
}
