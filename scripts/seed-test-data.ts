/**
 * Seed Test Data Script
 *
 * This script populates a test band with sample data for automated testing.
 * Run this after creating a test user and logging in once to create their band.
 *
 * Usage:
 *   1. Create test user in Supabase (with Auto Confirm)
 *   2. Log in once via the app to create the default band
 *   3. Get the band ID from the bands table in Supabase dashboard
 *   4. Run: TEST_BAND_ID=<your-band-id> npm run seed:test
 *
 * Environment variables needed:
 *   - VITE_SUPABASE_URL (from .env.local)
 *   - VITE_SUPABASE_ANON_KEY (from .env.local)
 *   - TEST_BAND_ID (pass when running)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

// Load .env.local manually
function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf-8');
    const env: Record<string, string> = {};
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    return env;
  } catch {
    console.error('Could not read .env.local file');
    process.exit(1);
  }
}

const localEnv = loadEnv();
const supabaseUrl = localEnv.VITE_SUPABASE_URL;
const supabaseKey = localEnv.VITE_SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const TEST_BAND_ID = process.env.TEST_BAND_ID;

if (!TEST_BAND_ID) {
  console.error('Missing TEST_BAND_ID environment variable');
  console.error('');
  console.error('Usage: TEST_BAND_ID=<your-band-id> npm run seed:test');
  console.error('');
  console.error('To find your test band ID:');
  console.error('  1. Log in as the test user once to create their band');
  console.error('  2. Go to Supabase Dashboard → Table Editor → bands');
  console.error('  3. Find the band owned by your test user and copy the id');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TEST DATA
// ============================================================================

const testMembers = [
  { id: randomUUID(), name: 'Alex', roles: ['Lead Guitar', 'Vocals'], avatarColor: 'bg-red-500' },
  { id: randomUUID(), name: 'Sam', roles: ['Bass'], avatarColor: 'bg-blue-500' },
  { id: randomUUID(), name: 'Jordan', roles: ['Drums'], avatarColor: 'bg-green-500' },
  { id: randomUUID(), name: 'Taylor', roles: ['Rhythm Guitar', 'Vocals'], avatarColor: 'bg-purple-500' },
];

const testRoles = ['Lead Guitar', 'Rhythm Guitar', 'Bass', 'Drums', 'Vocals', 'Keys'];

const testSongs = [
  {
    id: randomUUID(),
    title: 'Test Song - Performance Ready',
    artist: 'Test Artist',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'Performance Ready',
    charts: [
      {
        id: randomUUID(),
        name: 'Lead Sheet',
        type: 'TEXT',
        instrument: 'All',
        content: `[Intro]
E  |  A  |  E  |  B

[Verse 1]
E                    A
This is the first verse line
E                    B
Testing the chart display
E                    A
Another line of lyrics here
E         B          E
End of verse one today

[Chorus]
A           E
Test chorus section
B           E
With chord changes
A           E      B     E
Building to the resolution

[Verse 2]
E                    A
Second verse starts here
E                    B
More content to display

[Chorus]
A           E
Test chorus section
B           E
With chord changes

[Outro]
E  |  A  |  E  |  B  |  E`,
        annotations: [],
      },
    ],
    assignments: [],
    parts: [
      { id: randomUUID(), name: 'Intro', startTime: 0, notes: '4 bars' },
      { id: randomUUID(), name: 'Verse 1', startTime: 15, notes: '' },
      { id: randomUUID(), name: 'Chorus', startTime: 45, notes: '' },
      { id: randomUUID(), name: 'Verse 2', startTime: 75, notes: '' },
      { id: randomUUID(), name: 'Chorus', startTime: 105, notes: '' },
      { id: randomUUID(), name: 'Outro', startTime: 135, notes: 'Fade out' },
    ],
  },
  {
    id: randomUUID(),
    title: 'Test Song - In Progress',
    artist: 'Another Artist',
    duration: '4:15',
    bpm: 95,
    key: 'G',
    isOriginal: false,
    status: 'In Progress',
    charts: [
      {
        id: randomUUID(),
        name: 'Chord Chart',
        type: 'TEXT',
        instrument: 'Guitar',
        content: `[Verse]
G  |  C  |  G  |  D

[Chorus]
Em  |  C  |  G  |  D
Em  |  C  |  D  |  D`,
        annotations: [
          { id: randomUUID(), lineIndex: 1, text: 'Palm mute on verse', color: 'yellow' },
        ],
      },
    ],
    assignments: [],
    parts: [],
  },
  {
    id: randomUUID(),
    title: 'Test Song - To Learn',
    artist: 'New Band',
    duration: '2:45',
    bpm: 140,
    key: 'A',
    isOriginal: false,
    status: 'To Learn',
    targetDate: '2025-12-31',
    charts: [],
    assignments: [],
    parts: [],
  },
  {
    id: randomUUID(),
    title: 'Original Test Song',
    artist: 'Test Band',
    duration: '3:00',
    bpm: 110,
    key: 'D',
    isOriginal: true,
    status: 'In Progress',
    charts: [
      {
        id: randomUUID(),
        name: 'Working Chart',
        type: 'TEXT',
        instrument: 'All',
        content: `[Work in Progress]
D  |  G  |  A  |  D

Notes: Still working on bridge section`,
        annotations: [],
      },
    ],
    assignments: [],
    parts: [],
  },
];

const testEvents = [
  {
    id: randomUUID(),
    title: 'Test Practice Session',
    date: '2025-12-15',
    time: '18:00:00',
    type: 'PRACTICE',
    location: 'Test Studio',
    notes: 'Run through setlist',
  },
  {
    id: randomUUID(),
    title: 'Test Gig',
    date: '2025-12-20',
    time: '20:00:00',
    type: 'GIG',
    location: 'Test Venue',
    notes: '45 minute set',
  },
  {
    id: randomUUID(),
    title: 'Test Meeting',
    date: '2025-12-10',
    time: '19:00:00',
    type: 'OTHER',
    location: 'Online',
    notes: 'Planning session',
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function clearTestData() {
  console.log('Clearing existing test data...');

  // Delete in order to respect foreign keys
  const tables = [
    'events',
    'song_parts',
    'assignments',
    'chart_annotations',
    'charts',
    'songs',
    'members',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('band_id', TEST_BAND_ID);
    if (error) {
      console.warn(`Warning clearing ${table}:`, error.message);
    }
  }

  console.log('Cleared existing data');
}

async function seedMembers() {
  console.log('Seeding members...');

  const membersToInsert = testMembers.map((m) => ({
    id: m.id,
    band_id: TEST_BAND_ID,
    name: m.name,
    roles: m.roles,
    avatar_color: m.avatarColor,
  }));

  const { error } = await supabase.from('members').insert(membersToInsert);
  if (error) throw new Error(`Failed to insert members: ${error.message}`);

  console.log(`Inserted ${testMembers.length} members`);
}

async function seedSongs() {
  console.log('Seeding songs...');

  for (const song of testSongs) {
    // Insert song
    const { error: songError } = await supabase.from('songs').insert({
      id: song.id,
      band_id: TEST_BAND_ID,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      bpm: song.bpm,
      key: song.key,
      is_original: song.isOriginal,
      status: song.status,
      target_date: song.targetDate || null,
    });
    if (songError) throw new Error(`Failed to insert song: ${songError.message}`);

    // Insert charts
    for (const chart of song.charts) {
      const { error: chartError } = await supabase.from('charts').insert({
        id: chart.id,
        band_id: TEST_BAND_ID,
        song_id: song.id,
        name: chart.name,
        type: chart.type,
        instrument: chart.instrument,
        content: chart.content || null,
      });
      if (chartError) throw new Error(`Failed to insert chart: ${chartError.message}`);

      // Insert annotations
      for (const annotation of chart.annotations || []) {
        const { error: annotationError } = await supabase.from('chart_annotations').insert({
          id: annotation.id,
          band_id: TEST_BAND_ID,
          chart_id: chart.id,
          line_index: annotation.lineIndex,
          text: annotation.text,
          color: annotation.color,
        });
        if (annotationError) throw new Error(`Failed to insert annotation: ${annotationError.message}`);
      }
    }

    // Insert parts
    for (const part of song.parts) {
      const { error: partError } = await supabase.from('song_parts').insert({
        id: part.id,
        band_id: TEST_BAND_ID,
        song_id: song.id,
        name: part.name,
        start_time: part.startTime,
        notes: part.notes || null,
      });
      if (partError) throw new Error(`Failed to insert part: ${partError.message}`);
    }

    // Create some assignments (link members to songs)
    if (song.status !== 'To Learn') {
      const assignmentsToInsert = testMembers.slice(0, 2).map((member) => ({
        id: randomUUID(),
        band_id: TEST_BAND_ID,
        song_id: song.id,
        member_id: member.id,
        role: member.roles[0],
      }));

      const { error: assignError } = await supabase.from('assignments').insert(assignmentsToInsert);
      if (assignError) throw new Error(`Failed to insert assignments: ${assignError.message}`);
    }
  }

  console.log(`Inserted ${testSongs.length} songs with charts, parts, and assignments`);
}

async function seedEvents() {
  console.log('Seeding events...');

  const eventsToInsert = testEvents.map((e) => ({
    id: e.id,
    band_id: TEST_BAND_ID,
    title: e.title,
    date: e.date,
    time: e.time,
    type: e.type,
    location: e.location,
    notes: e.notes || null,
  }));

  const { error } = await supabase.from('events').insert(eventsToInsert);
  if (error) throw new Error(`Failed to insert events: ${error.message}`);

  console.log(`Inserted ${testEvents.length} events`);
}

async function updateBandRoles() {
  console.log('Updating band roles...');

  const { error } = await supabase
    .from('bands')
    .update({ available_roles: testRoles })
    .eq('id', TEST_BAND_ID);

  if (error) throw new Error(`Failed to update band roles: ${error.message}`);

  console.log(`Set ${testRoles.length} available roles`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Seeding test data for band:', TEST_BAND_ID);
  console.log('='.repeat(60));

  try {
    await clearTestData();
    await seedMembers();
    await seedSongs();
    await seedEvents();
    await updateBandRoles();

    console.log('='.repeat(60));
    console.log('✓ Test data seeded successfully!');
    console.log('='.repeat(60));
    console.log('\nTest data summary:');
    console.log(`  - ${testMembers.length} members`);
    console.log(`  - ${testSongs.length} songs`);
    console.log(`  - ${testEvents.length} events`);
    console.log(`  - ${testRoles.length} roles`);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

main();
