const assert = require('assert');
const { auditPrompt, getAuditSystemPrompt, buildAuditUserPrompt } = require('../lib/ai/prompts');

async function runTests() {
  console.log('Testing AI ASO Audit Parameterized Prompts & Metadata Field Builders...');

  // 1. Verify Platform-Specific System Prompts
  const playSystem = getAuditSystemPrompt('play');
  assert(playSystem.includes('Google Play Store'), 'Play system prompt must identify Google Play Store');
  assert(playSystem.includes('SHORT DESCRIPTION (Max 80 characters)'), 'Play prompt must specify 80 char short description limit');
  assert(playSystem.includes('HEAVILY INDEXED by Google\'s Natural Language Processing (NLP)'), 'Play prompt must specify Google NLP indexing of description');
  assert(playSystem.includes('Feature Graphic / Header Image (1024x500)'), 'Play prompt must specify feature graphic requirement');

  const iosSystem = getAuditSystemPrompt('apple');
  assert(iosSystem.includes('Apple App Store (iOS)'), 'iOS system prompt must identify Apple App Store');
  assert(iosSystem.includes('SUBTITLE (Max 30 characters)'), 'iOS prompt must specify 30 char subtitle limit');
  assert(iosSystem.includes('NEVER repeat words already present in the App Name'), 'iOS prompt must specify keyword redundancy rule');
  assert(iosSystem.includes('DOES NOT INDEX the full description'), 'iOS prompt must specify that Apple does not index full description');
  assert(iosSystem.includes('PROMOTIONAL TEXT (Max 170 characters)'), 'iOS prompt must specify 170 char promotional text rule');

  // 2. Verify Android/Google Play User Prompt Builder
  const mockPlayData = {
    title: 'Super Habit Tracker: Daily Goal',
    appId: 'com.example.habits',
    developer: 'Productivity Labs Inc.',
    category: 'Productivity',
    summary: 'Build lasting daily habits and track goals with reminders.',
    description: 'Detailed description:\n• Habit streaks\n• Analytics\n• Smart reminders',
    recentChanges: 'Version 2.4: Fixed dark mode issue and enhanced widget.',
    score: 4.7,
    ratings: 12500,
    reviews: 3200,
    installs: '500,000+',
    priceText: 'Free',
    contentRating: 'Everyone',
    version: '2.4.1',
    updated: '2026-10-01',
    headerImage: 'https://example.com/header.jpg',
    screenshots: ['shot1.jpg', 'shot2.jpg', 'shot3.jpg', 'shot4.jpg', 'shot5.jpg']
  };

  const playPrompt = buildAuditUserPrompt({
    platform: 'play',
    metadata: mockPlayData,
    packageName: 'com.example.habits',
    focusArea: 'Conversion and NLP indexing'
  });

  assert(playPrompt.includes('GOOGLE PLAY STORE (ANDROID)'), 'Prompt must header Google Play');
  assert(playPrompt.includes('App Title: Super Habit Tracker: Daily Goal [Length: 31/30 characters]'), 'Must include title with length and 30 limit');
  assert(playPrompt.includes('SHORT DESCRIPTION - HEAVILY INDEXED & ABOVE-THE-FOLD HOOK, MAX 80 CHARS'), 'Must include short description section');
  assert(playPrompt.includes('[Length: 58/80 characters]'), 'Must include short description length');
  assert(playPrompt.includes('FULL DESCRIPTION - HEAVILY INDEXED BY GOOGLE NLP, MAX 4,000 CHARS'), 'Must include full description section');
  assert(playPrompt.includes('Bullet Points Detected: Yes'), 'Must detect bullet points in description');
  assert(playPrompt.includes('WHAT\'S NEW / RECENT CHANGES'), 'Must include recent changes section');
  assert(playPrompt.includes('Installs Tier (Social Proof): 500,000+'), 'Must include installs social proof');
  assert(playPrompt.includes('Feature Graphic / Header Image: Present (1024x500 Feature Graphic)'), 'Must include header image presence');
  assert(playPrompt.includes('Screenshots: 5 uploaded (5/8 recommended slots used)'), 'Must include screenshots count and slot ratio');

  // 3. Verify iOS/Apple App Store User Prompt Builder
  const mockAppleData = {
    title: 'FocusFlow: Pomodoro Timer',
    trackName: 'FocusFlow: Pomodoro Timer',
    bundleId: 'com.focusflow.ios',
    developer: 'Zenith Apps LLC',
    category: 'Productivity',
    subtitle: 'Study & Work Focus Session',
    promotionalText: 'Fall productivity sale: 50% off Pro this week only!',
    keywordField: 'timer,pomodoro,focus,study,productivity,interval',
    description: 'Transform your daily workflow with focused work cycles.\n- Interval timer\n- Soundscapes',
    releaseNotes: 'Performance improvements and iOS lock screen widgets.',
    score: 4.9,
    ratings: 840,
    priceText: 'Free',
    contentRating: '4+',
    version: '3.1.0',
    updated: '2026-09-28',
    screenshots: ['ios1.jpg', 'ios2.jpg', 'ios3.jpg']
  };

  const iosPrompt = buildAuditUserPrompt({
    platform: 'apple',
    metadata: mockAppleData,
    packageName: '123456789',
    focusArea: 'Title and Subtitle keyword synergy'
  });

  assert(iosPrompt.includes('APPLE APP STORE (IOS)'), 'Prompt must header Apple App Store');
  assert(iosPrompt.includes('App Name / Title: FocusFlow: Pomodoro Timer [Length: 25/30 characters]'), 'Must include title length');
  assert(iosPrompt.includes('SUBTITLE - INDEXED FOR SEARCH, MAX 30 CHARS'), 'Must include subtitle section');
  assert(iosPrompt.includes('[Length: 26/30 characters]'), 'Must include subtitle length');
  assert(iosPrompt.includes('PROMOTIONAL TEXT - UNINDEXED CONVERSION HOOK, MAX 170 CHARS'), 'Must include promotional text section');
  assert(iosPrompt.includes('[Length: 51/170 characters]'), 'Must include promotional text length');
  assert(iosPrompt.includes('KEYWORD FIELD - PRIVATE INDEXED FIELD, MAX 100 CHARS'), 'Must include keyword field');
  assert(iosPrompt.includes('FULL DESCRIPTION - CRO & CONVERSION ONLY, NOT INDEXED IN SEARCH, MAX 4,000 CHARS'), 'Must note Apple description is not indexed');
  assert(iosPrompt.includes('WHAT\'S NEW / RELEASE NOTES'), 'Must include release notes');
  assert(iosPrompt.includes('Screenshots: 3 uploaded (3/10 slots used - First 3 show in search results)'), 'Must include search visibility for first 3 screenshots');

  // 4. Verify Telemetry & Custom Override
  const withTelemetry = buildAuditUserPrompt({
    platform: 'play',
    metadata: mockPlayData,
    packageName: 'com.example.habits',
    liveTelemetry: { installs: 120, uninstalls: 15, activeDevices: 4500, healthScore: 92 }
  });
  assert(withTelemetry.includes('LIVE PERFORMANCE TELEMETRY'), 'Must append telemetry');
  assert(withTelemetry.includes('Daily User Installs: 120'), 'Must format daily installs');
  assert(withTelemetry.includes('App Health Score: 92/100'), 'Must format health score');

  const customOverride = buildAuditUserPrompt({
    customListingText: 'Custom Listing Override Text Here'
  });
  assert.strictEqual(customOverride, 'Custom Listing Override Text Here', 'Custom listing text must be preserved');

  // Verify unverified screenshot assets are omitted from prompt
  const unverifiedPrompt = buildAuditUserPrompt({
    platform: 'play',
    metadata: { title: 'App without screenshots', description: 'Desc' },
    packageName: 'com.unverified.app'
  });
  assert(!unverifiedPrompt.includes('Screenshots: 0 uploaded'), 'Must not display 0 uploaded warning when screenshots are unverified');
  assert(!unverifiedPrompt.includes('Feature Graphic / Header Image: Missing/Not found'), 'Must not display Missing/Not found header image when unverified');

  // 5. Verify Schema
  assert.deepStrictEqual(auditPrompt.schema.required, ['score', 'headline', 'improvements'], 'Schema must require score, headline, improvements');
  const improvementTypes = auditPrompt.schema.properties.improvements.items.properties.type.enum;
  assert(improvementTypes.includes('short_description'), 'Schema enum must include short_description');
  assert(improvementTypes.includes('subtitle'), 'Schema enum must include subtitle');
  assert(improvementTypes.includes('promotional_text'), 'Schema enum must include promotional_text');
  assert(improvementTypes.includes('screenshots'), 'Schema enum must include screenshots');
  assert(improvementTypes.includes('ratings'), 'Schema enum must include ratings');
  assert(improvementTypes.includes('whats_new'), 'Schema enum must include whats_new');

  // 6. Verify Anti-Inflation Scoring Rubric & calibrateAuditScore
  const { calibrateAuditScore } = require('../lib/ai/prompts');
  assert(typeof calibrateAuditScore === 'function', 'calibrateAuditScore must be exported');

  // Case A: Flawed audit returning 98 with 2 high impact issues must be capped <= 76
  const inflatedAudit = {
    score: 98,
    headline: 'All looks good',
    improvements: [
      { type: 'title', impact: 'high', issue: 'Underutilized title', recommendation: 'Expand title' },
      { type: 'short_description', impact: 'high', issue: 'Short description missing', recommendation: 'Add short description' }
    ]
  };
  calibrateAuditScore(inflatedAudit);
  assert(inflatedAudit.score <= 76, `Score with 2 high-impact issues should be capped <= 76, got ${inflatedAudit.score}`);
  assert.strictEqual(inflatedAudit.score, 76, 'Inflated 98 score should calibrate down to 76');

  // Case B: Flawed audit with 1 high impact issue must be capped <= 84
  const oneHighAudit = {
    score: 98,
    headline: 'Great app',
    improvements: [
      { type: 'title', impact: 'high', issue: 'Exceeds limits', recommendation: 'Shorten title' }
    ]
  };
  calibrateAuditScore(oneHighAudit);
  assert(oneHighAudit.score <= 84, `Score with 1 high-impact issue should be capped <= 84, got ${oneHighAudit.score}`);

  // Case C: 3+ high-impact issues capped <= 68
  const severeAudit = {
    score: 95,
    headline: 'Severe issues',
    improvements: [
      { type: 'title', impact: 'high', issue: 'Issue 1', recommendation: 'Fix 1' },
      { type: 'subtitle', impact: 'high', issue: 'Issue 2', recommendation: 'Fix 2' },
      { type: 'ratings', impact: 'high', issue: 'Issue 3', recommendation: 'Fix 3' }
    ]
  };
  calibrateAuditScore(severeAudit);
  assert(severeAudit.score <= 68, `Score with 3 high-impact issues should be capped <= 68, got ${severeAudit.score}`);

  // Case D: Clean listing with no issues maintains high score
  const perfectAudit = {
    score: 96,
    headline: 'Exceptional listing',
    improvements: []
  };
  calibrateAuditScore(perfectAudit);
  assert.strictEqual(perfectAudit.score, 96, 'Clean listing maintains score');

  console.log('✓ All AI ASO Audit Parameterized Prompts & Metadata Field Builder tests passed!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
