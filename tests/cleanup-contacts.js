const fs = require('fs');
const path = require('path');

const contactFile = path.join(__dirname, '..', 'website', 'data', 'contacts.json');

if (fs.existsSync(contactFile)) {
  fs.writeFileSync(contactFile, '[]', 'utf8');
  console.log('✅ contacts.json geleegd');
} else {
  console.log('ℹ️  contacts.json bestaat niet, niets te legen');
}
