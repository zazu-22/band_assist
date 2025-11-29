#!/usr/bin/env node
import fs from 'fs';

const existing = JSON.parse(fs.readFileSync('/tmp/existing_features.json', 'utf8'));
const newFeatures = JSON.parse(fs.readFileSync('/tmp/new_features.json', 'utf8'));
const combined = [...existing, ...newFeatures];

fs.writeFileSync(process.cwd() + '/feature_list.json', JSON.stringify(combined, null, 2));

console.log(
  `Combined ${existing.length} existing + ${newFeatures.length} new = ${combined.length} total features`
);
