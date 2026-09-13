import fs from 'fs';
import path from 'path';

const taxonomyRaw = fs.readFileSync('docs/canonical-menu-taxonomy.json', 'utf-8');
const taxonomyData = JSON.parse(taxonomyRaw);
const order = Object.keys(taxonomyData);

const catRaw = fs.readFileSync('src/data/categories.json', 'utf-8');
const catData = JSON.parse(catRaw);

catData.categories.sort((a, b) => {
  return order.indexOf(a.id) - order.indexOf(b.id);
});

// Update titles from canonical as well
catData.categories.forEach(cat => {
  if (taxonomyData[cat.id]) {
    cat.title = taxonomyData[cat.id].name;
  }
});

fs.writeFileSync('src/data/categories.json', JSON.stringify(catData, null, 2));

console.log('Categories reordered and titles updated to match canonical menu.');
