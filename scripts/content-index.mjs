import { readFileSync, writeFileSync } from 'node:fs'
const poems = JSON.parse(readFileSync(new URL('../src/data/poetry-curated.json', import.meta.url), 'utf8'))
const ids = poems.map(poem => poem.id)
if (ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error('Poetry IDs must be present and unique')
const output = JSON.stringify(ids, null, 2) + '\n'
const target = new URL('../src/data/poetry-ids.json', import.meta.url)
if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) writeFileSync(target, output)
