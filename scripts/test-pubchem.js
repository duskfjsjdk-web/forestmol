const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function fetchPubChemCid(casNo) {
  if (!casNo) return null;
  try {
    const cleanCas = casNo.replace(/[^0-9\-]/g, '').trim();
    if (!cleanCas) return null;
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(cleanCas)}/cids/JSON`;
    console.log('Fetching:', url);
    const res = await fetch(url, { method: 'GET' });
    console.log('Status:', res.status);
    if (!res.ok) {
      console.log('Response text:', await res.text());
      return null;
    }
    const data = await res.json();
    console.log('Data:', JSON.stringify(data));
    if (data.IdentifierList && data.IdentifierList.CID && data.IdentifierList.CID.length > 0) {
      return data.IdentifierList.CID[0];
    }
    return null;
  } catch (e) {
    console.error('Error fetching CID:', e);
    return null;
  }
}

async function run() {
  const cid = await fetchPubChemCid('22139-77-1');
  console.log('CID:', cid);
}

run();
