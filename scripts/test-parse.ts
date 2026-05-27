const testHtml = `<tr><td class="d1"><a href=information.php?word=C00040889 target="_blank">C00040889</a></td><td class="d1">220210-98-0</td><td class="d1">Azedararide</td><td class="d1">C15H16O4</td><td class="d1">260.104859</td><td class="d1"><font color=#FF00BF>Melia azedarach</font></td></tr>`;

function parseKnapsackHtml(html: string): Array<{ name: string; cas: string; formula: string }> {
  const compounds: Array<{ name: string; cas: string; formula: string }> = [];
  const rows = html.split(/<\/tr>/i);
  
  for (const row of rows) {
    const trStartIndex = row.search(/<tr>/i);
    if (trStartIndex === -1) continue;
    const trContent = row.substring(trStartIndex + 4);
    
    // td로 쪼개기
    const tds = trContent.split(/<\/td>/i);
    const tdContents: string[] = [];
    
    for (const td of tds) {
      const match = td.match(/<td[^>]*>/i);
      if (match && match.index !== undefined) {
        const tagLength = match[0].length;
        tdContents.push(td.substring(match.index + tagLength).trim());
      }
    }
    
    if (tdContents.length >= 4) {
      if (tdContents[0].includes('information.php')) {
        const rawCas = tdContents[1].replace(/&nbsp;/gi, '').trim();
        const cas = (rawCas === '-' || !rawCas) ? '' : rawCas;
        const name = tdContents[2].replace(/<[^>]*>/g, '').trim();
        const formula = tdContents[3].replace(/<[^>]*>/g, '').trim();
        if (name) {
          compounds.push({ name, cas, formula });
        }
      }
    }
  }
  return compounds;
}

const res = parseKnapsackHtml(testHtml);
console.log('Result:', res);
