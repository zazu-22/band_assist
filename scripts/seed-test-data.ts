/**
 * Seed Test Data Script
 *
 * Populates a test band with sample data for automated testing.
 *
 * Usage:
 *   TEST_BAND_ID=<your-band-id> npm run seed:test
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TEST DATA
// ============================================================================

const testMembers = [
  { id: randomUUID(), name: 'Alex', roles: ['Lead Guitar', 'Vocals'], avatar_color: 'bg-red-500' },
  { id: randomUUID(), name: 'Sam', roles: ['Bass'], avatar_color: 'bg-blue-500' },
  { id: randomUUID(), name: 'Jordan', roles: ['Drums'], avatar_color: 'bg-green-500' },
  {
    id: randomUUID(),
    name: 'Taylor',
    roles: ['Rhythm Guitar', 'Vocals'],
    avatar_color: 'bg-purple-500',
  },
];

const testSongs = [
  {
    id: randomUUID(),
    title: 'Test Song - Performance Ready',
    artist: 'Test Artist',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    is_original: false,
    status: 'Performance Ready',
    target_date: null,
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
    assignments: [
      { id: randomUUID(), memberId: testMembers[0].id, role: 'Lead Guitar' },
      { id: randomUUID(), memberId: testMembers[1].id, role: 'Bass' },
    ],
    parts: [
      { id: randomUUID(), name: 'Intro', startTime: 0, notes: '4 bars' },
      { id: randomUUID(), name: 'Verse 1', startTime: 15, notes: '' },
      { id: randomUUID(), name: 'Chorus', startTime: 45, notes: '' },
      { id: randomUUID(), name: 'Outro', startTime: 75, notes: 'Fade out' },
    ],
  },
  {
    id: randomUUID(),
    title: 'Test Song - In Progress',
    artist: 'Another Artist',
    duration: '4:15',
    bpm: 95,
    key: 'G',
    is_original: false,
    status: 'In Progress',
    target_date: null,
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
    assignments: [{ id: randomUUID(), memberId: testMembers[0].id, role: 'Lead Guitar' }],
    parts: [],
  },
  {
    id: randomUUID(),
    title: 'Test Song - To Learn',
    artist: 'New Band',
    duration: '2:45',
    bpm: 140,
    key: 'A',
    is_original: false,
    status: 'To Learn',
    target_date: '2025-12-31',
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
    is_original: true,
    status: 'In Progress',
    target_date: null,
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

  await supabase.from('band_events').delete().eq('band_id', TEST_BAND_ID);
  await supabase.from('songs').delete().eq('band_id', TEST_BAND_ID);
  await supabase.from('band_members').delete().eq('band_id', TEST_BAND_ID);

  console.log('Cleared existing data');
}

async function seedMembers() {
  console.log('Seeding members...');

  const membersToInsert = testMembers.map(m => ({
    ...m,
    band_id: TEST_BAND_ID,
  }));

  const { error } = await supabase.from('band_members').insert(membersToInsert);
  if (error) throw new Error(`Failed to insert members: ${error.message}`);

  console.log(`Inserted ${testMembers.length} members`);
}

async function seedSongs() {
  console.log('Seeding songs...');

  const songsToInsert = testSongs.map(s => ({
    ...s,
    band_id: TEST_BAND_ID,
  }));

  const { error } = await supabase.from('songs').insert(songsToInsert);
  if (error) throw new Error(`Failed to insert songs: ${error.message}`);

  console.log(`Inserted ${testSongs.length} songs`);
}

async function seedEvents() {
  console.log('Seeding events...');

  const eventsToInsert = testEvents.map(e => ({
    ...e,
    band_id: TEST_BAND_ID,
  }));

  const { error } = await supabase.from('band_events').insert(eventsToInsert);
  if (error) throw new Error(`Failed to insert events: ${error.message}`);

  console.log(`Inserted ${testEvents.length} events`);
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

    console.log('='.repeat(60));
    console.log('✓ Test data seeded successfully!');
    console.log('='.repeat(60));
    console.log('\nTest data summary:');
    console.log(`  - ${testMembers.length} members`);
    console.log(`  - ${testSongs.length} songs`);
    console.log(`  - ${testEvents.length} events`);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

main();
