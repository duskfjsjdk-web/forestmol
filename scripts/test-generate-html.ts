import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { generateReportHtml } from '../src/lib/report-template';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchPubChemCid(casNo: string): Promise<number | null> {
  if (!casNo) return null;
  try {
    const cleanCas = casNo.replace(/[^0-9\-]/g, '').trim();
    if (!cleanCas) return null;
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(cleanCas)}/cids/JSON`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.IdentifierList && data.IdentifierList.CID && data.IdentifierList.CID.length > 0) {
      return data.IdentifierList.CID[0];
    }
    return null;
  } catch {
    return null;
  }
}

async function run() {
  console.log('Fetching material for testing...');
  const { data: materials, error } = await supabase
    .from('materials')
    .select('*')
    .eq('id', 'bd90792d-bac7-4fd0-9322-04d06b428484')
    .single();

  if (error || !materials) {
    console.error('Error fetching material:', error);
    return;
  }

  console.log('Material fetched:', materials.name_ko);

  let firstCasNo = '';
  if (materials.compounds) {
    let compoundsList = [];
    if (Array.isArray(materials.compounds)) {
      compoundsList = materials.compounds;
    } else {
      try {
        compoundsList = typeof materials.compounds === 'string' ? JSON.parse(materials.compounds) : materials.compounds;
      } catch {}
    }
    if (Array.isArray(compoundsList) && compoundsList.length > 0) {
      firstCasNo = compoundsList[0].cas || compoundsList[0].cas_no || '';
    }
  }

  console.log('First CAS No:', firstCasNo);
  const cid = firstCasNo ? await fetchPubChemCid(firstCasNo) : null;
  console.log('CID:', cid);

  const mappedMaterials = [{
    id: materials.id,
    name_ko: materials.name_ko || '알 수 없는 소재',
    name_en: materials.name_en || '',
    species: materials.species || materials.scientific_name || '',
    data_source: materials.data_source || '',
    source_org: materials.source_org || '',
    region: materials.region || '',
    bioactivity: materials.bioactivity || [],
    compounds: materials.compounds || [],
    patent_count: 0,
    patents: [],
    raw_data: materials.raw_data || {},
    cosmetic_allowed: materials.cosmetic_allowed,
    kegg_id: materials.kegg_id || null,
    kegg_enzymes: materials.kegg_enzymes || [],
    kegg_pathways: materials.kegg_pathways || [],
    pubchem_cid: cid
  }];

  const html = generateReportHtml(
    { name: '테스트 프로젝트', clientName: '테스트 고객사' },
    mappedMaterials,
    'client',
    'test@forestmol.com',
    '소나무',
    {
      effect_summary: '효능 요약',
      cosmetic_interpretation: '화장품 원료 해석',
      timeline: []
    }
  );

  const outputPath = path.join(__dirname, 'test-report.html');
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log('HTML saved to:', outputPath);

  const index = html.indexOf('대표 구조식');
  if (index !== -1) {
    console.log('Generated HTML contains Representative Structure Formula!');
    console.log(html.substring(index, index + 350));
  } else {
    console.log('Error: "대표 구조식" not found in HTML.');
  }
}

run();
