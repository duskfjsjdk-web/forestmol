async function runTest() {
  for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Test ${i} ---`);
    const start = Date.now();
    try {
      const res = await fetch('http://localhost:3000/api/ai/kegg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '호장근',
          compounds: [{name: 'Resveratrol'}, {name: 'Polydatin'}, {name: 'Emodin'}],
          kegg_pathways: [{name: 'Flavonoid biosynthesis'}, {name: 'Stilbenoid, diarylheptanoid and gingerol biosynthesis'}],
          kegg_enzymes: [{id: '1.1.1.21', name: 'Aldose reductase'}]
        })
      });
      const data = await res.json();
      console.log(`Time: ${Date.now() - start}ms`);
      console.log(`Status: ${res.status}`);
      console.log(`Result: ${data.interpretation}`);
    } catch (e) {
      console.error(`Error:`, e);
    }
  }
}
runTest();
